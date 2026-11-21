import { Logo } from "@/components/layout/logo"
import { ProductArt } from "@/components/product/product-art"
import { getDictionary } from "@/lib/i18n/dictionary"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getDictionary()
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main id="main" className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-slate-600 via-slate-500 to-slate-400 text-white lg:block">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(60%_60%_at_60%_55%,white,transparent)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <p className="text-6xl leading-[1.05] font-light tracking-tight">
            {t.auth.tagline[0]}
            <br />
            <span className="pl-[1em]">{t.auth.tagline[1]}</span>
          </p>
          <div className="mx-auto w-4/5 max-w-md">
            <ProductArt kind="monitor" accent="#14b8c4" body="#0f172a" />
          </div>
          <p className="text-sm text-white/80">{t.auth.perks}</p>
        </div>
      </aside>
    </div>
  )
}
