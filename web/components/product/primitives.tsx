"use client"

import { Star } from "lucide-react"
import type { Brand, ProductBadge } from "@/lib/types"
import { brandMark, discountPercent, formatCount, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useDict } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"

export function Price({
  price,
  compareAt,
  from,
  size = "md",
  className,
}: {
  price: number
  compareAt?: number | null
  /** Variants have different prices: show "From" */
  from?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const t = useDict()
  const off = discountPercent(price, compareAt)
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span
        className={cn(
          "font-medium text-primary tabular-nums",
          size === "sm" && "text-sm",
          size === "md" && "text-[15px]",
          size === "lg" && "text-2xl font-semibold sm:text-3xl",
        )}
      >
        {from && <span className="mr-1 text-xs font-normal text-muted-foreground">{t.product.from}</span>}
        {formatPrice(price)}
      </span>
      {off > 0 && (
        <>
          <span className={cn("text-muted-foreground line-through tabular-nums", size === "lg" ? "text-base" : "text-xs")}>
            {formatPrice(compareAt!)}
          </span>
          {size === "lg" && (
            <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive">-{off}%</span>
          )}
        </>
      )}
    </div>
  )
}

export function Rating({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number
  count?: number
  size?: "sm" | "md"
  className?: string
}) {
  const t = useDict()
  return (
    <div className={cn("flex items-center gap-1 text-muted-foreground", size === "sm" ? "text-xs" : "text-sm", className)}>
      <span className="flex" aria-label={fmt(t.product.rated, { value })}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              size === "sm" ? "size-3" : "size-4",
              i < Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30",
            )}
          />
        ))}
      </span>
      <span className="font-medium text-foreground">{value.toFixed(1)}</span>
      {count != null && <span>({formatCount(count)})</span>}
    </div>
  )
}

export function StockNote({ stock, className }: { stock: number; className?: string }) {
  const t = useDict()
  if (stock === 0) return <span className={cn("text-[11px] font-medium text-muted-foreground", className)}>{t.product.preorder}</span>
  if (stock <= 15)
    return <span className={cn("text-[11px] font-medium text-destructive", className)}>{fmt(t.product.left, { n: stock })}</span>
  return <span className={cn("text-[11px] font-medium text-success", className)}>{t.product.inStock}</span>
}

const BADGE_STYLES: Record<ProductBadge, { label: string; className: string }> = {
  new: { label: "New Arrival", className: "bg-primary text-primary-foreground" },
  sale: { label: "Sale", className: "bg-destructive text-white" },
  bestseller: { label: "Best Seller", className: "bg-amber-400 text-amber-950" },
  preorder: { label: "Pre-order", className: "bg-slate-800 text-white" },
}

export function ProductBadges({
  badges,
  discount,
  className,
}: {
  badges: ProductBadge[]
  discount?: number
  className?: string
}) {
  const t = useDict()
  if (!badges.length) return null
  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      {badges.map((b) => (
        <span
          key={b}
          className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none", BADGE_STYLES[b].className)}
        >
          <span className="size-1 rounded-full bg-current opacity-80" />
          {b === "sale" && discount ? `-${discount}%` : t.product.badges[b]}
        </span>
      ))}
    </div>
  )
}

export function BrandMark({ brand, className }: { brand: Brand; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-7 items-center justify-center rounded px-1 text-[9px] font-bold tracking-tight text-white",
        className,
      )}
      style={{ backgroundColor: brand.color ?? "#334155" }}
      aria-hidden
    >
      {brandMark(brand.name)}
    </span>
  )
}

export function SpecChips({ specs, max = 3, className }: { specs: Record<string, string>; max?: number; className?: string }) {
  const values = Object.values(specs).filter((v) => v && v !== "—").slice(0, max)
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {values.map((v) => (
        <span key={v} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {v}
        </span>
      ))}
    </div>
  )
}
