// Domain types, derived from the Prisma schema (prisma/schema.prisma).
//
// The models come from the generated client (`npm run db:generate`, also run
// on `npm install`), so a schema change that the fixtures or UI don't follow
// fails `tsc`. Two adjustments are made for the UI:
// - `Serialized<T>`: dates are ISO strings, because data crosses the
//   server → client boundary as JSON.
// - Json columns get their concrete shapes (specs, facets, variant options).
//
// The Prisma queries in lib/data and the seed fixtures in prisma/fixtures both
// return these exact shapes.

import type * as Db from "@/lib/generated/prisma/browser"
import type { OrderStatus } from "@/lib/generated/prisma/enums"

export type {
  InventoryReason,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  RefundStatus,
  ReviewStatus,
  Role,
  ShipmentStatus,
  UserStatus,
  VoucherType,
} from "@/lib/generated/prisma/enums"

type Wire<V> = V extends Date ? string : V
/** A Prisma model as it crosses the server → client boundary (Date → ISO string). */
export type Serialized<T> = { [K in keyof T]: Wire<T[K]> }

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export type CategorySlug =
  | "desktop-pc"
  | "laptops"
  | "monitors"
  | "keyboards"
  | "mouse"
  | "headsets"
  | "components"

export type ArtKind = "desktop" | "laptop" | "monitor" | "keyboard" | "mouse" | "headset" | "gpu"

/** One entry of `Category.facets` (Json). */
export interface Facet {
  /** Key inside Product.specs */
  key: string
  label: string
  /** chips = compact toggle buttons (like the size chips in the reference) */
  type: "checkbox" | "chips"
  /** Optional explicit option order; otherwise derived from products */
  order?: string[]
}

export type Category = Omit<Serialized<Db.Category>, "slug" | "art" | "facets"> & {
  slug: CategorySlug
  art: ArtKind
  facets: Facet[]
}

export type Brand = Serialized<Db.Brand>

/** `ProductVariant.options` (Json), e.g. { color: "Black" } or { ram: "32GB", storage: "1TB", color: "White" } */
export type VariantOptions = Record<string, string>

export type ProductVariant = Omit<Serialized<Db.ProductVariant>, "options"> & { options: VariantOptions }

export type Product = Omit<Serialized<Db.Product>, "specs" | "details"> & {
  /** Facet-able specs; keys match Category.facets[].key */
  specs: Record<string, string>
  /** Full specification table rows (label → value) */
  details: Record<string, string>
  /** Always loaded with the product (Prisma `include: { variants: true }`), ordered by position */
  variants: ProductVariant[]
}

/** Derived, never stored: see `deriveBadges` in lib/data. */
export type ProductBadge = "new" | "sale" | "bestseller" | "preorder"

export interface ColorOption {
  name: string
  hex: string
}

/** What listing and product pages render. */
export type ProductWithRelations = Product & {
  brand: Brand
  category: Category
  badges: ProductBadge[]
}

export type Review = Serialized<Db.Review>
/** Published review with the author's display name ("Rizky R."). */
export type ReviewView = Review & { author: string }

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type User = Serialized<Db.User>
export type Address = Serialized<Db.Address>

// ---------------------------------------------------------------------------
// Orders, payments, fulfilment
// ---------------------------------------------------------------------------

export type Order = Serialized<Db.Order>
export type OrderItem = Serialized<Db.OrderItem>
export type OrderEvent = Serialized<Db.OrderEvent>
export type Payment = Serialized<Db.Payment>
export type Refund = Serialized<Db.Refund>
export type Shipment = Serialized<Db.Shipment>

export type OrderWithDetails = Order & {
  items: OrderItem[]
  shipments: Shipment[]
  events: OrderEvent[]
  /** Payment attempts, newest first (what the order page needs to resume a payment) */
  payments: Pick<Payment, "number" | "status" | "method" | "redirectUrl" | "expiresAt">[]
}

// ---------------------------------------------------------------------------
// Promotions & operations
// ---------------------------------------------------------------------------

export type Voucher = Serialized<Db.Voucher>
export type VoucherRedemption = Serialized<Db.VoucherRedemption>
export type FlashSale = Serialized<Db.FlashSale>
export type FlashSaleItem = Serialized<Db.FlashSaleItem>
export type InventoryMovement = Serialized<Db.InventoryMovement>

// ---------------------------------------------------------------------------
// Shopping (client stores mirror CartItem: a line is a variant + quantity)
// ---------------------------------------------------------------------------

export interface CartLine {
  variantId: string
  quantity: number
}

// ---------------------------------------------------------------------------
// Catalog queries
// ---------------------------------------------------------------------------

export type SortKey = "popular" | "newest" | "price-asc" | "price-desc" | "rating"

export interface ProductFilters {
  category?: CategorySlug
  q?: string
  brands?: string[]
  colors?: string[]
  minPrice?: number
  maxPrice?: number
  minRating?: number
  inStock?: boolean
  specs?: Record<string, string[]>
  sort?: SortKey
  page?: number
  perPage?: number
}

export interface FacetOption {
  value: string
  count: number
}

export interface ProductQueryResult {
  items: ProductWithRelations[]
  total: number
  page: number
  pageCount: number
  facets: {
    brands: (Brand & { count: number })[]
    colors: (ColorOption & { count: number })[]
    specs: (Facet & { options: FacetOption[] })[]
    priceBounds: [number, number]
    priceHistogram: number[]
  }
}

// ---------------------------------------------------------------------------
// Admin rows: projections the admin tables render. In Phase 2 each is one
// Prisma select/aggregate in lib/data.
// ---------------------------------------------------------------------------

export type AdminProductRow = Pick<
  Product,
  "id" | "slug" | "name" | "status" | "priceFrom" | "compareAtFrom" | "totalStock" | "soldCount" | "updatedAt" | "accent"
> & {
  /** Category art kind + first variant colour, for the thumbnail */
  art: ArtKind
  colorHex: string | null
  description: string
  /** SKU of the first variant */
  sku: string
  variantCount: number
  brand: string
  brandSlug: string
  category: string
}

export type AdminUserRow = Pick<User, "id" | "name" | "email" | "role" | "status" | "createdAt" | "lastActiveAt"> & {
  orderCount: number
  /** Sum of paid order totals (IDR) */
  totalSpent: number
  /** City of the default address */
  city: string | null
}

export type AdminPaymentRow = Pick<
  Payment,
  "id" | "number" | "method" | "provider" | "amount" | "fee" | "status" | "createdAt" | "paidAt" | "expiresAt"
> & {
  orderNumber: string
  orderStatus: OrderStatus
  customer: string
  email: string
  itemCount: number
}
