"use client"

import { useSearchParams } from "next/navigation"
import { useRouter } from "@/components/i18n/provider"
import { useEffect, useId, useRef, useState } from "react"
import Link from "@/components/i18n/link"
import { Search, TrendingUp, X } from "lucide-react"
import type { ProductWithRelations } from "@/lib/types"
import { formatPrice } from "@/lib/format"
import { ProductImage } from "@/components/product/product-image"
import { cn } from "@/lib/utils"
import { useDict } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"

const TRENDING = ["OLED monitor", "wireless mouse", "75% keyboard", "RTX 5070", "gaming headset"]

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter()
  const t = useDict()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get("q") ?? "")
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<ProductWithRelations[]>([])
  const [active, setActive] = useState(-1)
  const ref = useRef<HTMLFormElement>(null)
  const listId = useId()

  // Suggestions from GET /api/search, debounced; stale responses are dropped.
  useEffect(() => {
    const term = q.trim()
    const controller = new AbortController()
    const timer = setTimeout(() => {
      const request = term
        ? fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal }).then((r) => r.json() as Promise<{ products: ProductWithRelations[] }>)
        : Promise.resolve({ products: [] })
      request
        .then(({ products }) => {
          setResults(products)
          setActive(-1)
        })
        .catch(() => {})
    }, term ? 150 : 0)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const go = (term: string) => {
    setOpen(false)
    if (term.trim()) router.push(`/search?q=${encodeURIComponent(term.trim())}`)
  }

  return (
    <form
      ref={ref}
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault()
        if (active >= 0 && results[active]) {
          setOpen(false)
          router.push(`/p/${results[active].slug}`)
        } else go(q)
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setActive((a) => Math.min(results.length - 1, a + 1))
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActive((a) => Math.max(-1, a - 1))
          } else if (e.key === "Escape") setOpen(false)
        }}
        placeholder={t.search.placeholder}
        aria-label={t.search.label}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className="h-10 w-full rounded-lg border bg-background pr-9 pl-9 text-sm outline-none placeholder:text-muted-foreground/80 focus:border-primary focus:ring-3 focus:ring-primary/15"
      />
      {q && (
        <button
          type="button"
          onClick={() => setQ("")}
          aria-label={t.search.clear}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-popover shadow-xl"
        >
          {q.trim() && results.length > 0 ? (
            <ul className="py-1.5">
              {results.map((p, i) => (
                <li key={p.id} role="option" aria-selected={i === active}>
                  <Link
                    href={`/p/${p.slug}`}
                    onClick={() => setOpen(false)}
                    className={cn("flex items-center gap-3 px-3 py-2 hover:bg-muted", i === active && "bg-muted")}
                  >
                    <ProductImage product={p} className="aspect-square w-10 shrink-0 rounded-md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.category.name}</span>
                    </span>
                    <span className="text-sm text-primary tabular-nums">{formatPrice(p.priceFrom)}</span>
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="submit"
                  className="w-full border-t px-3 py-2.5 text-left text-sm text-primary hover:bg-muted"
                >
                  See all results for “{q}”
                </button>
              </li>
            </ul>
          ) : q.trim() ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">{fmt(t.search.noMatch, { q })}</p>
          ) : (
            <div className="p-3">
              <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                <TrendingUp className="size-3.5" /> {t.search.trending}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setQ(t)
                      go(t)
                    }}
                    className="rounded-full border px-3 py-1 text-xs hover:border-primary hover:text-primary"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  )
}
