import type { Metadata } from "next"
import { getDictionary } from "@/lib/i18n/dictionary"
import { ForgotPasswordForm } from "@/components/account/password-reset-forms"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).extra.forgotTitle }
}

export default async function ForgotPasswordPage() {
  const t = await getDictionary()
  return (
    <>
      <h1 className="text-2xl font-medium tracking-tight">{t.extra.forgotTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.extra.forgotBody}</p>
      <ForgotPasswordForm />
    </>
  )
}
