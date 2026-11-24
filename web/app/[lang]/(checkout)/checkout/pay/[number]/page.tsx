import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth/session"
import { midtransEnabled } from "@/lib/payments/midtrans"
import { formatPrice } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import { MockPayButtons } from "@/components/checkout/mock-pay-buttons"
import { getDictionary } from "@/lib/i18n/dictionary"
import { fmt } from "@/lib/i18n/config"

// Development payment page, used when MIDTRANS_SERVER_KEY isn't set. It stands in for
// the Midtrans Snap page: "Pay" and "Fail" apply exactly what the webhook would.

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.payment, robots: { index: false } }
}

export default function MockPayPage({ params, searchParams }: PageProps<"/[lang]/checkout/pay/[number]">) {
  return (
    <div className="container-page mt-8 max-w-lg">
      <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
        <MockPay params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function MockPay({ params, searchParams }: Pick<PageProps<"/[lang]/checkout/pay/[number]">, "params" | "searchParams">) {
  const [{ number }, sp] = await Promise.all([params, searchParams])
  const token = typeof sp.t === "string" ? sp.t : null
  const payment = await db.payment.findUnique({ where: { number }, include: { order: { select: { number: true, userId: true, guestAccessToken: true, total: true } } } })
  const user = await getSessionUser()
  const owner = payment && (payment.order.userId ? payment.order.userId === user?.id : payment.order.guestAccessToken === token)
  if (!payment || !owner) notFound()
  const t = await getDictionary()

  return (
    <div className="rounded-2xl border bg-card p-6">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.checkout.testPayment}</p>
      <h1 className="mt-1 text-2xl font-medium">{formatPrice(payment.amount)}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {fmt(t.checkout.orderLine, { order: payment.order.number, method: t.checkout.payments[payment.method].name, payment: payment.number })}
      </p>
      {midtransEnabled() ? (
        <p className="mt-6 text-sm">{t.checkout.midtransActive}</p>
      ) : payment.status !== "PENDING" ? (
        <p className="mt-6 text-sm">{fmt(t.checkout.alreadyDone, { status: payment.status.toLowerCase() })}</p>
      ) : (
        <>
          <p className="mt-6 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
            {t.checkout.mockNote}
          </p>
          <MockPayButtons paymentNumber={payment.number} token={token} />
        </>
      )}
    </div>
  )
}
