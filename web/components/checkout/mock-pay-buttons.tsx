"use client"

import { useRouter } from "@/components/i18n/provider"
import { useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { simulatePaymentAction } from "@/lib/actions/checkout"
import { useDict } from "@/components/i18n/provider"

export function MockPayButtons({ paymentNumber, token }: { paymentNumber: string; token: string | null }) {
  const t = useDict()
  const router = useRouter()
  const [pending, start] = useTransition()
  const go = (outcome: "PAID" | "FAILED") =>
    start(async () => {
      const res = await simulatePaymentAction(paymentNumber, token, outcome)
      if ("error" in res) return void toast.error(res.error)
      toast.success(outcome === "PAID" ? t.checkout.paid : t.checkout.failed)
      router.push(res.redirect)
    })
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <Button size="lg" className="h-11 flex-1" disabled={pending} onClick={() => go("PAID")}>
        {pending && <Loader2 className="animate-spin" />} {t.checkout.paySuccess}
      </Button>
      <Button size="lg" variant="outline" className="h-11" disabled={pending} onClick={() => go("FAILED")}>
        {t.checkout.payFail}
      </Button>
    </div>
  )
}
