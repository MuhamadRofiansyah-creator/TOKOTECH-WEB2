import type { Metadata } from "next"
import Link from "@/components/i18n/link"
import { getOrders, getProductsByIds } from "@/lib/data"
import { Suspense } from "react"
import { requireUser } from "@/lib/auth/session"
import { AccountSkeleton } from "@/components/account/account-skeleton"
import { formatDate, formatPrice } from "@/lib/format"
import { OrderStatusBadge } from "@/components/account/order-status"
import { ProductImage } from "@/components/product/product-image"
import { Button } from "@/components/ui/button"
import { getDictionary, getLocale } from "@/lib/i18n/dictionary"
import { localizePath } from "@/lib/i18n/config"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.orders }
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <OrdersContent />
    </Suspense>
  )
}

async function OrdersContent() {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()])
  const user = await requireUser(localizePath("/account/orders", locale))
  const orders = await getOrders(user.id)
  const products = new Map((await getProductsByIds([...new Set(orders.flatMap((o) => o.items.map((i) => i.productId)))])).map((p) => [p.id, p]))
  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight">{t.account.orders}</h1>
      <ul className="mt-6 space-y-4">
        {orders.map((o) => {
          return (
            <li key={o.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/50 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-medium">{o.number}</span>
                  <span className="text-muted-foreground">{formatDate(o.placedAt, locale)}</span>
                </div>
                <OrderStatusBadge status={o.status} />
              </div>
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <ul className="flex-1 space-y-3">
                  {o.items.map((it) => {
                    const p = products.get(it.productId)
                    if (!p) return null
                    return (
                      <li key={it.id} className="flex items-center gap-3">
                        <ProductImage product={p} colorHex={p.variants.find((v) => v.id === it.variantId)?.colorHex} className="aspect-square w-14 shrink-0 rounded-md" />
                        <span className="min-w-0">
                          <span className="line-clamp-1 text-sm">{it.productName}</span>
                          <span className="text-xs text-muted-foreground">
                            {it.variantName} · {it.quantity} × {formatPrice(it.unitPrice)}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <p className="text-sm">
                    Total <span className="font-semibold text-primary tabular-nums">{formatPrice(o.total)}</span>
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/account/orders/${o.number}`}>{t.account.viewDetails}</Link>
                  </Button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
