import type { Metadata } from "next"
import { Suspense } from "react"
import { getBrands, getProducts } from "@/lib/data"
import { getView, parseFilters, type RawSearchParams } from "@/lib/filters"
import { CatalogView } from "@/components/catalog/catalog-view"
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton"
import { getDictionary } from "@/lib/i18n/dictionary"
import { fmt } from "@/lib/i18n/config"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.search }
}

export default function SearchPage({ searchParams }: PageProps<"/[lang]/search">) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  )
}

async function SearchResults({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams
  const filters = parseFilters(sp)
  const [result, brands, t] = await Promise.all([getProducts(filters), getBrands(), getDictionary()])
  return (
    <CatalogView
      result={result}
      view={getView(sp)}
      brands={brands}
      crumbs={[{ label: t.meta.search }]}
      heading={
        filters.q ? (
          <>
            {fmt(t.catalog.resultsFor, { n: result.total, q: "" }).trim()} <span className="text-primary">“{filters.q}”</span>
          </>
        ) : (
          <>{t.catalog.allProducts}</>
        )
      }
    />
  )
}
