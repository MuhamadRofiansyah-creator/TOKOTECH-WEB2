// Pure helpers over a Product and its variants. Safe for server and client.

import type { ColorOption, Product, ProductVariant, VariantOptions } from "@/lib/types"

/** Units that can be sold now (on hand minus held by unpaid orders). */
export const available = (v: ProductVariant) => Math.max(0, v.stock - v.reserved)

/** Distinct colours across active variants, in variant order. */
export function productColors(p: Pick<Product, "variants">): ColorOption[] {
  const seen = new Map<string, ColorOption>()
  for (const v of p.variants)
    if (v.isActive && v.options.color && !seen.has(v.options.color)) seen.set(v.options.color, { name: v.options.color, hex: v.colorHex ?? "#9ca3af" })
  return [...seen.values()]
}

/** The variant a card's "Add to cart" uses: the cheapest one in stock, else the cheapest. */
export function defaultVariant(p: Pick<Product, "variants">): ProductVariant {
  const active = p.variants.filter((v) => v.isActive)
  const byPrice = [...active].sort((a, b) => a.price - b.price || a.position - b.position)
  return byPrice.find((v) => available(v) > 0) ?? byPrice[0] ?? p.variants[0]
}

const OPTION_LABELS: Record<string, string> = { color: "Color", ram: "Memory", storage: "Storage" }
export const optionLabel = (key: string) => OPTION_LABELS[key] ?? key[0].toUpperCase() + key.slice(1)

/** Option keys and their values, e.g. [{ key: "ram", values: ["16GB", "32GB"] }, { key: "color", … }]. Color last. */
export function optionGroups(p: Pick<Product, "variants">) {
  const groups = new Map<string, string[]>()
  for (const v of p.variants.filter((x) => x.isActive))
    for (const [k, val] of Object.entries(v.options)) {
      const list = groups.get(k) ?? []
      if (!list.includes(val)) list.push(val)
      groups.set(k, list)
    }
  return [...groups.entries()]
    .map(([key, values]) => ({ key, label: optionLabel(key), values }))
    .sort((a, b) => Number(a.key === "color") - Number(b.key === "color"))
}

/**
 * Pick the variant for a selection. Exact match first; otherwise the variant that
 * matches the most recently changed option (`priority`) and as many others as possible.
 */
export function resolveVariant(p: Pick<Product, "variants">, selection: VariantOptions, priority?: string): ProductVariant {
  const active = p.variants.filter((v) => v.isActive)
  const score = (v: ProductVariant) =>
    Object.entries(selection).reduce((n, [k, val]) => n + (v.options[k] === val ? (k === priority ? 100 : 1) : 0), 0)
  return active.reduce((best, v) => (score(v) > score(best) ? v : best), active[0])
}
