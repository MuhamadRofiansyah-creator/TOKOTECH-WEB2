import { ChevronDown, MapPin, RotateCcw, ShieldCheck, Truck } from "lucide-react"
import { getDictionary } from "@/lib/i18n/dictionary"

export async function TopBar() {
  const t = await getDictionary()
  return (
    <div className="bg-topbar text-[11px] text-topbar-foreground">
      <div className="container-page flex h-8 items-center justify-between gap-4">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5" />
          {t.topbar.shipTo} <span className="font-medium text-white">{t.topbar.indonesia}</span>
          <span aria-hidden className="ml-0.5 inline-block h-2.5 w-3.5 overflow-hidden rounded-[2px] ring-1 ring-white/20">
            <span className="block h-1/2 bg-red-600" />
            <span className="block h-1/2 bg-white" />
          </span>
          <ChevronDown className="size-3" />
        </span>
        <ul className="hidden items-center gap-5 md:flex">
          <li className="inline-flex items-center gap-1.5">
            <Truck className="size-3.5" /> {t.topbar.freeShipping}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <RotateCcw className="size-3.5" /> {t.topbar.returns}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> {t.topbar.warranty}
          </li>
        </ul>
      </div>
    </div>
  )
}
