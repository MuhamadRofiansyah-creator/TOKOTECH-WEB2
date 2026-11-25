// Users and addresses in the shape of the Prisma `User` / `Address` models.
// u-001 is Rofi: the mock signed-in shopper and the ADMIN.

import type { Address, Role, User, UserStatus } from "@/lib/types"
import { DAY, HOUR, MOCK_NOW, iso, rng } from "./clock"

const NAMES = [
  "Rofi", "Siti Nurhaliza", "Budi Santoso", "Dewi Lestari", "Agus Pratama", "Rina Wijaya",
  "Fajar Nugroho", "Putri Maharani", "Hendra Gunawan", "Ayu Kartika", "Rizky Ramadhan", "Nadia Safitri",
  "Yoga Saputra", "Maya Anggraini", "Dimas Prakoso", "Intan Permata", "Bayu Firmansyah", "Lina Marlina",
  "Arif Hidayat", "Sari Puspita", "Galih Wicaksono", "Wulan Sari", "Eko Prasetyo", "Citra Kirana",
]

/** City → a real district (kecamatan), province and postal code, so courier-rate lookups have what they need. */
const AREAS = [
  { city: "Jakarta Selatan", district: "Kebayoran Baru", province: "DKI Jakarta", postalCode: "12110", lat: -6.2441, lng: 106.8001 },
  { city: "Bandung", district: "Coblong", province: "Jawa Barat", postalCode: "40132", lat: -6.8875, lng: 107.6136 },
  { city: "Surabaya", district: "Gubeng", province: "Jawa Timur", postalCode: "60281", lat: -7.2754, lng: 112.7516 },
  { city: "Yogyakarta", district: "Gondokusuman", province: "DI Yogyakarta", postalCode: "55223", lat: -7.7828, lng: 110.3825 },
  { city: "Semarang", district: "Semarang Tengah", province: "Jawa Tengah", postalCode: "50134", lat: -6.9818, lng: 110.4159 },
  { city: "Medan", district: "Medan Baru", province: "Sumatera Utara", postalCode: "20154", lat: 3.5778, lng: 98.6582 },
  { city: "Denpasar", district: "Denpasar Selatan", province: "Bali", postalCode: "80222", lat: -8.6884, lng: 115.2366 },
  { city: "Makassar", district: "Panakkukang", province: "Sulawesi Selatan", postalCode: "90231", lat: -5.1477, lng: 119.4327 },
  { city: "Malang", district: "Lowokwaru", province: "Jawa Timur", postalCode: "65141", lat: -7.9425, lng: 112.6121 },
  { city: "Tangerang", district: "Cipondoh", province: "Banten", postalCode: "15148", lat: -6.1856, lng: 106.6873 },
]
const STREETS = ["Jl. Merdeka No. 8", "Jl. Diponegoro No. 45", "Jl. Gajah Mada No. 112", "Jl. Ahmad Yani No. 27", "Jl. Pahlawan No. 3", "Jl. Veteran No. 61"]

const role = (i: number): Role => (i === 0 || i === 7 ? "ADMIN" : i === 3 || i === 12 ? "STAFF" : "CUSTOMER")
const status = (i: number): UserStatus => (i === 9 || i === 20 ? "SUSPENDED" : i === 22 || i === 23 ? "INVITED" : "ACTIVE")

export const users: User[] = NAMES.map((name, i) => {
  const r = rng(i + 11)
  const [first, last] = name.toLowerCase().split(" ")
  const st = status(i)
  const createdMs = i === 0 ? MOCK_NOW - 400 * DAY : MOCK_NOW - Math.floor(30 + r() * 700) * DAY
  return {
    id: `u-${String(i + 1).padStart(3, "0")}`,
    name,
    email: `${first}${last ? "." + last[0] : ""}@example.com`,
    emailVerified: st === "INVITED" ? null : iso(createdMs + HOUR),
    phone: st === "INVITED" ? null : `0812${String(30_000_000 + i * 1_234_567).slice(0, 8)}`,
    image: null,
    passwordHash: null, // set by Auth.js in Phase 3
    role: role(i),
    status: st,
    locale: i % 3 === 0 ? "id" : "en",
    lastActiveAt: st === "INVITED" ? null : iso(MOCK_NOW - Math.floor(r() * 20) * DAY - Math.floor(r() * 20) * HOUR),
    createdAt: iso(createdMs),
    updatedAt: iso(createdMs),
  }
})

export const ROFI_ID = "u-001"
export const userById = new Map(users.map((u) => [u.id, u]))

/** "Rizky Ramadhan" → "Rizky R." for public review bylines. */
export const displayName = (name: string | null) => {
  if (!name) return "TokoTech customer"
  const [first, last] = name.split(" ")
  return last ? `${first} ${last[0]}.` : first
}

const addr = (a: Omit<Address, "createdAt" | "updatedAt" | "notes" | "areaId"> & { notes?: string }): Address => ({
  notes: null,
  areaId: null, // filled by the shipping-aggregator autocomplete in Phase 3
  createdAt: iso(MOCK_NOW - 300 * DAY),
  updatedAt: iso(MOCK_NOW - 300 * DAY),
  ...a,
})

export const addresses: Address[] = [
  addr({ id: "a-001", userId: ROFI_ID, label: "Home", recipient: "Rofi", phone: "0812 3456 7890", street: "Jl. Sudirman No. 21", district: "Setiabudi", city: "Jakarta Selatan", province: "DKI Jakarta", postalCode: "12190", latitude: -6.2146, longitude: 106.8213, isDefault: true }),
  addr({ id: "a-002", userId: ROFI_ID, label: "Office", recipient: "Rofi", phone: "0812 3456 7890", street: "Menara Kuningan Lt. 12, Jl. H.R. Rasuna Said", district: "Setiabudi", city: "Jakarta Selatan", province: "DKI Jakarta", postalCode: "12940", latitude: -6.2187, longitude: 106.8306, isDefault: false, notes: "Leave with reception" }),
  ...users
    .filter((u) => u.id !== ROFI_ID && u.status !== "INVITED")
    .map((u, i) => {
      const r = rng(i + 71)
      const a = AREAS[Math.floor(r() * AREAS.length)]
      return addr({
        id: `a-${String(i + 3).padStart(3, "0")}`,
        userId: u.id,
        label: "Home",
        recipient: u.name!,
        phone: u.phone!,
        street: STREETS[Math.floor(r() * STREETS.length)],
        district: a.district,
        city: a.city,
        province: a.province,
        postalCode: a.postalCode,
        latitude: a.lat,
        longitude: a.lng,
        isDefault: true,
      })
    }),
]

export const defaultAddress = (userId: string) => addresses.find((a) => a.userId === userId && a.isDefault) ?? null
