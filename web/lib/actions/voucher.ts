"use server"

import { db } from "@/lib/db"
import type { VoucherRule } from "@/lib/pricing"

export type VoucherError = "empty" | "invalid" | "expired" | "notActive" | "exhausted"
export type VoucherCheck = { ok: true; rule: VoucherRule } | { ok: false; reason: VoucherError }

/**
 * Validate a voucher code for the cart. Returns the rule so the browser can keep the
 * discount in step with the subtotal. Phase 3 re-validates (per-user limit included)
 * inside the checkout transaction.
 */
export async function checkVoucher(input: string): Promise<VoucherCheck> {
  const code = input.trim().toUpperCase().slice(0, 40)
  if (!code) return { ok: false, reason: "empty" }
  const v = await db.voucher.findUnique({ where: { code } })
  if (!v) return { ok: false, reason: "invalid" }
  const now = new Date()
  if (!v.isActive || (v.endsAt && v.endsAt < now)) return { ok: false, reason: "expired" }
  if (v.startsAt && v.startsAt > now) return { ok: false, reason: "notActive" }
  if (v.usageLimit != null && v.usedCount >= v.usageLimit) return { ok: false, reason: "exhausted" }
  return { ok: true, rule: { code: v.code, type: v.type, value: v.value, maxDiscount: v.maxDiscount, minSubtotal: v.minSubtotal } }
}
