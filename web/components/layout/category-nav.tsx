import Link from "@/components/i18n/link"
import { Flame, LayoutGrid } from "lucide-react"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { getBrands, getCategories } from "@/lib/data"
import { ProductArt } from "@/components/product/product-art"
import { getDictionary } from "@/lib/i18n/dictionary"

export async function CategoryNav() {
  const t = await getDictionary()
  const [categories, brands] = await Promise.all([getCategories(), getBrands()])
  return (
    <nav aria-label={t.nav.categories} className="hidden border-t lg:block">
      <div className="container-page flex h-11 items-center gap-1">
        <NavigationMenu viewport={false}>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className="h-9 gap-1.5 px-3 text-sm font-medium">
                <LayoutGrid className="size-4" /> {t.nav.allCategories}
              </NavigationMenuTrigger>
              <NavigationMenuContent className="w-[760px]! p-0">
                <div className="grid grid-cols-[1fr_200px]">
                  <ul className="grid grid-cols-2 gap-1 p-3">
                    {categories.map((c) => (
                      <li key={c.slug}>
                        <NavigationMenuLink asChild>
                          <Link href={`/c/${c.slug}`} className="flex-row items-center gap-3 rounded-lg p-2.5">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <ProductArt kind={c.art} accent="#14b8c4" className="size-10" />
                            </span>
                            <span>
                              <span className="block text-sm font-medium">{c.name}</span>
                              <span className="block text-xs text-muted-foreground">
                                {c.tagline} · {c.count}
                              </span>
                            </span>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                  <div className="border-l bg-muted/50 p-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{t.nav.topBrands}</p>
                    <ul className="space-y-1 text-sm">
                      {brands.slice(0, 8).map((b) => (
                        <li key={b.slug}>
                          <NavigationMenuLink asChild>
                            <Link href={`/search?q=${encodeURIComponent(b.name)}`} className="px-2 py-1">
                              {b.name}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto text-sm">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/c/${c.slug}`}
                className="inline-flex h-9 items-center rounded-md px-3 whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/#flash-sale"
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap text-destructive hover:bg-destructive/5"
        >
          <Flame className="size-4" /> {t.nav.flashSale}
        </Link>
      </div>
    </nav>
  )
}
