import "server-only"
import { cookies } from "next/headers"
import { randomBytes } from "node:crypto"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth/session"
import type { CartLine } from "@/lib/types"

// Server-side cart. Signed-in users own a Cart by userId; guests by an httpOnly
// cookie token (Cart.guestToken). When a guest signs in, their guest cart is
// merged into the user cart on the next cart access and the cookie is cleared.

export const GUEST_COOKIE = "tt_cart"
const MAX_QTY = 99

type CartRef = { id: string }

async function guestToken() {
  return (await cookies()).get(GUEST_COOKIE)?.value ?? null
}

/** Merge the guest cart (if any) into the user's cart, keeping the larger quantity per variant. */
async function mergeGuestInto(userCartId: string, token: string) {
  const guest = await db.cart.findUnique({ where: { guestToken: token }, include: { items: true } })
  if (guest && guest.id !== userCartId) {
    await db.$transaction(async (tx) => {
      for (const item of guest.items) {
        const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: userCartId, variantId: item.variantId } } })
        if (existing) {
          await tx.cartItem.update({ where: { id: existing.id }, data: { quantity: Math.min(MAX_QTY, Math.max(existing.quantity, item.quantity)) } })
        } else {
          await tx.cartItem.create({ data: { cartId: userCartId, variantId: item.variantId, quantity: item.quantity } })
        }
      }
      await tx.cart.delete({ where: { id: guest.id } })
    })
  }
  ;(await cookies()).delete(GUEST_COOKIE)
}

/** The current visitor's cart; `create` makes one (and the guest cookie) when missing. */
export async function currentCart(opts: { create: true }): Promise<CartRef>
export async function currentCart(opts?: { create?: false }): Promise<CartRef | null>
export async function currentCart({ create = false } = {}): Promise<CartRef | null> {
  const [user, token] = await Promise.all([getSessionUser(), guestToken()])

  if (user) {
    let cart = await db.cart.findUnique({ where: { userId: user.id }, select: { id: true } })
    if (!cart && (create || token)) cart = await db.cart.create({ data: { userId: user.id }, select: { id: true } })
    if (cart && token) await mergeGuestInto(cart.id, token)
    return cart
  }

  if (token) {
    const cart = await db.cart.findUnique({ where: { guestToken: token }, select: { id: true } })
    if (cart) return cart
  }
  if (!create) return null
  const newToken = randomBytes(24).toString("base64url")
  ;(await cookies()).set(GUEST_COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    // Secure only when the site is served over https (a local production build runs on plain http)
    secure: (process.env.APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  })
  return db.cart.create({ data: { guestToken: newToken }, select: { id: true } })
}

export async function cartLines(cartId: string): Promise<CartLine[]> {
  const items = await db.cartItem.findMany({ where: { cartId }, orderBy: { addedAt: "asc" }, select: { variantId: true, quantity: true } })
  return items
}

/** Clamp a requested quantity to what can be sold now (and 1–99). Returns 0 if the variant isn't sellable. */
export async function sellableQuantity(variantId: string, requested: number) {
  const v = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true, reserved: true, isActive: true, product: { select: { status: true } } },
  })
  if (!v || !v.isActive || v.product.status !== "ACTIVE") return 0
  return Math.max(0, Math.min(MAX_QTY, Math.floor(requested), v.stock - v.reserved))
}
