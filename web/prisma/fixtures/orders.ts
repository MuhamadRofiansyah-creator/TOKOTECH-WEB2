// Orders and everything hanging off them, in the shape of the Prisma models:
// Order, OrderItem, OrderEvent, Payment, Refund, Shipment, Review, Voucher,
// VoucherRedemption, FlashSale, FlashSaleItem, InventoryMovement, AuditLog.
//
// Deterministic (seeded PRNG + MOCK_NOW). The same arrays feed the UI (via
// Fixtures for the database seed (prisma/seed.ts) only; the app reads Postgres.
//
// Three groups of orders:
//   1. Rofi's own orders (account pages): TT-260311, TT-260207, TT-259884, TT-259102
//   2. Recent store orders (admin payments): TT-260480 … TT-260339, the last 30 days
//   3. Purchase history (Aug–Oct): delivered orders whose items carry the reviews,
//      because reviews are buyer-only (Review.orderItemId is required)

import type {
  Order,
  OrderEvent,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductVariant,
  Refund,
  Review,
  ReviewStatus,
  Shipment,
  Voucher,
  VoucherRedemption,
  FlashSale,
  FlashSaleItem,
  InventoryMovement,
} from "@/lib/types"
import { providerLabel } from "@/lib/format"
import { DAY, HOUR, MOCK_NOW, iso, rng } from "./clock"
import { products, syncDenormalized } from "./products"
import { ROFI_ID, defaultAddress, users } from "./users"

// ---------------------------------------------------------------------------
// Vouchers
// ---------------------------------------------------------------------------

export const vouchers: Voucher[] = [
  { id: "vc-tokotech10", code: "TOKOTECH10", description: "10% off, up to Rp 500 rb", type: "PERCENT", value: 10, maxDiscount: 500_000, minSubtotal: 0, startsAt: iso(MOCK_NOW - 120 * DAY), endsAt: null, usageLimit: 5_000, perUserLimit: 3, usedCount: 0, isActive: true, createdAt: iso(MOCK_NOW - 120 * DAY) },
  { id: "vc-gratisongkir", code: "GRATISONGKIR", description: "Free shipping on orders over Rp 1 jt", type: "FREE_SHIPPING", value: 0, maxDiscount: null, minSubtotal: 1_000_000, startsAt: iso(MOCK_NOW - 60 * DAY), endsAt: iso(MOCK_NOW + 45 * DAY), usageLimit: null, perUserLimit: 5, usedCount: 0, isActive: true, createdAt: iso(MOCK_NOW - 60 * DAY) },
  { id: "vc-hemat100", code: "HEMAT100K", description: "Rp 100 rb off orders over Rp 2 jt (ended)", type: "FIXED", value: 100_000, maxDiscount: null, minSubtotal: 2_000_000, startsAt: iso(Date.UTC(2026, 9, 1)), endsAt: iso(Date.UTC(2026, 9, 31)), usageLimit: 500, perUserLimit: 1, usedCount: 0, isActive: false, createdAt: iso(Date.UTC(2026, 8, 25)) },
]
const voucherByCode = new Map(vouchers.map((v) => [v.code, v]))

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export const orders: Order[] = []
export const orderItems: OrderItem[] = []
export const orderEvents: OrderEvent[] = []
export const payments: Payment[] = []
export const refunds: Refund[] = []
export const shipments: Shipment[] = []
export const voucherRedemptions: VoucherRedemption[] = []

const COURIERS = {
  "jne-reg": { courier: "jne", service: "reg", cost: 18_000, eta: "2–3 days" },
  "jne-yes": { courier: "jne", service: "yes", cost: 32_000, eta: "Next day" },
  "sicepat-best": { courier: "sicepat", service: "best", cost: 32_000, eta: "Next day" },
  "gosend-instant": { courier: "gosend", service: "instant", cost: 55_000, eta: "Today, 3 hours" },
} as const
type CourierKey = keyof typeof COURIERS

