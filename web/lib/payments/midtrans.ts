import "server-only"
import { createHash, timingSafeEqual } from "node:crypto"
import type { PaymentMethod, PaymentStatus } from "@/lib/types"

// Midtrans Snap (https://docs.midtrans.com). Sandbox when the server key starts with
// "SB-", production otherwise. Without MIDTRANS_SERVER_KEY, payments are mocked:
// checkout redirects to /checkout/pay/[number] where the payment can be simulated.

const serverKey = () => process.env.MIDTRANS_SERVER_KEY ?? ""
export const midtransEnabled = () => serverKey().length > 0
const sandbox = () => serverKey().startsWith("SB-")
const snapBase = () => (sandbox() ? "https://app.sandbox.midtrans.com" : "https://app.midtrans.com")
const apiBase = () => (sandbox() ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com")
const authHeader = () => `Basic ${Buffer.from(`${serverKey()}:`).toString("base64")}`

/** Payment window per method (minutes); the order holds its stock for exactly this long. */
export const EXPIRY_MINUTES: Record<PaymentMethod, number> = { QRIS: 60, VIRTUAL_ACCOUNT: 24 * 60, CREDIT_CARD: 60, EWALLET: 15 }

/** Snap `enabled_payments` per checkout choice. */
const ENABLED: Record<PaymentMethod, string[]> = {
  QRIS: ["other_qris"],
  VIRTUAL_ACCOUNT: ["bca_va", "bni_va", "bri_va", "echannel", "permata_va", "other_va"],
  CREDIT_CARD: ["credit_card"],
  EWALLET: ["gopay", "shopeepay"],
}

export async function createSnapTransaction(input: {
  paymentNumber: string
  amount: number
  method: PaymentMethod
  customer: { name: string; email: string; phone: string }
  items: { id: string; name: string; price: number; quantity: number }[]
  finishUrl: string
}): Promise<{ token: string; redirectUrl: string }> {
  const res = await fetch(`${snapBase()}/snap/v1/transactions`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      transaction_details: { order_id: input.paymentNumber, gross_amount: input.amount },
      // item_details must sum to gross_amount; discounts/shipping are added as their own lines by the caller
      item_details: input.items.map((i) => ({ id: i.id.slice(0, 50), name: i.name.slice(0, 50), price: i.price, quantity: i.quantity })),
      customer_details: { first_name: input.customer.name.slice(0, 50), email: input.customer.email, phone: input.customer.phone },
      enabled_payments: ENABLED[input.method],
      expiry: { unit: "minutes", duration: EXPIRY_MINUTES[input.method] },
      callbacks: { finish: input.finishUrl },
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.token) throw new Error(`Midtrans Snap failed: ${JSON.stringify(json.error_messages ?? json)}`)
  return { token: json.token, redirectUrl: json.redirect_url }
}

/** Notification signature: SHA512(order_id + status_code + gross_amount + server_key). */
export function verifySignature(n: { order_id?: string; status_code?: string; gross_amount?: string; signature_key?: string }) {
  if (!n.order_id || !n.status_code || !n.gross_amount || !n.signature_key) return false
  const expected = createHash("sha512").update(n.order_id + n.status_code + n.gross_amount + serverKey()).digest("hex")
  const a = Buffer.from(expected)
  const b = Buffer.from(n.signature_key)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** transaction_status (+ fraud_status) → our PaymentStatus; null = no change. */
export function mapTransactionStatus(status: string, fraud?: string): PaymentStatus | null {
  switch (status) {
    case "capture":
      return fraud === "challenge" ? "PENDING" : fraud === "deny" ? "FAILED" : "PAID"
    case "settlement":
      return "PAID"
    case "pending":
      return "PENDING"
    case "deny":
    case "cancel":
    case "failure":
      return "FAILED"
    case "expire":
      return "EXPIRED"
    case "refund":
      return "REFUNDED"
    case "partial_refund":
      return "PARTIALLY_REFUNDED"
    default:
      return null
  }
}

/** payment_type (+ bank) → our method + provider code. */
export function mapPaymentType(n: { payment_type?: string; va_numbers?: { bank: string }[]; permata_va_number?: string; bank?: string }): { method: PaymentMethod; provider: string } | null {
  switch (n.payment_type) {
    case "qris":
      return { method: "QRIS", provider: "qris" }
    case "bank_transfer":
      return { method: "VIRTUAL_ACCOUNT", provider: n.va_numbers?.[0]?.bank ? `${n.va_numbers[0].bank}_va` : n.permata_va_number ? "permata_va" : "bank_va" }
    case "echannel":
      return { method: "VIRTUAL_ACCOUNT", provider: "mandiri_va" }
    case "credit_card":
      return { method: "CREDIT_CARD", provider: n.bank ?? "credit_card" }
    case "gopay":
    case "shopeepay":
      return { method: "EWALLET", provider: n.payment_type }
    default:
      return null
  }
}

/** Refund through Midtrans (cards and e-wallets; bank transfers are refunded manually). */
export async function refundTransaction(paymentNumber: string, amount: number, reason: string, refundKey: string) {
  const res = await fetch(`${apiBase()}/v2/${encodeURIComponent(paymentNumber)}/refund`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
    body: JSON.stringify({ refund_key: refundKey, amount, reason: reason.slice(0, 255) }),
  })
  const json = await res.json().catch(() => ({}))
  if (!["200", "201"].includes(String(json.status_code))) throw new Error(json.status_message ?? `Refund failed (${res.status})`)
  return { gatewayRef: String(json.refund_key ?? refundKey) }
}
