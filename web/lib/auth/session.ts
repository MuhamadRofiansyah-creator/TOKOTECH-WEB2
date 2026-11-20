import "server-only"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { auth } from "@/auth"
import { localeFromPath } from "@/lib/i18n/config"
import type { Role } from "@/lib/types"

// Data Access Layer for the signed-in user. These read the session cookie, so they
// run at request time: call them inside a <Suspense> boundary, never in "use cache".

export type SessionUser = { id: string; role: Role; name: string | null; email: string | null }

export async function getSessionUser(): Promise<SessionUser | null> {
  // Mark this as request-time before Auth.js runs: it uses new Date() and random values
  // before touching the cookie, which Cache Components would otherwise flag as prerender-unsafe.
  await connection()
  const session = await auth()
  if (!session?.user?.id) return null
  const { id, role, name, email } = session.user
  return { id, role, name: name ?? null, email: email ?? null }
}

/** Signed-in user, or a redirect to /login (in the language of `next`) that comes back to `next`. */
export async function requireUser(next = "/account"): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect(`${localeFromPath(next) === "id" ? "/id" : ""}/login?next=${encodeURIComponent(next)}`)
  return user
}

/** STAFF or ADMIN; `admin: true` for admin-only areas (payments, users). */
export async function requireStaff({ admin = false, next = "/admin" } = {}): Promise<SessionUser> {
  const user = await requireUser(next)
  const ok = admin ? user.role === "ADMIN" : user.role === "ADMIN" || user.role === "STAFF"
  if (!ok) redirect(admin ? "/admin?denied=1" : "/")
  return user
}
