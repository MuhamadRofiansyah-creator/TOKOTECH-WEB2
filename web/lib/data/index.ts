// Data access layer. Pages and components ONLY talk to these functions.
// Reads from Postgres via Prisma. Server-only: browser components go through
// GET /api/catalog (app/api/catalog/route.ts) or server actions (lib/actions).
//
// Caching (Cache Components): every read is `"use cache"` with a lifetime and
// tags, so pages keep prerendering. Tags for Phase 3 writes to revalidate:
//   catalog            products, variants, categories, brands, flash sales
//   product:<slug>     one product page
//   reviews:<id>       a product's reviews
//   orders:<userId>    a customer's orders and addresses
//   admin              admin tables and KPIs

import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { db } from "@/lib/db"
import { Prisma } from "@/lib/generated/prisma/client"
import type {
  AdminPaymentRow,
  AdminProductRow,
  AdminUserRow,
  Address,
  ArtKind,
  Brand,
  Category,
  CategorySlug,
  OrderWithDetails,
  Product,
  ProductBadge,
  ProductFilters,
  ProductQueryResult,
  ProductWithRelations,
  ReviewView,
} from "@/lib/types"

const PER_PAGE = 12
const HISTOGRAM_BUCKETS = 20
const NEW_FOR_DAYS = 21
/** pg_trgm word_similarity needed for a fuzzy match (tuned on the catalog: catches "keychorn", "sueprlight"). */
const FUZZY_THRESHOLD = 0.45

const sql = Prisma.sql
const join = Prisma.join

// ---------------------------------------------------------------------------
// Row → domain mapping. Prisma returns Date objects; the domain types carry ISO
// strings (they cross the server → client boundary), and Json columns get their
// concrete shapes. One recursive pass handles both.
// ---------------------------------------------------------------------------

function serialize<T>(value: unknown): T {
  if (value instanceof Date) return value.toISOString() as T
  if (Array.isArray(value)) return value.map((v) => serialize(v)) as T
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v)
    return out as T
  }
  return value as T
}

const productInclude = {
  brand: true,
  category: true,
  variants: { orderBy: { position: "asc" } },
} satisfies Prisma.ProductInclude

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>

/** Badges are derived, never stored: new (≤ 21 days), preorder (new + no stock), sale, bestseller (top 2 in category). */
function deriveBadges(p: ProductRow, bestsellers: Set<string>): ProductBadge[] {
  const badges: ProductBadge[] = []
  const isNew = !!p.publishedAt && Date.now() - p.publishedAt.getTime() <= NEW_FOR_DAYS * 86_400_000
  if (isNew) badges.push(p.totalStock === 0 ? "preorder" : "new")
  if (p.compareAtFrom && p.compareAtFrom > p.priceFrom) badges.push("sale")
  if (bestsellers.has(p.id)) badges.push("bestseller")
  return badges
}

function toProduct(row: ProductRow, bestsellers: Set<string>): ProductWithRelations {
  return { ...serialize<ProductWithRelations>(row), badges: deriveBadges(row, bestsellers) }
}

async function bestsellerIds(): Promise<Set<string>> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog")
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM (
      SELECT id, row_number() OVER (PARTITION BY "categoryId" ORDER BY "soldCount" DESC, id) AS rn
      FROM products WHERE status = 'ACTIVE'
    ) ranked WHERE rn <= 2`
  return new Set(rows.map((r) => r.id))
}

/** Load full products for ids, keeping the given order. */
async function productsById(ids: string[], where: Prisma.ProductWhereInput = {}): Promise<ProductWithRelations[]> {
  if (!ids.length) return []
  const [rows, best] = await Promise.all([
    db.product.findMany({ where: { id: { in: ids }, ...where }, include: productInclude }),
    bestsellerIds(),
  ])
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids.flatMap((id) => {
    const r = byId.get(id)
    return r ? [toProduct(r, best)] : []
  })
}

// ---------------------------------------------------------------------------
// Catalog listing: filters, facets ("excluding self"), histogram, sort and
// pagination all in SQL.
// ---------------------------------------------------------------------------

const FROM = sql`FROM products p JOIN brands b ON b.id = p."brandId" JOIN categories c ON c.id = p."categoryId"`
/** Everything a search term can match: name, brand, category and spec values. */
const HAYSTACK = sql`(p.name || ' ' || b.name || ' ' || c.name || ' ' || coalesce((SELECT string_agg(value, ' ') FROM jsonb_each_text(p.specs)), ''))`

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`)

