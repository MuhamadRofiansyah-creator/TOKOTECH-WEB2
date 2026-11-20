import "server-only"
import { randomBytes, randomInt } from "node:crypto"
import { db } from "@/lib/db"
import { Prisma } from "@/lib/generated/prisma/client"
import { voucherDiscount } from "@/lib/pricing"
import { quoteRates, type ParcelItem } from "@/lib/shipping"
import { EXPIRY_MINUTES } from "@/lib/payments/midtrans"
import { syncTotalStock } from "./settle"
import type { PaymentMethod } from "@/lib/types"

// The checkout transaction. Everything the browser showed is recomputed here:
// prices, flash-sale prices, voucher, shipping. Stock is held with a conditional
// update so two shoppers can never buy the same last unit.

export const FREE_SHIPPING_MIN = 1_000_000
const FREE_SHIPPING_RATE = "jne:reg"
const PROVIDER_FOR: Record<PaymentMethod, string> = { QRIS: "qris", VIRTUAL_ACCOUNT: "bank_va", CREDIT_CARD: "credit_card", EWALLET: "ewallet" }

export class CheckoutError extends Error {}

export type CheckoutAddress = {
  recipient: string
  phone: string
  street: string
  district: string
  city: string
  province: string
  postalCode: string
  notes?: string | null
  areaId?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type CheckoutInput = {
  email: string
  address: CheckoutAddress
  rateId: string
  method: PaymentMethod
  voucherCode?: string | null
}

/** Cart lines priced from the database (flash-sale price when a running sale has quota left). */
export async function priceCart(cartId: string) {
  const now = new Date()
  const items = await db.cartItem.findMany({
    where: { cartId },
    orderBy: { addedAt: "asc" },
    include: {
      variant: {
        include: {
          product: { select: { id: true, name: true, slug: true, status: true } },
          flashSaleItems: { where: { flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gt: now } } }, take: 1 },
        },
      },
    },
  })
  return items.map((i) => {
    const v = i.variant
    const flash = v.flashSaleItems[0]
    const flashOk = flash && (flash.quota == null || flash.quota - flash.sold >= i.quantity)
    return {
      variant: v,
      product: v.product,
      quantity: i.quantity,
      unitPrice: flashOk ? Math.min(flash.salePrice, v.price) : v.price,
      flashSaleItemId: flashOk ? flash.id : null,
      sellable: v.isActive && v.product.status === "ACTIVE",
    }
  })
}

export const parcelItems = (lines: Awaited<ReturnType<typeof priceCart>>): ParcelItem[] =>
  lines.map((l) => ({
    name: l.product.name,
    value: l.unitPrice,
    quantity: l.quantity,
    weightGrams: l.variant.weightGrams,
    lengthCm: l.variant.lengthCm,
    widthCm: l.variant.widthCm,
    heightCm: l.variant.heightCm,
  }))

/** Rates for the cart, with the store-paid free JNE REG over Rp 1 jt applied. */
export async function shippingOptions(lines: Awaited<ReturnType<typeof priceCart>>, address: Pick<CheckoutAddress, "postalCode" | "areaId" | "latitude" | "longitude">) {
  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0)
  const rates = await quoteRates(address, parcelItems(lines))
  return rates.map((r) => ({ ...r, cost: r.price, price: r.id === FREE_SHIPPING_RATE && subtotal >= FREE_SHIPPING_MIN ? 0 : r.price }))
}

async function uniqueNumbers(tx: Prisma.TransactionClient) {
  for (let i = 0; i < 5; i++) {
    const order = `TT-${randomInt(300_000, 999_999)}`
    const payment = `PAY-${randomInt(910_000, 999_999)}`
    const clash = await tx.$queryRaw<{ n: number }[]>`
      SELECT (SELECT count(*) FROM orders WHERE number = ${order}) + (SELECT count(*) FROM payments WHERE number = ${payment}) AS n`
    if (Number(clash[0].n) === 0) return { order, payment }
  }
  throw new CheckoutError("Couldn't allocate an order number, please try again")
}

