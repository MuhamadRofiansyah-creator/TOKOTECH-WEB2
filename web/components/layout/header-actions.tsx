"use client"

import Link from "@/components/i18n/link"
import { useTheme } from "next-themes"
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Moon,
  Package,
  ShoppingCart,
  Sun,
  User,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCartCount, useMounted, useWishlist } from "@/stores"
import { cn } from "@/lib/utils"
import { initials, signOutToHome, useSessionUser } from "@/components/auth/session-user"
import { useDict, useLocale } from "@/components/i18n/provider"
import { fmt, localizePath, stripLocale, type Locale } from "@/lib/i18n/config"

function CountBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="absolute -top-1.5 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white ring-2 ring-background">
      {count > 99 ? "99+" : count}
    </span>
  )
}

export function CartLink({ className }: { className?: string }) {
  const t = useDict()
  const count = useCartCount()
  return (
    <Link
      href="/cart"
      className={cn("relative inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted", className)}
      aria-label={fmt(t.header.cartCount, { n: count })}
    >
      <span className="relative">
        <ShoppingCart className="size-5" />
        <CountBadge count={count} />
      </span>
    </Link>
  )
}

export function WishlistLink({ className }: { className?: string }) {
  const t = useDict()
  const mounted = useMounted()
  const count = useWishlist((s) => s.ids.length)
  return (
    <Link
      href="/wishlist"
      className={cn("relative inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted", className)}
      aria-label={fmt(t.footer.wishlistCount, { n: mounted ? count : 0 })}
    >
      <span className="relative">
        <Heart className="size-5" />
        <CountBadge count={mounted ? count : 0} />
      </span>
    </Link>
  )
}

const LANGS = ["en", "id"] as const

/** CSS flags: emoji flags don't render on Windows. */
function Flag({ code }: { code: string }) {
  return (
    <span aria-hidden className="inline-block h-3 w-[18px] shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10">
      {code === "id" ? (
        <>
          <span className="block h-1/2 bg-red-600" />
          <span className="block h-1/2 bg-white" />
        </>
      ) : (
        <svg viewBox="0 0 18 12" className="size-full">
          <rect width="18" height="12" fill="#1e3a8a" />
          <path d="M0 0L18 12M18 0L0 12" stroke="#fff" strokeWidth="2.4" />
          <path d="M0 0L18 12M18 0L0 12" stroke="#dc2626" strokeWidth="1" />
          <path d="M9 0V12M0 6H18" stroke="#fff" strokeWidth="4" />
          <path d="M9 0V12M0 6H18" stroke="#dc2626" strokeWidth="2.2" />
        </svg>
      )}
    </span>
  )
}

/** Switches between /path (English) and /id/path (Bahasa Indonesia), keeping the page and its query. */
export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const t = useDict()
  const lang = useLocale()
  // Each language has its own root layout (<html lang>), so switching is a full page load,
  // the same thing Next.js does when a navigation changes the root layout.
  const switchTo = (next: string) => {
    if (next === lang) return
    // Read the path at click time: usePathname() would make every page's header request-time data
    const { pathname, search, hash } = window.location
    window.location.href = localizePath(stripLocale(pathname) + search + hash, next as Locale)
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm hover:bg-muted">
        <Flag code={lang} />
        {!compact && <span>{lang === "en" ? "English" : "Bahasa"}</span>}
        <ChevronDown className="size-3.5 text-muted-foreground" />
        <span className="sr-only">{t.header.language}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup value={lang} onValueChange={switchTo}>
          {LANGS.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} lang={l}>
              <Flag code={l} /> {l === "en" ? t.header.english : t.header.indonesian}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ThemeToggle() {
  const t = useDict()
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()
  const dark = mounted && resolvedTheme === "dark"
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted"
      aria-label={dark ? t.header.lightMode : t.header.darkMode}
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  )
}

export function AccountMenu({ compact }: { compact?: boolean }) {
  const t = useDict()
  const lang = useLocale()
  const { user, status } = useSessionUser()

  if (status === "loading") return <span className="size-9 animate-pulse rounded-full bg-muted" aria-hidden />
  if (!user)
    return (
      <Link
        href="/login"
        className="inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium hover:bg-muted"
      >
        <User className="size-[18px]" />
        <span className={cn(compact ? "sr-only" : "hidden xl:inline")}>{t.common.signIn}</span>
      </Link>
    )

  const staff = user.role === "ADMIN" || user.role === "STAFF"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2.5 rounded-lg p-1 text-left hover:bg-muted">
        <Avatar className="size-9">
          <AvatarFallback className="bg-muted text-xs font-semibold">{initials(user.name, user.email)}</AvatarFallback>
        </Avatar>
        {!compact && (
          <>
            <span className="hidden leading-tight xl:block">
              <span className="block text-[10px] text-muted-foreground">{t.header.welcome}</span>
              <span className="block max-w-32 truncate text-sm font-medium">{user.name?.split(" ")[0] ?? t.header.account}</span>
            </span>
            <ChevronDown className="hidden size-4 text-muted-foreground xl:block" />
          </>
        )}
        <span className="sr-only">{t.header.accountMenu}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User /> {t.header.myAccount}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/orders">
            <Package /> {t.header.orders}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/wishlist">
            <Heart /> {t.header.wishlist}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/addresses">
            <MapPin /> {t.header.addresses}
          </Link>
        </DropdownMenuItem>
        {staff && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <LayoutDashboard /> {t.header.admin}
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOutToHome(lang)}>
          <LogOut /> {t.common.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
