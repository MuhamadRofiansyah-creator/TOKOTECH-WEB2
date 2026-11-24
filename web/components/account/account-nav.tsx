"use client"

import Link from "@/components/i18n/link"
import { usePathname } from "next/navigation"
import { Suspense } from "react"
import { signOutToHome } from "@/components/auth/session-user"
import { Heart, LayoutDashboard, LogOut, MapPin, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDict, useLocale } from "@/components/i18n/provider"
import { stripLocale } from "@/lib/i18n/config"

const LINKS = [
  { href: "/account", key: "overview", icon: LayoutDashboard },
  { href: "/account/orders", key: "orders", icon: Package },
  { href: "/account/addresses", key: "addresses", icon: MapPin },
  { href: "/wishlist", key: "wishlist", icon: Heart },
]

/** usePathname is request data on dynamic routes, so the active state streams in; the fallback is the same nav unhighlighted. */
export function AccountNav() {
  return (
    <Suspense fallback={<NavLinks pathname="" />}>
      <ActiveNav />
    </Suspense>
  )
}

function ActiveNav() {
  return <NavLinks pathname={stripLocale(usePathname())} />
}

function NavLinks({ pathname }: { pathname: string }) {
  const t = useDict()
  const lang = useLocale()
  return (
    <nav aria-label={t.account.navLabel} className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {LINKS.map(({ href, key, icon: Icon }) => {
        const active = href === "/account" ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-accent font-medium text-accent-foreground hover:bg-accent",
            )}
          >
            <Icon className="size-4" /> {t.account.nav[key as keyof typeof t.account.nav]}
          </Link>
        )
      })}
      <button
        type="button"
        onClick={() => signOutToHome(lang)}
        className="inline-flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap text-muted-foreground hover:bg-muted lg:mt-4 lg:border-t lg:pt-4"
      >
        <LogOut className="size-4" /> {t.common.signOut}
      </button>
    </nav>
  )
}