/** Every term must match: as a substring, or fuzzily (typos) via pg_trgm. */
function searchClause(q: string) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6)
  if (!terms.length) return null
  return join(
    terms.map((t) => sql`(${HAYSTACK} ILIKE ${`%${escapeLike(t)}%`} OR word_similarity(${t}, ${HAYSTACK}) >= ${FUZZY_THRESHOLD})`),
    " AND ",
  )
}

const SORT_SQL = {
  popular: sql`p."soldCount" DESC`,
  newest: sql`p."publishedAt" DESC NULLS LAST`,
  "price-asc": sql`p."priceFrom" ASC`,
  "price-desc": sql`p."priceFrom" DESC`,
  rating: sql`p."ratingAvg" DESC, p."ratingCount" DESC`,
} as const

export async function getProducts(filters: ProductFilters = {}): Promise<ProductQueryResult> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog")

  const category = filters.category ? await getCategory(filters.category) : null

  // Base set: live products in the category matching the query. Facets count
  // over this set with every *other* filter applied.
  const base: Prisma.Sql[] = [sql`p.status = 'ACTIVE'`]
  if (category) base.push(sql`p."categoryId" = ${category.id}`)
  const search = filters.q ? searchClause(filters.q) : null
  if (search) base.push(search)

  const preds: Record<string, Prisma.Sql> = {}
  if (filters.brands?.length) preds.brand = sql`b.slug IN (${join(filters.brands)})`
  if (filters.colors?.length)
    preds.color = sql`EXISTS (SELECT 1 FROM product_variants v WHERE v."productId" = p.id AND v."isActive" AND v.options->>'color' IN (${join(filters.colors)}))`
  if (filters.minPrice != null || filters.maxPrice != null)
    preds.price = sql`p."priceFrom" BETWEEN ${filters.minPrice ?? 0} AND ${filters.maxPrice ?? 2_147_483_647}`
  if (filters.minRating) preds.rating = sql`p."ratingAvg" >= ${filters.minRating}`
  if (filters.inStock) preds.stock = sql`p."totalStock" > 0`
  for (const [key, values] of Object.entries(filters.specs ?? {})) {
    // @> containment uses the GIN jsonb_path_ops index on specs
    if (values.length) preds[`spec:${key}`] = sql`(${join(values.map((v) => sql`p.specs @> ${JSON.stringify({ [key]: v })}::jsonb`), " OR ")})`
  }

  const where = (skip?: string) => join([...base, ...Object.entries(preds).filter(([k]) => k !== skip).map(([, v]) => v)], " AND ")
  const baseWhere = join(base, " AND ")
  const facets = category?.facets ?? []

  const [[{ total }], brandCounts, colorCounts, specCounts, priceRows, allBrands] = await Promise.all([
    db.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${FROM} WHERE ${where()}`,
    db.$queryRaw<{ id: string; n: number }[]>`
      SELECT b.id, count(*) FILTER (WHERE ${where("brand")})::int AS n ${FROM} WHERE ${baseWhere} GROUP BY b.id`,
    db.$queryRaw<{ name: string; hex: string | null; n: number }[]>`
      SELECT v.options->>'color' AS name, min(v."colorHex") AS hex, count(DISTINCT p.id)::int AS n
      ${FROM} JOIN product_variants v ON v."productId" = p.id AND v."isActive"
      WHERE ${where("color")} AND v.options->>'color' IS NOT NULL GROUP BY 1`,
    Promise.all(
      facets.map((f) =>
        db.$queryRaw<{ value: string; n: number }[]>`
          SELECT p.specs->>${f.key} AS value, count(*) FILTER (WHERE ${where(`spec:${f.key}`)})::int AS n
          ${FROM} WHERE ${baseWhere} AND p.specs->>${f.key} IS NOT NULL GROUP BY 1`,
      ),
    ),
    db.$queryRaw<{ lo: number | null; hi: number | null; bucket: number | null; n: number }[]>`
      WITH base AS (SELECT p."priceFrom" AS price ${FROM} WHERE ${baseWhere}),
           bounds AS (SELECT min(price) AS lo, max(price) AS hi FROM base)
      SELECT bounds.lo, bounds.hi,
             LEAST(width_bucket(base.price, bounds.lo, GREATEST(bounds.hi, bounds.lo + 1), ${HISTOGRAM_BUCKETS}), ${HISTOGRAM_BUCKETS}) AS bucket,
             count(*)::int AS n
      FROM bounds LEFT JOIN base ON true GROUP BY 1, 2, 3`,
    getBrands(),
  ])

  // ---- page of results
  const perPage = filters.perPage ?? PER_PAGE
  const pageCount = Math.max(1, Math.ceil(total / perPage))
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount)
  const ids = await db.$queryRaw<{ id: string }[]>`
    SELECT p.id ${FROM} WHERE ${where()}
    ORDER BY ${SORT_SQL[filters.sort ?? "popular"]}, p.id
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`
  const items = await productsById(ids.map((r) => r.id))

  // ---- facets
  const brandCount = new Map(brandCounts.map((r) => [r.id, r.n]))
  const brandFacet = allBrands
    .map((b) => ({ ...b, count: brandCount.get(b.id) ?? 0 }))
    .filter((b) => brandCount.has(b.id) && (b.count > 0 || filters.brands?.includes(b.slug)))
    .sort((a, b) => b.count - a.count)

  const specFacets = facets.map((f, i) => {
    const rank = (v: string) => {
      const at = f.order?.indexOf(v) ?? -1
      return at === -1 ? 999 : at
    }
    const options = specCounts[i]
      .map((r) => ({ value: r.value, count: r.n }))
      .sort((a, b) => rank(a.value) - rank(b.value) || a.value.localeCompare(b.value))
    return { ...f, options }
  })

  const lo = priceRows[0]?.lo ?? 0
  const hi = priceRows[0]?.hi ?? 0
  const histogram = new Array(HISTOGRAM_BUCKETS).fill(0)
  for (const r of priceRows) if (r.bucket) histogram[r.bucket - 1] = r.n

  return {
    items,
    total,
    page,
    pageCount,
    facets: {
      brands: brandFacet,
      colors: colorCounts.map((c) => ({ name: c.name, hex: c.hex ?? "#9ca3af", count: c.n })).sort((a, b) => b.count - a.count),
      specs: specFacets,
      priceBounds: [lo, hi],
      priceHistogram: histogram,
    },
  }
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog", `product:${slug}`)
  const [row, best] = await Promise.all([
    db.product.findFirst({ where: { slug, status: "ACTIVE" }, include: productInclude }),
    bestsellerIds(),
  ])
  return row ? toProduct(row, best) : null
}

/** Slugs of live products, for generateStaticParams. */
export async function getProductSlugs(): Promise<string[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog")
  const rows = await db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true }, orderBy: { soldCount: "desc" } })
  return rows.map((r) => r.slug)
}

/** Any status (order history can point at archived products). Keeps the given order. */
export async function getProductsByIds(ids: string[]): Promise<ProductWithRelations[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog")
  return productsById(ids)
}

/**
 * Lookup for browser components (cart lines are variant ids; wishlist and compare
 * are product ids). Only live products come back; anything else is reported unknown.
 */
export async function lookupCatalog(productIds: string[], variantIds: string[]) {
  "use cache"
  cacheLife("minutes")
  cacheTag("catalog")
  const variants = variantIds.length
    ? await db.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, productId: true } })
    : []
  const ids = [...new Set([...productIds, ...variants.map((v) => v.productId)])]
  const products = await productsById(ids, { status: "ACTIVE" })
  const live = new Set(products.map((p) => p.id))
  return {
    products,
    unknownProducts: productIds.filter((id) => !live.has(id)),
    unknownVariants: variantIds.filter((id) => {
      const v = variants.find((x) => x.id === id)
      return !v || !live.has(v.productId)
    }),
  }
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<ProductWithRelations[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog")
  const rows = await db.product.findMany({
    where: { categoryId: product.categoryId, status: "ACTIVE", id: { not: product.id } },
    select: { id: true, brandId: true },
    orderBy: [{ soldCount: "desc" }, { id: "asc" }],
  })
  const ids = rows
    .sort((a, b) => Number(b.brandId === product.brandId) - Number(a.brandId === product.brandId))
    .slice(0, limit)
    .map((r) => r.id)
  return productsById(ids)
}

const BOUGHT_WITH: Record<string, string[]> = {
  "c-monitor": ["c-keyboard", "c-mouse"],
  "c-keyboard": ["c-mouse", "c-headset"],
  "c-mouse": ["c-keyboard", "c-headset"],
  "c-headset": ["c-mouse", "c-keyboard"],
  "c-laptop": ["c-mouse", "c-headset"],
  "c-desktop": ["c-monitor", "c-keyboard"],
  "c-components": ["c-components", "c-monitor"],
}

export async function getFrequentlyBoughtTogether(product: Product): Promise<ProductWithRelations[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog")
  // Phase 3: co-purchase counts from order_items. For now, the bestseller of each paired category.
  const picks = await Promise.all(
    (BOUGHT_WITH[product.categoryId] ?? []).map((categoryId) =>
      db.product.findFirst({
        where: { categoryId, status: "ACTIVE", id: { not: product.id } },
        select: { id: true },
        orderBy: [{ soldCount: "desc" }, { id: "asc" }],
      }),
    ),
  )
  return productsById([...new Set(picks.flatMap((p) => (p ? [p.id] : [])))])
}

export async function getCollection(kind: "new" | "bestseller" | "sale" | "flash", limit = 8): Promise<ProductWithRelations[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog")
  let ids: string[]
  switch (kind) {
    case "new":
    case "bestseller": {
      const rows = await db.product.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
        orderBy: kind === "new" ? [{ publishedAt: "desc" }, { id: "asc" }] : [{ soldCount: "desc" }, { id: "asc" }],
        take: limit,
      })
      ids = rows.map((r) => r.id)
      break
    }
    case "sale": {
      const rows = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM products WHERE status = 'ACTIVE' AND "compareAtFrom" > "priceFrom"
        ORDER BY "compareAtFrom"::float / "priceFrom" DESC, id LIMIT ${limit}`
      ids = rows.map((r) => r.id)
      break
    }
    case "flash": {
      // The running sale, or else the most recent active one (the home row never goes empty in dev)
      const now = new Date()
      const sale =
        (await db.flashSale.findFirst({ where: { isActive: true, startsAt: { lte: now }, endsAt: { gt: now } }, orderBy: { startsAt: "desc" } })) ??
        (await db.flashSale.findFirst({ where: { isActive: true }, orderBy: { startsAt: "desc" } }))
      const items = sale
        ? await db.flashSaleItem.findMany({ where: { flashSaleId: sale.id }, select: { variant: { select: { productId: true } } }, orderBy: { id: "asc" } })
        : []
      ids = [...new Set(items.map((i) => i.variant.productId))].slice(0, limit)
      break
    }
  }
  return productsById(ids, { status: "ACTIVE" })
}

