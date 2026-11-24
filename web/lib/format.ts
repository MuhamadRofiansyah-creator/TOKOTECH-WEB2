const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})

/** Single source of truth for price formatting. */
export function formatPrice(value: number) {
  return idr.format(value).replace(/ /g, " ")
}

/** Compact form for slider labels: Rp 1,5 jt */
export function formatPriceShort(value: number) {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`
  if (value >= 1_000) return `Rp ${Math.round(value / 1_000)} rb`
  return `Rp ${value}`
}

export function discountPercent(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return 0
  return Math.round((1 - price / compareAt) * 100)
}

export function formatDate(iso: string, locale: "en" | "id" = "en") {
  return new Date(iso).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n)
}

/** Axis/KPI compact form: Rp 120 jt, Rp 1,2 M */
export function compactIDR(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`
  if (n >= 1_000_000) return `Rp ${Math.round(n / 1_000_000).toLocaleString("id-ID")} jt`
  if (n >= 1_000) return `Rp ${Math.round(n / 1_000)} rb`
  return `Rp ${n}`
}

// ---------------------------------------------------------------------------
// Labels for stored codes (enums and gateway/courier codes stay machine-readable
// in the database; these are the only place they turn into display text).
// ---------------------------------------------------------------------------

const PROVIDERS: Record<string, string> = {
  qris: "QRIS",
  bca_va: "BCA VA",
  mandiri_va: "Mandiri VA",
  bni_va: "BNI VA",
  bri_va: "BRI VA",
  visa: "Visa",
  mastercard: "Mastercard",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
}
export const providerLabel = (code: string) => PROVIDERS[code] ?? code

export const PAYMENT_METHOD_LABEL = {
  QRIS: "QRIS",
  VIRTUAL_ACCOUNT: "Virtual account",
  CREDIT_CARD: "Credit card",
  EWALLET: "E-wallet",
} as const

const COURIERS: Record<string, string> = { jne: "JNE", sicepat: "SiCepat", gosend: "GoSend", jnt: "J&T", anteraja: "AnterAja", grab: "GrabExpress" }
/** ("jne", "yes") → "JNE YES"; ("gosend", "instant") → "GoSend Instant" */
export function courierLabel(courier: string, service: string) {
  const s = service.length <= 4 ? service.toUpperCase() : service[0].toUpperCase() + service.slice(1)
  return `${COURIERS[courier] ?? courier} ${s}`
}

/** Wordmark for the generated brand badge: "MSI", "SteelSeries" → "SS", "Logitech" → "LO". */
export function brandMark(name: string) {
  if (name.length <= 3) return name.toUpperCase()
  const caps = name.match(/[A-Z]/g) ?? []
  if (caps.length >= 2 && caps.length < name.length) return caps.slice(0, 2).join("")
  return name.slice(0, 2).toUpperCase()
}
