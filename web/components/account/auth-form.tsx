"use client"

import Link from "@/components/i18n/link"
import { useActionState, useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { googleSignInAction, loginAction, registerAction } from "@/lib/actions/auth"
import { useDict, useLocalePath } from "@/components/i18n/provider"

// Email + password via Auth.js server actions; Google when configured (AUTH_GOOGLE_ID/SECRET).
// Phone OTP is hidden until an SMS/WhatsApp provider is chosen.


/** Query values (?next=, ?error=, ?code=, ?invite=, ?email=) come from the page so the form renders on the server in the right language. */
export type AuthQuery = { next?: string; error?: string; code?: string; invite?: string; email?: string }

export function AuthForm({ mode, googleEnabled, query }: { mode: "login" | "register"; googleEnabled: boolean; query: AuthQuery }) {
  const t = useDict()
  const localPath = useLocalePath()
  const next = query.next ?? localPath("/account")
  const [show, setShow] = useState(false)
  const register = mode === "register"
  const [state, action, pending] = useActionState(register ? registerAction : loginAction, undefined)
  const errors = state?.fieldErrors ?? {}
  const urlError = query.error
  const formError =
    state?.error ??
    (query.code === "suspended" ? t.auth.errors.suspended : urlError ? (t.auth.errors[urlError] ?? t.auth.errors.generic) : null)
  const switchHref = `${register ? "/login" : "/register"}${next !== localPath("/account") ? `?next=${encodeURIComponent(next)}` : ""}`

  return (
    <>
      <h1 className="text-2xl font-medium tracking-tight">{register ? t.auth.registerTitle : t.auth.loginTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {register ? t.auth.registerBody : t.auth.loginBody}
      </p>

      {googleEnabled && (
        <>
          <form action={googleSignInAction} className="mt-6">
            <input type="hidden" name="next" value={next} />
            <Button variant="outline" className="h-10 w-full" type="submit">
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
              </svg>
              {t.auth.google}
            </Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" /> {t.auth.orEmail} <Separator className="flex-1" />
          </div>
        </>
      )}

      {formError && (
        <p role="alert" className={`${googleEnabled ? "mb-4" : "mt-6"} rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive`}>
          {formError}
        </p>
      )}

      <form action={action} noValidate className={googleEnabled || formError ? "space-y-4" : "mt-6 space-y-4"}>
        <input type="hidden" name="next" value={next} />
        {query.invite && <input type="hidden" name="invite" value={query.invite} />}
        {register && (
          <Field id="name" label={t.auth.name} error={errors.name}>
            <Input id="name" name="name" autoComplete="name" required className="h-10" aria-invalid={!!errors.name} />
          </Field>
        )}
        <Field id="email" label={t.auth.email} error={errors.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={query.email} className="h-10" aria-invalid={!!errors.email} />
        </Field>
        <Field
          id="password"
          label={t.auth.password}
          error={errors.password}
          extra={
            !register && (
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                {t.auth.forgot}
              </Link>
            )
          }
        >
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete={register ? "new-password" : "current-password"}
              required
              className="h-10 pr-10"
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label={show ? t.auth.hide : t.auth.show}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        {register && (
          <div>
            <div className="flex items-start gap-2">
              <Checkbox id="terms" name="terms" className="mt-0.5" />
              <Label htmlFor="terms" className="text-sm leading-snug font-normal text-muted-foreground">
                {t.auth.terms}
              </Label>
            </div>
            {errors.terms && <p className="mt-1 text-xs text-destructive">{errors.terms}</p>}
          </div>
        )}
        <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {register ? t.common.createAccount : t.common.signIn}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {register ? t.auth.haveAccount : t.auth.newHere}
        <Link href={switchHref} className="font-medium text-primary hover:underline">
          {register ? t.common.signIn : t.common.createAccount}
        </Link>
      </p>
    </>
  )
}

function Field({
  id,
  label,
  error,
  extra,
  children,
}: {
  id: string
  label: string
  error?: string
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {extra}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
