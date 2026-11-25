import type { ColorOption, Product, ProductStatus, ProductVariant } from "@/lib/types"
import { DAY, HOUR, MOCK_NOW, iso } from "./clock"

// ---------------------------------------------------------------------------
// Mock catalog in the shape of the Prisma `Product` + `ProductVariant` models.
// Prices are integers in IDR. Every product has at least one variant:
// - one per colour by default (same price), or
// - `configs` for price-changing options (RAM/storage), crossed with the colours.
// Denormalized fields (priceFrom, compareAtFrom, totalStock) are computed
// from the variants exactly as the Phase 3 write path will maintain them.
// ---------------------------------------------------------------------------

const C = {
  black: { name: "Black", hex: "#111827" },
  white: { name: "White", hex: "#f8fafc" },
  gray: { name: "Space Gray", hex: "#6b7280" },
  silver: { name: "Silver", hex: "#cbd5e1" },
  teal: { name: "Teal", hex: "#14b8c4" },
  pink: { name: "Pink", hex: "#f9a8d4" },
  lilac: { name: "Lilac", hex: "#a78bfa" },
  green: { name: "Mint", hex: "#86efac" },
  red: { name: "Red", hex: "#ef4444" },
  blue: { name: "Blue", hex: "#3b82f6" },
  yellow: { name: "Yellow", hex: "#facc15" },
} satisfies Record<string, ColorOption>

/** Packed weight (g) and box size (cm) per category, for courier rates. */
const PACKAGING: Record<string, { g: number; l: number; w: number; h: number }> = {
  "c-monitor": { g: 7_500, l: 75, w: 50, h: 20 },
  "c-keyboard": { g: 1_600, l: 50, w: 20, h: 8 },
  "c-mouse": { g: 400, l: 20, w: 15, h: 10 },
  "c-headset": { g: 1_000, l: 26, w: 22, h: 12 },
  "c-laptop": { g: 3_800, l: 50, w: 36, h: 10 },
  "c-desktop": { g: 16_000, l: 62, w: 56, h: 32 },
  "c-components": { g: 2_200, l: 40, w: 25, h: 12 },
}

const WARRANTY_MONTHS: Record<string, number> = {
  "c-monitor": 36,
  "c-desktop": 36,
  "c-laptop": 24,
  "c-components": 36,
}

type Config = { options: Record<string, string>; price: number; was?: number; stock: number }

type Input = {
  name: string
  brand: string
  cat: string
  /** Base variant price, used when there are no configs */
  price: number
  was?: number
  /** Units on hand across all variants */
  stock: number
  rating: number
  reviews: number
  sold: number
  colors: ColorOption[]
  /** Price-changing options; each config is offered in every colour */
  configs?: Config[]
  specs: Record<string, string>
  details?: Record<string, string>
  highlights: string[]
  accent: string
  daysAgo: number
  description?: string
  status?: ProductStatus
  featured?: boolean
  /** Override the category packaging (e.g. a 49" monitor) */
  pack?: { g: number; l: number; w: number; h: number }
}

let seq = 0

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/["″]/g, "in")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

/** Split `total` units across `n` variants; the first variant takes the remainder. */
function split(total: number, n: number) {
  const base = Math.floor(total / n)
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? total - base * n : 0))
}

