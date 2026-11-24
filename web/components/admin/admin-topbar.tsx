"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, LogOut, Menu, Search, Settings, Store } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Logo } from "@/components/layout/logo"
import { ThemeToggle } from "@/components/layout/header-actions"
import { AdminNav, type AdminCounts } from "./admin-nav"
import { initials, signOutToHome, useSessionUser } from "@/components/auth/session-user"

/** Where a search goes: payment/order numbers → payments, emails → users, anything else → products. */
function searchTarget(q: string) {
  const term = q.trim()
  if (/^(PAY|TT)-/i.test(term)) return `/admin/payments?q=${encodeURIComponent(term.toUpperCase())}`
  if (term.includes("@")) return `/admin/users?q=${encodeURIComponent(term)}`
  return `/admin/products?q=${encodeURIComponent(term)}`
}

export function AdminTopbar({ counts }: { counts: AdminCounts }) {
  const [open, setOpen] = useState(false)
  const { user } = useSessionUser()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const notifications = [
    counts.pendingPayments > 0 && { title: `${counts.pendingPayments} payment${counts.pendingPayments === 1 ? "" : "s"} awaiting payment`, href: "/admin/payments" },
    counts.pendingReviews > 0 && { title: `${counts.pendingReviews} review${counts.pendingReviews === 1 ? "" : "s"} waiting for moderation`, href: "/admin/reviews" },
    counts.lowStock > 0 && { title: `${counts.lowStock} live product${counts.lowStock === 1 ? "" : "s"} with 5 or fewer left`, href: "/admin/products" },
  ].filter(Boolean) as { title: string; href: string }[]
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="-ml-1 inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted lg:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Open navigation</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetHeader className="border-b">
            <SheetTitle asChild>
              <div className="flex items-center gap-2">
                <Logo />
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Admin</span>
              </div>
            </SheetTitle>
          </SheetHeader>
          <AdminNav counts={counts} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <form
        className="relative hidden max-w-md flex-1 sm:block"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (search.trim()) router.push(searchTarget(search))
        }}
      >
      <label className="block">
        <span className="sr-only">Search admin</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products, payments (PAY-/TT-), users (email)…"
          className="h-9 w-full rounded-lg border bg-muted/50 pr-12 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-3 focus:ring-primary/15"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border bg-background px-1.5 text-[10px] text-muted-foreground">
          ↵
        </kbd>
      </label>
      </form>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="relative inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <Bell className="size-[18px]" />
            {notifications.length > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive ring-2 ring-background" />}
            <span className="sr-only">Notifications, {notifications.length}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((n) => (
              <DropdownMenuItem key={n.href} asChild>
                <Link href={n.href} className="text-sm">
                  {n.title}
                </Link>
              </DropdownMenuItem>
            ))}
            {!notifications.length && <p className="px-2 py-3 text-sm text-muted-foreground">You&apos;re all caught up.</p>}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="mx-1 h-6 w-px bg-border" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 text-left hover:bg-muted">
            <Avatar className="size-8">
              <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">{user ? initials(user.name, user.email) : ""}</AvatarFallback>
            </Avatar>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-medium">{user?.name ?? " "}</span>
              <span className="block text-[11px] text-muted-foreground">{user?.role === "ADMIN" ? "Administrator" : user?.role === "STAFF" ? "Staff" : " "}</span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/">
                <Store /> View store
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account">
                <Settings /> My account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOutToHome()}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
