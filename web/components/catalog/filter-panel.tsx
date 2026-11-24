"use client"

import { useState } from "react"
import { Check, ChevronUp, Search, Star } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { BrandMark } from "@/components/product/primitives"
import type { ProductQueryResult } from "@/lib/types"
import { SPEC_PREFIX } from "@/lib/filters"
import { formatPriceShort } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useCatalog } from "./catalog-context"
import { useDict } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"

type Facets = ProductQueryResult["facets"]

export function FilterPanel({ facets, className }: { facets: Facets; className?: string }) {
  const t = useDict()
  const { clearAll, params } = useCatalog()
  const hasFilters = [...params.keys()].some((k) => !["q", "sort", "view", "page"].includes(k))

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3.5">
        <h2 className="text-[15px] font-medium">{t.catalog.filter}</h2>
        {hasFilters ? (
          <button type="button" onClick={clearAll} className="text-sm text-primary hover:underline">
            {t.catalog.clearAll}
          </button>
        ) : (
          <span className="text-sm text-muted-foreground">{t.catalog.advanced}</span>
        )}
      </div>

      <BrandFilter brands={facets.brands} />
      <PriceFilter key={`${params.get("min")}-${params.get("max")}`} bounds={facets.priceBounds} histogram={facets.priceHistogram} />
      {facets.specs.map((f) =>
        f.options.length ? (
          <FilterSection key={f.key} title={t.specLabels[f.key] ?? f.label}>
            {f.type === "chips" ? (
              <ChipGroup paramKey={SPEC_PREFIX + f.key} options={f.options} />
            ) : (
              <CheckList paramKey={SPEC_PREFIX + f.key} options={f.options} />
            )}
          </FilterSection>
        ) : null,
      )}
      {facets.colors.length > 1 && <ColorFilter colors={facets.colors} />}
      <MoreFilters />
    </div>
  )
}

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="rounded-xl border bg-card">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm"
        >
          {title}
          <ChevronUp className={cn("size-4 transition-transform", !open && "rotate-180")} />
        </button>
      </h3>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  )
}

function BrandFilter({ brands }: { brands: Facets["brands"] }) {
  const t = useDict()
  const { getList, toggleInList } = useCatalog()
  const [query, setQuery] = useState("")
  const [showAll, setShowAll] = useState(false)
  const selected = getList("brand")
  const matches = brands.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
  const visible = showAll || query ? matches : matches.slice(0, 6)

  return (
    <FilterSection title={t.catalog.brand}>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.catalog.searchBrand}
          aria-label={t.catalog.searchBrand}
          className="h-9 w-full rounded-md bg-muted pr-3 pl-8 text-xs outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <ul className="space-y-0.5">
        {visible.map((b) => {
          const on = selected.includes(b.slug)
          return (
            <li key={b.slug}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggleInList("brand", b.slug)}
                disabled={!b.count && !on}
                className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left text-sm hover:bg-muted/60 disabled:opacity-40"
              >
                <BrandMark brand={b} />
                <span className={cn(on && "font-medium")}>{b.name}</span>
                <span className="text-[10px] text-muted-foreground">{b.count}</span>
                {on && <Check className="ml-auto size-4 text-primary" />}
              </button>
            </li>
          )
        })}
        {!visible.length && <li className="py-2 text-xs text-muted-foreground">{t.catalog.noBrand}</li>}
      </ul>
      {!query && matches.length > 6 && (
        <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-1 text-xs text-primary hover:underline">
          {showAll ? t.catalog.showLess : fmt(t.catalog.showAllBrands, { n: matches.length })}
        </button>
      )}
    </FilterSection>
  )
}

