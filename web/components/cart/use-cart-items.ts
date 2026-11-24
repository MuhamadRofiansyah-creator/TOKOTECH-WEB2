"use client"

import { available } from "@/lib/product"
import { useCart, useMounted } from "@/stores"
import { useCatalog } from "./use-catalog"

/** Cart lines joined with their variant + product, plus totals. `mounted` stays false until the server cart and its products are loaded. */
export function useCartItems() {
  const hydrated = useMounted()
  const lines = useCart((s) => s.lines)
  const loaded = useCart((s) => s.loaded)
  const catalog = useCatalog({ variantIds: hydrated ? lines.map((l) => l.variantId) : [] })
  const mounted = hydrated && loaded && catalog.ready

  const items = (mounted ? lines : []).flatMap((l) => {
    const hit = catalog.variant(l.variantId)
    return hit ? [{ ...l, ...hit, available: available(hit.variant) }] : []
  })
  const subtotal = items.reduce((n, i) => n + i.variant.price * i.quantity, 0)
  const savings = items.reduce(
    (n, i) => n + (i.variant.compareAtPrice ? (i.variant.compareAtPrice - i.variant.price) * i.quantity : 0),
    0,
  )
  const count = items.reduce((n, i) => n + i.quantity, 0)
  return { mounted, items, subtotal, savings, count }
}
