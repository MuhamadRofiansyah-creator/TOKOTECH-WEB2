import type { Metadata } from "next"
import Link from "@/components/i18n/link"
import { ArrowRight, Award, Package, Truck, Wallet } from "lucide-react"
import { getOrders, getProductsByIds } from "@/lib/data"
import { Suspense } from "react"
import { requireUser } from "@/lib/auth/session"
import { AccountSkeleton } from "@/components/account/account-skeleton"
import { formatDate, formatPrice } from "@/lib/format"
import { OrderStatusBadge } from "@/components/account/order-status"
import { ProductImage } from "@/components/product/product-image"
import { Progress } from "@/components/ui/progress"
import { getDictionary, getLocale } from "@/lib/i18n/dictionary"
import { fmt, localizePath } from "@/lib/i18n/config"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.account }
}

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <AccountContent />
    </Suspense>
  )
}

async function AccountContent() {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()])
  const user = await requireUser(localizePath("/account", locale))
  const orders = await getOrders(user.id)
  const recent = orders.slice(0, 3)
  const products = await getProductsByIds(recent.map((o) => o.items[0].productId))
  const spent = orders
    .filter((o) => o.paidAt && o.status !== "RETURNED")
    .reduce((n, o) => n + o.total, 0)

  const stats = [
    { label: t.account.totalOrders, value: String(orders.length), icon: Package },
    { label: t.account.inTransit, value: String(orders.filter((o) => o.status === "SHIPPED").length), icon: Truck },
    { label: t.account.totalSpent, value: formatPrice(spent), icon: Wallet },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-medium tracking-tight">{fmt(t.account.hi, { name: user.name?.split(" ")[0] ?? t.account.there })}</h1>

      <ul className="grid gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <li key={label} className="rounded-xl border bg-card p-4">
            <Icon className="size-5 text-primary" />
            <p className="mt-3 text-xl font-medium tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </li>
        ))}
      </ul>

      <div className="rounded-xl border bg-gradient-to-br from-accent to-card p-5">
        <div className="flex items-center gap-3">
          <Award className="size-6 text-primary" />
          <div className="flex-1">
            <p className="font-medium">{t.account.member}</p>
            <p className="text-xs text-muted-foreground">{fmt(t.account.toGold, { amount: formatPrice(Math.max(0, 50_000_000 - spent)) })}</p>
          </div>
        </div>
        <Progress value={Math.min(100, (spent / 50_000_000) * 100)} className="mt-4 h-2" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">{t.account.recentOrders}</h2>
          <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            {t.account.viewAll} <ArrowRight className="size-4" />
          </Link>
        </div>
        <ul className="divide-y rounded-xl border bg-card">
          {recent.map((o, i) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.number}`} className="flex items-center gap-4 p-4 hover:bg-muted/50">
                {products[i] && <ProductImage product={products[i]} className="aspect-square w-14 shrink-0 rounded-md" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{o.number}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(o.placedAt, locale)} · {o.items.length > 1 ? fmt(t.account.itemCount, { n: o.items.length }) : t.account.oneItem}
                  </p>
                </div>
                <OrderStatusBadge status={o.status} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