/** Remounted (via key) whenever the URL range changes, so local state resets. */
function PriceFilter({ bounds, histogram }: { bounds: [number, number]; histogram: number[] }) {
  const t = useDict()
  const { params, update } = useCatalog()
  const [lo, hi] = bounds
  const step = hi - lo > 10_000_000 ? 100_000 : 10_000
  const urlMin = Number(params.get("min") ?? lo)
  const urlMax = Number(params.get("max") ?? hi)
  const [range, setRange] = useState<[number, number]>([urlMin, urlMax])
  const [inputs, setInputs] = useState<[string, string]>([String(urlMin), String(urlMax)])

  const commit = ([a, b]: [number, number]) => {
    const min = Math.max(lo, Math.min(a, b))
    const max = Math.min(hi, Math.max(a, b))
    update({ min: min <= lo ? null : String(min), max: max >= hi ? null : String(max) })
  }

  if (lo === hi) return null
  const peak = Math.max(...histogram, 1)

  return (
    <FilterSection title={t.catalog.price}>
      <div className="flex h-14 items-end gap-[3px] px-2" aria-hidden>
        {histogram.map((v, i) => {
          const bucketStart = lo + ((hi - lo) / histogram.length) * i
          const inRange = bucketStart >= range[0] - (hi - lo) / histogram.length && bucketStart <= range[1]
          return (
            <span
              key={i}
              className={cn("flex-1 rounded-t-sm", inRange ? "bg-primary/25" : "bg-muted")}
              style={{ height: `${Math.max(6, (v / peak) * 100)}%` }}
            />
          )
        })}
      </div>
      <Slider
        min={lo}
        max={hi}
        step={step}
        value={range}
        minStepsBetweenThumbs={1}
        onValueChange={(v) => {
          setRange([v[0], v[1]])
          setInputs([String(v[0]), String(v[1])])
        }}
        onValueCommit={(v) => commit([v[0], v[1]])}
        aria-label={t.catalog.priceRange}
        className="-mt-px"
      />
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{formatPriceShort(range[0])}</span>
        <span>{formatPriceShort(range[1])}</span>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {([t.catalog.min, t.catalog.max] as const).map((label, i) => (
          <div key={label} className="contents">
            {i === 1 && <span className="text-muted-foreground">–</span>}
            <label className="relative flex-1">
              <span className="sr-only">{i === 0 ? t.catalog.minPrice : t.catalog.maxPrice}</span>
              <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[10px] text-muted-foreground">Rp</span>
              <input
                inputMode="numeric"
                value={Number(inputs[i]).toLocaleString("id-ID")}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "") || "0"
                  setInputs((p) => (i === 0 ? [raw, p[1]] : [p[0], raw]))
                }}
                onBlur={() => commit([Number(inputs[0]), Number(inputs[1])])}
                onKeyDown={(e) => e.key === "Enter" && commit([Number(inputs[0]), Number(inputs[1])])}
                className="h-10 w-full min-w-0 rounded-md border bg-background pr-2 pl-7 text-xs tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
          </div>
        ))}
      </div>
    </FilterSection>
  )
}

function ChipGroup({ paramKey, options }: { paramKey: string; options: { value: string; count: number }[] }) {
  const { getList, toggleInList } = useCatalog()
  const selected = getList(paramKey)
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            disabled={!o.count && !on}
            onClick={() => toggleInList(paramKey, o.value)}
            className={cn(
              "h-9 min-w-12 rounded-md border px-3 text-xs transition-colors hover:border-primary/60 disabled:opacity-35 disabled:hover:border-border",
              on && "border-primary bg-accent font-medium text-accent-foreground",
            )}
          >
            {o.value}
          </button>
        )
      })}
    </div>
  )
}

function CheckList({ paramKey, options }: { paramKey: string; options: { value: string; count: number }[] }) {
  const { getList, toggleInList } = useCatalog()
  const selected = getList(paramKey)
  return (
    <ul className="space-y-2.5">
      {options.map((o) => {
        const id = `${paramKey}-${o.value}`.replace(/\W/g, "-")
        const on = selected.includes(o.value)
        return (
          <li key={o.value} className="flex items-center gap-2.5">
            <Checkbox id={id} checked={on} disabled={!o.count && !on} onCheckedChange={() => toggleInList(paramKey, o.value)} />
            <Label htmlFor={id} className="flex-1 text-sm font-normal">
              {o.value}
            </Label>
            <span className="text-[10px] text-muted-foreground">{o.count}</span>
          </li>
        )
      })}
    </ul>
  )
}

function ColorFilter({ colors }: { colors: Facets["colors"] }) {
  const t = useDict()
  const { getList, toggleInList } = useCatalog()
  const selected = getList("color")
  return (
    <FilterSection title={t.catalog.color}>
      <div className="flex flex-wrap gap-2.5">
        {colors.map((c) => {
          const on = selected.includes(c.name)
          return (
            <button
              key={c.name}
              type="button"
              title={`${c.name} (${c.count})`}
              aria-label={c.name}
              aria-pressed={on}
              onClick={() => toggleInList("color", c.name)}
              className={cn(
                "size-6 rounded-full ring-1 ring-black/10 ring-offset-2 ring-offset-card transition-shadow",
                on && "ring-2 ring-primary",
              )}
              style={{ backgroundColor: c.hex }}
            />
          )
        })}
      </div>
    </FilterSection>
  )
}

function MoreFilters() {
  const t = useDict()
  const { params, update } = useCatalog()
  const inStock = params.get("stock") === "1"
  const rating = Number(params.get("rating") ?? 0)
  return (
    <FilterSection title={t.catalog.availability}>
      <div className="flex items-center gap-2.5">
        <Checkbox id="f-stock" checked={inStock} onCheckedChange={(v) => update({ stock: v ? "1" : null })} />
        <Label htmlFor="f-stock" className="text-sm font-normal">
          {t.catalog.inStockOnly}
        </Label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[4.5, 4, 3].map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={rating === r}
            onClick={() => update({ rating: rating === r ? null : String(r) })}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs hover:border-primary/60",
              rating === r && "border-primary bg-accent text-accent-foreground",
            )}
          >
            <Star className="size-3 fill-amber-400 text-amber-400" /> {r}+
          </button>
        ))}
      </div>
    </FilterSection>
  )
}
