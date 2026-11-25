// Seed: loads the fixtures (prisma/fixtures/*) into Postgres.
// Run with `npm run db:seed` (or automatically after `prisma migrate reset`).
//
// Repeatable: every table is truncated first, then rows are inserted with the
// fixture ids, so relations line up and a second run gives the same database.
// `--check` validates the fixtures without touching the database.

import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import { PrismaClient, type Prisma } from "../lib/generated/prisma/client"
import { brands } from "./fixtures/brands"
import { categories } from "./fixtures/categories"
import { products } from "./fixtures/products"
import { addresses, users } from "./fixtures/users"
import {
  auditLogs,
  flashSaleItems,
  flashSales,
  inventoryMovements,
  newsletterSubscribers,
  orderEvents,
  orderItems,
  orders,
  payments,
  refunds,
  reviews,
  shipments,
  voucherRedemptions,
  vouchers,
} from "./fixtures/orders"

// ---------------------------------------------------------------------------
// ISO strings → Date for every date column (fixtures are JSON-shaped)
// ---------------------------------------------------------------------------

const DATE_KEYS = new Set([
  "emailVerified", "lastActiveAt", "createdAt", "updatedAt", "publishedAt", "moderatedAt",
  "expiresAt", "placedAt", "paidAt", "cancelledAt", "shippedAt", "deliveredAt",
  "startsAt", "endsAt", "confirmedAt", "unsubscribedAt", "notifiedAt", "addedAt",
])
function dates<T extends object>(row: T): T {
  const out = { ...row } as Record<string, unknown>
  for (const [k, v] of Object.entries(out)) if (DATE_KEYS.has(k) && typeof v === "string") out[k] = new Date(v)
  return out as T
}
const all = <T extends object>(rows: T[]) => rows.map(dates)

// ---------------------------------------------------------------------------
// Invariants (the same rules the CHECK constraints in the migration enforce)
// ---------------------------------------------------------------------------

function check() {
  const problems: string[] = []
  const fail = (msg: string) => problems.push(msg)
  const ids = <T extends { id: string }>(name: string, rows: T[]) => {
    const seen = new Set<string>()
    for (const r of rows) {
      if (seen.has(r.id)) fail(`${name}: duplicate id ${r.id}`)
      seen.add(r.id)
    }
    return seen
  }
  const variantIds = ids("variant", products.flatMap((p) => p.variants))
  const orderIds = ids("order", orders)
  const itemIds = ids("orderItem", orderItems)
  ids("product", products)
  ids("payment", payments)
  ids("review", reviews)

  for (const p of products) {
    if (!p.variants.length) fail(`${p.slug}: no variants`)
    const active = p.variants.filter((v) => v.isActive)
    if (p.priceFrom !== Math.min(...active.map((v) => v.price))) fail(`${p.slug}: priceFrom out of sync`)
    if (p.totalStock !== active.reduce((n, v) => n + v.stock - v.reserved, 0)) fail(`${p.slug}: totalStock out of sync`)
    for (const v of p.variants) {
      if (v.reserved < 0 || v.stock < v.reserved) fail(`${v.sku}: stock ${v.stock} < reserved ${v.reserved}`)
      if (v.price <= 0) fail(`${v.sku}: price must be > 0`)
      if (v.compareAtPrice != null && v.compareAtPrice <= v.price) fail(`${v.sku}: compareAtPrice must exceed price`)
    }
  }
  for (const o of orders) {
    const items = orderItems.filter((i) => i.orderId === o.id)
    if (!items.length) fail(`${o.number}: no items`)
    const subtotal = items.reduce((n, i) => n + i.lineTotal, 0)
    if (subtotal !== o.subtotal) fail(`${o.number}: subtotal ${o.subtotal} ≠ Σ lines ${subtotal}`)
    if (o.total !== o.subtotal - o.discount + o.shippingFee) fail(`${o.number}: total ≠ subtotal − discount + shipping`)
  }
  for (const i of orderItems) {
    if (i.quantity <= 0) fail(`${i.id}: quantity must be > 0`)
    if (i.lineTotal !== i.unitPrice * i.quantity) fail(`${i.id}: lineTotal ≠ unitPrice × quantity`)
    if (i.variantId && !variantIds.has(i.variantId)) fail(`${i.id}: unknown variant`)
  }
  for (const p of payments) {
    if (!orderIds.has(p.orderId)) fail(`${p.number}: unknown order`)
    const o = orders.find((x) => x.id === p.orderId)!
    if (p.amount !== o.total) fail(`${p.number}: amount ≠ order total`)
  }
  const reviewedItems = new Set<string>()
  for (const r of reviews) {
    if (r.rating < 1 || r.rating > 5) fail(`${r.id}: rating out of range`)
    if (!itemIds.has(r.orderItemId)) fail(`${r.id}: unknown order item`)
    if (reviewedItems.has(r.orderItemId)) fail(`${r.id}: order item reviewed twice`)
    reviewedItems.add(r.orderItemId)
    const item = orderItems.find((i) => i.id === r.orderItemId)!
    const order = orders.find((o) => o.id === item.orderId)!
    if (order.status !== "DELIVERED" || order.userId !== r.userId || item.productId !== r.productId)
      fail(`${r.id}: not a delivered purchase by the reviewer`)
  }
  const ledger = new Map<string, number>()
  for (const m of inventoryMovements) ledger.set(m.variantId, (ledger.get(m.variantId) ?? 0) + m.delta)
  for (const v of products.flatMap((p) => p.variants))
    if ((ledger.get(v.id) ?? 0) !== v.stock - v.reserved) fail(`${v.sku}: ledger ${ledger.get(v.id) ?? 0} ≠ stock − reserved`)
  for (const v of vouchers)
    if (v.usedCount !== voucherRedemptions.filter((r) => r.voucherId === v.id).length) fail(`${v.code}: usedCount out of sync`)

  if (problems.length) {
    console.error(`✖ ${problems.length} fixture problem(s):\n  ` + problems.slice(0, 30).join("\n  "))
    process.exit(1)
  }
}

