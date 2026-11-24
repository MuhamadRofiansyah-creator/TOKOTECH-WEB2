// Pricing rules shared by the client (live totals) and the server (Phase 3 checkout re-prices).

import type { Voucher } from "@/lib/types"

/** The parts of a Voucher needed to price it (what checkVoucher() returns to the browser). */
export type VoucherRule = Pick<Voucher, "code" | "type" | "value" | "maxDiscount" | "minSubtotal">

/** Goods discount for a subtotal; FREE_SHIPPING discounts shipping instead, so 0 here. */
export function voucherDiscount(rule: VoucherRule, subtotal: number) {
  if (subtotal < rule.minSubtotal) return 0
  if (rule.type === "PERCENT") return Math.min(rule.maxDiscount ?? Infinity, Math.round((subtotal * rule.value) / 100))
  if (rule.type === "FIXED") return Math.min(rule.value, subtotal)
  return 0
}