export async function searchSuggestions(q: string, limit = 6): Promise<ProductWithRelations[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog")
  const search = searchClause(q)
  if (!search) return []
  const first = q.trim().toLowerCase()
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT p.id ${FROM} WHERE p.status = 'ACTIVE' AND ${search}
    ORDER BY word_similarity(${first}, ${HAYSTACK}) DESC, p."soldCount" DESC LIMIT ${limit}`
  return productsById(rows.map((r) => r.id))
}

// ---------------------------------------------------------------------------
// Categories, brands, reviews
// ---------------------------------------------------------------------------

type CategoryRow = Prisma.CategoryGetPayload<object>
const toCategory = (c: CategoryRow): Category => ({ ...c, slug: c.slug as CategorySlug, art: (c.art ?? "monitor") as ArtKind, facets: c.facets as unknown as Category["facets"] })

export async function getCategories(): Promise<(Category & { count: number })[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog")
  const [rows, counts] = await Promise.all([
    db.category.findMany({ orderBy: { position: "asc" } }),
    db.product.groupBy({ by: ["categoryId"], where: { status: "ACTIVE" }, _count: true }),
  ])
  const n = new Map(counts.map((c) => [c.categoryId, c._count]))
  return rows.map((c) => ({ ...toCategory(c), count: n.get(c.id) ?? 0 }))
}

export async function getCategory(slug: string): Promise<Category | null> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog")
  const c = await db.category.findUnique({ where: { slug } })
  return c ? toCategory(c) : null
}

export async function getBrands(): Promise<Brand[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog")
  return db.brand.findMany({ orderBy: { name: "asc" } })
}

/** "Rizky Ramadhan" → "Rizky R." for public bylines. */
const displayName = (name: string | null) => {
  if (!name) return "TokoTech customer"
  const [first, last] = name.split(" ")
  return last ? `${first} ${last[0]}.` : first
}

/** Published reviews, newest first. */
export async function getReviews(productId: string): Promise<ReviewView[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog", `reviews:${productId}`)
  const rows = await db.review.findMany({
    where: { productId, status: "PUBLISHED" },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  return rows.map(({ user, ...r }) => ({ ...serialize<ReviewView>(r), author: displayName(user.name) }))
}

// ---------------------------------------------------------------------------
// Account (userId comes from the session; see lib/session.ts)
// ---------------------------------------------------------------------------

const orderInclude = {
  items: { orderBy: { id: "asc" } },
  shipments: true,
  events: { orderBy: { createdAt: "asc" } },
  payments: { orderBy: { createdAt: "desc" }, select: { number: true, status: true, method: true, redirectUrl: true, expiresAt: true } },
} satisfies Prisma.OrderInclude

export async function getOrders(userId: string): Promise<OrderWithDetails[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag(`orders:${userId}`)
  const rows = await db.order.findMany({ where: { userId }, include: orderInclude, orderBy: { placedAt: "desc" } })
  return serialize<OrderWithDetails[]>(rows)
}

/** By order number ("TT-260311"), scoped to the user. */
export async function getOrder(userId: string, number: string): Promise<OrderWithDetails | null> {
  "use cache"
  cacheLife("minutes")
  cacheTag(`orders:${userId}`)
  const row = await db.order.findFirst({ where: { number, userId }, include: orderInclude })
  return row ? serialize<OrderWithDetails>(row) : null
}

export async function getAddresses(userId: string): Promise<Address[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag(`orders:${userId}`)
  const rows = await db.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] })
  return serialize<Address[]>(rows)
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** Orders that count as revenue: paid and not cancelled or returned. */
const REVENUE = sql`o."paidAt" IS NOT NULL AND o.status NOT IN ('CANCELLED', 'RETURNED')`
/** Timestamps are stored as UTC; days are counted in WIB. */
const WIB_DAY = sql`((o."placedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date`

async function revenueSeries(days = 30) {
  const rows = await db.$queryRaw<{ day: string; revenue: number; orders: number }[]>`
    SELECT to_char(${WIB_DAY}, 'YYYY-MM-DD') AS day, sum(o.total)::float8 AS revenue, count(*)::int AS orders
    FROM orders o
    WHERE ${REVENUE} AND ${WIB_DAY} > (now() AT TIME ZONE 'Asia/Jakarta')::date - ${days}::int
    GROUP BY 1`
  const byDay = new Map(rows.map((r) => [r.day, r]))
  const todayWib = new Date(Date.now() + 7 * 3_600_000)
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.UTC(todayWib.getUTCFullYear(), todayWib.getUTCMonth(), todayWib.getUTCDate() - (days - 1 - i)))
    const key = d.toISOString().slice(0, 10)
    const r = byDay.get(key)
    return { date: d.toISOString(), revenue: r?.revenue ?? 0, orders: r?.orders ?? 0 }
  })
}

