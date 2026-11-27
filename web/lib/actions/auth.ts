"use server"
import { AuthError } from "next-auth"
import bcrypt from "bcryptjs"
import { signIn, signOut } from "@/auth"
import { db } from "@/lib/db"
import { claimGuestOrders } from "@/lib/auth/claim"

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string>
} | undefined

function safeNext(value: FormDataEntryValue | null, fallback = "/account") {
  const v = typeof value === "string" ? value : ""
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+}$/

export async function loginAction(_prev: AuthState, form: FormData): Promise<AuthState> {   

const email = String(form.get("email") ?? "").trim().toLowerCase()
const password = String(form.get("password") ?? "")
const fieldErrors: Record<string, string> = {}

if (!EMAIL.test(email)) fieldErrors.email = "Enter a valid email address"
if (!password) fieldErrors.password = "Enter your password"
if (Object.keys(fieldErrors).length) return { fieldErrors }

try {
  await signIn("credentials", {
    email,
    password,
    redirectTo: safeNext(form.get("next"))
  })
} catch (e) {
  if (e instanceof AuthError) {
    const code = (e as AuthError & { code?: string }).code
    return {
      error: code === "suspended"
        ? "This account is suspended. Contact support."
        : "Email or password is incorrect"
    }
  }
  throw e
}
