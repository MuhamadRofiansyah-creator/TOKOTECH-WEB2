"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { Archive, Download, ExternalLink, MoreHorizontal, Pencil, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProductImage } from "@/components/product/product-image"
import type { AdminProductRow as AdminProduct, Brand, ProductStatus } from "@/lib/types"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { StatusBadge } from "./status-badge"
import { SegmentedTabs, TablePagination, TableSearch } from "./data-table-parts"
import { ProductEditor } from "./product-editor"
import { downloadCsv, useAdminAction } from "./use-admin-action"
import { setProductStatusAction } from "@/lib/actions/admin"

const PER_PAGE = 10
type Tab = "all" | ProductStatus

export function ProductsManager({ products, categories, brands }: { products: AdminProduct[]; categories: string[]; brands: Brand[] }) {
  const action = useAdminAction()
  const params = useSearchParams()
  const [query, setQuery] = useState(params.get("q") ?? "")
  const [tab, setTab] = useState<Tab>("all")
  const [category, setCategory] = useState("all")
  const [stock, setStock] = useState(params.get("stock") === "low" ? "low" : "all")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(params.get("new") ? "new" : null)
  const [deleting, setDeleting] = useState<AdminProduct | null>(null)

  const counts = useMemo(
    () => ({
      all: products.length,
      active: products.filter((p) => p.status === "ACTIVE").length,
      draft: products.filter((p) => p.status === "DRAFT").length,
      archived: products.filter((p) => p.status === "ARCHIVED").length,
    }),
    [products],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter(
      (p) =>
        (tab === "all" || p.status === tab) &&
        (category === "all" || p.category === category) &&
        (stock === "all" || (stock === "low" ? p.totalStock > 0 && p.totalStock <= 5 : p.totalStock === 0)) &&
        (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)),
    )
  }, [products, query, tab, category, stock])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE)
  const allOnPage = rows.length > 0 && rows.every((r) => selected.includes(r.id))
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPage(1)
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your catalog, pricing and inventory.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-9"
            onClick={() =>
              downloadCsv(
                "products.csv",
                filtered.map((p) => ({ sku: p.sku, name: p.name, brand: p.brand, category: p.category, status: p.status, price: p.priceFrom, stock: p.totalStock, sold: p.soldCount })),
              )
            }
          >
            <Download /> Export
          </Button>
          <Button className="h-9" onClick={() => setEditing("new")}>
            <Plus /> Add product
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="px-4 pt-1">
          <SegmentedTabs<Tab>
            value={tab}
            onChange={resetPage(setTab)}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "ACTIVE", label: "Active", count: counts.active },
              { value: "DRAFT", label: "Draft", count: counts.draft },
              { value: "ARCHIVED", label: "Archived", count: counts.archived },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 p-4">
          <TableSearch value={query} onChange={resetPage(setQuery)} placeholder="Search name, SKU or brand" className="w-full sm:w-72" />
          <Select value={category} onValueChange={resetPage(setCategory)}>
            <SelectTrigger className="h-9! w-[160px]" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stock} onValueChange={resetPage(setStock)}>
            <SelectTrigger className="h-9! w-[140px]" aria-label="Stock">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">Any stock</SelectItem>
              <SelectItem value="low">Low stock (≤ 5)</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
            </SelectContent>
          </Select>
          {(query || category !== "all" || stock !== "all") && (
            <Button
              variant="ghost"
              className="h-9 text-muted-foreground"
              onClick={() => {
                setQuery("")
                setCategory("all")
                setStock("all")
                setPage(1)
              }}
            >
              Reset <X />
            </Button>
          )}
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t bg-accent/50 px-4 py-2 text-sm">
            <span className="font-medium">{selected.length} selected</span>
            <Button size="sm" variant="outline" disabled={action.pending} onClick={() => action.run(() => setProductStatusAction(selected, "ACTIVE"), () => setSelected([]))}>
              Set active
            </Button>
            <Button size="sm" variant="outline" disabled={action.pending} onClick={() => action.run(() => setProductStatusAction(selected, "ARCHIVED"), () => setSelected([]))}>
              <Archive /> Archive
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="border-y bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-10 py-2.5 pl-4">
                  <Checkbox
                    aria-label="Select all on page"
                    checked={allOnPage}
                    onCheckedChange={(v) =>
                      setSelected((s) => (v ? [...new Set([...s, ...rows.map((r) => r.id)])] : s.filter((id) => !rows.some((r) => r.id === id))))
                    }
                  />
                </th>
                <th className="px-3 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 font-medium">Category</th>
                <th className="px-3 py-2.5 text-right font-medium">Price</th>
                <th className="px-3 py-2.5 font-medium">Stock</th>
                <th className="px-3 py-2.5 text-right font-medium">Sold</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="w-12 py-2.5 pr-4" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((p) => {
                const isSel = selected.includes(p.id)
                return (
                  <tr key={p.id} className={cn("hover:bg-muted/40", isSel && "bg-accent/30")}>
                    <td className="py-3 pl-4">
                      <Checkbox
                        aria-label={`Select ${p.name}`}
                        checked={isSel}
                        onCheckedChange={(v) => setSelected((s) => (v ? [...s, p.id] : s.filter((id) => id !== p.id)))}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <ProductImage product={{ id: p.id, accent: p.accent, category: { art: p.art } }} colorHex={p.colorHex} className="aspect-square w-10 shrink-0 rounded-md" />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setEditing(p)}
                            className="line-clamp-1 text-left font-medium hover:text-primary"
                          >
                            {p.name}
                          </button>
                          <p className="text-xs text-muted-foreground">
                            {p.sku}
                            {p.variantCount > 1 && ` · ${p.variantCount} variants`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{p.category}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatPrice(p.priceFrom)}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            p.totalStock === 0 ? "bg-destructive" : p.totalStock <= 5 ? "bg-warning" : "bg-success",
                          )}
                          aria-hidden
                        />
                        <span className={cn("tabular-nums", p.totalStock === 0 && "text-destructive")}>
                          {p.totalStock === 0 ? "Out of stock" : p.totalStock <= 5 ? `${p.totalStock} · Low` : p.totalStock}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">{p.soldCount.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions for {p.name}</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onSelect={() => setEditing(p)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/p/${p.slug}`} target="_blank">
                              <ExternalLink /> View in store
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(p)}>
                            <Archive /> Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    No products match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={current} pageCount={pageCount} total={filtered.length} perPage={PER_PAGE} onPage={setPage} />
      </div>

      <ProductEditor
        brands={brands}
        product={editing === "new" ? null : editing}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        categories={categories}
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive product?</DialogTitle>
            <DialogDescription>
              “{deleting?.name}” will be hidden from the store. Past orders keep their records, and you can set it active again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={action.pending}
              onClick={() => deleting && action.run(() => setProductStatusAction([deleting.id], "ARCHIVED"), () => setDeleting(null))}
            >
              Archive product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
