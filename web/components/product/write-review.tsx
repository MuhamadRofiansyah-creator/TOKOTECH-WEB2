"use client"

import { useState, useTransition } from "react"
import { Loader2, Star } from "lucide-react"
import { toast } from "sonner"
import Link from "@/components/i18n/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useDict, useLocalePath } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"
import { cn } from "@/lib/utils"
import { reviewEligibilityAction, submitReviewAction } from "@/lib/actions/account"

type Status = "loading" | "signin" | "notBought" | "reviewed" | "ok"

/** "Write a review": only buyers with a delivered order can review; reviews wait for staff moderation. */
export function WriteReviewButton({ productId, productName, slug }: { productId: string; productName: string; slug: string }) {
  const t = useDict()
  const localPath = useLocalePath()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>("loading")
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  const openDialog = () => {
    setOpen(true)
    setStatus("loading")
    reviewEligibilityAction(productId)
      .then((r) => setStatus(r.status))
      .catch(() => setStatus("notBought"))
  }

  return (
    <>
      <Button variant="outline" className="mt-6 w-full" onClick={openDialog}>
        {t.extra.reviewTitle}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.extra.reviewTitle}</DialogTitle>
            <DialogDescription>{fmt(t.extra.reviewFor, { product: productName })}</DialogDescription>
          </DialogHeader>

          {status === "loading" && <Loader2 className="mx-auto my-6 size-6 animate-spin text-muted-foreground" />}
          {status === "signin" && (
            <div className="space-y-3 text-sm">
              <p>{t.extra.reviewSignIn}</p>
              <Button asChild className="w-full">
                <Link href={`/login?next=${encodeURIComponent(localPath(`/p/${slug}`))}`}>{t.common.signIn}</Link>
              </Button>
            </div>
          )}
          {status === "notBought" && <p className="text-sm text-muted-foreground">{t.extra.reviewNotBought}</p>}
          {status === "reviewed" && <p className="text-sm text-muted-foreground">{t.extra.reviewDone}</p>}

          {status === "ok" && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                const form = new FormData(e.currentTarget)
                start(async () => {
                  const res = await submitReviewAction(productId, { rating, title: String(form.get("title") ?? ""), body: String(form.get("body") ?? "") })
                  if (!res.ok) return setError(t.extra.reviewErrors[res.error] ?? t.extra.somethingWrong)
                  setError("")
                  setOpen(false)
                  setRating(0)
                  toast.success(t.extra.reviewSubmitted)
                })
              }}
            >
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">{t.extra.yourRating}</legend>
                <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={fmt(t.extra.stars, { n })}
                      aria-pressed={rating === n}
                      onMouseEnter={() => setHover(n)}
                      onClick={() => setRating(n)}
                      className="rounded p-0.5"
                    >
                      <Star className={cn("size-7", n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="space-y-1.5">
                <Label htmlFor="r-title">{t.extra.reviewHeadline}</Label>
                <Input id="r-title" name="title" maxLength={120} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-body">{t.extra.reviewBody}</Label>
                <Textarea id="r-body" name="body" rows={4} maxLength={2000} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />} {t.extra.submitReview}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
