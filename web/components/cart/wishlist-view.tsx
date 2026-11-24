"use client"

import Link from "@/components/i18n/link"
import { defaultVariant } from "@/lib/product"
import { Heart, ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductCard } from "@/components/product/product-card"
import { ProductGridSkeleton } from "@/components/product/product-card-skeleton"
import { useCatalog } from "./use-catalog"
import { useCart, useMounted, useWishlist } from "@/stores"
import { useDict } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"

export function WishlistView() {
  const t = useDict()
  const hydrated = useMounted()
  const ids = useWishlist((s) => s.ids)
  const clear = useWishlist((s) => s.clear)
  const add = useCart((s) => s.add)
  const catalog = useCatalog({ productIds: hydrated ? ids : [] })
  const mounted = hydrated && catalog.ready
  const products = ids.map(catalog.product).filter((p) => p !== null)

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium tracking-tight">
          {t.wishlist.title} {mounted && products.length > 0 && <span className="text-muted-foreground">({products.length})</span>}
        </h1>
        {mounted && products.length > 0 && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={clear}>
              {t.common.clear}
            </Button>
            <Button
              onClick={() => {
                const inStock = products.filter((p) => p.totalStock > 0)
                inStock.forEach((p) => add(defaultVariant(p).id))
                toast.success(fmt(t.product.addedItems, { n: inStock.length }))
              }}
            >
              <ShoppingCart /> {t.wishlist.addAll}
            </Button>
          </div>
        )}
      </div>
      <div className="mt-6">
        {!mounted ? (
          <ProductGridSkeleton count={4} />
        ) : products.length === 0 ? (
          <EmptyState icon={Heart} title={t.wishlist.empty} body={t.wishlist.emptyBody}>
            <Button asChild>
              <Link href="/">{t.wishlist.discover}</Link>
            </Button>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
