"use client"

import { useState } from "react"
import { Pause, Play, Plus, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Voucher, VoucherType } from "@/lib/types"
import type { getFlashSales } from "@/lib/data"
import { formatDate, formatPrice } from "@/lib/format"
import { createFlashSaleAction, createVoucherAction, setFlashSaleActiveAction, setVoucherActiveAction } from "@/lib/actions/admin"
import { PageHeader, StatusBadge } from "./status-badge"
import { useAdminAction } from "./use-admin-action"

type FlashData = Awaited<ReturnType<typeof getFlashSales>>

const describe = (v: Voucher) =>
  v.type === "PERCENT" ? `${v.value}% off${v.maxDiscount ? `, max ${formatPrice(v.maxDiscount)}` : ""}` : v.type === "FIXED" ? `${formatPrice(v.value)} off` : "Free shipping"

export function VouchersManager({ vouchers }: { vouchers: (Voucher & { expired: boolean })[] }) {
  const action = useAdminAction()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<VoucherType>("PERCENT")
  return (
    <>
      <PageHeader
        title="Vouchers"
        description="Codes customers enter in the cart. Limits are checked again when the order is placed."
        actions={
          <Button className="h-9" onClick={() => setOpen(true)}>
            <Plus /> New voucher
          </Button>
        }
      />
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Code</th>
              <th className="px-3 py-2.5 font-medium">Discount</th>
              <th className="px-3 py-2.5 font-medium">Min. spend</th>
              <th className="px-3 py-2.5 text-right font-medium">Used</th>
              <th className="px-3 py-2.5 font-medium">Ends</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {vouchers.map((v) => {
              const ended = v.expired
              return (
                <tr key={v.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <p className="font-mono font-medium">{v.code}</p>
                    {v.description && <p className="text-xs text-muted-foreground">{v.description}</p>}
                  </td>
                  <td className="px-3 py-3">{describe(v)}</td>
                  <td className="px-3 py-3 tabular-nums">{v.minSubtotal ? formatPrice(v.minSubtotal) : "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {v.usedCount}
                    {v.usageLimit != null && <span className="text-muted-foreground"> / {v.usageLimit}</span>}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{v.endsAt ? formatDate(v.endsAt) : "No end"}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={ended ? "EXPIRED" : v.isActive ? "ACTIVE" : "ARCHIVED"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" disabled={action.pending} onClick={() => action.run(() => setVoucherActiveAction(v.id, !v.isActive))}>
                      {v.isActive ? <Pause /> : <Play />} {v.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New voucher</DialogTitle>
            <DialogDescription>Codes are uppercase letters and digits.</DialogDescription>
          </DialogHeader>
          <form
            id="voucher-form"
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              action.run(() => createVoucherAction(form), () => setOpen(false))
            }}
          >
            <Field label="Code" className="sm:col-span-2">
              <Input name="code" required placeholder="PAYDAY15" className="h-9 uppercase" />
            </Field>
            <Field label="Type">
              <Select name="type" value={type} onValueChange={(v) => setType(v as VoucherType)}>
                <SelectTrigger className="h-9! w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Percent off</SelectItem>
                  <SelectItem value="FIXED">Fixed amount</SelectItem>
                  <SelectItem value="FREE_SHIPPING">Free shipping</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {type !== "FREE_SHIPPING" && (
              <Field label={type === "PERCENT" ? "Percent (1–100)" : "Amount (Rp)"}>
                <Input name="value" inputMode="numeric" required className="h-9" />
              </Field>
            )}
            {type === "PERCENT" && (
              <Field label="Max discount (Rp)">
                <Input name="maxDiscount" inputMode="numeric" placeholder="Optional" className="h-9" />
              </Field>
            )}
            <Field label="Minimum spend (Rp)">
              <Input name="minSubtotal" inputMode="numeric" placeholder="0" className="h-9" />
            </Field>
            <Field label="Total uses">
              <Input name="usageLimit" inputMode="numeric" placeholder="Unlimited" className="h-9" />
            </Field>
            <Field label="Uses per customer">
              <Input name="perUserLimit" inputMode="numeric" defaultValue="1" className="h-9" />
            </Field>
            <Field label="Ends on">
              <Input name="endsAt" type="date" className="h-9" />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Input name="description" placeholder="Shown to staff only" className="h-9" />
            </Field>
          </form>
          <DialogFooter>
            <Button type="submit" form="voucher-form" disabled={action.pending}>
              Create voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function FlashSalesManager({ data }: { data: FlashData }) {
  const action = useAdminAction()
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  return (
    <>
      <PageHeader
        title="Flash sales"
        description="Time-boxed deals on the home page. The checkout counts each item's quota."
        actions={
          <Button className="h-9" onClick={() => setOpen(true)}>
            <Zap /> New flash sale
          </Button>
        }
      />
      <div className="space-y-4">
        {data.sales.map((s) => {
          return (
            <section key={s.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.startsAt).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })} –{" "}
                    {new Date(s.endsAt).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })} WIB
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={{ LIVE: "ACTIVE", ENDED: "EXPIRED", SCHEDULED: "PENDING", PAUSED: "ARCHIVED" }[s.state]} />
                  <Button size="sm" variant="ghost" disabled={action.pending} onClick={() => action.run(() => setFlashSaleActiveAction(s.id, !s.isActive))}>
                    {s.isActive ? <Pause /> : <Play />} {s.isActive ? "Pause" : "Resume"}
                  </Button>
                </div>
              </div>
              <ul className="divide-y text-sm">
                {s.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-4 px-4 py-2.5">
                    <span className="min-w-0 flex-1 truncate">
                      {i.product} <span className="text-muted-foreground">· {i.variant}</span>
                    </span>
                    <span className="tabular-nums">{formatPrice(i.salePrice)}</span>
                    <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">
                      {i.sold}
                      {i.quota != null && ` / ${i.quota}`} sold
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
        {!data.sales.length && <p className="rounded-xl border bg-card px-4 py-16 text-center text-sm text-muted-foreground">No flash sales yet.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New flash sale</DialogTitle>
            <DialogDescription>Starts now. Items sell at their current (discounted) price until the quota runs out.</DialogDescription>
          </DialogHeader>
          <form
            id="flash-form"
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              form.set("variantIds", picked.join(","))
              action.run(() => createFlashSaleAction(form), () => {
                setOpen(false)
                setPicked([])
              })
            }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Name" className="sm:col-span-3">
                <Input name="name" defaultValue="Flash Sale" className="h-9" />
              </Field>
              <Field label="Hours">
                <Input name="hours" inputMode="numeric" defaultValue="24" className="h-9" />
              </Field>
              <Field label="Quota per item">
                <Input name="quota" inputMode="numeric" defaultValue="20" className="h-9" />
              </Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Products ({picked.length} selected)</legend>
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
                {data.candidates.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                      <Checkbox checked={picked.includes(c.id)} onCheckedChange={(v) => setPicked((p) => (v ? [...p, c.id] : p.filter((x) => x !== c.id)))} />
                      <span className="min-w-0 flex-1 truncate">{c.label}</span>
                      <span className="text-xs tabular-nums">{formatPrice(c.price)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          </form>
          <DialogFooter>
            <Button type="submit" form="flash-form" disabled={action.pending || !picked.length}>
              Start flash sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {children}
    </div>
  )
}
