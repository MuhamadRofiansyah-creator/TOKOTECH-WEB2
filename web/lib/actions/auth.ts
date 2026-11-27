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

