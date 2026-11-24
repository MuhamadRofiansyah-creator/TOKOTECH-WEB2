"use client"

import { useTransition } from "react"
import { Bell, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useDict, useRouter, useLocalePath } from "@/components/i18n/provider"
import { requestStockAlertAction } from "@/lib/actions/account"

/** Sold out: ask to be emailed when an admin restocks (StockAlert). */
export function StockAlertButton({ productId, slug }: { productId: string; slug: string }) {
  const t = useDict()
  const router = useRouter()
  const localPath = useLocalePath()
  const [pending, start] = useTransition()
  return (
    <Button
      size="lg"
      variant="outline"
      className="h-11 w-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await requestStockAlertAction(productId)
          if (res.ok) return void toast.success(t.extra.notifySet)
          if (res.error === "signin") {
            toast(t.extra.notifySignIn)
            router.push(`/login?next=${encodeURIComponent(localPath(`/p/${slug}`))}`)
            return
          }
          toast.error(t.extra.somethingWrong)
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Bell />} {t.extra.notifyMe}
    </Button>
  )
}
