"use client"

import Link from "@/components/i18n/link"
import { cn } from "@/lib/utils"
import { useDict } from "@/components/i18n/provider"

export function Logo({ className }: { className?: string }) {
  const t = useDict()
  return (
    <Link href="/" className={cn("inline-flex items-center gap-1.5 text-primary", className)} aria-label={t.header.home}>
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <rect x="2" y="2" width="24" height="24" rx="7" fill="currentColor" />
        <path d="M8 9.5h12M14 9.5v10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <circle cx="20" cy="19.5" r="1.8" fill="#fff" />
      </svg>
      <span className="text-[22px] leading-none font-medium tracking-tight">
        toko<span className="font-light">tech</span>
      </span>
    </Link>
  )
}