const PROVIDERS: Record<PaymentMethod, string[]> = {
  QRIS: ["qris"],
  VIRTUAL_ACCOUNT: ["bca_va", "mandiri_va", "bni_va"],
  CREDIT_CARD: ["visa", "mastercard"],
  EWALLET: ["gopay", "shopeepay"],
}
/** Midtrans payment windows. */
const EXPIRY_MS: Record<PaymentMethod, number> = { QRIS: HOUR, VIRTUAL_ACCOUNT: 24 * HOUR, CREDIT_CARD: HOUR, EWALLET: 15 * 60_000 }
const gatewayFee = (method: PaymentMethod, amount: number) =>
  method === "VIRTUAL_ACCOUNT" ? 4_000 : Math.round(amount * (method === "CREDIT_CARD" ? 0.029 : method === "QRIS" ? 0.007 : 0.02))

const hex = (seed: number, len: number) => {
  const r = rng(seed)
  return Array.from({ length: len }, () => Math.floor(r() * 16).toString(16)).join("")
}

type Line = { product: Product; variant: ProductVariant; quantity: number }

interface OrderSpec {
  key: number
  number: string
  paymentNumber: string
  userId: string
  placedMs: number
  lines: Line[]
  status: OrderStatus
  /** Final state of the payment attempt */
  payment: PaymentStatus
  method: PaymentMethod
  provider: string
  courier: CourierKey
  /** Charged shipping before vouchers (0 = store-paid free shipping) */
  shippingFee?: number
  voucherCode?: string
}

