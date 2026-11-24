import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { localeFromPath, stripLocale } from "@/lib/i18n/config"

// 1. Locales: storefront pages live under app/[lang]. English keeps clean URLs
//    (/c/monitors is rewritten to /en/c/monitors internally); Indonesian is /id/...
//    A visible /en/... URL redirects to the clean one so each page has one address.
// 2. Optimistic auth gates (pages and actions re-check with lib/auth/session.ts):
//      /account/*            signed in
//      /admin/*              STAFF or ADMIN
//      /admin/payments|users ADMIN
export default auth((req) => {
  const { pathname, search } = req.nextUrl
  const user = req.auth?.user

  // ---- admin (English only, not localized)
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!user) return toLogin(req.url, "", pathname + search)
    const adminOnly = /^\/admin\/(payments|users)/.test(pathname)
    const allowed = adminOnly ? user.role === "ADMIN" : user.role === "ADMIN" || user.role === "STAFF"
    if (!allowed) return NextResponse.redirect(new URL(adminOnly ? "/admin?denied=1" : "/", req.url))
    return NextResponse.next()
  }

  // ---- canonical English URLs: /en/x → /x
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return NextResponse.redirect(new URL(stripLocale(pathname) + search, req.url), 308)
  }

  const locale = localeFromPath(pathname)
  const prefix = locale === "id" ? "/id" : ""
  const bare = stripLocale(pathname)

  // ---- signed-in areas
  if ((bare === "/account" || bare.startsWith("/account/")) && !user) return toLogin(req.url, prefix, pathname + search)

  // ---- English: serve app/[lang] with lang = en
  if (locale === "en") return NextResponse.rewrite(new URL(`/en${pathname === "/" ? "" : pathname}${search}`, req.url))
  return NextResponse.next()
})

function toLogin(base: string, prefix: string, next: string) {
  const login = new URL(`${prefix}/login`, base)
  login.searchParams.set("next", next)
  return NextResponse.redirect(login)
}

export const config = {
  // Everything except Next internals, API routes and files with an extension (favicon, images…)
  matcher: ["/((?!api|_next|.*\\..*).*)"],
}
