"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useRouter } from "@/components/i18n/provider"
import { createContext, useCallback, useContext, useMemo, useTransition } from "react"

type Updates = Record<string, string | string[] | null | undefined>

type Ctx = {
  params: URLSearchParams
  pending: boolean
  /** Merge updates into the URL. Arrays are comma-joined; empty/null removes the key. Resets page unless set. */
  update: (updates: Updates) => void
  getList: (key: string) => string[]
  toggleInList: (key: string, value: string) => void
  clearAll: () => void
}

const CatalogCtx = createContext<Ctx | null>(null)

/** Keys preserved by "Clear all" */
const KEEP = ["q", "sort", "view"]

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams])

  const push = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString()
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
    },
    [pathname, router],
  )

  const update = useCallback(
    (updates: Updates) => {
      const next = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(updates)) {
        const val = Array.isArray(v) ? v.join(",") : v
        if (val == null || val === "") next.delete(k)
        else next.set(k, val)
      }
      if (!("page" in updates)) next.delete("page")
      push(next)
    },
    [params, push],
  )

  const getList = useCallback(
    (key: string) => (params.get(key) ?? "").split(",").filter(Boolean),
    [params],
  )

  const toggleInList = useCallback(
    (key: string, value: string) => {
      const list = getList(key)
      update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] })
    },
    [getList, update],
  )

  const clearAll = useCallback(() => {
    const next = new URLSearchParams()
    for (const k of KEEP) {
      const v = params.get(k)
      if (v) next.set(k, v)
    }
    push(next)
  }, [params, push])

  const value = useMemo(
    () => ({ params, pending, update, getList, toggleInList, clearAll }),
    [params, pending, update, getList, toggleInList, clearAll],
  )
  return <CatalogCtx.Provider value={value}>{children}</CatalogCtx.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogCtx)
  if (!ctx) throw new Error("useCatalog must be used inside <CatalogProvider>")
  return ctx
}

/** Dims its children while a filter navigation is in flight. */
export function PendingRegion({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useCatalog()
  return (
    <div className={className} data-pending={pending || undefined} aria-busy={pending}>
      <div className="transition-opacity duration-200 in-data-pending:pointer-events-none in-data-pending:opacity-50">{children}</div>
    </div>
  )
}
