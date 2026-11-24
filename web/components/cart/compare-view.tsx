"use client"

import Link from "@/components/i18n/link"
import { defaultVariant } from "@/lib/product"
import { GitCompareArrows, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductImage } from "@/components/product/product-image"
import { Price, Rating } from "@/components/product/primitives"
import { AddToCartButton } from "@/components/product/product-actions"
import { useCatalog } from "./use-catalog"
import { COMPARE_MAX, useCompare, useMounted } from "@/stores"
import { useDict } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"

export function CompareView() {
  const t = useDict()
  const hydrated = useMounted()
  const { ids, remove, clear } = useCompare()
  const catalog = useCatalog({ productIds: hydrated ? ids : [] })
  const mounted = hydrated && catalog.ready
  const products = ids.map(catalog.product).filter((p) => p !== null)

  if (!mounted) return <Skeleton className="mt-6 h-96 rounded-2xl" />
  if (!products.length)
    return (
      <EmptyState
        icon={GitCompareArrows}
        title={t.compare.empty}
        body={fmt(t.compare.emptyBody, { n: COMPARE_MAX })}
        className="mt-6"
      >
        <Button asChild>
          <Link href="/c/monitors?view=list">{t.compare.browse}</Link>
        </Button>
      </EmptyState>
    )

  const specKeys = [...new Set(products.flatMap((p) => Object.keys(p.details)))]

  return (
    <div className="mt-6">
      <div className="mb-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={clear}>
          {t.common.clearAll}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[640px] table-fixed text-sm">
          <thead>
            <tr>
              <th className="w-40 bg-muted/50 p-4 text-left align-bottom text-xs font-normal text-muted-foreground">
                {products.length} of {COMPARE_MAX} selected
              </th>
              {products.map((p) => (
                <th key={p.id} className="relative p-4 text-left align-top font-normal">
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="absolute top-2 right-2 z-10 rounded-full bg-background p-1 text-muted-foreground shadow hover:text-foreground"
                    aria-label={fmt(t.compare.removeItem, { name: p.name })}
                  >
                    <X className="size-3.5" />
                  </button>
                  <Link href={`/p/${p.slug}`}>
                    <ProductImage product={p} className="aspect-square rounded-lg" />
                    <p className="mt-2 text-xs text-muted-foreground">{p.brand.name}</p>
                    <p className="line-clamp-2 font-medium hover:text-primary">{p.name}</p>
                  </Link>
                  <Price price={p.priceFrom} compareAt={p.compareAtFrom} size="sm" className="mt-1" />
                  <AddToCartButton variantId={defaultVariant(p).id} productName={p.name} disabled={p.totalStock === 0} size="sm" className="mt-3 w-full" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <th className="bg-muted/50 p-4 text-left font-normal text-muted-foreground">{t.compare.rating}</th>
              {products.map((p) => (
                <td key={p.id} className="p-4">
                  <Rating value={p.ratingAvg} count={p.ratingCount} />
                </td>
              ))}
            </tr>
            <tr className="border-t">
              <th className="bg-muted/50 p-4 text-left font-normal text-muted-foreground">{t.compare.category}</th>
              {products.map((p) => (
                <td key={p.id} className="p-4">
                  {p.category.name}
                </td>
              ))}
            </tr>
            {specKeys.map((k) => (
              <tr key={k} className="border-t">
                <th className="bg-muted/50 p-4 text-left font-normal text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</th>
                {products.map((p) => (
                  <td key={p.id} className="p-4">
                    {p.details[k] ?? <span className="text-muted-foreground">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