export async function placeOrder(cartId: string, userId: string | null, input: CheckoutInput) {
  const lines = await priceCart(cartId)
  if (!lines.length) throw new CheckoutError("Your cart is empty")
  const unsellable = lines.find((l) => !l.sellable)
  if (unsellable) throw new CheckoutError(`${unsellable.product.name} is no longer available. Remove it to continue.`)

  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0)

  // Shipping: re-quote and find the chosen rate
  const options = await shippingOptions(lines, input.address)
  const rate = options.find((o) => o.id === input.rateId)
  if (!rate) throw new CheckoutError("That shipping option is no longer available. Choose another one.")

  // Voucher: re-validate, including the per-user limit
  let voucher: Awaited<ReturnType<typeof db.voucher.findUnique>> = null
  let discount = 0
  let shippingFee = rate.price
  if (input.voucherCode) {
    voucher = await db.voucher.findUnique({ where: { code: input.voucherCode.trim().toUpperCase() } })
    const now = new Date()
    const usable =
      voucher &&
      voucher.isActive &&
      (!voucher.startsAt || voucher.startsAt <= now) &&
      (!voucher.endsAt || voucher.endsAt > now) &&
      (voucher.usageLimit == null || voucher.usedCount < voucher.usageLimit) &&
      subtotal >= voucher.minSubtotal
    if (!usable) throw new CheckoutError("The voucher can't be used on this order. Remove it to continue.")
    if (userId) {
      const used = await db.voucherRedemption.count({ where: { voucherId: voucher!.id, userId } })
      if (used >= voucher!.perUserLimit) throw new CheckoutError(`You've already used ${voucher!.code} the maximum number of times`)
    }
    if (voucher!.type === "FREE_SHIPPING") {
      discount = shippingFee
    } else {
      discount = voucherDiscount(voucher!, subtotal)
    }
  }
  if (voucher?.type === "FREE_SHIPPING") shippingFee = rate.price // charged, then discounted in full
  const total = subtotal - discount + shippingFee
  const tax = Math.round(((total - shippingFee) * 11) / 111)
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES[input.method] * 60_000)
  const guestAccessToken = userId ? null : randomBytes(24).toString("base64url")
  const a = input.address

  const result = await db.$transaction(
    async (tx) => {
      // Hold stock: succeeds only while enough unreserved units remain
      for (const l of lines) {
        const held = await tx.$executeRaw`
          UPDATE product_variants SET reserved = reserved + ${l.quantity}
          WHERE id = ${l.variant.id} AND "isActive" AND stock - reserved >= ${l.quantity}`
        if (held !== 1) throw new CheckoutError(`Only a few ${l.product.name} (${l.variant.name}) are left. Reduce the quantity to continue.`)
        if (l.flashSaleItemId) {
          const ok = await tx.$executeRaw`
            UPDATE flash_sale_items SET sold = sold + ${l.quantity}
            WHERE id = ${l.flashSaleItemId} AND (quota IS NULL OR sold + ${l.quantity} <= quota)`
          if (ok !== 1) throw new CheckoutError(`The flash-sale quota for ${l.product.name} just ran out. Refresh your cart.`)
        }
      }
      const numbers = await uniqueNumbers(tx)
      const order = await tx.order.create({
        data: {
          number: numbers.order,
          userId,
          email: input.email.toLowerCase(),
          guestAccessToken,
          status: "PENDING_PAYMENT",
          shipRecipient: a.recipient,
          shipPhone: a.phone,
          shipStreet: a.street,
          shipDistrict: a.district,
          shipCity: a.city,
          shipProvince: a.province,
          shipPostalCode: a.postalCode,
          shipAreaId: a.areaId ?? null,
          shipLatitude: a.latitude ?? null,
          shipLongitude: a.longitude ?? null,
          shipNotes: a.notes || null,
          subtotal,
          discount,
          shippingFee,
          tax,
          total,
          voucherId: voucher?.id ?? null,
          voucherCode: voucher?.code ?? null,
          expiresAt,
          items: {
            create: lines.map((l) => ({
              variantId: l.variant.id,
              productId: l.product.id,
              productName: l.product.name,
              productSlug: l.product.slug,
              variantName: l.variant.name,
              sku: l.variant.sku,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              lineTotal: l.unitPrice * l.quantity,
              flashSaleItemId: l.flashSaleItemId,
            })),
          },
          events: { create: { status: "PENDING_PAYMENT", message: "Order placed; stock held until the payment window ends" } },
          shipments: {
            create: {
              courier: rate.courier,
              service: rate.service,
              provider: rate.provider === "biteship" ? "biteship" : "mock",
              cost: rate.cost,
              weightGrams: parcelItems(lines).reduce((n, i) => n + i.weightGrams * i.quantity, 0),
              etaText: rate.eta,
            },
          },
        },
        include: { items: true },
      })
      const payment = await tx.payment.create({
        data: { number: numbers.payment, orderId: order.id, method: input.method, provider: PROVIDER_FOR[input.method], amount: total, expiresAt },
      })
      await tx.inventoryMovement.createMany({
        data: lines.map((l) => ({ variantId: l.variant.id, delta: -l.quantity, reason: "RESERVATION" as const, orderId: order.id, note: `Held until ${expiresAt.toISOString()}` })),
      })
      await syncTotalStock(tx, [...new Set(lines.map((l) => l.product.id))])
      await tx.cartItem.deleteMany({ where: { cartId } })
      await tx.cart.update({ where: { id: cartId }, data: { voucherId: null } })
      return { order, payment }
    },
    { isolationLevel: "ReadCommitted", timeout: 20_000 },
  )

  return { ...result, shippingLabel: rate.label }
}