function buildOrder(s: OrderSpec) {
  const id = `o-${s.key}`
  const user = users.find((u) => u.id === s.userId)!
  const address = defaultAddress(s.userId)!
  const courier = COURIERS[s.courier]

  const items: OrderItem[] = s.lines.map((l, k) => ({
    id: `oi-${s.key}-${k + 1}`,
    orderId: id,
    variantId: l.variant.id,
    productId: l.product.id,
    productName: l.product.name,
    productSlug: l.product.slug,
    variantName: l.variant.name,
    sku: l.variant.sku,
    unitPrice: l.variant.price,
    quantity: l.quantity,
    lineTotal: l.variant.price * l.quantity,
    flashSaleItemId: null,
  }))

  const subtotal = items.reduce((n, i) => n + i.lineTotal, 0)
  const shippingFee = s.shippingFee ?? (subtotal >= 1_000_000 && s.courier === "jne-reg" ? 0 : courier.cost)
  const voucher = s.voucherCode ? voucherByCode.get(s.voucherCode) : undefined
  let discount = 0
  if (voucher && subtotal >= voucher.minSubtotal) {
    if (voucher.type === "PERCENT") discount = Math.min(voucher.maxDiscount ?? Infinity, Math.round((subtotal * voucher.value) / 100))
    else if (voucher.type === "FIXED") discount = voucher.value
    else discount = shippingFee
  }
  const total = subtotal - discount + shippingFee
  const goods = total - shippingFee
  const tax = Math.round((goods * 11) / 111) // PPN 11%, included in prices

  // ---- payment
  const expiresMs = s.placedMs + EXPIRY_MS[s.method]
  const settled = s.payment === "PAID" || s.payment === "REFUNDED" || s.payment === "PARTIALLY_REFUNDED"
  const paidMs = settled ? s.placedMs + 4 * 60_000 + (s.key % 9) * 60_000 : null
  const pay: Payment = {
    id: `pay-${s.key}`,
    number: s.paymentNumber,
    orderId: id,
    method: s.method,
    provider: s.provider,
    gateway: "midtrans",
    gatewayRef: s.payment === "PENDING" && s.method !== "VIRTUAL_ACCOUNT" ? null : `${hex(s.key, 8)}-${hex(s.key + 1, 4)}-${hex(s.key + 2, 4)}-${hex(s.key + 3, 12)}`,
    snapToken: s.payment === "PENDING" ? `snap-${hex(s.key + 9, 24)}` : null,
    amount: total,
    fee: settled ? gatewayFee(s.method, total) : 0,
    status: s.payment,
    fraudStatus: s.method === "CREDIT_CARD" ? (s.payment === "FAILED" ? "deny" : "accept") : null,
    vaNumber: s.method === "VIRTUAL_ACCOUNT" ? `${s.provider === "bca_va" ? "12345" : s.provider === "bni_va" ? "98812" : "70014"}${String(100_000_000 + s.key * 7_919).slice(-9)}` : null,
    qrString: s.method === "QRIS" && s.payment === "PENDING" ? `00020101021226670016COM.MIDTRANS${hex(s.key + 5, 20)}` : null,
    redirectUrl: null,
    expiresAt: iso(expiresMs),
    paidAt: paidMs ? iso(paidMs) : null,
    raw: null,
    createdAt: iso(s.placedMs),
    updatedAt: iso(paidMs ?? (s.payment === "PENDING" ? s.placedMs : Math.min(expiresMs, MOCK_NOW))),
  }

  // ---- timeline
  const events: OrderEvent[] = []
  let t = s.placedMs
  const ev = (status: OrderStatus | null, message: string, atMs: number, actorId: string | null = null) => {
    events.push({ id: `oe-${s.key}-${events.length + 1}`, orderId: id, status, message, actorId, createdAt: iso(atMs) })
  }
  ev("PENDING_PAYMENT", "Order placed", t)
  const reached = (st: OrderStatus) => {
    const flow: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "RETURNED"]
    return flow.indexOf(s.status) >= flow.indexOf(st)
  }
  let shippedMs: number | null = null
  let deliveredMs: number | null = null
  if (paidMs) ev("PAID", `Payment received via ${providerLabel(s.provider)}`, (t = paidMs))
  if (s.status !== "CANCELLED" && reached("PROCESSING")) ev("PROCESSING", "Packed at Jakarta warehouse", (t = t + 5 * HOUR), "u-004")
  if (s.status !== "CANCELLED" && reached("SHIPPED")) ev("SHIPPED", "Handed to courier", (shippedMs = t = t + 14 * HOUR))
  if (s.status !== "CANCELLED" && reached("DELIVERED")) ev("DELIVERED", "Delivered", (deliveredMs = t = t + (courier.service === "instant" ? 3 * HOUR : 40 * HOUR)))
  if (s.status === "RETURNED") ev("RETURNED", "Returned via support; refund issued", (t = t + 3 * DAY), ROFI_ID)
  let cancelledMs: number | null = null
  if (s.status === "CANCELLED")
    ev("CANCELLED", s.payment === "FAILED" ? "Payment failed; order cancelled" : "Payment window expired; stock released", (cancelledMs = s.payment === "FAILED" ? s.placedMs + 10 * 60_000 : expiresMs))

  // ---- shipment
  if (s.status !== "CANCELLED" && s.status !== "PENDING_PAYMENT") {
    const actual = s.lines.reduce((n, l) => n + l.variant.weightGrams * l.quantity, 0)
    const volumetric = s.lines.reduce((n, l) => n + Math.round(((l.variant.lengthCm ?? 0) * (l.variant.widthCm ?? 0) * (l.variant.heightCm ?? 0)) / 6) * l.quantity, 0)
    const shipStatus = s.status === "DELIVERED" || s.status === "RETURNED" ? "DELIVERED" : s.status === "SHIPPED" ? "IN_TRANSIT" : "PENDING"
    shipments.push({
      id: `sh-${s.key}`,
      orderId: id,
      courier: courier.courier,
      service: courier.service,
      provider: "biteship",
      externalId: shipStatus === "PENDING" ? null : `bs_${hex(s.key + 20, 16)}`,
      trackingNumber: shipStatus === "PENDING" ? null : `${courier.courier === "jne" ? "JP" : courier.courier === "sicepat" ? "00" : "GK-"}${String(1_000_000_000 + s.key * 104_729).slice(-10)}`,
      cost: courier.cost,
      weightGrams: Math.max(actual, volumetric),
      status: shipStatus,
      etaText: courier.eta,
      shippedAt: shippedMs ? iso(shippedMs) : null,
      deliveredAt: deliveredMs ? iso(deliveredMs) : null,
      createdAt: iso(paidMs ?? s.placedMs),
      updatedAt: iso(deliveredMs ?? shippedMs ?? paidMs ?? s.placedMs),
    })
  }

  // ---- refund (returns are handled by support; the admin issues the refund)
  if (s.payment === "REFUNDED") {
    refunds.push({ id: `rf-${s.key}`, paymentId: pay.id, amount: total, reason: "Returned via support chat", status: "SUCCEEDED", gatewayRef: `rf-${hex(s.key + 30, 12)}`, issuedById: ROFI_ID, createdAt: iso(t), updatedAt: iso(t + HOUR) })
    pay.updatedAt = iso(t + HOUR)
  }

  // ---- voucher redemption (only once the order is paid; unpaid orders release it)
  if (voucher && discount > 0 && paidMs) {
    voucherRedemptions.push({ id: `vr-${s.key}`, voucherId: voucher.id, userId: s.userId, orderId: id, amount: discount, createdAt: iso(paidMs) })
    voucher.usedCount += 1
  }

  orders.push({
    id,
    number: s.number,
    userId: s.userId,
    email: user.email,
    guestAccessToken: null,
    status: s.status,
    shipRecipient: address.recipient,
    shipPhone: address.phone,
    shipStreet: address.street,
    shipDistrict: address.district,
    shipCity: address.city,
    shipProvince: address.province,
    shipPostalCode: address.postalCode,
    shipAreaId: address.areaId,
    shipLatitude: address.latitude,
    shipLongitude: address.longitude,
    shipNotes: address.notes,
    subtotal,
    discount,
    shippingFee,
    tax,
    total,
    voucherId: voucher && discount > 0 ? voucher.id : null,
    voucherCode: voucher && discount > 0 ? voucher.code : null,
    expiresAt: iso(expiresMs),
    placedAt: iso(s.placedMs),
    paidAt: paidMs ? iso(paidMs) : null,
    cancelledAt: cancelledMs ? iso(cancelledMs) : null,
    updatedAt: iso(Math.max(...events.map((e) => Date.parse(e.createdAt)))),
  })
  orderItems.push(...items)
  orderEvents.push(...events)
  payments.push(pay)
  return { id, items, deliveredMs }
}