async function paymentRows(take?: number): Promise<AdminPaymentRow[]> {
  const rows = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
      order: { select: { number: true, status: true, email: true, shipRecipient: true, user: { select: { name: true } }, items: { select: { quantity: true } } } },
    },
  })
  return rows.map((p) => ({
    id: p.id,
    number: p.number,
    method: p.method,
    provider: p.provider,
    amount: p.amount,
    fee: p.fee,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? null,
    expiresAt: p.expiresAt?.toISOString() ?? null,
    orderNumber: p.order.number,
    orderStatus: p.order.status,
    customer: p.order.user?.name ?? p.order.shipRecipient,
    email: p.order.email,
    itemCount: p.order.items.reduce((n, i) => n + i.quantity, 0),
  }))
}

async function productRows(): Promise<AdminProductRow[]> {
  const rows = await db.product.findMany({
    include: { brand: true, category: true, variants: { select: { sku: true, colorHex: true }, orderBy: { position: "asc" } } },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  })
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    status: p.status,
    priceFrom: p.priceFrom,
    compareAtFrom: p.compareAtFrom,
    totalStock: p.totalStock,
    soldCount: p.soldCount,
    updatedAt: p.updatedAt.toISOString(),
    sku: p.variants[0]?.sku ?? "—",
    variantCount: p.variants.length,
    brand: p.brand.name,
    brandSlug: p.brand.slug,
    category: p.category.name,
    accent: p.accent,
    art: (p.category.art ?? "monitor") as ArtKind,
    colorHex: p.variants[0]?.colorHex ?? null,
    description: p.description,
  }))
}

