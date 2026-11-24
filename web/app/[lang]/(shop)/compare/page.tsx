import type { Metadata } from "next"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { CompareView } from "@/components/cart/compare-view"
import { getDictionary } from "@/lib/i18n/dictionary"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.compare }
}

export default async function ComparePage() {
  const t = await getDictionary()
  return (
    <div className="container-page pt-6 sm:pt-8">
      <Breadcrumbs items={[{ label: t.product.compare }]} />
      <h1 className="mt-3 text-2xl font-medium tracking-tight">{t.compare.title}</h1>
      <CompareView />
    </div>
  )
}
