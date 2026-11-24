import "server-only"

// Courier rates and bookings through Biteship (https://biteship.com/id/docs).
//
// Safety: Biteship is only contacted when shippingMode() === "biteship":
//   - BITESHIP_API_KEY empty/blank        → mock rates + mock waybills, no network calls
//   - live key (biteship_live…)          → still mock, unless BITESHIP_ALLOW_LIVE="true"
//     (live rate lookups cost money and live bookings dispatch real couriers)
//   - testing key, or live + allowed      → real Biteship
// The low-level request helper re-checks the mode, so no code path can call Biteship by accident.

export type ShippingRate = {
  /** "<courier>:<service>", e.g. "jne:reg" */
  id: string
  courier: string
  service: string
  label: string
  eta: string
  price: number
  provider: "biteship" | "mock"
}

export type ParcelItem = {
  name: string
  value: number
  quantity: number
  weightGrams: number
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
}

export type Destination = { postalCode: string; areaId?: string | null; latitude?: number | null; longitude?: number | null }

const API = "https://api.biteship.com"
const COURIERS = "jne,sicepat,jnt,anteraja,gojek"
/** Warehouse (origin) postal code; Jakarta Selatan by default. */
const ORIGIN_POSTAL = process.env.WAREHOUSE_POSTAL_CODE ?? "12190"
const ORIGIN_COORDS = { latitude: -6.2146, longitude: 106.8213 }

const biteshipKey = () => (process.env.BITESHIP_API_KEY ?? "").trim()
let warnedLive = false

export function shippingMode(): "mock" | "biteship" {
  const key = biteshipKey()
  if (!key) return "mock"
  if (key.startsWith("biteship_live") && process.env.BITESHIP_ALLOW_LIVE !== "true") {
    if (!warnedLive) {
      console.warn('[shipping] Live Biteship key ignored: set BITESHIP_ALLOW_LIVE="true" to use it. Using mock rates and waybills.')
      warnedLive = true
    }
    return "mock"
  }
  return "biteship"
}

/** @deprecated use shippingMode() */
export const shippingProvider = shippingMode

/** Billed weight: max(actual, volumetric at 6000 cm³/kg), in grams. */
export function billedWeight(items: ParcelItem[]) {
  const actual = items.reduce((n, i) => n + i.weightGrams * i.quantity, 0)
  const volumetric = items.reduce((n, i) => n + Math.round(((i.lengthCm ?? 0) * (i.widthCm ?? 0) * (i.heightCm ?? 0)) / 6) * i.quantity, 0)
  return Math.max(actual, volumetric, 100)
}

async function biteship<T>(path: string, body: unknown): Promise<T> {
  // Second guard: never send a request unless the mode explicitly allows it
  if (shippingMode() !== "biteship") throw new Error("Biteship is disabled (mock mode)")
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: biteshipKey(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.success === false) throw new Error(`Biteship ${path} failed: ${json.error ?? res.status}`)
  return json as T
}

const SERVICE_LABELS: Record<string, string> = { gojek: "GoSend" }
const label = (courier: string, service: string, name?: string) =>
  `${SERVICE_LABELS[courier] ?? name ?? courier.toUpperCase()} ${service.length <= 4 ? service.toUpperCase() : service[0].toUpperCase() + service.slice(1)}`

/** Deterministic mock: price by billed kg and zone (Jabodetabek / Java / outside Java). */
function mockRates(dest: Destination, items: ParcelItem[]): ShippingRate[] {
  const kg = Math.ceil(billedWeight(items) / 1000)
  const p = dest.postalCode
  const zone = /^1[0-7]/.test(p) ? 0 : /^[1-6]/.test(p) ? 1 : 2
  const perKg = [9_000, 13_000, 24_000][zone]
  const rates: ShippingRate[] = [
    { id: "jne:reg", courier: "jne", service: "reg", label: "JNE REG", eta: ["1–2 days", "2–3 days", "3–5 days"][zone], price: perKg * kg + 9_000, provider: "mock" },
    { id: "sicepat:best", courier: "sicepat", service: "best", label: "SiCepat BEST", eta: ["Next day", "Next day", "2–3 days"][zone], price: Math.round(perKg * kg * 1.6) + 14_000, provider: "mock" },
    { id: "jnt:ez", courier: "jnt", service: "ez", label: "J&T EZ", eta: ["1–2 days", "2–3 days", "3–6 days"][zone], price: Math.round(perKg * kg * 0.95) + 8_000, provider: "mock" },
  ]
  if (zone === 0 && kg <= 20) rates.push({ id: "gojek:instant", courier: "gojek", service: "instant", label: "GoSend Instant", eta: "Today, 1–3 hours", price: 55_000 + kg * 2_500, provider: "mock" })
  return rates
}

