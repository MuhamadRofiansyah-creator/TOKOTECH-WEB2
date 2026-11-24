import type { Metadata } from "next"
import Link from "@/components/i18n/link"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getGuestOrder, getProductsByIds } from "@/lib/data"
import { getSessionUser } from "@/lib/auth/session"
import { OrderDetailView } from "@/components/account/order-detail-view"
import { AccountSkeleton } from "@/components/account/account-skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { PackageSearch } from "lucide-react"
import { getDictionary } from "@/lib/i18n/dictionary"
import { fmt } from "@/lib/i18n/config"

// Guest order link: /orders/TT-123456?t=<guestAccessToken> (sent in the order emails).
// Signed-in shoppers without a token are sent to their account copy.

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.yourOrder, robots: { index: false } }
}

export default function GuestOrderPage({ params, searchParams }: PageProps<"/[lang]/orders/[number]">) {
  return (
    <div className="container-page pt-6 sm:pt-8">
      <Suspense fallback={<AccountSkeleton />}>
        <GuestOrder params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function GuestOrder({ params, searchParams }: Pick<PageProps<"/[lang]/orders/[number]">, "params" | "searchParams">) {
  const [{ number }, sp] = await Promise.all([params, searchParams])
  const token = typeof sp.t === "string" ? sp.t : ""
  const t = await getDictionary()
  const order = token ? await getGuestOrder(number, token) : null
  if (!order) {
    if (await getSessionUser()) redirect(`/account/orders/${number}`)
    return (
      <EmptyState icon={PackageSearch} title={t.order.notFound} body={t.order.notFoundBody}>
        <Button asChild>
          <Link href={`/login?next=/account/orders/${encodeURIComponent(number)}`}>{t.common.signIn}</Link>
        </Button>
      </EmptyState>
    )
  }
  const products = new Map((await getProductsByIds(order.items.map((i) => i.productId))).map((p) => [p.id, p]))
  return (
    <>
      <OrderDetailView order={order} products={products} />
      <p className="mt-6 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
        {fmt(t.order.claim, { email: order.email })}{" "}
        <Link href="/register" className="text-primary hover:underline">
          {t.common.createAccount}
        </Link>
      </p>
    </>
  )
}