const live = products.filter((p) => p.status === "ACTIVE")
const line = (product: Product, quantity = 1, variantIndex = 0): Line => ({ product, variant: product.variants[variantIndex] ?? product.variants[0], quantity })
const inStockVariant = (p: Product, qty: number) => p.variants.find((v) => v.stock - v.reserved >= qty)

const customers = users.filter((u) => u.role === "CUSTOMER" && u.status !== "INVITED")
let key = 1000

// ---------------------------------------------------------------------------
// 1. Rofi's orders
// ---------------------------------------------------------------------------

const pick = (i: number) => products[i % live.length]
buildOrder({ key: key++, number: "TT-260311", paymentNumber: "PAY-905120", userId: ROFI_ID, placedMs: Date.parse("2026-11-12T09:20:00Z"), lines: [line(pick(0)), line(pick(18))], status: "PROCESSING", payment: "PAID", method: "VIRTUAL_ACCOUNT", provider: "bca_va", courier: "jne-yes", shippingFee: 0, voucherCode: "TOKOTECH10" })
buildOrder({ key: key++, number: "TT-260207", paymentNumber: "PAY-904811", userId: ROFI_ID, placedMs: Date.parse("2026-11-02T14:05:00Z"), lines: [line(pick(9))], status: "SHIPPED", payment: "PAID", method: "QRIS", provider: "qris", courier: "sicepat-best", shippingFee: 25_000 })
buildOrder({ key: key++, number: "TT-259884", paymentNumber: "PAY-904302", userId: ROFI_ID, placedMs: Date.parse("2026-10-18T07:44:00Z"), lines: [line(pick(27)), line(pick(23), 2)], status: "DELIVERED", payment: "PAID", method: "EWALLET", provider: "gopay", courier: "gosend-instant", shippingFee: 18_000 })
buildOrder({ key: key++, number: "TT-259102", paymentNumber: "PAY-902977", userId: ROFI_ID, placedMs: Date.parse("2026-09-29T11:10:00Z"), lines: [line(pick(5))], status: "CANCELLED", payment: "EXPIRED", method: "VIRTUAL_ACCOUNT", provider: "mandiri_va", courier: "jne-reg" })

