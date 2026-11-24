"use client"

import { createContext, useContext } from "react"
import { useRouter as useNextRouter } from "next/navigation"
import { intlLocale, localizePath, type Locale } from "@/lib/i18n/config"
import type { Dictionary } from "@/lib/i18n/dictionaries/en"

// The [lang] root layout passes the locale and its dictionary here; client
// components read them with useDict() / useLocale().

const I18nContext = createContext<{ locale: Locale; dict: Dictionary } | null>(null)

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: React.ReactNode }) {
  return <I18nContext.Provider value={{ locale, dict }}>{children}</I18nContext.Provider>
}

function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useDict/useLocale must be used inside <I18nProvider>")
  return ctx
}

export const useDict = () => useI18n().dict
export const useLocale = () => useI18n().locale
export const useIntlLocale = () => intlLocale(useI18n().locale)

/** Localize an internal path for the current locale. */
export function useLocalePath() {
  const { locale } = useI18n()
  return (href: string) => localizePath(href, locale)
}

/** next/navigation's router, with push/replace/prefetch kept inside the current locale. */
export function useRouter() {
  const router = useNextRouter()
  const { locale } = useI18n()
  return {
    ...router,
    push: (href: string, opts?: Parameters<typeof router.push>[1]) => router.push(localizePath(href, locale), opts),
    replace: (href: string, opts?: Parameters<typeof router.replace>[1]) => router.replace(localizePath(href, locale), opts),
    prefetch: (href: string) => router.prefetch(localizePath(href, locale)),
  }
}
