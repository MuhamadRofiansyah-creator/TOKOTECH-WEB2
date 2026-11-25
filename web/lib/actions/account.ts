"use server"

import { randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { updateTag } from "next/cache"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth/session"
import { sendPasswordReset } from "@/lib/email"

// Customer self-service actions: addresses, reviews, stock alerts, newsletter, password reset.
// Every action re-checks the session; results carry codes the UI translates.

export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

export type AddressInput = {
  label: string
  recipient: string
  phone: string
  street: string
  district: string
  city: string
  province: string
  postalCode: string
  notes?: string
  isDefault?: boolean
}

/** Field name → error code (translated in the UI). */
function validateAddress(a: AddressInput): Record<string, string> {
  const e: Record<string, string> = {}
  if (str(a.label, 40).length < 2) e.label = "label"
  if (str(a.recipient, 80).length < 2) e.recipient = "recipient"
  if (!/^[0-9+\s-]{9,20}$/.test(str(a.phone, 20))) e.phone = "phone"
  if (str(a.street).length < 5) e.street = "street"
  if (str(a.district, 80).length < 2) e.district = "district"
  if (!str(a.city, 80)) e.city = "city"
  if (!str(a.province, 80)) e.province = "province"
  if (!/^\d{5}$/.test(str(a.postalCode, 5))) e.postalCode = "postal"
  return e
}

export async function saveAddressAction(addressId: string | null, input: AddressInput): Promise<Result | { ok: false; error: "fields"; fields: Record<string, string> }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: "signin" }
  const fields = validateAddress(input)
  if (Object.keys(fields).length) return { ok: false, error: "fields", fields }

  const data = {
    label: str(input.label, 40),
    recipient: str(input.recipient, 80),
    phone: str(input.phone, 20),
    street: str(input.street),
    district: str(input.district, 80),
    city: str(input.city, 80),
    province: str(input.province, 80),
    postalCode: str(input.postalCode, 5),
    notes: str(input.notes) || null,
  }
  const count = await db.address.count({ where: { userId: user.id } })
  const makeDefault = !!input.isDefault || count === 0

  await db.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } })
    if (addressId) {
      const own = await tx.address.findFirst({ where: { id: addressId, userId: user.id }, select: { id: true } })
      if (!own) throw new Error("not found")
      await tx.address.update({ where: { id: addressId }, data: { ...data, ...(makeDefault ? { isDefault: true } : {}) } })
    } else {
      await tx.address.create({ data: { ...data, userId: user.id, isDefault: makeDefault } })
    }
  })
  updateTag(`orders:${user.id}`)
  return { ok: true }
}

export async function setDefaultAddressAction(addressId: string): Promise<Result> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: "signin" }
  const own = await db.address.findFirst({ where: { id: addressId, userId: user.id }, select: { id: true } })
  if (!own) return { ok: false, error: "notFound" }
  await db.$transaction([
    db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    db.address.update({ where: { id: addressId }, data: { isDefault: true } }),
  ])
  updateTag(`orders:${user.id}`)
  return { ok: true }
}

export async function deleteAddressAction(addressId: string): Promise<Result> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: "signin" }
  const own = await db.address.findFirst({ where: { id: addressId, userId: user.id } })
  if (!own) return { ok: false, error: "notFound" }
  await db.address.delete({ where: { id: addressId } })
  // Keep one default address if any remain
  if (own.isDefault) {
    const next = await db.address.findFirst({ where: { userId: user.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] })
    if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } })
  }
  updateTag(`orders:${user.id}`)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Reviews (buyers only: one review per delivered order item; starts PENDING)
// ---------------------------------------------------------------------------

/** Which delivered purchase of this product the user can still review, if any. */
export async function reviewEligibilityAction(productId: string): Promise<{ status: "signin" | "notBought" | "reviewed" | "ok"; orderNumber?: string }> {
  const user = await getSessionUser()
  if (!user) return { status: "signin" }
  const items = await db.orderItem.findMany({
    where: { productId, order: { userId: user.id, status: "DELIVERED" } },
    select: { id: true, review: { select: { id: true } }, order: { select: { number: true } } },
    orderBy: { id: "desc" },
  })
  if (!items.length) return { status: "notBought" }
  const open = items.find((i) => !i.review)
  return open ? { status: "ok", orderNumber: open.order.number } : { status: "reviewed" }
}

export async function submitReviewAction(productId: string, input: { rating: number; title: string; body: string }): Promise<Result> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: "signin" }
  const rating = Math.round(Number(input.rating))
  const title = str(input.title, 120)
  const body = str(input.body, 2000)
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: "rating" }
  if (title.length < 3) return { ok: false, error: "title" }
  if (body.length < 10) return { ok: false, error: "body" }
  const item = await db.orderItem.findFirst({
    where: { productId, review: null, order: { userId: user.id, status: "DELIVERED" } },
    select: { id: true },
  })
  if (!item) return { ok: false, error: "notEligible" }
  await db.review.create({ data: { productId, userId: user.id, orderItemId: item.id, rating, title, body } })
  updateTag("admin")
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Back-in-stock alerts
// ---------------------------------------------------------------------------

export async function requestStockAlertAction(productId: string): Promise<Result> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: "signin" }
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) return { ok: false, error: "notFound" }
  await db.stockAlert.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    create: { userId: user.id, productId },
    update: { notifiedAt: null },
  })
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------

export async function subscribeNewsletterAction(input: string): Promise<Result> {
  const email = str(input, 254).toLowerCase()
  if (!EMAIL.test(email)) return { ok: false, error: "email" }
  await db.newsletterSubscriber.upsert({
    where: { email },
    create: { email, confirmedAt: new Date() },
    update: { unsubscribedAt: null, confirmedAt: new Date() },
  })
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Password reset (token in VerificationToken, identifier "reset:<email>", 1 hour)
// ---------------------------------------------------------------------------

/** Dev/self-hosted helper: with MOCK_EMAIL_LINKS="true" the reset link is returned to show on screen. */
const showLinks = () => process.env.MOCK_EMAIL_LINKS === "true"

export async function requestPasswordResetAction(input: string, localePrefix: "" | "/id"): Promise<Result<{ link?: string }>> {
  const email = str(input, 254).toLowerCase()
  if (!EMAIL.test(email)) return { ok: false, error: "email" }
  const user = await db.user.findUnique({ where: { email }, select: { id: true, status: true } })
  // Same answer whether or not the account exists (no account probing)
  if (!user || user.status === "SUSPENDED") return { ok: true, data: {} }
  await db.verificationToken.deleteMany({ where: { identifier: `reset:${email}` } })
  const token = randomBytes(24).toString("base64url")
  await db.verificationToken.create({ data: { identifier: `reset:${email}`, token, expires: new Date(Date.now() + 60 * 60_000) } })
  const path = `${localePrefix}/reset-password?token=${token}`
  await sendPasswordReset(email, `${process.env.APP_URL ?? "http://localhost:3000"}${path}`)
  return { ok: true, data: showLinks() ? { link: path } : {} }
}

export async function resetPasswordAction(token: string, password: string): Promise<Result> {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) return { ok: false, error: "password" }
  const row = await db.verificationToken.findUnique({ where: { token: str(token, 100) } })
  if (!row || !row.identifier.startsWith("reset:") || row.expires < new Date()) return { ok: false, error: "token" }
  const email = row.identifier.slice("reset:".length)
  await db.$transaction([
    db.user.update({ where: { email }, data: { passwordHash: await bcrypt.hash(password, 10) } }),
    db.verificationToken.delete({ where: { token: row.token } }),
  ])
  return { ok: true }
}