// ---------------------------------------------------------------------------
// 2. Recent store orders (one payment attempt each), newest first
// ---------------------------------------------------------------------------

const METHODS: PaymentMethod[] = ["QRIS", "VIRTUAL_ACCOUNT", "CREDIT_CARD", "EWALLET"]
const COURIER_KEYS: CourierKey[] = ["jne-reg", "jne-reg", "sicepat-best", "jne-yes", "gosend-instant"]

for (let i = 0; i < 48; i++) {
  const r = rng(i + 101)
  const u = customers[Math.floor(r() * customers.length)]
  let method = METHODS[Math.floor(r() * METHODS.length)]
  const provider = PROVIDERS[method][Math.floor(r() * PROVIDERS[method].length)]
  // Spread over the last 30 days (the newest three stay inside their 24h payment window)
  const placedMs = MOCK_NOW - (i < 3 ? i * 7 : i * 15) * HOUR - Math.floor(r() * HOUR)
  const ageMs = MOCK_NOW - placedMs
  const roll = r()

  // Outcome: the newest three are still awaiting payment; two are forced failures.
  let payment: PaymentStatus =
    i < 3 ? "PENDING" : i === 11 || i === 27 ? "FAILED" : roll < 0.78 ? "PAID" : roll < 0.88 ? "EXPIRED" : roll < 0.95 ? "REFUNDED" : "FAILED"
  if (payment === "PENDING") method = "VIRTUAL_ACCOUNT" // only VA windows (24h) are still open this long after placing
  if (payment === "REFUNDED" && ageMs < 5 * DAY) payment = "PAID" // too recent to have been returned
  const status: OrderStatus =
    payment === "PENDING" ? "PENDING_PAYMENT"
    : payment === "FAILED" || payment === "EXPIRED" ? "CANCELLED"
    : payment === "REFUNDED" ? "RETURNED"
    : ageMs < 1 * DAY ? "PAID" : ageMs < 2 * DAY ? "PROCESSING" : ageMs < 4 * DAY ? "SHIPPED" : "DELIVERED"

  // 1–3 distinct products; pending orders only take units that are actually available
  const n = 1 + Math.floor(r() * 3)
  const lines: Line[] = []
  for (let k = 0; k < n * 3 && lines.length < n; k++) {
    const p = live[Math.floor(r() * live.length)]
    if (lines.some((l) => l.product.id === p.id)) continue
    const qty = p.priceFrom < 1_000_000 && r() < 0.3 ? 2 : 1
    const v = status === "PENDING_PAYMENT" ? inStockVariant(p, qty) : p.variants[Math.floor(r() * p.variants.length)]
    if (!v) continue
    lines.push({ product: p, variant: v, quantity: qty })
    if (status === "PENDING_PAYMENT") v.reserved += qty
  }

  buildOrder({
    key: key++,
    number: `TT-${260_480 - i * 3}`,
    paymentNumber: `PAY-${908_412 - i * 37}`,
    userId: u.id,
    placedMs,
    lines,
    status,
    payment,
    method,
    provider: method === "VIRTUAL_ACCOUNT" && !PROVIDERS.VIRTUAL_ACCOUNT.includes(provider) ? "bca_va" : provider,
    courier: COURIER_KEYS[Math.floor(r() * COURIER_KEYS.length)],
    voucherCode: i % 7 === 0 ? "TOKOTECH10" : i % 11 === 5 ? "GRATISONGKIR" : undefined,
  })
}

