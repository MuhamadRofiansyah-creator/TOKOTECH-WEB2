"use client"

import Link from "@/components/i18n/link"
import { ChevronRight, Menu } from "lucide-react"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { Category } from "@/lib/types"
import { ProductArt } from "@/components/product/product-art"
import { Logo } from "./logo"
import { ThemeToggle } from "./header-actions"
import { useDict } from "@/components/i18n/provider"

export function MobileMenu({ categories }: { categories: Pick<Category, "slug" | "name" | "art" | "tagline">[] }) {
  const t = useDict()
  return (
    <Sheet>
      <SheetTrigger className="-ml-2 inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted lg:hidden">
        <Menu className="size-5" />
        <span className="sr-only">{t.header.openMenu}</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-[86vw] max-w-sm gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle asChild>
            <div>
              <Logo />
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto p-2" aria-label={t.nav.categories}>
          <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">{t.header.shopByCategory}</p>
          <ul>
            {categories.map((c) => (
              <li key={c.slug}>
                <SheetClose asChild>
                  <Link href={`/c/${c.slug}`} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
                      <ProductArt kind={c.art} accent="#14b8c4" className="size-8" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">{c.tagline}</span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </SheetClose>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t px-1 pt-2">
            {[
              ["/account/orders", t.header.myOrders],
              ["/wishlist", t.header.wishlist],
              ["/compare", t.product.compare],
              ["/login", t.header.signInRegister],
            ].map(([href, label]) => (
              <SheetClose asChild key={href}>
                <Link href={href} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-muted">
                  {label}
                </Link>
              </SheetClose>
            ))}
          </div>
        </nav>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          Appearance <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  )
}
