"use server"
import { db } from "@/lib/db"
import { currentCart } from "@/lib/cart"
import { getSessionUser } from "@/lib/auth/session"

import {
  CheckoutError,
  placeOrder,
  priceCart,
  shippingOptions,
  type CheckoutAddress,
} from "@/lib/orders/checkout"
import {
  applyPaymentStatus,
  invalidateOrderCaches,
} from "@/lib/orders/settle"
import {
  createSnapTransaction,
  midtransEnabled,
} from "@/lib/payments/midtrans"
import {
  orderUrl,
  sendOrderPlaced,
} from "@/lib/email"
import type { PaymentMethod } from "@/lib/types"
import error from "@/app/[lang]/(shop)/error"

const appUrl = () =>
  process.env.APP_URL ?? "http://localhost:3000"

const METHODS: PaymentMethod[] = [
  "QRIS",
  "VIRTUAL_ACCOUNT",
  "CREDIT_CARD",
  "EWALLET",
]
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export type CheckoutDefaults = {
  signedIn: boolean
  email: string
  address: CheckoutAddress | null
}
export async function getCheckoutDefaultsAction(): Promise<CheckoutDefaults> {
    const user = await getSessionUser()
    if (!user) {
  return {
    signedIn: false,
    email: "",
    address: null,
  }
}
const a = await db.address.findFirst({
  where: { userId: user.id },
  orderBy: [
    { isDefault: "desc" },
    { createdAt: "asc" },
  ],
})
return {
  signedIn: true,
  email: user.email ?? "",
  address: a
    ? {
        recipient: a.recipient,
        phone: a.phone,
        street: a.street,
        district: a.district,
        city: a.city,
        province: a.province,
        postalCode: a.postalCode,
        notes: a.notes,
        areaId: a.areaId,
        latitude: a.latitude,
        longitude: a.longitude,
      }
    : null,
}
}
export type RateOption = {
  id: string
  label: string
  eta: string
  price: number
  cost: number
}
export async function quoteShippingAction(
  postalCode: string
): Promise<{ rates: RateOption[]; error?: string }> {
    if (!/^\d{5}$/.test(postalCode)) {
  return {
    rates: [],
    error: "Enter a 5-digit postal code",
  }
}
const cart = await currentCart()
if (!cart) {
  return {
    rates: [],
    error: "Your cart is empty",
  }
}
const lines = await priceCart(cart.id)
if (!lines.length) {
  return {
    rates: [],
    error: "Your cart is empty",
  }
}
const options = await shippingOptions(lines, {
  postalCode,
})
return {
  rates: options.map(
    ({ id, label, eta, price, cost }) => ({
      id,
      label,
      eta,
      price,
      cost,
    })
  ),
}
}
function cleanAddress(
  raw: Partial<CheckoutAddress>
): {
  address?: CheckoutAddress
  errors: Record<string, string>
} {
  const s = (v: unknown, max = 200) =>
    typeof v === "string"
      ? v.trim().slice(0, max)
      : ""

  return { errors: {} }
  const address: CheckoutAddress = {
  recipient: s(raw.recipient, 80),
  phone: s(raw.phone, 20),
  street: s(raw.street),
  district: s(raw.district, 80),
  city: s(raw.city, 80),
  province: s(raw.province, 80),
  postalCode: s(raw.postalCode, 5),
  notes: s(raw.notes, 200) || null,
}
notes: s(raw.notes, 200) || null
const errors: Record<string, string> = {}
if (address.recipient.length < 2) {
  errors.recipient = "Enter the recipient's name"
}
if (!/^[0-9+\s-]{9,20}$/.test(address.phone)) {
  errors.phone = "Enter a valid phone number"
}
if (address.district.length < 2) {
  errors.district = "Enter the district (kecamatan)"
}
if (!address.city) {
  errors.city = "Enter a city"
}

if (!address.province) {
  errors.province = "Choose a province"
}
if (!/^\d{5}$/.test(address.postalCode)) {
  errors.postalCode = "Postal code must be 5 digits"
}
return {
  address: Object.keys(errors).length
    ? undefined
    : address,
  errors,
}
}
export type PlaceOrderResult =
  | { ok: true; redirect: string }
  | {
      ok: false
      error?: string
      fieldErrors?: Record<string, string>
    }
    
export async function placeOrderAction(input: {
  email?: string
  address: Partial<CheckoutAddress>
  rateId: string
  method: PaymentMethod
  voucherCode?: string | null
  saveAddress?: boolean
}): Promise<PlaceOrderResult> {