"use client"

import { useSyncExternalStore } from "react"
import { MapPin, Truck } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDict } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"
import { cn } from "@/lib/utils"

// Delivery estimate with a city picker (mock: the zone sets the ETA text; checkout quotes real rates).
// The chosen city is remembered in localStorage for every product page.

const CITIES = [
  { city: "Jakarta Selatan", zone: 0 }, { city: "Jakarta Pusat", zone: 0 }, { city: "Tangerang", zone: 0 }, { city: "Bekasi", zone: 0 }, { city: "Depok", zone: 0 },
  { city: "Bandung", zone: 1 }, { city: "Semarang", zone: 1 }, { city: "Yogyakarta", zone: 1 }, { city: "Surabaya", zone: 1 }, { city: "Malang", zone: 1 },
  { city: "Denpasar", zone: 2 }, { city: "Medan", zone: 2 }, { city: "Makassar", zone: 2 }, { city: "Balikpapan", zone: 2 }, { city: "Palembang", zone: 2 },
]
const KEY = "tokotech-city"
const listeners = new Set<() => void>()

function readCity() {
  try {
    return localStorage.getItem(KEY) ?? CITIES[0].city
  } catch {
    return CITIES[0].city
  }
}
function saveCity(city: string) {
  try {
    localStorage.setItem(KEY, city)
  } catch {}
  listeners.forEach((l) => l())
}

export function DeliveryEstimate() {
  const t = useDict()
  const city = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    readCity,
    () => CITIES[0].city,
  )
  const zone = CITIES.find((c) => c.city === city)?.zone ?? 0
  const eta = [t.extra.etaJakarta, t.extra.etaJava, t.extra.etaOther][zone]

  return (
    <div className="flex items-start gap-3 p-4">
      <Truck className="mt-0.5 size-5 shrink-0 text-primary" />
      <div>
        <p className="font-medium">{fmt(t.extra.deliveryTo, { city })}</p>
        <p className="text-muted-foreground">{eta}</p>
        <Popover>
          <PopoverTrigger className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <MapPin className="size-3" /> {t.product.changeLocation}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">{t.extra.chooseCity}</p>
            <ul className="max-h-64 overflow-y-auto">
              {CITIES.map((c) => (
                <li key={c.city}>
                  <button
                    type="button"
                    onClick={() => saveCity(c.city)}
                    className={cn("w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted", c.city === city && "bg-accent font-medium text-accent-foreground")}
                  >
                    {c.city}
                  </button>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
