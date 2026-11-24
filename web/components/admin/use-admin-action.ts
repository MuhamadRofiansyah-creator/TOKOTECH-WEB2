"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import type { AdminResult } from "@/lib/actions/admin"

/** Run an admin server action: toast its message or error and refresh the server data. */
export function useAdminAction() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const run = (action: () => Promise<AdminResult>, onOk?: () => void) =>
    start(async () => {
      const res = await action()
      if (!res.ok) return void toast.error(res.error)
      if (res.message) toast.success(res.message)
      onOk?.()
      router.refresh()
    })
  return { pending, run }
}

/** Download rows as a CSV file (client-side export of what the table holds). */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const a = Object.assign(document.createElement("a"), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
