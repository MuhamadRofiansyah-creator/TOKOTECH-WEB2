import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BadgeCheck, Star } from "lucide-react"
import {
  getFrequentlyBoughtTogether,
  getProductBySlug,
  getRelatedProducts,
  getProductSlugs,
  getReviews,
} from "@/lib/data"
import { defaultVariant } from "@/lib/product"
import { formatDate, formatPrice } from "@/lib/format"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { SectionHeading } from "@/components/shared/empty-state"
import { ProductHero } from "@/components/product/product-hero"
import { ProductCard } from "@/components/product/product-card"
import { ProductImage } from "@/components/product/product-image"
import { Rating } from "@/components/product/primitives"
import { BundleAddButton } from "@/components/product/bundle-add-button"
import { WriteReviewButton } from "@/components/product/write-review"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { getDictionary, getLocale } from "@/lib/i18n/dictionary"
import { fmt } from "@/lib/i18n/config"

export async function generateStaticParams() {
  return (await getProductSlugs()).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps<"/[lang]/p/[slug]">): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug)
  return product ? { title: product.name, description: product.description } : {}
}

export default async function ProductPage({ params }: PageProps<"/[lang]/p/[slug]">) {
  const product = await getProductBySlug((await params).slug)
  if (!product) notFound()
  const [t, locale] = await Promise.all([getDictionary(), getLocale()])

  const [related, bundle, reviews] = await Promise.all([
    getRelatedProducts(product),
    getFrequentlyBoughtTogether(product),
    getReviews(product.id),
  ])
  const bundleTotal = [product, ...bundle].reduce((n, p) => n + p.priceFrom, 0)
  // Mock rating distribution derived from the average
  const dist = [5, 4, 3, 2, 1].map((s) => {
    const d = Math.abs(product.ratingAvg - s)
    return { star: s, pct: Math.max(2, Math.round(100 * Math.exp(-d * 1.6) * (s === 5 ? 1 : 0.7))) }
  })
  const distTotal = dist.reduce((n, d) => n + d.pct, 0)

  return (
    <div className="container-page pt-6 sm:pt-8">
      <Breadcrumbs items={[{ label: product.category.name, href: `/c/${product.category.slug}` }, { label: product.name }]} />
      <div className="mt-6">
        <ProductHero product={product} />
      </div>

      <Tabs defaultValue="overview" className="mt-14">
        <TabsList variant="line" className="h-11! w-full justify-start gap-6 border-b p-0">
          <TabsTrigger value="overview" className="flex-none px-0">{t.product.overview}</TabsTrigger>
          <TabsTrigger value="specs" className="flex-none px-0">{t.product.specs}</TabsTrigger>
          <TabsTrigger value="reviews" className="flex-none px-0">{fmt(t.product.reviews, { n: product.ratingCount })}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-8 pt-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="max-w-prose space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p className="text-base text-foreground">{product.description}</p>
            <p>{fmt(t.product.overviewBody, { brand: product.brand.name })}</p>
            <ul className="list-disc space-y-1 pl-5">
              {product.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
              <li>{t.product.whyList[2]}</li>
            </ul>
          </div>
          <div className="rounded-xl border p-5">
            <h3 className="text-sm font-medium">{t.product.inBox}</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>1× {product.name}</li>
              {t.product.boxList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="specs" className="pt-6">
          <dl className="max-w-3xl overflow-hidden rounded-xl border text-sm">
            {[[t.product.brand, product.brand.name], [t.product.model, product.name], ...Object.entries(product.details).map(([k, v]) => [t.specLabels[k] ?? k, v])].map(
              ([k, v], i) => (
                <div key={k} className={`grid grid-cols-[40%_1fr] gap-4 px-4 py-3 ${i % 2 ? "" : "bg-muted/60"}`}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ),
            )}
          </dl>
        </TabsContent>

        <TabsContent value="reviews" className="grid gap-10 pt-6 lg:grid-cols-[280px_1fr]">
          <div>
            <p className="text-5xl font-light">{product.ratingAvg.toFixed(1)}</p>
            <Rating value={product.ratingAvg} size="md" className="mt-1" />
            <p className="mt-1 text-sm text-muted-foreground">{fmt(t.product.ratings, { n: product.ratingCount })}</p>
            <ul className="mt-5 space-y-2">
              {dist.map((d) => (
                <li key={d.star} className="flex items-center gap-2 text-xs">
                  <span className="flex w-6 items-center gap-0.5">
                    {d.star} <Star className="size-3 fill-amber-400 text-amber-400" />
                  </span>
                  <Progress value={(d.pct / distTotal) * 100} className="h-1.5 flex-1" />
                  <span className="w-8 text-right text-muted-foreground">{Math.round((d.pct / distTotal) * 100)}%</span>
                </li>
              ))}
            </ul>
            <WriteReviewButton productId={product.id} productName={product.name} slug={product.slug} />
          </div>
          <ul className="divide-y">
            {reviews.length === 0 && (
              <li className="py-5 text-sm text-muted-foreground first:pt-0">{t.product.noReviews}</li>
            )}
            {reviews.map((r) => (
              <li key={r.id} className="py-5 first:pt-0">
                <div className="flex items-center justify-between gap-4">
                  <Rating value={r.rating} />
                  <span className="text-xs text-muted-foreground">{formatDate(r.createdAt, locale)}</span>
                </div>
                <p className="mt-2 font-medium">{r.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {r.author}
                  {/* Reviews are buyer-only (tied to a delivered order item), so every one is verified */}
                  <span className="inline-flex items-center gap-0.5 text-success">
                    <BadgeCheck className="size-3.5" /> {t.product.verified}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      {bundle.length > 0 && (
        <section className="mt-16">
          <SectionHeading title={t.product.boughtTogether} />
          <div className="flex flex-col gap-6 rounded-2xl border p-4 sm:p-6 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {[product, ...bundle].map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  {i > 0 && <span className="text-xl text-muted-foreground">+</span>}
                  <div className="w-28 sm:w-36">
                    <ProductImage product={p} className="aspect-square rounded-lg" />
                    <p className="mt-2 line-clamp-1 text-xs">{p.name}</p>
                    <p className="text-xs text-primary">{formatPrice(p.priceFrom)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:w-64">
              <p className="text-sm text-muted-foreground">{fmt(t.product.totalFor, { n: bundle.length + 1 })}</p>
              <p className="text-2xl font-medium text-primary">{formatPrice(bundleTotal)}</p>
              <BundleAddButton
                items={[product, ...bundle].map((p) => ({ variantId: defaultVariant(p).id, name: p.name, inStock: p.totalStock > 0 }))}
              />
            </div>
          </div>
        </section>
      )}

      <section className="mt-16">
        <SectionHeading title={t.product.alsoLike} />
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-4">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  )
}
