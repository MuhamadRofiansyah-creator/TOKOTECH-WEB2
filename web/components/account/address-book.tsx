"use client"

import { useState, useTransition } from "react"
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useDict, useRouter } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"
import type { Address } from "@/lib/types"
import { deleteAddressAction, saveAddressAction, setDefaultAddressAction, type AddressInput } from "@/lib/actions/account"

const PROVINCES = [
  "DKI Jakarta", "Jawa Barat", "Banten", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", "Bali",
  "Sumatera Utara", "Sumatera Barat", "Riau", "Sumatera Selatan", "Lampung", "Kalimantan Barat",
  "Kalimantan Timur", "Sulawesi Selatan", "Sulawesi Utara", "Nusa Tenggara Barat", "Papua",
]

const EMPTY: AddressInput = { label: "", recipient: "", phone: "", street: "", district: "", city: "", province: "DKI Jakarta", postalCode: "", notes: "", isDefault: false }

export function AddressBook({ addresses }: { addresses: Address[] }) {
  const t = useDict()
  const router = useRouter()
  const [editing, setEditing] = useState<Address | "new" | null>(null)
  const [pending, start] = useTransition()

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const res = await fn()
      if (!res.ok) return void toast.error(t.extra.addressErrors[res.error ?? ""] ?? t.extra.somethingWrong)
      toast.success(success)
      router.refresh()
    })

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight">{t.account.addresses}</h1>
        <Button onClick={() => setEditing("new")}>
          <Plus /> {t.account.addAddress}
        </Button>
      </div>

      {!addresses.length && <p className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t.extra.noAddresses}</p>}

      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="flex flex-col rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <span className="font-medium">{a.label}</span>
              {a.isDefault && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">{t.account.primary}</span>}
            </div>
            <p className="mt-3 text-sm">
              {a.recipient} · {a.phone}
            </p>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">
              {a.street}, {a.district}, {a.city}, {a.province} {a.postalCode}
              {a.notes && <span className="mt-1 block text-xs">{fmt(t.account.note, { note: a.notes })}</span>}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(a)}>
                {t.common.edit}
              </Button>
              {!a.isDefault && (
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => setDefaultAddressAction(a.id), t.extra.primarySet)}>
                  {t.account.setPrimary}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-muted-foreground hover:text-destructive"
                disabled={pending}
                onClick={() => window.confirm(t.extra.confirmDelete) && run(() => deleteAddressAction(a.id), t.extra.addressDeleted)}
              >
                <Trash2 /> {t.extra.deleteAddress}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing !== null && (
            <AddressForm
              key={editing === "new" ? "new" : editing.id}
              initial={editing === "new" ? { ...EMPTY, isDefault: !addresses.length } : { ...editing, notes: editing.notes ?? "" }}
              title={editing === "new" ? t.extra.addTitle : t.extra.editTitle}
              onSaved={() => {
                setEditing(null)
                toast.success(t.extra.addressSaved)
                router.refresh()
              }}
              id={editing === "new" ? null : editing.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddressForm({ id, initial, title, onSaved }: { id: string | null; initial: AddressInput; title: string; onSaved: () => void }) {
  const t = useDict()
  const [a, setA] = useState<AddressInput>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()
  const msg: Record<string, string> = { ...t.checkout.errors, label: t.extra.addressErrors.label, province: t.extra.addressErrors.province }

  const field = (key: keyof AddressInput, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`a-${key}`}>{label}</Label>
      <Input id={`a-${key}`} value={String(a[key] ?? "")} onChange={(e) => setA((x) => ({ ...x, [key]: e.target.value }))} aria-invalid={!!errors[key]} className="h-10" {...props} />
      {errors[key] && <p className="text-xs text-destructive">{msg[errors[key]] ?? errors[key]}</p>}
    </div>
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await saveAddressAction(id, a)
          if (res.ok) return onSaved()
          if (res.error === "fields" && "fields" in res) return setErrors(res.fields)
          toast.error(t.extra.addressErrors[res.error] ?? t.extra.somethingWrong)
        })
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="mt-4 grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        <div className="sm:col-span-2">{field("label", t.extra.addressLabel)}</div>
        {field("recipient", t.checkout.recipient, { autoComplete: "name" })}
        {field("phone", t.checkout.phone, { autoComplete: "tel", inputMode: "tel" })}
        <div className="sm:col-span-2">{field("street", t.checkout.street, { autoComplete: "street-address" })}</div>
        {field("district", t.checkout.district)}
        {field("city", t.checkout.city, { autoComplete: "address-level2" })}
        <div className="space-y-1.5">
          <Label htmlFor="a-province">{t.checkout.province}</Label>
          <Select value={a.province} onValueChange={(v) => setA((x) => ({ ...x, province: v }))}>
            <SelectTrigger id="a-province" className="h-10! w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {field("postalCode", t.checkout.postal, { inputMode: "numeric", maxLength: 5, autoComplete: "postal-code" })}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="a-notes">{t.checkout.notes}</Label>
          <Textarea id="a-notes" value={a.notes ?? ""} onChange={(e) => setA((x) => ({ ...x, notes: e.target.value }))} placeholder={t.checkout.notesPlaceholder} />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Checkbox id="a-default" checked={!!a.isDefault} onCheckedChange={(v) => setA((x) => ({ ...x, isDefault: v === true }))} />
          <Label htmlFor="a-default" className="font-normal text-muted-foreground">
            {t.extra.makePrimary}
          </Label>
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} {t.extra.saveAddress}
        </Button>
      </DialogFooter>
    </form>
  )
}
