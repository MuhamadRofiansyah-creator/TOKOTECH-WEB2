import type { Metadata } from "next"
import { Suspense } from "react"
import { googleEnabled } from "@/auth"
import { AuthForm } from "@/components/account/auth-form"
import { getDictionary } from "@/lib/i18n/dictionary"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.register }
}

export default function RegisterPage({ searchParams }: PageProps<"/[lang]/register">) {
  // The query is request data, so the form sits behind Suspense (the auth layout prerenders)
  return (
    <Suspense>
      <Form searchParams={searchParams} />
    </Suspense>
  )
}

async function Form({ searchParams }: Pick<PageProps<"/[lang]/register">, "searchParams">) {
  const sp = await searchParams
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined)
  const query = { next: one("next"), error: one("error"), code: one("code"), invite: one("invite"), email: one("email") }
  return <AuthForm mode="register" googleEnabled={googleEnabled} query={query} />
}
