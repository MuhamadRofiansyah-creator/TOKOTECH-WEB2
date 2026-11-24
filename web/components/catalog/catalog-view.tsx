import Link from "@/components/i18n/link"
import { SearchX } from "lucide-react"
import { Suspense } from "react"
import type { Brand, ProductQueryResult } from "@/lib/types"
import { ProductCard, ProductListItem } from "@/components/product/product-card"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { CatalogProvider, PendingRegion } from "./catalog-context"
import { FilterPanel } from "./filter-panel"
import { ActiveFilters, CatalogToolbar } from "./toolbar"
import { CatalogPagination } from "./catalog-pagination"
import { ClearFiltersButton } from "./clear-filters-button"
import { getDictionary } from "@/lib/i18n/dictionary"
import { fmt } from "@/lib/i18n/config"

export async function CatalogView({
  result,
  view,
  heading,
  crumbs,
  brands,
}: {
  result: ProductQueryResult
  view: "grid" | "list"
  heading: React.ReactNode
  crumbs: { label: string; href?: string }[]
  brands: Brand[]
}) {
  const t = await getDictionary()
  return (
    <Suspense>
      <CatalogProvider>
        <div id="results" className="container-page scroll-mt-32 pt-6 sm:pt-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-xl font-medium tracking-tight sm:text-2xl">{heading}</h1>

          <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
            <aside className="hidden lg:block" aria-label={t.catalog.filters}>
              <div className="sticky top-32 max-h-[calc(100dvh-9rem)] overflow-y-auto pb-6 [scrollbar-width:thin]">
                <FilterPanel facets={result.facets} />
              </div>
            </aside>

            <div className="min-w-0">
              <div className="border-b pb-3">
                <CatalogToolbar total={result.total} facets={result.facets} />
              </div>
              <div className="mt-3 empty:hidden">
                <ActiveFilters brands={brands} />
              </div>

              <PendingRegion className="mt-5">
                {result.items.length === 0 ? (
                  <EmptyState
                    icon={SearchX}
                    title={t.catalog.noMatch}
                    body={t.catalog.noMatchBody}
                  >
                    <ClearFiltersButton />
                    <Button variant="outline" asChild>
                      <Link href="/">{t.catalog.backHome}</Link>
                    </Button>
                  </EmptyState>
                ) : view === "list" ? (
                  <div className="space-y-3">
                    {result.items.map((p) => (
                      <ProductListItem key={p.id} product={p} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3">
                    {result.items.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}

                <div className="mt-12">
                  <CatalogPagination page={result.page} pageCount={result.pageCount} />
                  {result.total > 0 && (
                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      {fmt(t.catalog.showing, { from: (result.page - 1) * 12 + 1, to: Math.min(result.page * 12, result.total), total: result.total })}
                    </p>
                  )}
                </div>
              </PendingRegion>
            </div>
          </div>
        </div>
      </CatalogProvider>
    </Suspense>
  )
}
