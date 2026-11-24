"use client"

import NextLink from "next/link"
import { forwardRef } from "react"
import { localizePath } from "@/lib/i18n/config"
import { useLocale } from "./provider"

/** Drop-in for next/link that keeps internal links in the current locale (/id/... for Indonesian). */
const Link = forwardRef<HTMLAnchorElement, React.ComponentProps<typeof NextLink>>(function Link({ href, ...props }, ref) {
  const locale = useLocale()
  const localized = typeof href === "string" ? localizePath(href, locale) : href.pathname ? { ...href, pathname: localizePath(href.pathname, locale) } : href
  return <NextLink ref={ref} href={localized} {...props} />
})

export default Link