function p(i: Input): Product {
  seq += 1
  const index = seq - 1
  const id = `p-${String(seq).padStart(3, "0")}`
  const status = i.status ?? "ACTIVE"
  const createdMs = Date.UTC(2026, 10, 15) - i.daysAgo * DAY
  const updatedMs = Math.max(createdMs, MOCK_NOW - (index % 17) * DAY - index * HOUR)
  const pack = i.pack ?? PACKAGING[i.cat]
  const skuBase = `TT-${i.cat.slice(2, 5).toUpperCase()}-${1000 + index * 7}`

  const configs: Config[] = i.configs ?? [{ options: {}, price: i.price, was: i.was, stock: i.stock }]
  const variants: ProductVariant[] = []
  for (const cfg of configs) {
    const perColor = split(cfg.stock, i.colors.length)
    i.colors.forEach((color, ci) => {
      const options = { ...cfg.options, color: color.name }
      const n = variants.length
      variants.push({
        id: `${id}-v${n + 1}`,
        productId: id,
        sku: `${skuBase}-${String(n + 1).padStart(2, "0")}`,
        name: Object.values(options).join(" / "),
        options,
        colorHex: color.hex,
        price: cfg.price,
        compareAtPrice: cfg.was ?? null,
        stock: perColor[ci],
        reserved: 0, // set by orders.ts from PENDING_PAYMENT orders
        weightGrams: pack.g,
        lengthCm: pack.l,
        widthCm: pack.w,
        heightCm: pack.h,
        isActive: true,
        position: n,
        createdAt: iso(createdMs),
        updatedAt: iso(updatedMs),
      })
    })
  }

  return {
    id,
    slug: slugify(i.name),
    name: i.name,
    description:
      i.description ??
      `${i.name}: ${i.highlights[0]}, plus ${i.highlights[1]}. Backed by an official Indonesian warranty and shipped fully tested from our Jakarta warehouse.`,
    status,
    brandId: `b-${i.brand}`,
    categoryId: i.cat,
    specs: i.specs,
    details: { ...i.specs, ...(i.details ?? {}) },
    highlights: i.highlights,
    accent: i.accent,
    featured: i.featured ?? false,
    warrantyMonths: WARRANTY_MONTHS[i.cat] ?? 24,
    // Denormalized; recomputed by syncDenormalized() once reservations are known
    priceFrom: 0,
    compareAtFrom: null,
    totalStock: 0,
    ratingAvg: i.rating,
    ratingCount: i.reviews,
    soldCount: i.sold,
    publishedAt: status === "DRAFT" ? null : iso(createdMs),
    createdAt: iso(createdMs),
    updatedAt: iso(updatedMs),
    variants,
  }
}

/**
 * Keep Product.priceFrom / compareAtFrom / totalStock in sync with the variants:
 * priceFrom is the cheapest active variant, totalStock is what can be sold now
 * (on hand minus reserved).
 */
export function syncDenormalized(product: Product) {
  const active = product.variants.filter((v) => v.isActive)
  const cheapest = active.reduce((a, b) => (b.price < a.price ? b : a), active[0])
  product.priceFrom = cheapest.price
  product.compareAtFrom = cheapest.compareAtPrice
  product.totalStock = active.reduce((n, v) => n + v.stock - v.reserved, 0)
}

