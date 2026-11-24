"use client"

import { useState, useTransition } from "react"
import { Tag } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/format"
import { checkVoucher } from "@/lib/actions/voucher"
import { voucherDiscount } from "@/lib/pricing"
import { useVoucher } from "@/stores"
import { cn } from "@/lib/utils"
import { useDict } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"

/** Store-paid free JNE REG above this subtotal (mirrors lib/orders/checkout.ts). */
export const FREE_SHIPPING_MIN = 1_000_000

export function getTotals(subtotal: number, savings: number, voucher = 0, shipping?: number) {
  const ship = shipping ?? (subtotal >= FREE_SHIPPING_MIN || subtotal === 0 ? 0 : 25_000)
  return { subtotal, savings, voucher, shipping: ship, total: Math.max(0, subtotal - voucher + ship) }
}

export function OrderSummary({
  subtotal,
  savings,
  shipping,
  itemCount,
  children,
  showVoucher = true,
  className,
}: {
  subtotal: number
  savings: number
  shipping?: number
  itemCount: number
  children?: React.ReactNode
  showVoucher?: boolean
  className?: string
}) {
  const [code, setCode] = useState("")
  const rule = useVoucher((s) => s.rule)
  const setRule = useVoucher((s) => s.set)
  const [error, setError] = useState("")
  const [checking, startCheck] = useTransition()
  // The server validates the code once; the discount then follows the subtotal (and min-spend) locally.
  const eligible = !!rule && subtotal >= rule.minSubtotal
  const voucher = rule && eligible ? { code: rule.code, type: rule.type, amount: voucherDiscount(rule, subtotal) } : null
  const t = useDict()
  const tot = getTotals(subtotal, savings, voucher?.amount ?? 0, voucher?.type === "FREE_SHIPPING" ? 0 : shipping)

  return (
    <div className={cn("rounded-2xl border bg-card p-5", className)}>
      <h2 className="text-base font-medium">{t.summary.title}</h2>

      {showVoucher && (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault()
            startCheck(async () => {
              const res = await checkVoucher(code)
              setRule(res.ok ? res.rule : null)
              setError(res.ok ? "" : t.summary.errors[res.reason])
            })
          }}
        >
          <label htmlFor="voucher" className="text-xs text-muted-foreground">
            {t.summary.voucherCode}
          </label>
          <div className="mt-1 flex gap-2">
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="voucher"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t.summary.voucherPlaceholder}
                className="h-10 pl-9 uppercase placeholder:normal-case"
                aria-invalid={!!error}
              />
            </div>
            <Button type="submit" variant="outline" className="h-10" disabled={checking}>
              {t.summary.apply}
            </Button>
          </div>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          {voucher && (
            <p className="mt-1 text-xs text-success">
              {fmt(t.summary.applied, { code: voucher.code })}{voucher.type === "FREE_SHIPPING" && t.summary.freeShippingApplied}
            </p>
          )}
          {rule && !eligible && (
            <p className="mt-1 text-xs text-destructive">
              {fmt(t.summary.minSpend, { code: rule.code, amount: formatPrice(rule.minSubtotal) })}
            </p>
          )}
        </form>
      )}

      <dl className="mt-5 space-y-2.5 text-sm">
        <Row label={fmt(t.summary.subtotalItems, { n: itemCount })} value={formatPrice(tot.subtotal)} />
        {tot.savings > 0 && <Row label={t.summary.youSave} value={`- ${formatPrice(tot.savings)}`} className="text-success" />}
        {tot.voucher > 0 && <Row label={t.common.voucher} value={`- ${formatPrice(tot.voucher)}`} className="text-success" />}
        <Row label={t.common.shipping} value={tot.shipping === 0 ? t.common.free : formatPrice(tot.shipping)} />
      </dl>
      {subtotal > 0 && subtotal < FREE_SHIPPING_MIN && shipping === undefined && (
        <p className="mt-3 rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
          {fmt(t.summary.addMore, { amount: formatPrice(FREE_SHIPPING_MIN - subtotal) })}
        </p>
      )}
      <Separator className="my-4" />
      <div className="flex items-baseline justify-between">
        <span className="font-medium">{t.common.total}</span>
        <span className="text-xl font-semibold text-primary tabular-nums">{formatPrice(tot.total)}</span>
      </div>
      <p className="mt-1 text-right text-[11px] text-muted-foreground">{t.summary.vat}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex justify-between gap-4", className)}>
      <dt className={cn(!className && "text-muted-foreground")}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
