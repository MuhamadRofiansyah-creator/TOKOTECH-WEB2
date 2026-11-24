import { Suspense } from "react"
import { getCategories } from "@/lib/data"
import { Logo } from "./logo"
import { SearchBar } from "./search-bar"
import { MobileMenu } from "./mobile-menu"
import { AccountMenu, CartLink, LanguageSwitcher, ThemeToggle, WishlistLink } from "./header-actions"
import { CategoryNav } from "./category-nav"

function SearchFallback({ className }: { className?: string }) {
  return <div className={`h-10 rounded-lg border bg-background ${className ?? ""}`} />
}

export async function Header() {
  const categories = await getCategories()
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      {/* Desktop */}
      <div className="container-page hidden h-16 items-center gap-6 lg:flex">
        <Logo />
        <Suspense fallback={<SearchFallback className="max-w-xl flex-1" />}>
          <SearchBar className="max-w-xl flex-1" />
        </Suspense>
        <div className="ml-auto flex items-center gap-1">
          <CartLink />
          <WishlistLink />
          <ThemeToggle />
          <span className="mx-1 h-6 w-px bg-border" />
          <LanguageSwitcher />
          <span className="mx-1 h-6 w-px bg-border" />
          <AccountMenu />
        </div>
      </div>

      {/* Mobile: two rows, as in the reference */}
      <div className="container-page lg:hidden">
        <div className="flex h-14 items-center gap-2">
          <MobileMenu categories={categories} />
          <Logo />
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher compact />
            <AccountMenu compact />
          </div>
        </div>
        <div className="flex items-center gap-1 pb-3">
          <Suspense fallback={<SearchFallback className="flex-1" />}>
            <SearchBar className="flex-1" />
          </Suspense>
          <CartLink />
          <WishlistLink />
        </div>
      </div>

      <CategoryNav />
    </header>
  )
}