// ---------------------------------------------------------------------------
// 3. Purchase history + buyer-only reviews
// ---------------------------------------------------------------------------

const TEMPLATES: { rating: number; title: string; body: string }[] = [
  { rating: 5, title: "Exactly as described", body: "Arrived in two days, well packed, and works perfectly. Build quality is excellent for the price." },
  { rating: 5, title: "Huge upgrade", body: "Coming from an older model this is a night-and-day difference. Setup took five minutes." },
  { rating: 4, title: "Great, one small gripe", body: "Performance is fantastic. The companion software could be simpler, but it's not a dealbreaker." },
  { rating: 5, title: "Fast shipping, genuine item", body: "Official warranty card included. Customer service answered my question within an hour." },
  { rating: 4, title: "Solid value", body: "Does everything I need for work and some gaming at night. Would buy from TokoTech again." },
  { rating: 3, title: "Good but pricey", body: "Quality is good, though I found it a bit expensive. Waiting for the next flash sale might be smart." },
]
const REVIEWS_PER_PRODUCT = 3

// Who reviews what: three distinct customers per live product.
const wants = new Map<string, Product[]>()
live.forEach((p, pi) => {
  for (let j = 0; j < REVIEWS_PER_PRODUCT; j++) {
    const u = customers[(pi + j * 5) % customers.length]
    wants.set(u.id, [...(wants.get(u.id) ?? []), p])
  }
})

export const reviews: Review[] = []
let historyN = 0
let reviewN = 0
for (const [userId, bought] of wants) {
  for (let c = 0; c < bought.length; c += 3) {
    const r = rng(historyN + 701)
    const placedMs = MOCK_NOW - Math.floor(35 + r() * 75) * DAY - Math.floor(r() * 12) * HOUR
    const chunk = bought.slice(c, c + 3)
    const { items, deliveredMs } = buildOrder({
      key: key++,
      number: `TT-${258_100 + historyN * 13}`,
      paymentNumber: `PAY-${901_000 + historyN * 11}`,
      userId,
      placedMs,
      lines: chunk.map((p) => line(p, 1, Math.floor(r() * p.variants.length))),
      status: "DELIVERED",
      payment: "PAID",
      method: METHODS[historyN % METHODS.length],
      provider: PROVIDERS[METHODS[historyN % METHODS.length]][historyN % 2 ? 0 : PROVIDERS[METHODS[historyN % METHODS.length]].length - 1],
      courier: COURIER_KEYS[historyN % COURIER_KEYS.length],
    })
    historyN++

    for (const item of items) {
      const n = reviewN++
      const t = TEMPLATES[n % TEMPLATES.length]
      const createdMs = deliveredMs! + (2 + (n % 8)) * DAY
      // Moderation: most are published; a few wait in the queue; one was hidden.
      const status: ReviewStatus = n % 23 === 7 ? "HIDDEN" : n % 11 === 4 || createdMs > MOCK_NOW - 2 * DAY ? "PENDING" : "PUBLISHED"
      const moderated = status !== "PENDING"
      reviews.push({
        id: `rv-${n + 1}`,
        productId: item.productId,
        userId,
        orderItemId: item.id,
        rating: t.rating,
        title: t.title,
        body: t.body,
        status,
        moderatedById: moderated ? (n % 2 ? ROFI_ID : "u-008") : null,
        moderatedAt: moderated ? iso(createdMs + 6 * HOUR) : null,
        moderationNote: status === "HIDDEN" ? "Contains a phone number; asked the customer to repost without it" : null,
        createdAt: iso(Math.min(createdMs, MOCK_NOW - HOUR)),
        updatedAt: iso(Math.min(createdMs + 6 * HOUR, MOCK_NOW - HOUR)),
      })
    }
  }
}

