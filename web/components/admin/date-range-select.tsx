"use client"

import { useRouter } from "next/navigation"
import { CalendarDays, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { downloadCsv } from "./use-admin-action"
import { RANGES, type RangeValue } from "@/lib/admin-ranges"


/** Date range control (controlled). */
export function DateRangeSelect({ value, onChange }: { value: string; onChange: (v: RangeValue) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RangeValue)}>
      <SelectTrigger className="h-9! min-w-40 bg-background" aria-label="Date range">
        <CalendarDays className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {RANGES.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Dashboard variant: the range lives in the URL (?range=30d) so the server computes the KPIs. */
export function DashboardRangeSelect({ value }: { value: string }) {
  const router = useRouter()
  return <DateRangeSelect value={value} onChange={(v) => router.push(v === "7d" ? "/admin" : `/admin?range=${v}`)} />
}

export function ExportCsvButton({ filename, rows }: { filename: string; rows: Record<string, unknown>[] }) {
  return (
    <Button variant="outline" className="h-9" onClick={() => downloadCsv(filename, rows)}>
      <Download /> Export
    </Button>
  )
}