/** KPIs for the last `days` compared with the `days` before; the chart shows at least 30 days. */
export async function getAdminOverview(days = 7) {
  "use cache"
  cacheLife("minutes")
  cacheTag("admin")
  const [series, categoryRevenue, recentPayments, rows, customers] = await Promise.all([
    revenueSeries(Math.max(30, days * 2)),
    db.$queryRaw<{ name: string; revenue: number }[]>`
      SELECT c.name, coalesce(sum(oi."lineTotal") FILTER (WHERE ${REVENUE} AND ${WIB_DAY} > (now() AT TIME ZONE 'Asia/Jakarta')::date - 30), 0)::float8 AS revenue
      FROM categories c
      LEFT JOIN products p ON p."categoryId" = c.id
      LEFT JOIN order_items oi ON oi."productId" = p.id
      LEFT JOIN orders o ON o.id = oi."orderId"
      GROUP BY c.name ORDER BY revenue DESC, c.name`,
    paymentRows(6),
    productRows(),
    db.$queryRaw<{ total: number; recent: number; previous: number }[]>`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE "createdAt" > now() - interval '30 days')::int AS recent,
             count(*) FILTER (WHERE "createdAt" <= now() - interval '30 days' AND "createdAt" > now() - interval '60 days')::int AS previous
      FROM users WHERE role = 'CUSTOMER'`,
  ])
  const sum = (a: { revenue: number }[]) => a.reduce((n, d) => n + d.revenue, 0)
  const count = (a: { orders: number }[]) => a.reduce((n, d) => n + d.orders, 0)
  const last7 = series.slice(-days)
  const prev7 = series.slice(-days * 2, -days)
  const chart = series.slice(-Math.max(30, days))
  const revenue = sum(last7)
  const orders = count(last7)
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0)
  const aov = orders ? revenue / orders : 0
  const prevAov = count(prev7) ? sum(prev7) / count(prev7) : 0
  const live = rows.filter((p) => p.status === "ACTIVE")
  return {
    kpis: {
      revenue: { value: revenue, delta: pct(revenue, sum(prev7)), trend: chart.slice(-12).map((d) => d.revenue) },
      orders: { value: orders, delta: pct(orders, count(prev7)), trend: chart.slice(-12).map((d) => d.orders) },
      customers: { value: customers[0].total, delta: pct(customers[0].recent, customers[0].previous) },
      aov: { value: Math.round(aov), delta: pct(aov, prevAov) },
    },
    revenueSeries: chart,
    categoryRevenue,
    recentPayments,
    lowStock: live.filter((p) => p.totalStock <= 5).sort((a, b) => a.totalStock - b.totalStock).slice(0, 5),
    topProducts: [...live].sort((a, b) => b.soldCount - a.soldCount).slice(0, 5),
  }
}

