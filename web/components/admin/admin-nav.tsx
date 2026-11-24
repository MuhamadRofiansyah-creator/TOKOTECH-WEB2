"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CreditCard, ExternalLink, LayoutDashboard, Package, Users, MessageSquareText, TicketPercent, Zap, FolderTree } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSessionUser } from "@/components/auth/session-user"

export type AdminCounts = { products: number; pendingPayments: number; pendingReviews: number; lowStock: number }

export const ADMIN_LINKS: { href: string; label: string; icon: typeof Users; countKey?: keyof AdminCounts; adminOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package, countKey: "products" },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, countKey: "pendingPayments", adminOnly: true },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText, countKey: "pendingReviews" },
  { href: "/admin/vouchers", label: "Vouchers", icon: TicketPercent },
  { href: "/admin/flash-sales", label: "Flash sales", icon: Zap },
]

export function AdminNav({ counts, onNavigate }: { counts: AdminCounts; onNavigate?: () => void }) {
  const pathname = usePathname()
  const { user } = useSessionUser()
  // Payments and users are ADMIN-only (proxy.ts enforces it; this just hides the links from staff)
  const links = ADMIN_LINKS.filter((l) => !l.adminOnly || user?.role === "ADMIN")
  return (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-1 p-3">
      <p className="px-3 pt-1 pb-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Manage</p>
      {links.map(({ href, label, icon: Icon, countKey }) => {
        const count = countKey ? counts[countKey] : undefined
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-accent font-medium text-accent-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-[18px]" />
            <span className="flex-1">{label}</span>
            {count != null && (
              <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {count}
              </span>
            )}
          </Link>
        )
      })}
      <div className="mt-auto border-t pt-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-[18px]" /> View store
        </Link>
      </div>
    </nav>
  )
}
