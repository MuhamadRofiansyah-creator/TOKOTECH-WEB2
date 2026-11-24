"use client"

import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDict } from "@/components/i18n/provider"

export function QuantityStepper({
  value,
  onChange,
  max = 99,
  size = "md",
  className,
}: {
  value: number
  onChange: (n: number) => void
  max?: number
  size?: "sm" | "md"
  className?: string
}) {
  const t = useDict()
  const btn = cn(
    "inline-flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40",
    size === "sm" ? "size-8" : "size-11",
  )
  return (
    <div className={cn("inline-flex items-center rounded-lg border bg-background", className)}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={t.common.decreaseQty}>
        <Minus className="size-4" />
      </button>
      <input
        value={value}
        inputMode="numeric"
        aria-label={t.common.quantity}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ""))
          if (n) onChange(Math.min(max, n))
        }}
        className={cn("bg-transparent text-center text-sm tabular-nums outline-none", size === "sm" ? "w-8" : "w-10")}
      />
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={t.common.increaseQty}>
        <Plus className="size-4" />
      </button>
    </div>
  )
}