export async function getAdminProducts(): Promise<AdminProductRow[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("admin", "catalog")
  return productRows()
}

export async function getPayments(): Promise<AdminPaymentRow[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("admin")
  return paymentRows()
}

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("admin")
  const [users, stats, cities] = await Promise.all([
    db.user.findMany({ orderBy: { id: "asc" } }),
    db.$queryRaw<{ userId: string; orders: number; spent: number }[]>`
      SELECT o."userId", count(*)::int AS orders, coalesce(sum(o.total) FILTER (WHERE ${REVENUE}), 0)::float8 AS spent
      FROM orders o WHERE o."userId" IS NOT NULL GROUP BY 1`,
    db.address.findMany({ where: { isDefault: true }, select: { userId: true, city: true } }),
  ])
  const byUser = new Map(stats.map((s) => [s.userId, s]))
  const city = new Map(cities.map((c) => [c.userId, c.city]))
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt.toISOString(),
    lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
    orderCount: byUser.get(u.id)?.orders ?? 0,
    totalSpent: byUser.get(u.id)?.spent ?? 0,
    city: city.get(u.id) ?? null,
  }))
}

/** Guest order link (/orders/[number]?t=token). Uncached: the token is a secret and the page is request-time. */
export async function getGuestOrder(number: string, token: string): Promise<OrderWithDetails | null> {
  if (!token || token.length < 20) return null
  const row = await db.order.findFirst({ where: { number, guestAccessToken: token }, include: orderInclude })
  return row ? serialize<OrderWithDetails>(row) : null
}

