import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Category } from "@/lib/types"
import { getBrands, getCategories, getCategory, getProducts } from "@/lib/data"
import { getView, parseFilters, type RawSearchParams } from "@/lib/filters"
import { CategoryHero } from "@/components/catalog/category-hero"
import { CatalogView } from "@/components/catalog/catalog-view"
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton"
import { getDictionary } from "@/lib/i18n/dictionary"
import { fmt } from "@/lib/i18n/config"

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ category: c.slug }))
}

export async function generateMetadata({ params }: PageProps<"/[lang]/c/[category]">): Promise<Metadata> {
  const category = await getCategory((await params).category)
  return category ? { title: category.name, description: category.description } : {}
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[lang]/c/[category]">) {
  const category = await getCategory((await params).category)
  if (!category) notFound()

  // Hero is static; filtered results depend on searchParams and stream in.
  return (
    <>
      <CategoryHero title={category.heroTitle ?? category.name} subtitle={category.heroSubtitle ?? ""} art={category.art} />
      <Suspense fallback={<CatalogSkeleton />}>
        <CategoryResults category={category} searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function CategoryResults({ category, searchParams }: { category: Category; searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams
  const [result, brands, t] = await Promise.all([getProducts(parseFilters(sp, category.slug)), getBrands(), getDictionary()])
  return (
    <CatalogView
      result={result}
      view={getView(sp)}
      brands={brands}
      crumbs={[{ label: category.name }]}
      heading={
        <>
          {fmt(t.catalog.resultsFor, { n: result.total, q: category.name.toLowerCase() })}
        </>
      }
    />
  )
}
