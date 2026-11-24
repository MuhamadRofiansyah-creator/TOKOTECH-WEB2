import type { Metadata } from "next"
import { getCollection } from "@/lib/data"
import { CartView } from "@/components/cart/cart-view"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { SectionHeading } from "@/components/shared/empty-state"
import { ProductRail } from "@/components/home/product-rail"
import { getDictionary } from "@/lib/i18n/dictionary"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.cart }
}

export default async function CartPage() {
  const t = await getDictionary()
  const recommended = await getCollection("bestseller", 10)
  return (
    <div className="container-page pt-6 sm:pt-8">
      <Breadcrumbs items={[{ label: t.meta.cart }]} />
      <h1 className="mt-3 text-2xl font-medium tracking-tight">{t.cart.title}</h1>
      <CartView />
      <section className="mt-16">
        <SectionHeading title={t.cart.popular} />
        <ProductRail products={recommended} />
      </section>
    </div>
  )
}
