import Link from "@/components/i18n/link"
import { CreditCard, Headphones, RotateCcw, ShieldCheck, Truck } from "lucide-react"
import { getCategories } from "@/lib/data"
import { Logo } from "./logo"
import { getDictionary } from "@/lib/i18n/dictionary"

const PERK_ICONS = [Truck, ShieldCheck, RotateCcw, Headphones]

export async function Footer() {
  const [categories, t] = await Promise.all([getCategories(), getDictionary()])
  const perks = t.footer.perks.map((p, i) => ({ ...p, icon: PERK_ICONS[i] }))
  return (
    <footer className="mt-20">
      <div className="border-y bg-muted/60">
        <ul className="container-page grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
          {perks.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-medium">{title}</span>
                <span className="block text-xs text-muted-foreground">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-topbar text-topbar-foreground">
        <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              {t.footer.about}
            </p>
            <p className="mt-4 text-sm">
              Jl. Gatot Subroto Kav. 18, Jakarta
              <br />
              {t.footer.hours}
            </p>
          </div>
          <FooterCol title={t.footer.shop} links={categories.map((c) => [`/c/${c.slug}`, c.name])} />
          <FooterCol
            title={t.footer.help}
            links={[
              ["/account/orders", t.footer.trackOrder],
              ["/info/shipping", t.footer.shippingInfo],
              ["/info/returns", t.footer.returnsWarranty],
              ["/info/payment", t.footer.paymentMethods],
              ["/info/contact", t.footer.contact],
            ]}
          />
          <FooterCol
            title={t.footer.company}
            links={[
              ["/info/about", t.footer.aboutUs],
              ["/info/careers", t.footer.careers],
              ["/info/stores", t.footer.stores],
              ["/info/business", t.footer.business],
            ]}
          />
        </div>
        <div className="border-t border-white/10">
          <div className="container-page flex flex-col items-center justify-between gap-3 py-5 text-xs sm:flex-row">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {t.footer.rights}
              <Link href="/info/terms" className="hover:text-white">
                {t.extra.terms}
              </Link>
              <Link href="/info/privacy" className="hover:text-white">
                {t.extra.privacy}
              </Link>
            </p>
            <div className="flex items-center gap-2">
              <CreditCard className="size-4" />
              {["VISA", "Mastercard", "QRIS", "GoPay", "OVO", "BCA VA"].map((m) => (
                <span key={m} className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-white">{title}</h2>
      <ul className="space-y-2 text-sm">
        {links.map(([href, label]) => (
          <li key={label}>
            <Link href={href} className="hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