// ---------------------------------------------------------------------------
// Admin: moderation queue, vouchers, flash sales
// ---------------------------------------------------------------------------

export type AdminReviewRow = {
  id: string
  rating: number
  title: string
  body: string
  status: "PENDING" | "PUBLISHED" | "HIDDEN"
  createdAt: string
  moderationNote: string | null
  author: string
  productName: string
  productSlug: string
  orderNumber: string
}

export async function getReviewQueue(): Promise<AdminReviewRow[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("admin")
  const rows = await db.review.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: { user: { select: { name: true, email: true } }, product: { select: { name: true, slug: true } }, orderItem: { select: { order: { select: { number: true } } } } },
  })
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    moderationNote: r.moderationNote,
    author: r.user.name ?? r.user.email,
    productName: r.product.name,
    productSlug: r.product.slug,
    orderNumber: r.orderItem.order.number,
  }))
}

export async function getVouchers() {
  "use cache"
  cacheLife("minutes")
  cacheTag("admin")
  const rows = await db.voucher.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] })
  const now = Date.now()
  return serialize<import("@/lib/types").Voucher[]>(rows).map((v) => ({ ...v, expired: !!v.endsAt && Date.parse(v.endsAt) < now }))
}

export async function getFlashSales() {
  "use cache"
  cacheLife("minutes")
  cacheTag("admin", "catalog")
  const [sales, candidates] = await Promise.all([
    db.flashSale.findMany({
      orderBy: { startsAt: "desc" },
      take: 20,
      include: { items: { include: { variant: { select: { sku: true, name: true, product: { select: { name: true } } } } }, orderBy: { id: "asc" } } },
    }),
    // Discounted live variants are the natural picks for a new sale
    db.productVariant.findMany({
      where: { isActive: true, compareAtPrice: { not: null }, product: { status: "ACTIVE" } },
      select: { id: true, price: true, compareAtPrice: true, name: true, product: { select: { name: true } } },
      orderBy: { price: "desc" },
      take: 40,
    }),
  ])
  return {
    sales: sales.map((s) => ({
      state: (Date.now() >= s.endsAt.getTime() ? "ENDED" : !s.isActive ? "PAUSED" : Date.now() >= s.startsAt.getTime() ? "LIVE" : "SCHEDULED") as "ENDED" | "PAUSED" | "LIVE" | "SCHEDULED",
      id: s.id,
      name: s.name,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      isActive: s.isActive,
      items: s.items.map((i) => ({ id: i.id, product: i.variant.product.name, variant: i.variant.name, sku: i.variant.sku, salePrice: i.salePrice, quota: i.quota, sold: i.sold })),
    })),
    candidates: candidates.map((v) => ({ id: v.id, label: `${v.product.name} · ${v.name}`, price: v.price, compareAtPrice: v.compareAtPrice! })),
  }
}

/** Admin list: every category with live and total product counts. */
export async function getAdminCategories() {
  "use cache"
  cacheLife("minutes")
  cacheTag("admin", "catalog")
  const [rows, counts] = await Promise.all([
    db.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }),
    db.product.groupBy({ by: ["categoryId", "status"], _count: true }),
  ])
  return rows.map((c) => ({
    ...toCategory(c),
    liveCount: counts.filter((x) => x.categoryId === c.id && x.status === "ACTIVE").reduce((n, x) => n + x._count, 0),
    totalCount: counts.filter((x) => x.categoryId === c.id).reduce((n, x) => n + x._count, 0),
  }))
}
