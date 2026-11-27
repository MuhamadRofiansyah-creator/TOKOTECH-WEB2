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