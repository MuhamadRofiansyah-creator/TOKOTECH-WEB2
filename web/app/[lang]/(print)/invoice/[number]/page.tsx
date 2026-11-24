import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getGuestOrder, getOrder } from "@/lib/data"
import { requireUser } from "@/lib/auth/session"
import { getDictionary, getLocale } from "@/lib/i18n/dictionary"
import { fmt, localizePath } from "@/lib/i18n/config"
import { courierLabel, formatDate, formatPrice } from "@/lib/format"
import { Logo } from "@/components/layout/logo"
import { PrintButton } from "@/components/account/print-button"
import { Skeleton } from "@/components/ui/skeleton"

// Printable invoice: /invoice/TT-123456 (signed in) or /invoice/TT-123456?t=<guest token>.
// "Print or save as PDF" uses the browser's print dialog.

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).extra.invoice, robots: { index: false } }
}

export default function InvoicePage({ params, searchParams }: PageProps<"/[lang]/invoice/[number]">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-[600px] max-w-3xl rounded-xl" />}>
      <Invoice params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Invoice({ params, searchParams }: Pick<PageProps<"/[lang]/invoice/[number]">, "params" | "searchParams">) {
  const [{ number }, sp, t, locale] = await Promise.all([params, searchParams, getDictionary(), getLocale()])
  const token = typeof sp.t === "string" ? sp.t : ""
  const order = token
    ? await getGuestOrder(number, token)
    : await getOrder((await requireUser(localizePath(`/invoice/${number}`, locale))).id, number)
  if (!order) notFound()

  const paid = order.payments.find((p) => p.status === "PAID" || p.status === "REFUNDED")
  const shipment = order.shipments[0]

  return (
    <div className="mx-auto max-w-3xl px-4">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton label={t.extra.printInvoice} />
      </div>
      <article className="rounded-xl border bg-card p-8 text-sm print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b pb-6">
          <div>
            <Logo />
            <p className="mt-3 text-xs text-muted-foreground">TokoTech · Jl. Gatot Subroto Kav. 18, Jakarta</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-medium tracking-tight">{t.extra.invoice}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.extra.invoiceNo} <span className="font-medium text-foreground">INV-{order.number.replace("TT-", "")}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {t.extra.invoiceDate} {formatDate(order.placedAt, locale)}
            </p>
          </div>
        </header>

        <section className="grid gap-6 border-b py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{t.extra.billedTo}</p>
            <p className="mt-1 font-medium">{order.shipRecipient}</p>
            <p className="text-muted-foreground">{order.email}</p>
            <p className="text-muted-foreground">{order.shipPhone}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.extra.shipTo}</p>
            <p className="mt-1">
              {order.shipStreet}, {order.shipDistrict}, {order.shipCity}, {order.shipProvince} {order.shipPostalCode}
            </p>
            {shipment && <p className="text-muted-foreground">{courierLabel(shipment.courier, shipment.service)}</p>}
          </div>
        </section>

        <table className="mt-6 w-full">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-2 font-medium">{t.extra.item}</th>
              <th className="py-2 text-right font-medium">{t.extra.qty}</th>
              <th className="py-2 text-right font-medium">{t.extra.unitPrice}</th>
              <th className="py-2 text-right font-medium">{t.extra.amount}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="py-3">
                  <p>{i.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.variantName} · SKU {i.sku}
                  </p>
                </td>
                <td className="py-3 text-right tabular-nums">{i.quantity}</td>
                <td className="py-3 text-right tabular-nums">{formatPrice(i.unitPrice)}</td>
                <td className="py-3 text-right tabular-nums">{formatPrice(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-6 ml-auto w-full max-w-xs space-y-1.5 border-t pt-4">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t.common.subtotal}</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {t.common.voucher}
                {order.voucherCode && ` (${order.voucherCode})`}
              </dt>
              <dd className="tabular-nums">- {formatPrice(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t.common.shipping}</dt>
            <dd className="tabular-nums">{order.shippingFee ? formatPrice(order.shippingFee) : t.common.free}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-medium">
            <dt>{t.common.total}</dt>
            <dd className="tabular-nums">{formatPrice(order.total)}</dd>
          </div>
          <p className="pt-1 text-right text-xs text-muted-foreground">{fmt(t.extra.includesVat, { amount: formatPrice(order.tax) })}</p>
        </dl>

        <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          {paid ? fmt(t.extra.paidWith, { method: t.checkout.payments[paid.method].name }) : t.extra.unpaid} · {t.orderStatus[order.status]}
        </p>
      </article>
    </div>
  )
}
