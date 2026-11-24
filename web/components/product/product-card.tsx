"use client"

import Link from "@/components/i18n/link"
import type { ProductWithRelations } from "@/lib/types"
import { discountPercent } from "@/lib/format"
import { defaultVariant } from "@/lib/product"
import { cn } from "@/lib/utils"
import type { ProductWithRelations as P } from "@/lib/types"
import { ProductImage } from "./product-image"
import { BrandMark, Price, ProductBadges, Rating, SpecChips, StockNote } from "./primitives"
import { AddToCartButton, CompareButton, WishlistButton } from "./product-actions"
import { useDict } from "@/components/i18n/provider"

/** Grid card: mirrors the reference layout (image, badge, brand + heart, name, price + stock). */
export function ProductCard({ product, className }: { product: ProductWithRelations; className?: string }) {
  const t = useDict()
  const off = discountPercent(product.priceFrom, product.compareAtFrom)
  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative overflow-hidden rounded-lg group-has-[a:focus-visible]:ring-2 group-has-[a:focus-visible]:ring-ring">
        <ProductImage product={product} />
        <ProductBadges badges={product.badges} discount={off} className="absolute top-2.5 left-2.5" />
        <div className="absolute inset-x-2.5 bottom-2.5 z-10 hidden translate-y-2 opacity-0 transition-all group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 lg:block">
          <AddToCartButton
            variantId={defaultVariant(product).id}
            productName={product.name}
            disabled={product.totalStock === 0}
            className="h-9 w-full shadow-md"
            label={product.totalStock === 0 ? t.product.preorderSoon : t.product.addToCart}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">{product.brand.name}</span>
        <WishlistButton productId={product.id} productName={product.name} className="relative z-10 -my-1 -mr-1.5" />
      </div>
      <h3 className="mt-0.5 line-clamp-2 text-sm leading-snug font-medium sm:text-[15px]">
        <Link href={`/p/${product.slug}`} className="outline-none after:absolute after:inset-0 after:content-['']">
          {product.name}
        </Link>
      </h3>
      <div className="mt-1.5 flex items-center gap-2">
        <Rating value={product.ratingAvg} count={product.ratingCount} />
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
        <Price price={product.priceFrom} compareAt={product.compareAtFrom} from={hasPriceRange(product)} />
        <StockNote stock={product.totalStock} />
      </div>
    </article>
  )
}

/** List row: used when the "list" view toggle is active. */
export function ProductListItem({ product }: { product: ProductWithRelations }) {
  const off = discountPercent(product.priceFrom, product.compareAtFrom)
  return (
    <article className="group relative grid grid-cols-[112px_1fr] gap-4 rounded-xl border bg-card p-3 transition-shadow hover:shadow-md sm:grid-cols-[180px_1fr_auto] sm:p-4">
      <Link href={`/p/${product.slug}`} className="relative overflow-hidden rounded-lg">
        <ProductImage product={product} className="aspect-square" />
        <ProductBadges badges={product.badges} discount={off} className="absolute top-2 left-2" />
      </Link>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BrandMark brand={product.brand} />
          {product.brand.name}
        </div>
        <h3 className="mt-1 line-clamp-2 font-medium">
          <Link href={`/p/${product.slug}`} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <Rating value={product.ratingAvg} count={product.ratingCount} className="mt-1.5" />
        <SpecChips specs={product.specs} max={5} className="mt-2" />
        <ul className="mt-3 hidden list-disc space-y-0.5 pl-4 text-sm text-muted-foreground sm:block">
          {product.highlights.slice(0, 2).map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <div className="mt-2 sm:hidden">
          <Price price={product.priceFrom} compareAt={product.compareAtFrom} from={hasPriceRange(product)} />
          <StockNote stock={product.totalStock} />
        </div>
      </div>
      <div className="col-span-2 hidden flex-col items-end justify-between gap-3 sm:col-span-1 sm:flex">
        <div className="text-right">
          <Price price={product.priceFrom} compareAt={product.compareAtFrom} from={hasPriceRange(product)} className="justify-end" />
          <StockNote stock={product.totalStock} />
        </div>
        <div className="flex flex-col items-end gap-1">
          <AddToCartButton variantId={defaultVariant(product).id} productName={product.name} disabled={product.totalStock === 0} className="h-9 w-40" />
          <div className="flex items-center">
            <CompareButton productId={product.id} />
            <WishlistButton productId={product.id} productName={product.name} />
          </div>
        </div>
      </div>
    </article>
  )
}

const hasPriceRange = (p: P) => new Set(p.variants.filter((v) => v.isActive).map((v) => v.price)).size > 1
