import { lang } from "next/root-params"
import { notFound } from "next/navigation"
import { isLocale, type Locale } from "./config"
import type { Dictionary } from "./dictionaries/en"

// Server-side access to the current locale and its dictionary. Uses the root
// [lang] param, so any Server Component can call these without props.

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.en),
  id: () => import("./dictionaries/id").then((m) => m.id),
}

export async function getLocale(): Promise<Locale> {
  const l = await lang()
  if (!l || !isLocale(l)) notFound()
  return l
}

export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  return dictionaries[locale ?? (await getLocale())]()
}

export type { Dictionary }
