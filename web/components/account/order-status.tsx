"use client"

import type { OrderStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useDict } from "@/components/i18n/provider"

const STATUS: Record<OrderStatus, { label: string; className: string }> = {
  PENDING_PAYMENT: { label: "Awaiting payment", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  PAID: { label: "Paid", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  PROCESSING: { label: "Processing", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  SHIPPED: { label: "Shipped", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  DELIVERED: { label: "Delivered", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  RETURNED: { label: "Returned", className: "bg-muted text-muted-foreground" },
}

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const t = useDict()
  const s = STATUS[status]
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", s.className, className)}>{t.orderStatus[status]}</span>
}
