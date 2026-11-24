"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import Link from "@/components/i18n/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDict, useLocale } from "@/components/i18n/provider"
import { requestPasswordResetAction, resetPasswordAction } from "@/lib/actions/account"

export function ForgotPasswordForm() {
  const t = useDict()
  const locale = useLocale()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [sent, setSent] = useState<{ link?: string } | null>(null)
  const [pending, start] = useTransition()

  if (sent)
    return (
      <div className="mt-6 space-y-4">
        <p className="flex items-start gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> {t.extra.linkSent}
        </p>
        {sent.link && (
          // Only when MOCK_EMAIL_LINKS="true" (self-hosted): email may not reach this inbox
          <a href={sent.link} className="block rounded-lg border border-dashed p-3 text-sm text-primary hover:underline">
            {t.extra.devLink} →
          </a>
        )}
        <Link href="/login" className="inline-block text-sm text-primary hover:underline">
          {t.extra.backToSignIn}
        </Link>
      </div>
    )

  return (
    <form
      className="mt-6 space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await requestPasswordResetAction(email, locale === "id" ? "/id" : "")
          if (!res.ok) return setError(t.extra.emailInvalid)
          setError("")
          setSent(res.data ?? {})
        })
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} className="h-10" />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} {t.extra.sendLink}
      </Button>
      <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-primary">
        {t.extra.backToSignIn}
      </Link>
    </form>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useDict()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  if (done)
    return (
      <div className="mt-6 space-y-4">
        <p className="flex items-start gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> {t.extra.passwordSaved}
        </p>
        <Button asChild className="w-full">
          <Link href="/login">{t.common.signIn}</Link>
        </Button>
      </div>
    )

  return (
    <form
      className="mt-6 space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (password.length < 8) return setError(t.extra.passwordShort)
        start(async () => {
          const res = await resetPasswordAction(token, password)
          if (!res.ok) return setError(res.error === "token" ? t.extra.invalidToken : t.extra.passwordShort)
          setDone(true)
        })
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="password">{t.extra.newPassword}</Label>
        <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} className="h-10" />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending || !token}>
        {pending && <Loader2 className="animate-spin" />} {t.extra.savePassword}
      </Button>
    </form>
  )
}
