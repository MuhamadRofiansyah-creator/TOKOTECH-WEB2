"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { downloadCsv, useAdminAction } from "./use-admin-action"
import { markDeliveredAction, refundPaymentAction, shipOrderAction } from "@/lib/actions/admin"
import { Building2, CheckCircle2, CreditCard, Download, QrCode, RotateCcw, Truck, Wallet } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import type { AdminPaymentRow as Payment, PaymentMethod, PaymentStatus } from "@/lib/types"
import { PAYMENT_METHOD_LABEL, compactIDR, formatPrice, providerLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import { StatusBadge } from "./status-badge"
import { SegmentedTabs, TablePagination, TableSearch } from "./data-table-parts"
import { DateRangeSelect } from "./date-range-select"
import { rangeDays } from "@/lib/admin-ranges"


const PER_PAGE = 12
const METHOD_ICON: Record<PaymentMethod, LucideIcon> = {
  QRIS: QrCode,
  VIRTUAL_ACCOUNT: Building2,
  CREDIT_CARD: CreditCard,
  EWALLET: Wallet,
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })

type Tab = "all" | PaymentStatus

export function PaymentsManager({ payments }: { payments: Payment[] }) {
  const [tab, setTab] = useState<Tab>("all")
  const [range, setRange] = useState("30d")
  // Range is relative to the newest payment, so the filter is stable during render
  const newest = payments.reduce((n, p) => Math.max(n, Date.parse(p.createdAt)), 0)
  const inRange = (p: Payment) => Date.parse(p.createdAt) > newest - rangeDays(range) * 86_400_000
  const [method, setMethod] = useState("all")
  const initialQuery = useSearchParams().get("q") ?? ""
  const [query, setQuery] = useState(initialQuery)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<Payment | null>(null)

  const sumBy = (s: PaymentStatus) => payments.filter((p) => p.status === s).reduce((n, p) => n + p.amount, 0)
  const countBy = (s: PaymentStatus) => payments.filter((p) => p.status === s).length
  const summary = [
    { label: "Collected", value: sumBy("PAID"), count: countBy("PAID"), status: "PAID" },
    { label: "Pending", value: sumBy("PENDING"), count: countBy("PENDING"), status: "PENDING" },
    { label: "Refunded", value: sumBy("REFUNDED"), count: countBy("REFUNDED"), status: "REFUNDED" },
    { label: "Failed", value: sumBy("FAILED"), count: countBy("FAILED"), status: "FAILED" },
  ] as const

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return payments.filter(
      (p) =>
        inRange(p) &&
        (tab === "all" || p.status === tab) &&
        (method === "all" || p.method === method) &&
        (!q || [p.number, p.orderNumber, p.customer, p.email].some((s) => s.toLowerCase().includes(q))),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, tab, method, query, range])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track transactions, settlements and refunds.</p>
        </div>
        <Button
          variant="outline"
          className="h-9"
          onClick={() =>
            downloadCsv(
              "payments.csv",
              filtered.map((p) => ({ payment: p.number, order: p.orderNumber, customer: p.customer, email: p.email, method: p.method, provider: p.provider, status: p.status, amount: p.amount, fee: p.fee, created: p.createdAt })),
            )
          }
        >
          <Download /> Export CSV
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <DateRangeSelect value={range} onChange={(v) => { setRange(v); setPage(1) }} />
        <Select value={method} onValueChange={(v) => { setMethod(v); setPage(1) }}>
          <SelectTrigger className="h-9! min-w-40 bg-background" aria-label="Payment method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All methods</SelectItem>
            {(Object.keys(METHOD_ICON) as PaymentMethod[]).map((m) => (
              <SelectItem key={m} value={m}>
                {PAYMENT_METHOD_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ul className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((s) => (
          <li key={s.label}>
            <button
              type="button"
              onClick={() => { setTab(s.status); setPage(1) }}
              className={cn(
                "w-full rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/40",
                tab === s.status && "border-primary ring-1 ring-primary",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <StatusBadge status={s.status} />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums" title={formatPrice(s.value)}>
                {compactIDR(s.value)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{s.count} transactions</p>
            </button>
          </li>
        ))}
      </ul>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-1">
          <SegmentedTabs<Tab>
            value={tab}
            onChange={(v) => { setTab(v); setPage(1) }}
            options={[
              { value: "all", label: "All", count: payments.length },
              { value: "PAID", label: "Paid" },
              { value: "PENDING", label: "Pending", count: countBy("PENDING") },
              { value: "REFUNDED", label: "Refunded" },
              { value: "FAILED", label: "Failed" },
              { value: "EXPIRED", label: "Expired" },
            ]}
          />
          <TableSearch value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Search ID, order or customer" className="mb-2 w-full sm:w-72" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-y bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Transaction</th>
                <th className="px-3 py-2.5 font-medium">Customer</th>
                <th className="px-3 py-2.5 font-medium">Method</th>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((p) => {
                const Icon = METHOD_ICON[p.method]
                return (
                  <tr
                    key={p.id}
                    tabIndex={0}
                    onClick={() => setOpen(p)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(p))}
                    className="cursor-pointer outline-none hover:bg-muted/40 focus-visible:bg-accent/40"
                    aria-label={`Open ${p.number}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.number}</p>
                      <p className="text-xs text-muted-foreground">{p.orderNumber}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p>{p.customer}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Icon className="size-4" /> {providerLabel(p.provider)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{fmtDate(p.createdAt)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className={cn("px-4 py-3 text-right font-medium tabular-nums", p.status === "REFUNDED" && "text-muted-foreground line-through")}>
                      {formatPrice(p.amount)}
                    </td>
                  </tr>
                )
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                    No transactions match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={current} pageCount={pageCount} total={filtered.length} perPage={PER_PAGE} onPage={setPage} />
      </div>

      <PaymentDrawer payment={open} onClose={() => setOpen(null)} />
    </>
  )
}

function PaymentDrawer({ payment: p, onClose }: { payment: Payment | null; onClose: () => void }) {
  const action = useAdminAction()
  const Icon = p ? METHOD_ICON[p.method] : CreditCard
  return (
    <Sheet open={!!p} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        {p && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>{p.number}</SheetTitle>
              <SheetDescription>Order {p.orderNumber}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
              <div className="rounded-xl bg-muted/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatPrice(p.amount)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{fmtDate(p.createdAt)} WIB</p>
              </div>

              <dl className="space-y-3 text-sm">
                {[
                  ["Customer", `${p.customer}`],
                  ["Email", p.email],
                  ["Items", String(p.itemCount)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Method</dt>
                  <dd className="inline-flex items-center gap-1.5">
                    <Icon className="size-4 text-muted-foreground" /> {providerLabel(p.provider)}
                  </dd>
                </div>
              </dl>

              <Separator />

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Gross</dt>
                  <dd className="tabular-nums">{formatPrice(p.amount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Gateway fee</dt>
                  <dd className="tabular-nums">- {formatPrice(p.fee)}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <dt>Net settlement</dt>
                  <dd className="tabular-nums">{formatPrice(p.amount - p.fee)}</dd>
                </div>
              </dl>

              <div>
                <h3 className="mb-3 text-sm font-medium">Timeline</h3>
                <ol className="relative space-y-4 border-l pl-5 text-sm">
                  {[
                    ["Payment created", true],
                    [p.status === "FAILED" ? "Payment failed" : p.status === "EXPIRED" ? "Payment window expired" : "Payment authorised", p.status !== "PENDING"],
                    ...(p.status === "REFUNDED" ? [["Refund issued", true] as const] : []),
                    [p.status === "PAID" ? "Settled to bank" : "Settlement", p.status === "PAID"],
                  ].map(([label, done], i) => (
                    <li key={i} className="relative">
                      <span
                        className={cn(
                          "absolute top-1 -left-[25px] size-2.5 rounded-full ring-4 ring-background",
                          done ? "bg-primary" : "bg-muted-foreground/30",
                        )}
                      />
                      <span className={done ? "" : "text-muted-foreground"}>{label}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <SheetFooter className="flex-col gap-3 border-t">
              <p className="text-xs text-muted-foreground">
                Order status: <span className="font-medium text-foreground">{p.orderStatus.replace("_", " ").toLowerCase()}</span>
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                {(p.orderStatus === "PAID" || p.orderStatus === "PROCESSING") && (
                  <Button disabled={action.pending} onClick={() => action.run(() => shipOrderAction(p.orderNumber), onClose)}>
                    <Truck /> Book pickup &amp; ship
                  </Button>
                )}
                {p.orderStatus === "SHIPPED" && (
                  <Button variant="outline" disabled={action.pending} onClick={() => action.run(() => markDeliveredAction(p.orderNumber), onClose)}>
                    <CheckCircle2 /> Mark delivered
                  </Button>
                )}
              </div>
              {p.status === "PAID" && (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const reason = String(new FormData(e.currentTarget).get("reason") ?? "")
                    action.run(() => refundPaymentAction(p.id, reason), onClose)
                  }}
                >
                  <Input name="reason" placeholder="Refund reason (required)" required minLength={3} className="h-9" aria-label="Refund reason" />
                  <Button type="submit" variant="outline" disabled={action.pending} className="text-destructive hover:text-destructive">
                    <RotateCcw /> Refund {formatPrice(p.amount)}
                  </Button>
                </form>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
