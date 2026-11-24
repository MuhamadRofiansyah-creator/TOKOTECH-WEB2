"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCatalog } from "./catalog-context"
import { useDict } from "@/components/i18n/provider"

function pages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | "…")[] = []
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push("…")
    out.push(n)
  })
  return out
}

export function CatalogPagination({ page, pageCount }: { page: number; pageCount: number }) {
  const t = useDict()
  const { update } = useCatalog()
  if (pageCount <= 1) return null
  const go = (p: number) => {
    update({ page: p === 1 ? null : String(p) })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const btn = "inline-flex size-9 items-center justify-center rounded-lg text-sm transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
  return (
    <nav aria-label={t.catalog.pagination} className="flex items-center justify-center gap-1">
      <button type="button" className={btn} onClick={() => go(page - 1)} disabled={page === 1} aria-label={t.catalog.prevPage}>
        <ChevronLeft className="size-4" />
      </button>
      {pages(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(btn, p === page && "bg-primary text-primary-foreground hover:bg-primary")}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={btn} onClick={() => go(page + 1)} disabled={page === pageCount} aria-label={t.catalog.nextPage}>
        <ChevronRight className="size-4" />
      </button>
    </nav>
  )
}
