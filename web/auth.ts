// Auth.js v5. Sessions are JWTs (required for the email + password provider);
// Google accounts are linked through the Account table by the Prisma adapter.
// Server code reads the user through lib/auth/session.ts, not auth() directly.

import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import type { Role } from "@/lib/generated/prisma/enums"
import { claimGuestOrders } from "@/lib/auth/claim"

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"]
  }
  interface User {
    role?: Role
  }
}

class SuspendedError extends CredentialsSignin {
  code = "suspended"
}

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The adapter is typed against @prisma/client; our client is generated to lib/generated/prisma (same API).
  adapter: PrismaAdapter(db as unknown as Parameters<typeof PrismaAdapter>[0]),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  pages: { signIn: "/login", error: "/login" },
  providers: [
    ...(googleEnabled ? [Google({ allowDangerousEmailAccountLinking: true })] : []),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const email = String(raw?.email ?? "").trim().toLowerCase()
        const password = String(raw?.password ?? "")
        if (!email || !password) return null
        const user = await db.user.findUnique({ where: { email } })
        if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return null
        if (user.status === "SUSPENDED") throw new SuspendedError()
        await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date(), status: "ACTIVE" } })
        return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Block suspended accounts for every provider (Google included)
      if (!user.email) return true
      const existing = await db.user.findUnique({ where: { email: user.email.toLowerCase() }, select: { status: true } })
      return existing?.status !== "SUSPENDED"
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id
        token.role = user.role ?? (await db.user.findUnique({ where: { id: user.id }, select: { role: true } }))?.role ?? "CUSTOMER"
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.sub!
      session.user.role = (token.role as Role | undefined) ?? "CUSTOMER"
      return session
    },
  },
  events: {
    // Guest checkouts placed with this email become this user's orders (3.7)
    async createUser({ user }) {
      if (user.id && user.email) await claimGuestOrders(user.id, user.email)
    },
  },
})
