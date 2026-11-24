import { Ban, CheckCircle2, CircleDashed, Clock, FileEdit, Archive, RotateCcw, XCircle, Mail, TimerOff, EyeOff } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Status colors are reserved for state and always ship with an icon + label.
const TONES = {
  good: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-400/20",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-400/20",
  critical: "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-400/20",
  neutral: "bg-muted text-muted-foreground ring-border",
  info: "bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-400/20",
} as const

const MAP: Record<string, { tone: keyof typeof TONES; icon: LucideIcon; label?: string }> = {
  // PaymentStatus
  PAID: { tone: "good", icon: CheckCircle2, label: "Paid" },
  PENDING: { tone: "warning", icon: Clock, label: "Pending" },
  REFUNDED: { tone: "neutral", icon: RotateCcw, label: "Refunded" },
  PARTIALLY_REFUNDED: { tone: "neutral", icon: RotateCcw, label: "Part refunded" },
  FAILED: { tone: "critical", icon: XCircle, label: "Failed" },
  EXPIRED: { tone: "neutral", icon: TimerOff, label: "Expired" },
  // ProductStatus (ACTIVE is shared with UserStatus)
  ACTIVE: { tone: "good", icon: CheckCircle2, label: "Active" },
  DRAFT: { tone: "neutral", icon: FileEdit, label: "Draft" },
  ARCHIVED: { tone: "neutral", icon: Archive, label: "Archived" },
  // ReviewStatus (PENDING shared with payments)
  PUBLISHED: { tone: "good", icon: CheckCircle2, label: "Published" },
  HIDDEN: { tone: "neutral", icon: EyeOff, label: "Hidden" },
  // UserStatus
  INVITED: { tone: "info", icon: Mail, label: "Invited" },
  SUSPENDED: { tone: "critical", icon: Ban, label: "Suspended" },
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = MAP[status] ?? { tone: "neutral" as const, icon: CircleDashed }
  const Icon = s.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONES[s.tone],
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {s.label ?? status}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        role === "ADMIN" ? "bg-foreground text-background" : role === "STAFF" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {role[0] + role.slice(1).toLowerCase()}
    </span>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
