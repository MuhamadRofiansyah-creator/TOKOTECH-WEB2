"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Check, EyeOff, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AdminReviewRow } from "@/lib/data"
import { formatDate } from "@/lib/format"
import { moderateReviewAction } from "@/lib/actions/admin"
import { PageHeader, StatusBadge } from "./status-badge"
import { SegmentedTabs } from "./data-table-parts"
import { useAdminAction } from "./use-admin-action"

type Tab = "PENDING" | "PUBLISHED" | "HIDDEN"

export function ReviewsManager({ reviews }: { reviews: AdminReviewRow[] }) {
  const [tab, setTab] = useState<Tab>("PENDING")
  const [notes, setNotes] = useState<Record<string, string>>({})
  const action = useAdminAction()
  const count = (s: Tab) => reviews.filter((r) => r.status === s).length
  const rows = useMemo(() => reviews.filter((r) => r.status === tab), [reviews, tab])

  return (
    <>
      <PageHeader title="Reviews" description="Buyer reviews wait here until staff publish them. Only published reviews count toward ratings." />
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="px-4 pt-1">
          <SegmentedTabs<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "PENDING", label: "Waiting", count: count("PENDING") },
              { value: "PUBLISHED", label: "Published", count: count("PUBLISHED") },
              { value: "HIDDEN", label: "Hidden", count: count("HIDDEN") },
            ]}
          />
        </div>
        <ul className="divide-y border-t">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={i <= r.rating ? "size-3.5 fill-amber-400 text-amber-400" : "size-3.5 text-muted-foreground/40"} aria-hidden />
                    ))}
                  </span>
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                </div>
                <p className="mt-1.5 font-medium">{r.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{r.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {r.author} on{" "}
                  <Link href={`/p/${r.productSlug}`} target="_blank" className="text-primary hover:underline">
                    {r.productName}
                  </Link>{" "}
                  · order {r.orderNumber}
                </p>
                {r.moderationNote && <p className="mt-1 text-xs text-muted-foreground">Note: {r.moderationNote}</p>}
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:w-64">
                {r.status !== "PUBLISHED" && (
                  <Button size="sm" disabled={action.pending} onClick={() => action.run(() => moderateReviewAction(r.id, "PUBLISHED"))}>
                    <Check /> Publish
                  </Button>
                )}
                {r.status !== "HIDDEN" && (
                  <>
                    <Input
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                      placeholder="Reason for hiding (internal)"
                      className="h-8 text-xs"
                      aria-label="Reason for hiding"
                    />
                    <Button size="sm" variant="outline" disabled={action.pending} onClick={() => action.run(() => moderateReviewAction(r.id, "HIDDEN", notes[r.id]))}>
                      <EyeOff /> Hide
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
          {!rows.length && <li className="px-4 py-16 text-center text-sm text-muted-foreground">Nothing here.</li>}
        </ul>
      </div>
    </>
  )
}
