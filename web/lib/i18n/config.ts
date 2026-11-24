// Locales. English is the default and keeps unprefixed URLs (/c/monitors);
// Indonesian lives under /id (/id/c/monitors). proxy.ts rewrites unprefixed
// storefront URLs to /en/... internally, so every page sits under app/[lang].
// Product and category content stays English; only the UI is translated.

export const LOCALES = ["en", "id"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "en"

export const isLocale = (v: string): v is Locale => (LOCALES as readonly string[]).includes(v)

/** Paths that never get a locale prefix (admin is English-only; APIs aren't pages). */
const UNLOCALIZED = /^\/(admin|api)(\/|$)/

/** "/c/monitors" → "/id/c/monitors" for Indonesian; unchanged for English, external URLs and admin/api. */
export function localizePath(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//") || UNLOCALIZED.test(href)) return href
  const bare = stripLocale(href)
  if (locale === DEFAULT_LOCALE) return bare
  return bare === "/" ? "/id" : bare.startsWith("/?") || bare.startsWith("/#") ? `/id${bare.slice(1)}` : `/id${bare}`
}

/** "/id/c/monitors?x=1" → "/c/monitors?x=1"; "/id" → "/". */
export function stripLocale(path: string): string {
  if (path === "/id" || path === "/en") return "/"
  if (/^\/(id|en)[/?#]/.test(path)) {
    const rest = path.slice(3)
    return rest.startsWith("/") ? rest : `/${rest}`
  }
  return path
}

export const localeFromPath = (path: string): Locale => (path === "/id" || /^\/id[/?#]/.test(path) ? "id" : "en")

/** BCP 47 tag for Intl formatting. */
export const intlLocale = (l: Locale) => (l === "id" ? "id-ID" : "en-GB")

/** Replace {name} placeholders: fmt("Only {n} left", { n: 3 }). */
export function fmt(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}
