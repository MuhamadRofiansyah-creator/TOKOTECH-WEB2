"use client"

import { useState, useTransition } from "react"
import { Loader2, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDict } from "@/components/i18n/provider"
import { subscribeNewsletterAction } from "@/lib/actions/account"

/** Home page newsletter sign-up (saves a NewsletterSubscriber). */
export function NewsletterForm() {
  const t = useDict()
  const [email, setEmail] = useState("")
  const [pending, start] = useTransition()
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await subscribeNewsletterAction(email)
          if (!res.ok) return void toast.error(t.extra.newsletterInvalid)
          setEmail("")
          toast.success(t.home.subscribed)
        })
      }}
    >
      <label className="relative flex-1">
        <span className="sr-only">{t.home.email}</span>
        <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/50" />
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="h-11 border-white/15 bg-white/10 pl-9 text-white placeholder:text-white/50"
        />
      </label>
      <Button type="submit" size="lg" className="h-11 px-5" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} {t.home.subscribe}
      </Button>
    </form>
  )
}
