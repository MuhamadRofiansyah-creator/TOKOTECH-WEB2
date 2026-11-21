import Link from "@/components/i18n/link"
import { ArrowLeft, Lock } from "lucide-react"
import { Logo } from "@/components/layout/logo"
import { getDictionary } from "@/lib/i18n/dictionary"

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const t = await getDictionary()
  return (
    <div className="flex min-h-dvh flex-col bg-muted/50">
      <header className="border-b bg-background">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5 text-success" /> {t.checkout.secure}
          </span>
        </div>
      </header>
      <main id="main" className="flex-1 pb-16">
        <div className="container-page pt-6">
          <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {t.checkout.backToCart}
          </Link>
        </div>
        {children}
      </main>
    </div>
  )
}
