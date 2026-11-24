import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getOrder, getProductsByIds } from "@/lib/data"
import { Suspense } from "react"
import { requireUser } from "@/lib/auth/session"
import { AccountSkeleton } from "@/components/account/account-skeleton"
import { OrderDetailView } from "@/components/account/order-detail-view"
import { getDictionary, getLocale } from "@/lib/i18n/dictionary"
import { localizePath } from "@/lib/i18n/config"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.orderDetails }
}

export default function OrderDetailPage({ params }: PageProps<"/[lang]/account/orders/[id]">) {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <OrderDetail params={params} />
    </Suspense>
  )
}

async function OrderDetail({ params }: { params: PageProps<"/[lang]/account/orders/[id]">["params"] }) {
  const { id } = await params
  const [t, locale] = await Promise.all([getDictionary(), getLocale()])
  const user = await requireUser(localizePath(`/account/orders/${id}`, locale))
  const order = await getOrder(user.id, id)
  if (!order) notFound()
  const products = new Map((await getProductsByIds(order.items.map((i) => i.productId))).map((p) => [p.id, p]))

  return <OrderDetailView order={order} products={products} back={{ href: "/account/orders", label: t.order.allOrders }} />
}
