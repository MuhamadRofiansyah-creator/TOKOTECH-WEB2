"use client"

import { toast } from "sonner"
import { useState } from "react"
import { ImagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ProductImage } from "@/components/product/product-image"
import { useAdminAction } from "./use-admin-action"
import { saveProductAction } from "@/lib/actions/admin"
import type { AdminProductRow as AdminProduct, Brand } from "@/lib/types"

/** Add / edit drawer. Phase 1: the form is visual only; Save shows a toast. */
export function ProductEditor({
  product,
  open,
  onOpenChange,
  categories,
  brands,
}: {
  product: AdminProduct | null
  open: boolean
  onOpenChange: (o: boolean) => void
  categories: string[]
  brands: Brand[]
}) {
  const isNew = !product
  const action = useAdminAction()
  const [previews, setPreviews] = useState<string[]>([])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle>{isNew ? "Add product" : "Edit product"}</SheetTitle>
          <SheetDescription>{isNew ? "Create a new listing for the store." : product.sku}</SheetDescription>
        </SheetHeader>

        <form
          key={product?.id ?? "new"}
          id="product-form"
          className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault()
            const form = new FormData(e.currentTarget)
            action.run(() => saveProductAction(product?.id ?? null, form), () => onOpenChange(false))
          }}
        >
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Media</h3>
            <div className="grid grid-cols-4 gap-2">
              {product &&
                [0, 1, 2].map((v) => (
                  <ProductImage key={v} product={{ id: product.id, accent: product.accent, category: { art: product.art } }} colorHex={product.colorHex} variant={v} className="aspect-square rounded-lg" />
                ))}
              {previews.map((src) => (
                // Local preview only (object URL); nothing is uploaded
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="aspect-square rounded-lg object-cover ring-1 ring-border" />
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <ImagePlus className="size-5" />
                Upload
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])].slice(0, 8)
                    setPreviews((p) => [...p, ...files.map((file) => URL.createObjectURL(file))])
                    if (files.length) toast("Preview only: saving photos needs file storage, so the store keeps the generated art for now.")
                    e.target.value = ""
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {previews.length ? "Preview only: photos aren't saved yet (no file storage configured)." : "PNG or JPG up to 5 MB. The first image is the cover."}
            </p>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Details</h3>
            <Field id="p-name" label="Product name">
              <Input id="p-name" name="name" defaultValue={product?.name} placeholder="e.g. UltraGear 27&quot; 240Hz" required className="h-10" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="p-brand" label="Brand">
                <Select name="brand" defaultValue={product?.brandSlug ?? brands[0].slug}>
                  <SelectTrigger id="p-brand" className="h-10! w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.slug} value={b.slug}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="p-cat" label="Category">
                <Select name="category" defaultValue={product?.category ?? categories[0]}>
                  <SelectTrigger id="p-cat" className="h-10! w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field id="p-desc" label="Description">
              <Textarea id="p-desc" name="description" rows={4} defaultValue={product?.description} placeholder="What makes this product great?" />
            </Field>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Pricing & inventory</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="p-price" label="Price (Rp)">
                <Input id="p-price" name="price" inputMode="numeric" defaultValue={product?.priceFrom.toLocaleString("id-ID")} placeholder="0" className="h-10 tabular-nums" />
              </Field>
              <Field id="p-compare" label="Compare-at price (Rp)" hint="Shown struck through when on sale">
                <Input id="p-compare" name="compareAt" inputMode="numeric" defaultValue={product?.compareAtFrom?.toLocaleString("id-ID")} placeholder="Optional" className="h-10 tabular-nums" />
              </Field>
              <Field id="p-sku" label="SKU">
                <Input id="p-sku" name="sku" defaultValue={product?.sku} placeholder="TT-XXX-0000" className="h-10" />
              </Field>
              <Field id="p-stock" label="Stock quantity">
                <Input id="p-stock" name="stock" type="number" min={0} defaultValue={product?.totalStock ?? 0} className="h-10 tabular-nums" />
              </Field>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Visibility</h3>
            <Field id="p-status" label="Status">
              <Select name="status" defaultValue={product?.status ?? "DRAFT"}>
                <SelectTrigger id="p-status" className="h-10! w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active: visible in store</SelectItem>
                  <SelectItem value="DRAFT">Draft: hidden</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </section>
        </form>

        <SheetFooter className="flex-row justify-end border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" disabled={action.pending}>
            {action.pending ? "Saving…" : isNew ? "Create product" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
