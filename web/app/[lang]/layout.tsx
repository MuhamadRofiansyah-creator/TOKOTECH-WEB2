import type { Metadata, Viewport } from "next"
import { Lexend, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { SessionProvider } from "next-auth/react"
import { StoreSync } from "@/components/auth/store-sync"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { I18nProvider } from "@/components/i18n/provider"
import { LOCALES } from "@/lib/i18n/config"
import { getDictionary, getLocale } from "@/lib/i18n/dictionary"
import "../globals.css"

const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

// Root layout for the storefront in every locale (/... = en, /id/... = id).
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }))
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary()
  return { title: { default: t.meta.title, template: `%s | TokoTech` }, description: t.meta.description }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  return (
    <html lang={locale} suppressHydrationWarning className={`${lexend.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <I18nProvider locale={locale} dict={dict}>
            <SessionProvider>
              <StoreSync />
              <TooltipProvider>{children}</TooltipProvider>
            </SessionProvider>
          </I18nProvider>
          <Toaster position="bottom-right" richColors={false} />
        </ThemeProvider>
      </body>
    </html>
  )
}
