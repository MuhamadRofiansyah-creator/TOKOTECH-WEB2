import "server-only"
import { revalidateTag } from "next/cache"
import { db } from "@/lib/db"
import { Prisma } from "@/lib/generated/prisma/client"
import { sendPaymentReceived } from "@/lib/email"
import type { PaymentMethod, PaymentStatus } from "@/lib/types"

// Payment outcomes → order, stock, ledger, voucher, flash sale. Used by the Midtrans
// webhook, the mock payment page and the expiry sweeper. Idempotent: applying the
// same status twice changes nothing (webhooks are retried).

type Tx = Prisma.TransactionClient

export type GatewayUpdate = {
  transactionId?: string | null
  method?: PaymentMethod
  provider?: string
  fraudStatus?: string | null
  vaNumber?: string | null
  fee?: number
  raw?: Prisma.InputJsonValue
}

/** Recompute denormalized Product.totalStock for the given products. */
export async function syncTotalStock(tx: Tx, productIds: string[]) {
  if (!productIds.length) return
  await tx.$executeRaw`
    UPDATE products p SET "totalStock" = coalesce((
      SELECT sum(v.stock - v.reserved) FROM product_variants v WHERE v."productId" = p.id AND v."isActive"
    ), 0)
    WHERE p.id IN (${Prisma.join(productIds)})`
}

/** Give back held units (order cancelled or expired before payment). */
async function releaseReservations(tx: Tx, orderId: string, note: string) {
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { variantId: true, quantity: true, productId: true, flashSaleItemId: true } })
  for (const it of items) {
    if (it.variantId) {
      await tx.$executeRaw`UPDATE product_variants SET reserved = GREATEST(reserved - ${it.quantity}, 0) WHERE id = ${it.variantId}`
      await tx.inventoryMovement.create({ data: { variantId: it.variantId, delta: it.quantity, reason: "RESERVATION_RELEASE", orderId, note } })
    }
    if (it.flashSaleItemId) await tx.$executeRaw`UPDATE flash_sale_items SET sold = GREATEST(sold - ${it.quantity}, 0) WHERE id = ${it.flashSaleItemId}`
  }
  await syncTotalStock(tx, [...new Set(items.map((i) => i.productId))])
}

/** Held units become sold units. */
async function convertReservations(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { variantId: true, quantity: true, productId: true } })
  for (const it of items) {
    if (!it.variantId) continue
    await tx.$executeRaw`UPDATE product_variants SET reserved = GREATEST(reserved - ${it.quantity}, 0), stock = stock - ${it.quantity} WHERE id = ${it.variantId}`
    await tx.inventoryMovement.createMany({
      data: [
        { variantId: it.variantId, delta: it.quantity, reason: "RESERVATION_RELEASE", orderId, note: "Paid" },
        { variantId: it.variantId, delta: -it.quantity, reason: "SALE", orderId },
      ],
    })
    await tx.product.update({ where: { id: it.productId }, data: { soldCount: { increment: it.quantity } } })
  }
  await syncTotalStock(tx, [...new Set(items.map((i) => i.productId))])
}

export function invalidateOrderCaches(userId: string | null) {
  try {
    revalidateTag("catalog", "max") // stock and sold counts
    revalidateTag("admin", { expire: 0 })
    if (userId) revalidateTag(`orders:${userId}`, { expire: 0 })
  } catch {
    // Outside a request (the background expiry job) there is no cache scope; entries expire on their own lifetime
  }
}

/**
 * Move a payment (by its number, = Midtrans order_id) to `status` and apply the
 * consequences. Returns false if the payment doesn't exist.
 */
export async function applyPaymentStatus(paymentNumber: string, status: PaymentStatus, gw: GatewayUpdate = {}): Promise<boolean> {
  const payment = await db.payment.findUnique({ where: { number: paymentNumber }, include: { order: true } })
  if (!payment) return false
  if (payment.status === status && !gw.transactionId) return true

  const order = payment.order
  const now = new Date()
  let notifyPaid = false

  await db.$transaction(async (tx) => {
    // Re-read inside the transaction and lock the row so concurrent webhooks serialize
    const [locked] = await tx.$queryRaw<{ status: PaymentStatus }[]>`SELECT status FROM payments WHERE id = ${payment.id} FOR UPDATE`
    const current = locked.status
    const base = {
      ...(gw.transactionId ? { gatewayRef: gw.transactionId } : {}),
      ...(gw.method ? { method: gw.method } : {}),
      ...(gw.provider ? { provider: gw.provider } : {}),
      ...(gw.fraudStatus !== undefined ? { fraudStatus: gw.fraudStatus } : {}),
      ...(gw.vaNumber ? { vaNumber: gw.vaNumber } : {}),
      ...(gw.raw !== undefined ? { raw: gw.raw } : {}),
    }

    if (status === current) {
      await tx.payment.update({ where: { id: payment.id }, data: base })
      return
    }

    if (status === "PAID" && current === "PENDING") {
      await tx.payment.update({ where: { id: payment.id }, data: { ...base, status: "PAID", paidAt: now, fee: gw.fee ?? payment.fee } })
      if (order.status === "PENDING_PAYMENT") {
        await convertReservations(tx, order.id)
        await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: now } })
        await tx.orderEvent.create({ data: { orderId: order.id, status: "PAID", message: `Payment received (${payment.number})` } })
        if (order.voucherId && order.discount > 0) {
          await tx.voucherRedemption.create({ data: { voucherId: order.voucherId, userId: order.userId, orderId: order.id, amount: order.discount } })
          await tx.voucher.update({ where: { id: order.voucherId }, data: { usedCount: { increment: 1 } } })
        }
        notifyPaid = true
      } else {
        // Paid after the order was cancelled (stock already released): flag for a refund
        await tx.orderEvent.create({ data: { orderId: order.id, status: null, message: `Payment ${payment.number} settled after cancellation; refund required` } })
      }
      return
    }

    if ((status === "FAILED" || status === "EXPIRED") && current === "PENDING") {
      await tx.payment.update({ where: { id: payment.id }, data: { ...base, status } })
      if (order.status === "PENDING_PAYMENT") {
        await releaseReservations(tx, order.id, status === "EXPIRED" ? "Payment expired" : "Payment failed")
        await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", cancelledAt: now } })
        await tx.orderEvent.create({
          data: { orderId: order.id, status: "CANCELLED", message: status === "EXPIRED" ? "Payment window expired; stock released" : "Payment failed; order cancelled" },
        })
      }
      return
    }

    if ((status === "REFUNDED" || status === "PARTIALLY_REFUNDED") && (current === "PAID" || current === "PARTIALLY_REFUNDED")) {
      await tx.payment.update({ where: { id: payment.id }, data: { ...base, status } })
      return
    }

    // Any other transition (e.g. PENDING notification for a settled payment) only records gateway data
    await tx.payment.update({ where: { id: payment.id }, data: base })
  })

  invalidateOrderCaches(order.userId)
  if (notifyPaid) {
    const items = await db.orderItem.findMany({ where: { orderId: order.id } })
    await sendPaymentReceived(order, items)
  }
  return true
}

/** Cancel unpaid orders whose payment window has passed (backup to Midtrans "expire" notifications). */
export async function expireOverduePayments(limit = 100) {
  const overdue = await db.payment.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    select: { number: true },
    take: limit,
  })
  for (const p of overdue) await applyPaymentStatus(p.number, "EXPIRED")
  return overdue.length
}