const COUNTS = {
  users: users.length, addresses: addresses.length, categories: categories.length, brands: brands.length,
  products: products.length, variants: products.reduce((n, p) => n + p.variants.length, 0),
  orders: orders.length, orderItems: orderItems.length, payments: payments.length, refunds: refunds.length,
  shipments: shipments.length, reviews: reviews.length, vouchers: vouchers.length, flashSaleItems: flashSaleItems.length,
  inventoryMovements: inventoryMovements.length,
}

// ---------------------------------------------------------------------------

async function main() {
  check()
  if (process.argv.includes("--check")) {
    console.log("✔ fixtures valid", COUNTS)
    return
  }

  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set (copy .env.example to .env)")
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })

  try {
    await prisma.$transaction(
      async (tx) => {
        // Truncate everything (CASCADE handles the FK order) so the seed is repeatable.
        const tables = await tx.$queryRaw<{ tablename: string }[]>`
          SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`
        if (tables.length)
          await tx.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`)

        // Every seeded account (except pending invites) gets the dev password, so sign-in can be tested
        const passwordHash = await bcrypt.hash(process.env.SEED_USER_PASSWORD || "tokotech123", 10)
        await tx.user.createMany({ data: all(users).map((u) => ({ ...u, passwordHash: u.status === "INVITED" ? null : passwordHash })) })
        await tx.address.createMany({ data: all(addresses) })
        await tx.category.createMany({
          data: categories.map((c) => ({ ...c, facets: c.facets as unknown as Prisma.InputJsonValue })),
        })
        await tx.brand.createMany({ data: brands })
        await tx.product.createMany({
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- variants go in their own table
          data: products.map(({ variants, ...p }) => dates({ ...p })),
        })
        await tx.productVariant.createMany({ data: all(products.flatMap((p) => p.variants)) })
        await tx.voucher.createMany({ data: all(vouchers) })
        await tx.flashSale.createMany({ data: all(flashSales) })
        await tx.flashSaleItem.createMany({ data: flashSaleItems })
        await tx.order.createMany({ data: all(orders) })
        await tx.orderItem.createMany({ data: orderItems })
        await tx.orderEvent.createMany({ data: all(orderEvents) })
        await tx.payment.createMany({ data: all(payments).map((p) => ({ ...p, raw: p.raw ?? undefined })) })
        await tx.refund.createMany({ data: all(refunds) })
        await tx.shipment.createMany({ data: all(shipments) })
        await tx.voucherRedemption.createMany({ data: all(voucherRedemptions) })
        await tx.review.createMany({ data: all(reviews) })
        await tx.inventoryMovement.createMany({ data: all(inventoryMovements) })
        await tx.auditLog.createMany({ data: all(auditLogs) })
        await tx.newsletterSubscriber.createMany({ data: all(newsletterSubscribers) })
      },
      { timeout: 60_000 },
    )
    console.log("✔ seeded", COUNTS)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
