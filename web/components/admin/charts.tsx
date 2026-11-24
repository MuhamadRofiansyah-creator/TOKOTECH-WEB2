"use client"

import { useEffect, useRef, useState } from "react"
import { compactIDR, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

// Hand-built SVG charts following the dataviz spec:
// single series (no legend box: the card title names it), 2px line, ~10% area
// wash, hairline solid grid, crosshair + tooltip, keyboard focus, table view.
// Series color = --chart-1 (validated in light and dark).

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** Smallest clean step (1/2/2.5/5 × 10^n) giving at most `maxTicks` intervals. */
function niceMax(v: number, maxTicks = 5) {
  const pow = 10 ** Math.floor(Math.log10(v / maxTicks))
  for (const m of [1, 2, 2.5, 5, 10, 20]) {
    const step = m * pow
    const n = Math.ceil(v / step)
    if (n <= maxTicks) return { max: n * step, step }
  }
  return { max: v, step: v / maxTicks }
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })

export function RevenueChart({ data, height = 260 }: { data: { date: string; revenue: number; orders: number }[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const m = { top: 16, right: 16, bottom: 28, left: 64 }
  const w = Math.max(0, width - m.left - m.right)
  const h = height - m.top - m.bottom
  const { max, step } = niceMax(Math.max(...data.map((d) => d.revenue)))
  const x = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * w : 0)
  const y = (v: number) => h - (v / max) * h
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`).join("")
  const area = `${line}L${x(data.length - 1)},${h}L0,${h}Z`
  const last = data.length - 1
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step)

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - rect.left) / rect.width) * last)
    setActive(Math.max(0, Math.min(last, i)))
  }

  const a = active != null ? data[active] : null
  const tipLeft = active != null ? m.left + x(active) : 0

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Daily revenue for the last ${data.length} days. Use arrow keys to inspect values.`}
          tabIndex={0}
          className="overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setActive((i) => Math.min(last, (i ?? last) + (i == null ? 0 : 1)))
            if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? last) - 1))
            if (e.key === "Escape") setActive(null)
          }}
          onBlur={() => setActive(null)}
        >
          <g transform={`translate(${m.left},${m.top})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={w} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
                <text x={-10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                  {compactIDR(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) =>
              i % 7 === last % 7 ? (
                <text key={d.date} x={x(i)} y={h + 18} textAnchor={i === last ? "end" : "middle"} className="fill-muted-foreground text-[11px]">
                  {shortDate(d.date)}
                </text>
              ) : null,
            )}
            <path d={area} className="fill-chart-1" fillOpacity={0.1} />
            <path d={line} fill="none" className="stroke-chart-1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {/* End marker + selective direct label */}
            <circle cx={x(last)} cy={y(data[last].revenue)} r={4} className="fill-chart-1 stroke-card" strokeWidth={2} />

            {a && active != null && (
              <g pointerEvents="none">
                <line x1={x(active)} x2={x(active)} y1={0} y2={h} className="stroke-foreground/30" strokeWidth={1} />
                <circle cx={x(active)} cy={y(a.revenue)} r={5} className="fill-chart-1 stroke-card" strokeWidth={2} />
              </g>
            )}
            <rect
              width={w}
              height={h}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setActive(null)}
            />
          </g>
        </svg>
      )}
      {a && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg"
          style={{
            left: Math.min(Math.max(tipLeft, 80), width - 80),
            transform: "translateX(-50%)",
          }}
        >
          <p className="text-muted-foreground">{shortDate(a.date)}</p>
          <p className="mt-1 flex items-center gap-2">
            <span className="h-0.5 w-3 rounded bg-chart-1" aria-hidden />
            <span className="text-sm font-semibold tabular-nums">{formatPrice(a.revenue)}</span>
          </p>
          <p className="mt-0.5 pl-5 text-muted-foreground">{a.orders} orders</p>
        </div>
      )}
    </div>
  )
}

export function CategoryBars({ data }: { data: { name: string; revenue: number }[] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(...data.map((d) => d.revenue))
  return (
    <ul className="space-y-3" aria-label="Revenue by category, last 30 days">
      {data.map((d, i) => (
        <li
          key={d.name}
          tabIndex={0}
          onPointerEnter={() => setActive(i)}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(i)}
          onBlur={() => setActive(null)}
          className="group grid grid-cols-[92px_1fr] items-center gap-3 rounded-md py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label={`${d.name}: ${formatPrice(d.revenue)}`}
        >
          <span className="truncate text-xs text-muted-foreground">{d.name}</span>
          <span className="flex items-center gap-2">
            <span
              className={cn("h-4 rounded-r-[4px] bg-chart-1 transition-opacity", active != null && active !== i && "opacity-45")}
              style={{ width: `${Math.max(2, (d.revenue / max) * 78)}%` }}
            />
            <span className={cn("text-xs whitespace-nowrap tabular-nums", active === i ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {compactIDR(d.revenue)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** 12-point sparkline: de-emphasis hue, current period in the accent. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const w = 96
  const h = 28
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 4) + 2, h - 3 - ((v - min) / (max - min || 1)) * (h - 6)])
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("")
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className={className} aria-hidden>
      <path d={d} fill="none" className="stroke-muted-foreground/40" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3} className="fill-chart-1 stroke-card" strokeWidth={1.5} />
    </svg>
  )
}

/** Accessible table view for any chart. */
export function ChartTable({ caption, rows }: { caption: string; rows: [string, string][] }) {
  return (
    <details className="mt-4 text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View as table</summary>
      <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border">
        <table className="w-full">
          <caption className="sr-only">{caption}</caption>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b last:border-0">
                <th scope="row" className="px-3 py-1.5 text-left font-normal text-muted-foreground">
                  {k}
                </th>
                <td className="px-3 py-1.5 text-right tabular-nums">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
