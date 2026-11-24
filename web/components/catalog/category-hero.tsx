import { ArrowDown } from "lucide-react"
import type { ArtKind } from "@/lib/types"
import { ProductArt } from "@/components/product/product-art"
import { getDictionary } from "@/lib/i18n/dictionary"

/** Full-width banner with a large light headline, matching the reference's "Simple is More" hero. */
export async function CategoryHero({
  title,
  subtitle,
  art,
  accent = "#14b8c4",
}: {
  title: string
  subtitle: string
  art: ArtKind
  accent?: string
}) {
  const t = await getDictionary()
  const [l1, l2] = title.split("\n")
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-slate-500 via-slate-400 to-slate-300 text-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-600">
      <div className="absolute inset-0 -z-10 opacity-30 [background:radial-gradient(60%_80%_at_75%_40%,white,transparent)]" />
      <div className="container-page relative flex min-h-[260px] items-center py-10 sm:min-h-[300px] lg:min-h-[340px]">
        <div className="relative z-10">
          <h1 className="text-5xl leading-[1.05] font-light tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block">{l1}</span>
            {l2 && <span className="block pl-[1.1em]">{l2}</span>}
          </h1>
          <p className="mt-5 max-w-[14rem] text-xs tracking-[0.18em] uppercase opacity-90 sm:max-w-none">{subtitle}</p>
        </div>
        <div className="pointer-events-none absolute right-[-14%] bottom-[-12%] w-[70%] max-w-[420px] opacity-95 sm:right-[10%] sm:bottom-[-10%] sm:w-[40%]">
          <ProductArt kind={art} accent={accent} body="#0f172a" />
        </div>
        <a
          href="#results"
          className="absolute top-1/2 right-6 z-10 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 backdrop-blur-sm transition-colors hover:bg-white/15 lg:flex"
          aria-label={t.catalog.scrollToProducts}
        >
          <ArrowDown className="size-5" />
        </a>
      </div>
    </section>
  )
}
