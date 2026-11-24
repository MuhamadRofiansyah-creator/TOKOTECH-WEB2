"use client"

import { useEffect, useReducer } from "react"
import type { ProductVariant, ProductWithRelations } from "@/lib/types"

// Browser-side lookups for ids kept in localStorage (cart lines, wishlist, compare).
// Fetches what it doesn't have yet from GET /api/catalog and keeps it for the page session.

const products = new Map<string, ProductWithRelations>()
const variantOwner = new Map<string, string>()
const unknown = new Set<string>()
const listeners = new Set<() => void>()

async function load(productIds: string[], variantIds: string[]) {
  const qs = new URLSearchParams()
  if (productIds.length) qs.set("products", productIds.join(","))
  if (variantIds.length) qs.set("variants", variantIds.join(","))
  const res = await fetch(`/api/catalog?${qs}`)
  if (!res.ok) throw new Error(`Catalog lookup failed (${res.status})`)
  const data: { products: ProductWithRelations[]; unknownProducts: string[]; unknownVariants: string[] } = await res.json()
  for (const p of data.products) {
    products.set(p.id, p)
    for (const v of p.variants) variantOwner.set(v.id, p.id)
  }
  for (const id of [...data.unknownProducts, ...data.unknownVariants]) unknown.add(id)
  listeners.forEach((notify) => notify())
}

const missing = (productIds: string[], variantIds: string[]) => ({
  p: productIds.filter((id) => !products.has(id) && !unknown.has(id)),
  v: variantIds.filter((id) => !variantOwner.has(id) && !unknown.has(id)),
})

/** `ready` is false until every id is resolved (found, or known to be gone). */
export function useCatalog({ productIds = [], variantIds = [] }: { productIds?: string[]; variantIds?: string[] }) {
  const [version, rerender] = useReducer((n: number) => n + 1, 0)
  const need = missing(productIds, variantIds)
  const key = `${need.p.join(",")}|${need.v.join(",")}`

  useEffect(() => {
    listeners.add(rerender)
    return () => {
      listeners.delete(rerender)
    }
  }, [])

  useEffect(() => {
    if (key === "|") return
    const [p, v] = key.split("|").map((s) => (s ? s.split(",") : []))
    load(p, v).catch((e) => console.error(e))
  }, [key])

  return {
    ready: need.p.length === 0 && need.v.length === 0,
    /** Changes whenever the shared cache fills; use it as a memo dependency. */
    version,
    product: (id: string) => products.get(id) ?? null,
    variant: (variantId: string): { product: ProductWithRelations; variant: ProductVariant } | null => {
      const owner = variantOwner.get(variantId)
      const product = owner ? products.get(owner) : undefined
      const variant = product?.variants.find((v) => v.id === variantId)
      return product && variant ? { product, variant } : null
    },
  }
}
