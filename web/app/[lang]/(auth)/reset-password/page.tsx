import type { Metadata } from "next"
import { Suspense } from "react"
import { getDictionary } from "@/lib/i18n/dictionary"
import { ResetPasswordForm } from "@/components/account/password-reset-forms"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).extra.resetTitle, robots: { index: false } }
}

export default async function ResetPasswordPage({ searchParams }: PageProps<"/[lang]/reset-password">) {
  const t = await getDictionary()
  return (
    <>
      <h1 className="text-2xl font-medium tracking-tight">{t.extra.resetTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.extra.resetBody}</p>
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Form({ searchParams }: Pick<PageProps<"/[lang]/reset-password">, "searchParams">) {
  const sp = await searchParams
  return <ResetPasswordForm token={typeof sp.token === "string" ? sp.token : ""} />
}
