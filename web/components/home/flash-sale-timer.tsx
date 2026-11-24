"use client"

import { useEffect, useState } from "react"
import { useDict } from "@/components/i18n/provider"

/** Counts down to the next midnight (WIB-agnostic for the mock). */
export function FlashSaleTimer() {
  const t = useDict()
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const end = new Date(now)
      end.setHours(24, 0, 0, 0)
      setLeft(Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000)))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const parts = left == null ? ["--", "--", "--"] : [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60].map((n) => String(n).padStart(2, "0"))

  return (
    <div className="flex items-center gap-1.5" aria-label={t.home.timeRemaining} role="timer">
      <span className="mr-1 text-xs text-muted-foreground">{t.home.endsIn}</span>
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-destructive px-1 text-sm font-semibold text-white tabular-nums">
            {p}
          </span>
          {i < 2 && <span className="font-semibold text-destructive">:</span>}
        </span>
      ))}
    </div>
  )
}
