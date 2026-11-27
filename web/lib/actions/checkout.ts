
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

// Konfigurasi URL aplikasi
const appUrl = () =>
  process.env.APP_URL ?? "http://localhost:3000"

// Metode pembayaran yang tersedia
const METHODS: PaymentMethod[] = [
  "QRIS",
  "VIRTUAL_ACCOUNT",
  "CREDIT_CARD",
  "EWALLET",
]

// Validasi format email
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ==============================
// CHECKOUT DEFAULTS
// ==============================

export type CheckoutDefaults = {
  signedIn: boolean
  email: string
  address: CheckoutAddress | null
}

// Mengambil data pengguna dan alamat default
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

// ==============================
// SHIPPING OPTIONS
// ==============================

export type RateOption = {
  id: string
  label: string
  eta: string
  price: number
  cost: number
}

// Menghitung pilihan dan biaya pengiriman
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

// ==============================
// ADDRESS VALIDATION
// ==============================

// Membersihkan dan memvalidasi alamat
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

  const errors: Record<string, string> = {}

  if (address.recipient.length < 2) {
    errors.recipient = "Enter the recipient's name"
  }

  if (!/^[0-9+\s-]{9,20}$/.test(address.phone)) {
    errors.phone = "Enter a valid phone number"
  }

  if (address.street.length < 5) {
    errors.street = "Enter a street address"
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

// ==============================
// PLACE ORDER
// ==============================

export type PlaceOrderResult =
  | { ok: true; redirect: string }
  | {
      ok: false
      error?: string
      fieldErrors?: Record<string, string>
    }

// Membuat pesanan dan memproses pembayaran
export async function placeOrderAction(input: {
  email?: string
  address: Partial<CheckoutAddress>
  rateId: string
  method: PaymentMethod
  voucherCode?: string | null
  saveAddress?: boolean
}): Promise<PlaceOrderResult> {

  const user = await getSessionUser()

  const email = (
    user?.email ?? input.email ?? ""
  ).trim().toLowerCase()

  const { address, errors } = cleanAddress(
    input.address ?? {}
  )

  if (!EMAIL.test(email)) {
    errors.email = "Enter a valid email for your receipt"
  }

  if (!METHODS.includes(input.method)) {
    return {
      ok: false,
      error: "Choose a payment method",
    }
  }

  if (!address || errors.email) {
    return {
      ok: false,
      fieldErrors: errors,
    }
  }

  // Memeriksa keranjang belanja
  const cart = await currentCart()

  if (!cart) {
    return {
      ok: false,
      error: "Your cart is empty",
    }
  }

  // Membuat pesanan
  let placed: Awaited<ReturnType<typeof placeOrder>>

  try {
    placed = await placeOrder(
      cart.id,
      user?.id ?? null,
      {
        email,
        address,
        rateId: input.rateId,
        method: input.method,
        voucherCode: input.voucherCode,
      }
    )
  } catch (e) {
    if (e instanceof CheckoutError) {
      return {
        ok: false,
        error: e.message,
      }
    }

    console.error(e)

    return {
      ok: false,
      error: "We couldn't place your order. Nothing was charged; please try again.",
    }
  }

  const { order, payment } = placed

  // Menyimpan alamat pengguna
  if (user) {
    const count = await db.address.count({
      where: { userId: user.id },
    })

    if (count === 0 || input.saveAddress) {
      await db.address.create({
        data: {
          userId: user.id,
          label: count === 0 ? "Home" : "Address",
          ...address,
          isDefault: count === 0,
        },
      })
    }
  }

  // Menyiapkan URL pembayaran
  const mockPath =
    `/checkout/pay/${payment.number}` +
    (order.guestAccessToken
      ? `?t=${order.guestAccessToken}`
      : "")

  let redirect = mockPath
  let payUrl = `${appUrl()}${mockPath}`

  // Integrasi pembayaran Midtrans
  if (midtransEnabled()) {
    try {
      const items = order.items.map((i) => ({
        id: i.sku,
        name: `${i.productName} (${i.variantName})`,
        price: i.unitPrice,
        quantity: i.quantity,
      }))

      if (order.shippingFee) {
        items.push({
          id: "SHIPPING",
          name: `Shipping (${placed.shippingLabel})`,
          price: order.shippingFee,
          quantity: 1,
        })
      }

      if (order.discount) {
        items.push({
          id: "DISCOUNT",
          name: `Voucher ${order.voucherCode ?? ""}`.trim(),
          price: -order.discount,
          quantity: 1,
        })
      }

      const snap = await createSnapTransaction({
        paymentNumber: payment.number,
        amount: order.total,
        method: input.method,
        customer: {
          name: address.recipient,
          email,
          phone: address.phone,
        },
        items,
        finishUrl: orderUrl(order),
      })

      await db.payment.update({
        where: { id: payment.id },
        data: {
          snapToken: snap.token,
          redirectUrl: snap.redirectUrl,
        },
      })

      payUrl = snap.redirectUrl
      redirect = snap.redirectUrl

    } catch (e) {
      console.error(e)

      await applyPaymentStatus(
        payment.number,
        "FAILED"
      )

      return {
        ok: false,
        error: "The payment provider didn't respond. Your order was cancelled and nothing was charged; please try again.",
      }
    }
  }

  // Memperbarui cache pesanan
  invalidateOrderCaches(user?.id ?? null)

  // Mengirim email konfirmasi pesanan
  await sendOrderPlaced(
    order,
    order.items,
    payUrl,
    order.expiresAt
  )

  return {
    ok: true,
    redirect,
  }
}

// ==============================
// SIMULATE PAYMENT
// ==============================

/**
 * Simulasi pembayaran hanya digunakan
 * ketika Midtrans belum dikonfigurasi.
 */
export async function simulatePaymentAction(
  paymentNumber: string,
  token: string | null,
  outcome: "PAID" | "FAILED"
): Promise<{ redirect: string } | { error: string }> {

  if (midtransEnabled()) {
    return {
      error: "Payments are handled by Midtrans",
    }
  }

  // Mengambil data pembayaran
  const payment = await db.payment.findUnique({
    where: { number: paymentNumber },
    include: { order: true },
  })

  const user = await getSessionUser()

  // Memeriksa kepemilikan pesanan
  const owner =
    payment &&
    (payment.order.userId
      ? payment.order.userId === user?.id
      : payment.order.guestAccessToken === token)

  if (!payment || !owner) {
    return {
      error: "Payment not found",
    }
  }

  // Memeriksa status pembayaran
  if (payment.status !== "PENDING") {
    return {
      redirect: orderUrl(payment.order).replace(
        appUrl(),
        ""
      ),
    }
  }

  // Memperbarui status pembayaran
  await applyPaymentStatus(
    paymentNumber,
    outcome,
    {
      transactionId: `mock-${paymentNumber}`,
      fee:
        outcome === "PAID"
          ? Math.round(payment.amount * 0.007)
          : 0,
    }
  )

  return {
    redirect: orderUrl(payment.order).replace(
      appUrl(),
      ""
    ),
  }
}
