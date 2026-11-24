import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon,
  title,
  body,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  body?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center", className)}>
      <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-medium">{title}</h2>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}

export function SectionHeading({
  title,
  eyebrow,
  action,
  className,
}: {
  title: string
  eyebrow?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="mb-1 text-xs font-medium tracking-wider text-primary uppercase">{eyebrow}</p>}
        <h2 className="text-xl font-medium tracking-tight sm:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  )
}
