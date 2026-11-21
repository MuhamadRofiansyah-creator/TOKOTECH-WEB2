import Link from "@/components/i18n/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/layout/logo"
import { ProductArt } from "@/components/product/product-art"
import { getDictionary } from "@/lib/i18n/dictionary"

export default async function NotFound() {
  const t = await getDictionary()
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo />
      <div className="mt-8 w-56">
        <ProductArt kind="monitor" accent="#ef4444" />
      </div>
      <p className="mt-2 text-sm font-medium text-primary">404</p>
      <h1 className="mt-1 text-3xl font-light tracking-tight">{t.errors.notFoundTitle}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {t.errors.notFoundBody}
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="/">{t.errors.goHome}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/search">{t.errors.browseAll}</Link>
        </Button>
      </div>
    </main>
  )
}
