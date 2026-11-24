"use client"

import { signOut, useSession } from "next-auth/react"

/** "Rizky Ramadhan" → "RR"; falls back to the email's first letter. */
export function initials(name?: string | null, email?: string | null) {
  const src = (name ?? "").trim()
  if (src) return src.split(/\s+/).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("")
  return (email?.[0] ?? "?").toUpperCase()
}

/** The signed-in user on the client (from /api/auth/session; doesn't block prerendering). */
export function useSessionUser() {
  const { data, status } = useSession()
  return { user: data?.user ?? null, status }
}

export const signOutToHome = (locale: "en" | "id" = "en") => signOut({ redirectTo: locale === "id" ? "/id" : "/" })
