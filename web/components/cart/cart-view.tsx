"use client"

import Link from "@/components/i18n/link"
import { Heart, ShoppingCart, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { QuantityStepper } from "@/components/shared/quantity-stepper"
import { ProductImage } from "@/components/product/product-image"
import { Price, StockNote } from "@/components/product/primitives"
import { useCart, useWishlist } from "@/stores"
import { formatPrice } from "@/lib/format"
import { OrderSummary } from "./order-summary"
import { useCartItems } from "./use-cart-items"
import { useDict } from "@/components/i18n/provider"

export function CartView() {
  const t = useDict()
  const { mounted, items, subtotal, savings, count } = useCartItems()
  const { setQuantity, remove, add } = useCart()
  const wishlist = useWishlist()

  if (!mounted)
    return (
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )

  if (!items.length)
    return (
      <EmptyState
        icon={ShoppingCart}
        title={t.cart.empty}
        body={t.cart.emptyBody}
        className="mt-6"
      >
        <Button asChild>
          <Link href="/">{t.cart.startShopping}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/wishlist">{t.cart.viewWishlist}</Link>
        </Button>
      </EmptyState>
    )

  return (
    <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_360px]">
      <ul className="divide-y rounded-2xl border bg-card">
        {items.map(({ product: p, variant: v, variantId, quantity, available: stock }) => (
          <li key={variantId} className="flex gap-4 p-4 sm:p-5">
            <Link href={`/p/${p.slug}`} className="w-24 shrink-0 overflow-hidden rounded-lg sm:w-28">
              <ProductImage product={p} colorHex={v.colorHex} className="aspect-square" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{p.brand.name}</p>
                  <Link href={`/p/${p.slug}`} className="line-clamp-2 font-medium hover:text-primary">
                    {p.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.variants.length > 1 && <>{v.name} · </>}
                    <StockNote stock={stock} />
                  </p>
                </div>
                <p className="hidden text-right font-medium tabular-nums sm:block">{formatPrice(v.price * quantity)}</p>
              </div>
              <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                <Price price={v.price} compareAt={v.compareAtPrice} size="sm" className="sm:hidden" />
                <div className="flex items-center gap-1">
                  <QuantityStepper size="sm" value={quantity} max={Math.max(1, Math.min(10, stock))} onChange={(n) => setQuantity(variantId, n)} />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    aria-label={t.cart.moveToWishlist}
                    onClick={() => {
                      if (!wishlist.ids.includes(p.id)) wishlist.toggle(p.id)
                      remove(variantId)
                      toast(t.cart.movedToWishlist, { description: p.name })
                    }}
                  >
                    <Heart />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={t.common.remove}
                    onClick={() => {
                      remove(variantId)
                      toast(t.cart.removed, {
                        description: p.name,
                        action: { label: t.common.undo, onClick: () => add(variantId, quantity) },
                      })
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <OrderSummary subtotal={subtotal} savings={savings} itemCount={count} className="lg:sticky lg:top-32">
        <Button asChild size="lg" className="h-11 w-full">
          <Link href="/checkout">{t.cart.checkout}</Link>
        </Button>
        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link href="/">{t.cart.continue}</Link>
        </Button>
      </OrderSummary>
    </div>
  )
}
