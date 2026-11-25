import type { Brand } from "@/lib/types"

// logoUrl stays null until real logos exist; the UI draws a wordmark badge (brandMark in lib/format.ts).
const b = (slug: string, name: string, color: string): Brand => ({ id: `b-${slug}`, slug, name, color, logoUrl: null })

export const brands: Brand[] = [
  b("asus", "ASUS", "#0f172a"),
  b("msi", "MSI", "#dc2626"),
  b("logitech", "Logitech", "#00b8fc"),
  b("razer", "Razer", "#16a34a"),
  b("corsair", "Corsair", "#eab308"),
  b("dell", "Dell", "#0076ce"),
  b("lg", "LG", "#a50034"),
  b("samsung", "Samsung", "#1428a0"),
  b("lenovo", "Lenovo", "#e2231a"),
  b("keychron", "Keychron", "#334155"),
  b("steelseries", "SteelSeries", "#f97316"),
  b("hyperx", "HyperX", "#e11d48"),
  b("nvidia", "NVIDIA", "#76b900"),
  b("acer", "Acer", "#83b81a"),
]

export const brandById = new Map(brands.map((x) => [x.id, x]))
export const brandBySlug = new Map(brands.map((x) => [x.slug, x]))
