"use client"

import Link from "next/link"
import { useState } from "react"
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProductArt } from "@/components/product/product-art"
import type { getAdminCategories } from "@/lib/data"
import type { ArtKind } from "@/lib/types"
import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions/admin"
import { useSessionUser } from "@/components/auth/session-user"
import { PageHeader } from "./status-badge"
import { useAdminAction } from "./use-admin-action"

type Row = Awaited<ReturnType<typeof getAdminCategories>>[number]

const ARTS: { value: ArtKind; label: string }[] = [
  { value: "desktop", label: "Desktop PC" },
  { value: "laptop", label: "Laptop" },
  { value: "monitor", label: "Monitor" },
  { value: "keyboard", label: "Keyboard" },
  { value: "mouse", label: "Mouse" },
  { value: "headset", label: "Headset" },
  { value: "gpu", label: "Graphics card" },
]

export function CategoriesManager({ categories }: { categories: Row[] }) {
  const action = useAdminAction()
  const isAdmin = useSessionUser().user?.role === "ADMIN"
  const [editing, setEditing] = useState<Row | "new" | null>(null)
  const [deleting, setDeleting] = useState<Row | null>(null)

  return (
    <>
      <PageHeader
        title="Categories"
        description="Names, URLs and hero text for the store menu and category pages. Lower position numbers come first."
        actions={
          <Button className="h-9" onClick={() => setEditing("new")}>
            <Plus /> New category
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-3 py-2.5 font-medium">URL</th>
              <th className="px-3 py-2.5 text-right font-medium">Products</th>
              <th className="px-3 py-2.5 font-medium">Filters</th>
              <th className="px-3 py-2.5 text-right font-medium">Position</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-muted/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted p-1">
                      <ProductArt kind={c.art} accent="#14b8c4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{c.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{c.tagline ?? "No tagline"}</span>
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Link href={`/c/${c.slug}`} target="_blank" className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">
                    /c/{c.slug} <ExternalLink className="size-3" />
                  </Link>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {c.liveCount}
                  {c.totalCount !== c.liveCount && <span className="text-muted-foreground"> / {c.totalCount}</span>}
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{c.facets.map((f) => f.label).join(", ") || "None"}</td>
                <td className="px-3 py-3 text-right tabular-nums">{c.position}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                    <Pencil /> Edit
                  </Button>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}>
                      <Trash2 />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Products: live / total including drafts and archived. Spec filters are set up per category in the seed data for now.</p>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <CategoryForm
            key={editing === "new" ? "new" : editing?.id}
            category={editing === "new" ? null : editing}
            nextPosition={Math.max(-1, ...categories.map((c) => c.position)) + 1}
            pending={action.pending}
            onSubmit={(form) => {
              const id = editing === "new" ? null : (editing?.id ?? null)
              action.run(() => saveCategoryAction(id, form), () => setEditing(null))
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>
              {deleting && deleting.totalCount > 0
                ? `It still has ${deleting.totalCount} products. Move them to another category first.`
                : `/c/${deleting?.slug} will stop working. This can't be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={action.pending || (deleting?.totalCount ?? 0) > 0}
              onClick={() => deleting && action.run(() => deleteCategoryAction(deleting.id), () => setDeleting(null))}
            >
              Delete category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function CategoryForm({
  category,
  nextPosition,
  pending,
  onSubmit,
}: {
  category: Row | null
  nextPosition: number
  pending: boolean
  onSubmit: (form: FormData) => void
}) {
  const [slug, setSlug] = useState(category?.slug ?? "")
  const slugChanged = !!category && slug !== category.slug

  return (
    <>
      <DialogHeader>
        <DialogTitle>{category ? `Edit ${category.name}` : "New category"}</DialogTitle>
        <DialogDescription>Changes appear in the store menu and on the category page right away.</DialogDescription>
      </DialogHeader>
      <form
        id="category-form"
        className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(new FormData(e.currentTarget))
        }}
      >
        <Field label="Name" htmlFor="c-name">
          <Input id="c-name" name="name" required defaultValue={category?.name} placeholder="e.g. Mouse" className="h-9" />
        </Field>
        <Field label="URL slug" htmlFor="c-slug" hint={slugChanged ? `Old links to /c/${category!.slug} will stop working` : `/c/${slug || "…"}`} warn={slugChanged}>
          <Input id="c-slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="Leave empty to use the name" className="h-9 font-mono" />
        </Field>
        <Field label="Tagline" htmlFor="c-tagline" className="sm:col-span-2" hint="Shown under the name in the menu">
          <Input id="c-tagline" name="tagline" defaultValue={category?.tagline ?? ""} className="h-9" />
        </Field>
        <Field label="Description" htmlFor="c-desc" className="sm:col-span-2">
          <Textarea id="c-desc" name="description" rows={2} defaultValue={category?.description ?? ""} />
        </Field>
        <Field label="Hero title" htmlFor="c-hero" hint="Press Enter for a line break">
          <Textarea id="c-hero" name="heroTitle" rows={2} defaultValue={category?.heroTitle ?? ""} placeholder={"Precision\nIn Your Palm"} />
        </Field>
        <Field label="Hero subtitle" htmlFor="c-sub">
          <Input id="c-sub" name="heroSubtitle" defaultValue={category?.heroSubtitle ?? ""} className="h-9" />
        </Field>
        <Field label="Illustration" htmlFor="c-art">
          <Select name="art" defaultValue={category?.art ?? "monitor"}>
            <SelectTrigger id="c-art" className="h-9! w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ARTS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Position" htmlFor="c-pos" hint="0 = first in the menu">
          <Input id="c-pos" name="position" inputMode="numeric" defaultValue={String(category?.position ?? nextPosition)} className="h-9" />
        </Field>
      </form>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" form="category-form" disabled={pending}>
          {pending ? "Saving…" : category ? "Save changes" : "Create category"}
        </Button>
      </DialogFooter>
    </>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  warn,
  className,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  warn?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-xs">
        {label}
      </Label>
      {children}
      {hint && <p className={warn ? "mt-1 text-xs text-warning" : "mt-1 text-xs text-muted-foreground"}>{hint}</p>}
    </div>
  )
}
