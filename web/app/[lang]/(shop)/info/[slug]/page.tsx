import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { getLocale } from "@/lib/i18n/dictionary"
import { INFO_SLUGS, infoPage, isInfoSlug } from "@/lib/i18n/info-pages"

// Footer info pages (shipping, returns, payment, contact, about, careers, stores,
// business, terms, privacy). Content lives in lib/i18n/info-pages.ts.

export function generateStaticParams() {
  return INFO_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps<"/[lang]/info/[slug]">): Promise<Metadata> {
  const { slug } = await params
  if (!isInfoSlug(slug)) return {}
  return { title: infoPage(await getLocale(), slug).title }
}

export default async function InfoPage({ params }: PageProps<"/[lang]/info/[slug]">) {
  const { slug } = await params
  if (!isInfoSlug(slug)) notFound()
  const page = infoPage(await getLocale(), slug)
  return (
    <div className="container-page max-w-3xl pt-6">
      <Breadcrumbs items={[{ label: page.title }]} />
      <h1 className="mt-4 text-3xl font-light tracking-tight">{page.title}</h1>
      <p className="mt-2 text-muted-foreground">{page.intro}</p>
      <div className="mt-8 space-y-8">
        {page.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-medium">{s.heading}</h2>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
