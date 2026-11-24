import Link from "@/components/i18n/link"
import { ArrowLeft, Check, CircleX } from "lucide-react"
import { courierLabel, formatDate, formatPrice } from "@/lib/format"
import type { OrderStatus, OrderWithDetails, ProductWithRelations } from "@/lib/types"
import { OrderStatusBadge } from "@/components/account/order-status"
import { ProductImage } from "@/components/product/product-image"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getDictionary, getLocale } from "@/lib/i18n/dictionary"
import { fmt } from "@/lib/i18n/config"

// Order details, shared by the account page and the guest order link (/orders/[number]?t=…).

/** How many TIMELINE steps each status has completed. */
const REACHED: Record<OrderStatus, number> = { PENDING_PAYMENT: 1, PAID: 2, PROCESSING: 3, SHIPPED: 4, DELIVERED: 5, RETURNED: 5, CANCELLED: 1 }

export async function OrderDetailView({
  order,
  products,
  back,
}: {
  order: OrderWithDetails
  products: Map<string, ProductWithRelations>
  back?: { href: string; label: string }
}) {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()])
  const shipment = order.shipments[0]
  const reached = REACHED[order.status]
  const pending = order.payments.find((p) => p.status === "PENDING")

  return (
    <div>
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {back.label}
        </Link>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-medium tracking-tight">{fmt(t.order.title, { number: order.number })}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{fmt(t.order.placedOn, { date: formatDate(order.placedAt, locale) })}</p>

      {order.status === "PENDING_PAYMENT" && pending && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <p>
            <span className="font-medium">{t.order.waiting}</span>{" "}
            {fmt(t.order.heldUntil, {
              time: pending.expiresAt
                ? new Date(pending.expiresAt).toLocaleString(locale === "id" ? "id-ID" : "en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB"
                : t.order.windowEnds,
            })}
          </p>
          <Button asChild size="sm">
            <a href={pending.redirectUrl ?? `/checkout/pay/${pending.number}${order.guestAccessToken ? `?t=${order.guestAccessToken}` : ""}`}>{t.order.completePayment}</a>
          </Button>
        </div>
      )}

      <ol className="mt-6 grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-5">
        {t.order.timeline.map((step, i) => {
          const done = i < reached
          const cancelled = order.status === "CANCELLED" && i === reached
          return (
            <li key={step} className="flex items-center gap-3 sm:flex-col sm:text-center">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border",
                  done && "border-primary bg-primary text-primary-foreground",
                  cancelled && "border-destructive bg-destructive/10 text-destructive",
                )}
              >
                {cancelled ? <CircleX className="size-4" /> : done ? <Check className="size-4" /> : <span className="text-xs">{i + 1}</span>}
              </span>
              <span className={cn("text-xs", done ? "text-foreground" : "text-muted-foreground")}>
                {cancelled ? t.order.cancelled : step}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <ul className="divide-y rounded-xl border bg-card">
          {order.items.map((it) => {
            const p = products.get(it.productId)
            if (!p) return null
            return (
              <li key={it.id} className="flex items-center gap-4 p-4">
                <ProductImage product={p} colorHex={p.variants.find((v) => v.id === it.variantId)?.colorHex} className="aspect-square w-16 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <Link href={`/p/${p.slug}`} className="line-clamp-1 text-sm font-medium hover:text-primary">
                    {it.productName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {it.variantName} · {it.quantity} × {formatPrice(it.unitPrice)}
                  </p>
                </div>
                <span className="text-sm tabular-nums">{formatPrice(it.lineTotal)}</span>
              </li>
            )
          })}
        </ul>
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 text-sm">
            <p className="text-xs text-muted-foreground">{t.order.shippingTo}</p>
            <p className="mt-1">
              {order.shipRecipient} · {order.shipPhone}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {order.shipStreet}, {order.shipDistrict}, {order.shipCity}, {order.shipProvince} {order.shipPostalCode}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">{t.order.courier}</p>
            <p className="mt-1">{shipment ? courierLabel(shipment.courier, shipment.service) : t.order.notBooked}</p>
            {shipment?.trackingNumber && <p className="text-xs text-muted-foreground">{fmt(t.order.waybill, { n: shipment.trackingNumber })}</p>}
          </div>
          <dl className="space-y-2 rounded-xl border bg-card p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.common.subtotal}</dt>
              <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-success">
                <dt>{t.common.voucher}{order.voucherCode && ` (${order.voucherCode})`}</dt>
                <dd className="tabular-nums">- {formatPrice(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.common.shipping}</dt>
              <dd className="tabular-nums">{order.shippingFee ? formatPrice(order.shippingFee) : t.common.free}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <dt>{t.common.total}</dt>
              <dd className="text-primary tabular-nums">{formatPrice(order.total)}</dd>
            </div>
          </dl>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/invoice/${order.number}${order.guestAccessToken ? `?t=${order.guestAccessToken}` : ""}`}>{t.order.invoice}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
