import Link from "@/components/i18n/link"
import { ArrowRight, Flame } from "lucide-react"
import { getBrands, getCategories, getCollection } from "@/lib/data"
import { HeroCarousel } from "@/components/home/hero-carousel"
import { NewsletterForm } from "@/components/home/newsletter-form"
import { FlashSaleTimer } from "@/components/home/flash-sale-timer"
import { ProductRail } from "@/components/home/product-rail"
import { ProductArt } from "@/components/product/product-art"
import { BrandMark } from "@/components/product/primitives"
import { SectionHeading } from "@/components/shared/empty-state"
import { getDictionary } from "@/lib/i18n/dictionary"
import { fmt } from "@/lib/i18n/config"

const SeeAll = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline">
    {label} <ArrowRight className="size-4" />
  </Link>
)

export default async function HomePage() {
  const [t, categories, brands, flash, fresh, best] = await Promise.all([
    getDictionary(),
    getCategories(),
    getBrands(),
    getCollection("flash", 10),
    getCollection("new", 10),
    getCollection("bestseller", 10),
  ])

  return (
    <>
      <HeroCarousel />

      {/* Categories */}
      <section id="categories" className="container-page scroll-mt-32 pt-12 sm:pt-16">
        <SectionHeading eyebrow={t.home.browse} title={t.home.shopByCategory} />
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7 sm:gap-4">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/c/${c.slug}`}
                className="group flex flex-col items-center rounded-xl border bg-card p-3 text-center transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md sm:p-4"
              >
                <span className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted">
                  <ProductArt kind={c.art} accent="#14b8c4" className="w-4/5 transition-transform group-hover:scale-105" />
                </span>
                <span className="mt-3 text-sm font-medium">{c.name}</span>
                <span className="text-[11px] text-muted-foreground">{fmt(t.common.products, { n: c.count })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Flash sale */}
      <section id="flash-sale" className="container-page scroll-mt-32 pt-14 sm:pt-20">
        <div className="rounded-2xl border bg-gradient-to-br from-destructive/5 via-background to-background p-4 sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <h2 className="flex items-center gap-2 text-xl font-medium tracking-tight sm:text-2xl">
                <Flame className="size-6 text-destructive" /> {t.home.flashSale}
              </h2>
              <FlashSaleTimer />
            </div>
            <SeeAll href="/search?q=&sort=price-asc" label={t.common.seeAll} />
          </div>
          <ProductRail products={flash} />
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-page pt-14 sm:pt-20">
        <SectionHeading eyebrow={t.home.justLanded} title={t.home.newArrivals} action={<SeeAll href="/search?sort=newest" label={t.common.seeAll} />} />
        <ProductRail products={fresh} />
      </section>

      {/* Promo banners */}
      <section className="container-page grid gap-4 pt-14 sm:pt-20 md:grid-cols-2">
        <PromoBanner
          href="/c/monitors"
          kicker={t.home.promos[0].kicker}
          title={t.home.promos[0].title}
          body={t.home.promos[0].body}
          cta={t.home.shopNow}
          art="monitor"
          accent="#0ea5e9"
          className="from-sky-100 to-cyan-50 dark:from-sky-950 dark:to-cyan-950"
        />
        <PromoBanner
          href="/c/mouse"
          kicker={t.home.promos[1].kicker}
          title={t.home.promos[1].title}
          body={t.home.promos[1].body}
          cta={t.home.shopNow}
          art="mouse"
          accent="#14b8c4"
          className="from-teal-100 to-emerald-50 dark:from-teal-950 dark:to-emerald-950"
        />
      </section>

      {/* Best sellers */}
      <section className="container-page pt-14 sm:pt-20">
        <SectionHeading eyebrow={t.home.favourites} title={t.home.bestSellers} action={<SeeAll href="/search" label={t.common.seeAll} />} />
        <ProductRail products={best} />
      </section>

      {/* Brands */}
      <section className="container-page pt-14 sm:pt-20">
        <SectionHeading title={t.home.brands} />
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
          {brands.map((b) => (
            <li key={b.slug}>
              <Link
                href={`/search?q=${encodeURIComponent(b.name)}`}
                className="flex h-16 items-center justify-center gap-2 rounded-xl border bg-card text-sm font-medium transition-colors hover:border-primary/50"
              >
                <BrandMark brand={b} />
                {b.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Newsletter */}
      <section className="container-page pt-14 sm:pt-20">
        <div className="relative overflow-hidden rounded-2xl bg-topbar px-6 py-10 text-white sm:px-12">
          <div className="absolute inset-0 opacity-40 [background:radial-gradient(40%_80%_at_85%_50%,var(--primary),transparent)]" />
          <div className="relative grid items-center gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-light tracking-tight sm:text-3xl">{t.home.newsletterTitle}</h2>
              <p className="mt-2 text-sm text-white/70">{t.home.newsletterBody}</p>
            </div>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  )
}

function PromoBanner({
  href,
  kicker,
  title,
  body,
  cta,
  art,
  accent,
  className,
}: {
  href: string
  kicker: string
  title: string
  body: string
  cta: string
  art: "monitor" | "mouse"
  accent: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`group relative flex min-h-52 overflow-hidden rounded-2xl bg-gradient-to-br p-6 sm:p-8 ${className}`}
    >
      <div className="relative z-10 max-w-[60%]">
        <p className="text-xs font-medium tracking-wider text-primary uppercase">{kicker}</p>
        <h3 className="mt-2 text-xl font-medium tracking-tight sm:text-2xl">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all">
          {cta} <ArrowRight className="size-4" />
        </span>
      </div>
      <div className="absolute right-[-6%] bottom-[-10%] w-[52%] transition-transform duration-500 group-hover:scale-105">
        <ProductArt kind={art} accent={accent} />
      </div>
    </Link>
  )
}