type BiteshipRates = {
  pricing: { courier_code: string; courier_service_code: string; courier_name: string; duration: string; shipment_duration_range?: string; shipment_duration_unit?: string; price: number }[]
}

export async function quoteRates(dest: Destination, items: ParcelItem[]): Promise<ShippingRate[]> {
  if (shippingMode() !== "biteship") return mockRates(dest, items)
  try {
    const instant = dest.latitude != null && dest.longitude != null
    const data = await biteship<BiteshipRates>("/v1/rates/couriers", {
      origin_postal_code: Number(ORIGIN_POSTAL),
      destination_postal_code: Number(dest.postalCode),
      ...(dest.areaId ? { destination_area_id: dest.areaId } : {}),
      ...(instant ? { origin_latitude: ORIGIN_COORDS.latitude, origin_longitude: ORIGIN_COORDS.longitude, destination_latitude: dest.latitude, destination_longitude: dest.longitude } : {}),
      couriers: COURIERS,
      items: items.map((i) => ({
        name: i.name.slice(0, 60),
        value: i.value,
        quantity: i.quantity,
        weight: i.weightGrams,
        length: i.lengthCm ?? 1,
        width: i.widthCm ?? 1,
        height: i.heightCm ?? 1,
      })),
    })
    return data.pricing
      .map((r) => ({
        id: `${r.courier_code}:${r.courier_service_code}`,
        courier: r.courier_code,
        service: r.courier_service_code,
        label: label(r.courier_code, r.courier_service_code, r.courier_name),
        eta: r.shipment_duration_range ? `${r.shipment_duration_range} ${r.shipment_duration_unit ?? "days"}` : r.duration,
        price: r.price,
        provider: "biteship" as const,
      }))
      .sort((a, b) => a.price - b.price)
  } catch (e) {
    console.error(e)
    return mockRates(dest, items)
  }
}

export type BookedShipment = { externalId: string | null; trackingNumber: string | null; provider: "biteship" | "mock" }

/** Book a pickup for a paid order. Returns the aggregator id and waybill (resi). */
export async function bookShipment(input: {
  orderNumber: string
  courier: string
  service: string
  recipient: { name: string; phone: string; address: string; postalCode: string; latitude?: number | null; longitude?: number | null; note?: string | null }
  items: ParcelItem[]
}): Promise<BookedShipment> {
  if (shippingMode() !== "biteship") {
    const n = [...input.orderNumber].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
    return { externalId: `mock_${input.orderNumber}`, trackingNumber: `${input.courier.toUpperCase().slice(0, 2)}${String(n).padStart(10, "0").slice(0, 10)}`, provider: "mock" }
  }
  const data = await biteship<{ id: string; courier: { waybill_id?: string; tracking_id?: string } }>("/v1/orders", {
    reference_id: input.orderNumber,
    shipper_contact_name: "TokoTech",
    origin_contact_name: "TokoTech Warehouse",
    origin_contact_phone: process.env.WAREHOUSE_PHONE ?? "081200000000",
    origin_address: process.env.WAREHOUSE_ADDRESS ?? "Jl. Sudirman No. 1, Jakarta Selatan",
    origin_postal_code: Number(ORIGIN_POSTAL),
    origin_coordinate: ORIGIN_COORDS,
    destination_contact_name: input.recipient.name,
    destination_contact_phone: input.recipient.phone.replace(/\D/g, ""),
    destination_address: input.recipient.address,
    destination_postal_code: Number(input.recipient.postalCode),
    destination_note: input.recipient.note ?? undefined,
    ...(input.recipient.latitude != null ? { destination_coordinate: { latitude: input.recipient.latitude, longitude: input.recipient.longitude } } : {}),
    courier_company: input.courier,
    courier_type: input.service,
    delivery_type: "now",
    items: input.items.map((i) => ({ name: i.name.slice(0, 60), value: i.value, quantity: i.quantity, weight: i.weightGrams, length: i.lengthCm ?? 1, width: i.widthCm ?? 1, height: i.heightCm ?? 1 })),
  })
  return { externalId: data.id, trackingNumber: data.courier.waybill_id ?? data.courier.tracking_id ?? null, provider: "biteship" }
}

/** Biteship order status → our ShipmentStatus. */
export function mapBiteshipStatus(status: string) {
  switch (status) {
    case "picked":
      return "PICKED_UP" as const
    case "dropping_off":
    case "on_hold":
      return "IN_TRANSIT" as const
    case "delivered":
      return "DELIVERED" as const
    case "rejected":
    case "courier_not_found":
    case "cancelled":
    case "disposed":
      return "FAILED" as const
    case "returned":
    case "return_in_transit":
      return "RETURNED" as const
    default:
      return null
  }
}