export const products: Product[] = [
  // ---------------- Monitors ----------------
  p({ name: 'ROG Swift 27" OLED PG27AQDM', brand: "asus", cat: "c-monitor", price: 14_999_000, was: 16_499_000, stock: 8, rating: 4.9, reviews: 312, sold: 1200, colors: [C.black], specs: { size: '27"', resolution: "QHD 1440p", refresh: "240Hz", panel: "OLED" }, details: { "Response time": "0.03ms GtG", HDR: "DisplayHDR True Black 400", Ports: "2× HDMI 2.0, DP 1.4, USB hub" }, highlights: ["240Hz OLED panel", "0.03ms response time", "Anti-glare micro texture"], accent: "#8b5cf6", daysAgo: 4 }),
  p({ name: 'UltraGear 27" 27GR83Q', brand: "lg", cat: "c-monitor", price: 5_499_000, stock: 24, rating: 4.7, reviews: 860, sold: 3400, colors: [C.black], specs: { size: '27"', resolution: "QHD 1440p", refresh: "240Hz", panel: "IPS" }, details: { "Response time": "1ms GtG", HDR: "HDR10", Ports: "2× HDMI 2.1, DP 1.4" }, highlights: ["Nano IPS colour", "240Hz with G-Sync compatibility"], accent: "#ef4444", daysAgo: 60 }),
  p({ name: 'Odyssey G9 49" Curved', brand: "samsung", cat: "c-monitor", pack: { g: 17_500, l: 125, w: 52, h: 38 }, price: 21_999_000, was: 24_999_000, stock: 3, rating: 4.6, reviews: 214, sold: 410, colors: [C.white], specs: { size: '49"', resolution: "DQHD", refresh: "240Hz", panel: "VA" }, details: { Curvature: "1000R", "Response time": "1ms", HDR: "HDR1000" }, highlights: ["Immersive 1000R curve", "Dual QHD in one screen"], accent: "#3b82f6", daysAgo: 120 }),
  p({ name: 'UltraSharp 32" 4K U3225QE', brand: "dell", cat: "c-monitor", price: 13_499_000, stock: 12, rating: 4.8, reviews: 156, sold: 520, colors: [C.silver], specs: { size: '32"', resolution: "4K UHD", refresh: "60Hz", panel: "IPS" }, details: { "Colour coverage": "99% DCI-P3", Ports: "Thunderbolt 4 (90W), HDMI, DP, RJ45" }, highlights: ["Factory-calibrated 4K", "Thunderbolt 4 hub with 90W charging"], accent: "#0ea5e9", daysAgo: 9 }),
  p({ name: 'MAG 274QRF QD E2 27"', brand: "msi", cat: "c-monitor", price: 4_299_000, was: 4_799_000, stock: 40, rating: 4.6, reviews: 540, sold: 2600, colors: [C.black], specs: { size: '27"', resolution: "QHD 1440p", refresh: "165Hz", panel: "IPS" }, highlights: ["Quantum dot colour", "165Hz rapid IPS"], accent: "#f97316", daysAgo: 200 }),
  p({ name: 'Nitro 24" VG240Y', brand: "acer", cat: "c-monitor", price: 1_699_000, stock: 65, rating: 4.4, reviews: 1320, sold: 7800, colors: [C.black], specs: { size: '24"', resolution: "FHD 1080p", refresh: "144Hz", panel: "IPS" }, highlights: ["Budget-friendly 144Hz", "Slim three-sided bezel"], accent: "#22c55e", daysAgo: 400 }),
  p({ name: 'ProArt 34" PA34VCNV Ultrawide', brand: "asus", cat: "c-monitor", price: 9_899_000, stock: 6, rating: 4.7, reviews: 98, sold: 210, colors: [C.black], specs: { size: '34"', resolution: "UWQHD", refresh: "75Hz", panel: "IPS" }, highlights: ["Calman verified colour", "USB-C 96W power delivery"], accent: "#14b8c4", daysAgo: 150 }),
  p({ name: 'Odyssey OLED G6 27" 360Hz', brand: "samsung", cat: "c-monitor", price: 12_499_000, stock: 0, rating: 4.8, reviews: 74, sold: 160, colors: [C.silver], specs: { size: '27"', resolution: "QHD 1440p", refresh: "360Hz", panel: "OLED" }, highlights: ["360Hz QD-OLED", "Glare-free finish"], accent: "#6366f1", daysAgo: 2 }),
  p({ name: 'S2425HS 24" Home Monitor', brand: "dell", cat: "c-monitor", price: 1_899_000, stock: 50, rating: 4.5, reviews: 640, sold: 3900, colors: [C.white, C.black], specs: { size: '24"', resolution: "FHD 1080p", refresh: "75Hz", panel: "IPS" }, highlights: ["Built-in dual speakers", "Height-adjustable stand"], accent: "#38bdf8", daysAgo: 90 }),

  // ---------------- Keyboards ----------------
  p({ name: "Keychron Q1 Pro QMK", brand: "keychron", cat: "c-keyboard", price: 3_199_000, stock: 18, rating: 4.8, reviews: 420, sold: 1900, colors: [C.gray, C.silver, C.black], specs: { layout: "75%", switch: "Gateron Jupiter Brown", connectivity: "Tri-mode" }, details: { Case: "CNC aluminium", "Hot-swap": "Yes", Battery: "4000 mAh" }, highlights: ["Full aluminium gasket mount", "Hot-swappable switches"], accent: "#64748b", daysAgo: 70 }),
  p({ name: "Keychron K2 Max", brand: "keychron", cat: "c-keyboard", price: 1_599_000, stock: 30, rating: 4.6, reviews: 980, sold: 5200, colors: [C.gray, C.white], specs: { layout: "75%", switch: "Gateron Red", connectivity: "Tri-mode" }, highlights: ["1000Hz wireless polling", "Mac & Windows layouts"], accent: "#f97316", daysAgo: 12 }),
  p({ name: "Huntsman V3 Pro TKL", brand: "razer", cat: "c-keyboard", price: 3_799_000, was: 4_199_000, stock: 9, rating: 4.7, reviews: 210, sold: 640, colors: [C.black, C.white], specs: { layout: "TKL", switch: "Analog Optical", connectivity: "Wired" }, highlights: ["Adjustable actuation 0.1–4.0mm", "Rapid trigger mode"], accent: "#22c55e", daysAgo: 100 }),
  p({ name: "K70 RGB Pro", brand: "corsair", cat: "c-keyboard", price: 2_499_000, stock: 22, rating: 4.6, reviews: 730, sold: 2400, colors: [C.black], specs: { layout: "Full", switch: "Cherry MX Red", connectivity: "Wired" }, highlights: ["8000Hz hyper-polling", "PBT double-shot keycaps"], accent: "#eab308", daysAgo: 300 }),
  p({ name: "MX Keys S", brand: "logitech", cat: "c-keyboard", price: 1_799_000, stock: 44, rating: 4.7, reviews: 1500, sold: 8100, colors: [C.gray, C.pink, C.white], specs: { layout: "Full", switch: "Scissor", connectivity: "Wireless" }, highlights: ["Smart backlighting", "Pair up to 3 devices"], accent: "#a78bfa", daysAgo: 220 }),
  p({ name: "G Pro X 60 Lightspeed", brand: "logitech", cat: "c-keyboard", price: 2_899_000, stock: 5, rating: 4.5, reviews: 190, sold: 520, colors: [C.black, C.pink, C.white], specs: { layout: "60%", switch: "GX Optical Red", connectivity: "Tri-mode" }, highlights: ["Keycontrol layers", "Lightspeed wireless"], accent: "#ec4899", daysAgo: 6 }),
  p({ name: "Apex Pro Mini Wireless", brand: "steelseries", cat: "c-keyboard", price: 3_299_000, stock: 11, rating: 4.6, reviews: 260, sold: 900, colors: [C.black, C.white], specs: { layout: "60%", switch: "OmniPoint 2.0", connectivity: "Wireless" }, highlights: ["Adjustable OmniPoint switches", "Up to 40h battery"], accent: "#f97316", daysAgo: 160 }),
  p({ name: "Alloy Origins 65", brand: "hyperx", cat: "c-keyboard", price: 1_299_000, was: 1_499_000, stock: 35, rating: 4.5, reviews: 610, sold: 3100, colors: [C.black], specs: { layout: "65%", switch: "HyperX Aqua", connectivity: "Wired" }, highlights: ["Aircraft-grade aluminium", "Detachable USB-C"], accent: "#e11d48", daysAgo: 260 }),
  p({ name: "ROG Azoth Extreme", brand: "asus", cat: "c-keyboard", price: 7_499_000, stock: 4, rating: 4.9, reviews: 64, sold: 140, colors: [C.black], specs: { layout: "75%", switch: "ROG NX Snow", connectivity: "Tri-mode" }, highlights: ["Carbon-fibre plate", "OLED control display"], accent: "#ef4444", daysAgo: 3 }),

  // ---------------- Mouse ----------------
  p({ name: "G Pro X Superlight 2", brand: "logitech", cat: "c-mouse", price: 2_399_000, stock: 28, rating: 4.9, reviews: 2100, sold: 9400, colors: [C.black, C.white, C.pink], specs: { connectivity: "Wireless", weight: "< 60g", dpi: "30K+" }, details: { Sensor: "HERO 2", Polling: "Up to 8kHz", Battery: "95 hours" }, highlights: ["60g ultralight shell", "HERO 2 sensor up to 32K DPI"], accent: "#14b8c4", daysAgo: 40 }),
  p({ name: "MX Master 3S", brand: "logitech", cat: "c-mouse", price: 1_599_000, stock: 60, rating: 4.8, reviews: 3400, sold: 12000, colors: [C.gray, C.white, C.black], specs: { connectivity: "Wireless", weight: "> 100g", dpi: "8K" }, highlights: ["Quiet clicks", "MagSpeed electromagnetic scrolling"], accent: "#64748b", daysAgo: 330 }),
  p({ name: "DeathAdder V3 Pro", brand: "razer", cat: "c-mouse", price: 2_299_000, was: 2_599_000, stock: 14, rating: 4.8, reviews: 880, sold: 3600, colors: [C.black, C.white], specs: { connectivity: "Wireless", weight: "< 60g", dpi: "30K+" }, highlights: ["Ergonomic esports shape", "Focus Pro 30K sensor"], accent: "#22c55e", daysAgo: 180 }),
  p({ name: "Viper V3 HyperSpeed", brand: "razer", cat: "c-mouse", price: 1_199_000, stock: 33, rating: 4.6, reviews: 410, sold: 1800, colors: [C.black], specs: { connectivity: "Wireless", weight: "80–100g", dpi: "30K+" }, highlights: ["280h battery life", "Symmetrical design"], accent: "#84cc16", daysAgo: 8 }),
  p({ name: "Aerox 5 Wireless", brand: "steelseries", cat: "c-mouse", price: 1_899_000, stock: 7, rating: 4.4, reviews: 220, sold: 700, colors: [C.black, C.white], specs: { connectivity: "Wireless", weight: "60–80g", dpi: "16K" }, highlights: ["9 programmable buttons", "IP54 water resistance"], accent: "#f97316", daysAgo: 240 }),
  p({ name: "Pulsefire Haste 2", brand: "hyperx", cat: "c-mouse", price: 649_000, stock: 80, rating: 4.5, reviews: 1100, sold: 6100, colors: [C.black, C.white, C.pink], specs: { connectivity: "Wired", weight: "< 60g", dpi: "26K" }, highlights: ["53g honeycomb-free shell", "Virtually weightless cable"], accent: "#e11d48", daysAgo: 280 }),
  p({ name: "M240 Silent Bluetooth", brand: "logitech", cat: "c-mouse", price: 299_000, stock: 150, rating: 4.4, reviews: 2600, sold: 15000, colors: [C.gray, C.pink, C.white], specs: { connectivity: "Wireless", weight: "60–80g", dpi: "8K" }, highlights: ["90% less click noise", "18-month battery"], accent: "#f9a8d4", daysAgo: 360 }),
  p({ name: "ROG Harpe Ace Aim Lab", brand: "asus", cat: "c-mouse", price: 1_999_000, stock: 10, rating: 4.7, reviews: 150, sold: 480, colors: [C.black, C.white], specs: { connectivity: "Wireless", weight: "< 60g", dpi: "30K+" }, highlights: ["Tuned with Aim Lab", "54g tri-mode"], accent: "#8b5cf6", daysAgo: 5 }),
  p({ name: "M75 Wireless", brand: "corsair", cat: "c-mouse", price: 1_499_000, stock: 19, rating: 4.5, reviews: 130, sold: 390, colors: [C.black, C.white], specs: { connectivity: "Wireless", weight: "80–100g", dpi: "26K" }, highlights: ["Ambidextrous swappable buttons", "Marksman 26K sensor"], accent: "#eab308", daysAgo: 75 }),

  // ---------------- Headsets ----------------
  p({ name: "BlackShark V2 Pro", brand: "razer", cat: "c-headset", price: 2_799_000, stock: 16, rating: 4.7, reviews: 760, sold: 2900, colors: [C.black, C.white], specs: { connectivity: "Wireless", surround: "Spatial" }, highlights: ["TriForce Titanium 50mm drivers", "HyperClear super-wideband mic"], accent: "#22c55e", daysAgo: 140 }),
  p({ name: "Cloud III Wireless", brand: "hyperx", cat: "c-headset", price: 2_099_000, was: 2_399_000, stock: 21, rating: 4.6, reviews: 540, sold: 2100, colors: [C.black, C.red], specs: { connectivity: "Wireless", surround: "Spatial" }, highlights: ["120h battery life", "Signature Cloud comfort"], accent: "#ef4444", daysAgo: 110 }),
  p({ name: "Arctis Nova Pro Wireless", brand: "steelseries", cat: "c-headset", price: 5_999_000, stock: 6, rating: 4.8, reviews: 320, sold: 800, colors: [C.black, C.white], specs: { connectivity: "Wireless", surround: "Spatial" }, highlights: ["Active noise cancellation", "Hot-swappable batteries"], accent: "#f97316", daysAgo: 11 }),
  p({ name: "G Pro X 2 Lightspeed", brand: "logitech", cat: "c-headset", price: 3_799_000, stock: 13, rating: 4.6, reviews: 280, sold: 900, colors: [C.black, C.white], specs: { connectivity: "Wireless", surround: "7.1 Surround" }, highlights: ["Graphene drivers", "50h battery"], accent: "#14b8c4", daysAgo: 190 }),
  p({ name: "HS80 RGB USB", brand: "corsair", cat: "c-headset", price: 1_399_000, stock: 27, rating: 4.4, reviews: 450, sold: 1700, colors: [C.black, C.white], specs: { connectivity: "Wired", surround: "Spatial" }, highlights: ["Dolby Atmos", "Broadcast-grade omni mic"], accent: "#eab308", daysAgo: 310 }),
  p({ name: "Cloud Stinger 2", brand: "hyperx", cat: "c-headset", price: 599_000, stock: 90, rating: 4.3, reviews: 1900, sold: 9800, colors: [C.black], specs: { connectivity: "Wired", surround: "Stereo" }, highlights: ["Lightweight 275g", "Swivel-to-mute mic"], accent: "#64748b", daysAgo: 420 }),

  // ---------------- Laptops ----------------
  p({ name: "ROG Zephyrus G16 (2026)", brand: "asus", cat: "c-laptop", price: 39_999_000, stock: 5, configs: [{ options: { ram: "32GB", storage: "1TB" }, price: 39_999_000, stock: 3 }, { options: { ram: "32GB", storage: "2TB" }, price: 42_999_000, stock: 2 }], rating: 4.8, reviews: 88, sold: 210, colors: [C.gray, C.white], specs: { screen: '16"', cpu: "Intel Core Ultra 9", gpu: "RTX 5080", ram: "32GB", storage: "2TB" }, details: { Display: "2.5K 240Hz OLED", Weight: "1.85 kg", Battery: "90Wh" }, highlights: ["240Hz OLED display", "RTX 5080 laptop GPU"], accent: "#8b5cf6", daysAgo: 7 }),
  p({ name: "Legion Pro 7i Gen 10", brand: "lenovo", cat: "c-laptop", price: 38_499_000, was: 41_999_000, stock: 4, rating: 4.7, reviews: 120, sold: 300, colors: [C.black], specs: { screen: '16"', cpu: "Intel Core Ultra 9", gpu: "RTX 5080", ram: "32GB", storage: "1TB" }, highlights: ["Legion ColdFront vapor chamber", "WQXGA 240Hz display"], accent: "#0ea5e9", daysAgo: 50 }),
  p({ name: "XPS 14 9440", brand: "dell", cat: "c-laptop", price: 29_999_000, stock: 9, rating: 4.5, reviews: 140, sold: 260, colors: [C.gray, C.silver], specs: { screen: '14"', cpu: "Intel Core Ultra 7", gpu: "RTX 4050", ram: "16GB", storage: "1TB" }, highlights: ["Seamless glass touchpad", "3.2K OLED touch option"], accent: "#38bdf8", daysAgo: 170 }),
  p({ name: "Katana 15 B13V", brand: "msi", cat: "c-laptop", price: 15_999_000, stock: 17, rating: 4.4, reviews: 610, sold: 2200, colors: [C.black], specs: { screen: '15.6"', cpu: "Intel Core i7", gpu: "RTX 4060", ram: "16GB", storage: "512GB" }, highlights: ["144Hz FHD display", "Cooler Boost 5"], accent: "#ef4444", daysAgo: 260 }),
  p({ name: "Zenbook 14 OLED UX3405", brand: "asus", cat: "c-laptop", price: 16_499_000, stock: 23, configs: [{ options: { ram: "16GB", storage: "1TB" }, price: 16_499_000, stock: 15 }, { options: { ram: "32GB", storage: "1TB" }, price: 18_999_000, stock: 8 }], rating: 4.7, reviews: 390, sold: 1500, colors: [C.blue, C.silver], specs: { screen: '14"', cpu: "Intel Core Ultra 7", gpu: "Intel Arc", ram: "16GB", storage: "1TB" }, highlights: ["1.2kg featherweight", "3K 120Hz OLED"], accent: "#3b82f6", daysAgo: 130 }),
  p({ name: "Swift Go 14 AI", brand: "acer", cat: "c-laptop", price: 12_999_000, was: 13_999_000, stock: 2, rating: 4.3, reviews: 95, sold: 330, colors: [C.silver], specs: { screen: '14"', cpu: "Snapdragon X Plus", gpu: "Adreno", ram: "16GB", storage: "512GB" }, highlights: ["All-day battery", "Copilot+ PC"], accent: "#22c55e", daysAgo: 30 }),
  p({ name: "ThinkPad X1 Carbon Gen 13", brand: "lenovo", cat: "c-laptop", price: 34_999_000, stock: 8, rating: 4.8, reviews: 70, sold: 150, colors: [C.black], specs: { screen: '14"', cpu: "Intel Core Ultra 7", gpu: "Intel Arc", ram: "32GB", storage: "1TB" }, highlights: ["Under 1kg carbon chassis", "Legendary keyboard"], accent: "#e2231a", daysAgo: 14 }),
  p({ name: "Raider 18 HX AI", brand: "msi", cat: "c-laptop", price: 64_999_000, stock: 1, rating: 4.9, reviews: 22, sold: 40, colors: [C.black], specs: { screen: '17"', cpu: "Intel Core Ultra 9", gpu: "RTX 5090", ram: "64GB", storage: "2TB" }, highlights: ["RTX 5090 laptop GPU", "Mini-LED 4K 120Hz"], accent: "#f97316", daysAgo: 20 }),

  // ---------------- Desktop PCs ----------------
  p({ name: "TokoTech Vanguard RTX 5070", brand: "asus", cat: "c-desktop", price: 24_999_000, was: 27_499_000, stock: 6, featured: true, configs: [{ options: { ram: "32GB", storage: "1TB" }, price: 24_999_000, was: 27_499_000, stock: 4 }, { options: { ram: "64GB", storage: "2TB" }, price: 29_499_000, was: 31_999_000, stock: 2 }], rating: 4.8, reviews: 140, sold: 380, colors: [C.white, C.black], specs: { useCase: "Gaming", cpu: "AMD Ryzen 7 9800X3D", gpu: "RTX 5070", ram: "32GB", storage: "1TB" }, details: { Motherboard: "ROG Strix B850-A", PSU: "850W 80+ Gold", Cooling: "360mm AIO" }, highlights: ["Ryzen 7 9800X3D gaming CPU", "Tempered glass with ARGB fans"], accent: "#14b8c4", daysAgo: 25 }),
  p({ name: "Aegis RS2 Gaming Desktop", brand: "msi", cat: "c-desktop", price: 47_999_000, stock: 3, rating: 4.7, reviews: 46, sold: 90, colors: [C.black], specs: { useCase: "Gaming", cpu: "Intel Core Ultra 9", gpu: "RTX 5080", ram: "32GB", storage: "2TB" }, highlights: ["RTX 5080 graphics", "Tool-less upgrade access"], accent: "#ef4444", daysAgo: 10 }),
  p({ name: "Legion Tower 7i", brand: "lenovo", cat: "c-desktop", price: 39_999_000, stock: 4, rating: 4.6, reviews: 58, sold: 120, colors: [C.black], specs: { useCase: "Gaming", cpu: "Intel Core i9", gpu: "RTX 4080 Super", ram: "32GB", storage: "2TB" }, highlights: ["Legion Coldfront 5.0", "Front-panel ARGB"], accent: "#3b82f6", daysAgo: 210 }),
  p({ name: "TokoTech Studio Creator", brand: "asus", cat: "c-desktop", price: 33_499_000, stock: 5, rating: 4.9, reviews: 34, sold: 70, colors: [C.white], specs: { useCase: "Creator", cpu: "AMD Ryzen 9 9950X", gpu: "RTX 4070 Ti Super", ram: "64GB", storage: "2TB" }, highlights: ["16-core Ryzen 9", "Silent airflow chassis"], accent: "#a78bfa", daysAgo: 45 }),
  p({ name: "OptiPlex Micro 7020", brand: "dell", cat: "c-desktop", price: 10_999_000, stock: 25, rating: 4.5, reviews: 110, sold: 640, colors: [C.black], specs: { useCase: "Office", cpu: "Intel Core i5", gpu: "Intel UHD", ram: "16GB", storage: "512GB" }, highlights: ["1.2L ultra-compact", "VESA mountable"], accent: "#0ea5e9", daysAgo: 300 }),
  p({ name: "TokoTech Starter RTX 4060", brand: "msi", cat: "c-desktop", price: 12_499_000, stock: 14, rating: 4.5, reviews: 260, sold: 1100, colors: [C.black, C.white], specs: { useCase: "Gaming", cpu: "AMD Ryzen 5 7600", gpu: "RTX 4060", ram: "16GB", storage: "1TB" }, highlights: ["1080p high-refresh gaming", "Ready to play out of the box"], accent: "#22c55e", daysAgo: 95 }),

  // ---------------- Components ----------------
  p({ name: "ROG Astral GeForce RTX 5090 OC", brand: "asus", cat: "c-components", price: 49_999_000, stock: 2, rating: 4.9, reviews: 41, sold: 60, colors: [C.black], specs: { type: "Graphics card", memory: "32GB" }, details: { "Boost clock": "2610 MHz", Power: "600W", Slots: "3.8" }, highlights: ["Quad-fan cooling", "32GB GDDR7"], accent: "#8b5cf6", daysAgo: 15 }),
  p({ name: "GeForce RTX 5070 Ti Gaming Trio", brand: "msi", cat: "c-components", price: 15_499_000, stock: 9, rating: 4.7, reviews: 130, sold: 420, colors: [C.black], specs: { type: "Graphics card", memory: "16GB" }, highlights: ["TRI FROZR 4 cooling", "16GB GDDR7"], accent: "#ef4444", daysAgo: 55 }),
  p({ name: "GeForce RTX 5060 Ventus 2X", brand: "msi", cat: "c-components", price: 5_499_000, stock: 31, rating: 4.5, reviews: 210, sold: 900, colors: [C.black], specs: { type: "Graphics card", memory: "8GB" }, highlights: ["Compact dual-fan design", "DLSS 4 support"], accent: "#64748b", daysAgo: 35 }),
  p({ name: "Vengeance RGB DDR5 32GB 6000", brand: "corsair", cat: "c-components", price: 1_899_000, was: 2_199_000, stock: 48, rating: 4.8, reviews: 930, sold: 4200, colors: [C.black, C.white], specs: { type: "Memory", memory: "32GB" }, highlights: ["DDR5-6000 CL30", "Dynamic RGB lighting"], accent: "#eab308", daysAgo: 230 }),
  p({ name: "990 PRO 2TB NVMe SSD", brand: "samsung", cat: "c-components", price: 2_999_000, stock: 37, rating: 4.9, reviews: 1400, sold: 5600, colors: [C.black], specs: { type: "Storage", memory: "2TB" }, highlights: ["7450 MB/s reads", "PCIe 4.0"], accent: "#1428a0", daysAgo: 270 }),

  // ---------------- Not live: admin-only (DRAFT is unpublished, ARCHIVED was retired) ----------------
  p({ name: 'UltraGear 32" 4K OLED 32GS95UE', brand: "lg", cat: "c-monitor", price: 19_999_000, stock: 0, rating: 0, reviews: 0, sold: 0, colors: [C.black], specs: { size: '32"', resolution: "4K UHD", refresh: "240Hz", panel: "OLED" }, highlights: ["Dual-mode 4K 240Hz / FHD 480Hz", "Pixel Sound speakers"], accent: "#a50034", daysAgo: 1, status: "DRAFT" }),
  p({ name: "BlackWidow V4 75%", brand: "razer", cat: "c-keyboard", price: 3_299_000, stock: 0, rating: 0, reviews: 0, sold: 0, colors: [C.black, C.white], specs: { layout: "75%", switch: "Razer Orange", connectivity: "Wired" }, highlights: ["Hot-swappable switches", "Gasket-mounted FR4 plate"], accent: "#16a34a", daysAgo: 1, status: "DRAFT" }),
  p({ name: "GeForce RTX 5080 Founders Edition", brand: "nvidia", cat: "c-components", price: 21_999_000, stock: 0, rating: 0, reviews: 0, sold: 0, colors: [C.black], specs: { type: "Graphics card", memory: "16GB" }, highlights: ["Double flow-through cooler", "16GB GDDR7"], accent: "#76b900", daysAgo: 0, status: "DRAFT" }),
  p({ name: "G502 HERO", brand: "logitech", cat: "c-mouse", price: 699_000, stock: 0, rating: 4.6, reviews: 4200, sold: 21000, colors: [C.black], specs: { connectivity: "Wired", weight: "> 100g", dpi: "26K" }, highlights: ["11 programmable buttons", "Adjustable weights"], accent: "#00b8fc", daysAgo: 900, status: "ARCHIVED" }),
]

export const productById = new Map(products.map((x) => [x.id, x]))
export const productBySlug = new Map(products.map((x) => [x.slug, x]))

for (const x of products) syncDenormalized(x)
