"use client"

import { LayoutGrid, List, SlidersHorizontal, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { SORT_OPTIONS } from "@/lib/filters"
import type { Brand, ProductQueryResult } from "@/lib/types"
import { formatPriceShort } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useCatalog } from "./catalog-context"
import { FilterPanel } from "./filter-panel"
import { useDict } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"

export function CatalogToolbar({ total, facets }: { total: number; facets: ProductQueryResult["facets"] }) {
  const t = useDict()
  const { params, update } = useCatalog()
  const view = params.get("view") === "list" ? "list" : "grid"
  const sort = params.get("sort") ?? "popular"

  return (
    <div className="flex items-center gap-2">
      {/* Mobile filter trigger, as the "Filter" pill in the reference */}
      <MobileFilters facets={facets} total={total} />

      <div className="hidden items-center rounded-lg border p-0.5 sm:flex" role="group" aria-label={t.catalog.view}>
        {(
          [
            ["list", List],
            ["grid", LayoutGrid],
          ] as const
        ).map(([v, Icon]) => (
          <button
            key={v}
            type="button"
            aria-label={v === "grid" ? t.catalog.grid : t.catalog.list}
            aria-pressed={view === v}
            onClick={() => update({ view: v === "grid" ? null : v, page: params.get("page") })}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground",
              view === v && "bg-accent text-primary",
            )}
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>

      <p className="hidden text-sm text-muted-foreground md:block">
        <span className="font-medium text-foreground">{total}</span> {fmt(t.catalog.productsCount, { n: "" }).trim()}
      </p>

      <Select value={sort} onValueChange={(v) => update({ sort: v === "popular" ? null : v })}>
        <SelectTrigger className="ml-auto h-10! min-w-44 gap-1.5 bg-background" aria-label={t.catalog.sortBy}>
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">{t.catalog.sortBy}:</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" position="popper">
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {t.catalog.sort[o.value] ?? o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function MobileFilters({ facets, total }: { facets: ProductQueryResult["facets"]; total: number }) {
  const t = useDict()
  const { params } = useCatalog()
  const count = [...params.entries()]
    .filter(([k]) => !["q", "sort", "view", "page"].includes(k))
    .reduce((n, [k, v]) => n + (k === "min" || k === "max" ? 0.5 : v.split(",").length), 0)

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-10 flex-1 justify-start gap-2 rounded-lg px-3 sm:flex-none lg:hidden">
          <span className="size-4 rounded-full border-2 border-primary" />
          {t.catalog.filter}
          {count > 0 && (
            <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{Math.ceil(count)}</span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[88dvh] gap-0 rounded-t-2xl p-0">
        <SheetHeader className="border-b">
          <SheetTitle>{t.catalog.filters}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto bg-muted/40 p-3">
          <FilterPanel facets={facets} />
        </div>
        <SheetFooter className="border-t bg-background">
          <SheetClose asChild>
            <Button size="lg" className="h-11 w-full">
              {fmt(t.catalog.showResults, { n: total })}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function ActiveFilters({ brands }: { brands: Brand[] }) {
  const t = useDict()
  const { params, update, getList, toggleInList, clearAll } = useCatalog()
  const chips: { label: string; onRemove: () => void }[] = []

  for (const [key, value] of params.entries()) {
    if (["q", "sort", "view", "page", "min", "max"].includes(key)) continue
    if (key === "stock") chips.push({ label: t.catalog.inStock, onRemove: () => update({ stock: null }) })
    else if (key === "rating") chips.push({ label: `${value}★ & up`, onRemove: () => update({ rating: null }) })
    else
      for (const v of getList(key))
        chips.push({
          label: key === "brand" ? (brands.find((b) => b.slug === v)?.name ?? v) : v,
          onRemove: () => toggleInList(key, v),
        })
  }
  const min = params.get("min")
  const max = params.get("max")
  if (min || max)
    chips.push({
      label: `${min ? formatPriceShort(Number(min)) : t.catalog.any} – ${max ? formatPriceShort(Number(max)) : t.catalog.any}`,
      onRemove: () => update({ min: null, max: null }),
    })

  if (!chips.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={c.onRemove}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/30 bg-accent pr-2 pl-3 text-xs text-accent-foreground hover:border-primary"
        >
          {c.label}
          <X className="size-3" />
          <span className="sr-only">{t.catalog.removeFilter}</span>
        </button>
      ))}
      <button type="button" onClick={clearAll} className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:underline">
        {t.catalog.clearAll}
      </button>
    </div>
  )
}