// Newest first, like the Prisma queries will return them
orders.sort((a, b) => b.placedAt.localeCompare(a.placedAt))
payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

// ---------------------------------------------------------------------------
// Flash sale (home page row): today's deals on the most-discounted products
// ---------------------------------------------------------------------------

export const flashSales: FlashSale[] = [
  { id: "fs-2026-11-16", name: "Daily Flash Sale", startsAt: iso(MOCK_NOW), endsAt: iso(MOCK_NOW + DAY), isActive: true, createdAt: iso(MOCK_NOW - 3 * DAY) },
]
export const flashSaleItems: FlashSaleItem[] = live
  .filter((p) => p.compareAtFrom)
  .sort((a, b) => b.compareAtFrom! / b.priceFrom - a.compareAtFrom! / a.priceFrom)
  .slice(0, 10)
  .map((p, i) => {
    const v = p.variants.find((x) => x.price === p.priceFrom)!
    const quota = 10 + (i % 3) * 10
    // salePrice = the discounted price already on the variant; compareAtPrice is the normal price
    return { id: `fsi-${i + 1}`, flashSaleId: "fs-2026-11-16", variantId: v.id, salePrice: v.price, quota, sold: Math.floor(quota * (0.35 + (i % 4) * 0.15)) }
  })

// ---------------------------------------------------------------------------
// Stock ledger: opening balance per variant, plus holds for unpaid orders.
// Σ delta per variant = stock − reserved (what can still be sold).
// ---------------------------------------------------------------------------

export const inventoryMovements: InventoryMovement[] = []
for (const p of products)
  for (const v of p.variants) {
    if (v.stock > 0)
      inventoryMovements.push({ id: `im-${v.id}-open`, variantId: v.id, delta: v.stock, reason: "RESTOCK", orderId: null, actorId: "u-004", note: "Opening balance", createdAt: iso(MOCK_NOW - 30 * DAY) })
  }
for (const o of orders.filter((x) => x.status === "PENDING_PAYMENT"))
  for (const it of orderItems.filter((x) => x.orderId === o.id))
    inventoryMovements.push({ id: `im-${it.id}-hold`, variantId: it.variantId!, delta: -it.quantity, reason: "RESERVATION", orderId: o.id, actorId: null, note: `Held until ${o.expiresAt}`, createdAt: o.placedAt })

// Reservations changed `reserved`, so refresh the denormalized product fields.
for (const p of products) syncDenormalized(p)

// ---------------------------------------------------------------------------
// Admin audit trail (a few recent writes)
// ---------------------------------------------------------------------------

export const auditLogs = [
  { id: "al-1", actorId: ROFI_ID, action: "product.update", entity: "Product", entityId: "p-001", changes: { priceFrom: [15_499_000, 14_999_000] }, createdAt: iso(MOCK_NOW - 2 * DAY) },
  { id: "al-2", actorId: ROFI_ID, action: "user.role_change", entity: "User", entityId: "u-004", changes: { role: ["CUSTOMER", "STAFF"] }, createdAt: iso(MOCK_NOW - 9 * DAY) },
  { id: "al-3", actorId: "u-008", action: "voucher.deactivate", entity: "Voucher", entityId: "vc-hemat100", changes: { isActive: [true, false] }, createdAt: iso(Date.UTC(2026, 10, 1)) },
]

export const newsletterSubscribers = [
  { id: "ns-1", email: "rofi@example.com", confirmedAt: iso(MOCK_NOW - 200 * DAY), unsubscribedAt: null, createdAt: iso(MOCK_NOW - 200 * DAY) },
  { id: "ns-2", email: "siti.n@example.com", confirmedAt: iso(MOCK_NOW - 90 * DAY), unsubscribedAt: null, createdAt: iso(MOCK_NOW - 90 * DAY) },
  { id: "ns-3", email: "budi.s@example.com", confirmedAt: null, unsubscribedAt: null, createdAt: iso(MOCK_NOW - 3 * DAY) },
]

