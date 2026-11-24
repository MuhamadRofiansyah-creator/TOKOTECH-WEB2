import type { CategorySlug, ProductFilters, SortKey } from "@/lib/types"

// URL <-> filter state. Reserved keys are listed here; every other key that
// starts with "f_" is treated as a category spec facet (e.g. f_refresh=144Hz,165Hz).

export type RawSearchParams = Record<string, string | string[] | undefined>

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
]

export const SPEC_PREFIX = "f_"

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const list = (v: string | string[] | undefined) =>
  (first(v) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
const num = (v: string | string[] | undefined) => {
  const n = Number(first(v))
  return Number.isFinite(n) && first(v) !== undefined && first(v) !== "" ? n : undefined
}

export function parseFilters(sp: RawSearchParams, category?: CategorySlug): ProductFilters {
  const specs: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(sp)) {
    if (k.startsWith(SPEC_PREFIX)) specs[k.slice(SPEC_PREFIX.length)] = list(v)
  }
  const sort = first(sp.sort) as SortKey | undefined
  return {
    category,
    q: first(sp.q)?.trim() || undefined,
    brands: list(sp.brand),
    colors: list(sp.color),
    minPrice: num(sp.min),
    maxPrice: num(sp.max),
    minRating: num(sp.rating),
    inStock: first(sp.stock) === "1",
    specs,
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? sort : "popular",
    page: num(sp.page) ?? 1,
  }
}

export function getView(sp: RawSearchParams): "grid" | "list" {
  return first(sp.view) === "list" ? "list" : "grid"
}

export function countActiveFilters(f: ProductFilters) {
  return (
    (f.brands?.length ?? 0) +
    (f.colors?.length ?? 0) +
    (f.minPrice != null || f.maxPrice != null ? 1 : 0) +
    (f.minRating ? 1 : 0) +
    (f.inStock ? 1 : 0) +
    Object.values(f.specs ?? {}).reduce((n, v) => n + v.length, 0)
  )
}
