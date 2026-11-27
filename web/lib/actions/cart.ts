"use server"

import { db } from "@/lib/db"
import { cartLines, currentCart, sellableQuantity } from "@/lib/cart"
import { getSessionUser } from "@/lib/auth/session"
import type { CartLine } from "@/lib/types"

// Cart and wishlist mutations. Every action returns the resulting server state so
// the client store can replace its optimistic copy.

export type CartResult = { lines: CartLine[]; notice?: string }

const isId = (v: unknown): v is string => typeof v === "string" && /^[\w-]{1,40}$/.test(v)

export async function getCartAction(): Promise<CartResult> {
  const cart = await currentCart()
  return { lines: cart ? await cartLines(cart.id) : [] }
}

export async function addToCartAction(variantId: string, quantity = 1): Promise<CartResult> {
  if (!isId(variantId)) return getCartAction()
  const cart = await currentCart({ create: true })
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } })
  const wanted = (existing?.quantity ?? 0) + Math.max(1, Math.floor(quantity))
  const allowed = await sellableQuantity(variantId, wanted)
  if (allowed === 0) return { lines: await cartLines(cart.id), notice: "This item is out of stock" }
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity: allowed },
    update: { quantity: allowed },
  })
  return { lines: await cartLines(cart.id), notice: allowed < wanted ? `Only ${allowed} available; quantity adjusted` : undefined }
}

export async function setCartQuantityAction(variantId: string, quantity: number): Promise<CartResult> {
  const cart = await currentCart()
  if (!cart || !isId(variantId)) return getCartAction()
  const allowed = await sellableQuantity(variantId, Math.max(1, quantity))
  if (allowed === 0) await db.cartItem.deleteMany({ where: { cartId: cart.id, variantId } })
  else await db.cartItem.updateMany({ where: { cartId: cart.id, variantId }, data: { quantity: allowed } })
  return { lines: await cartLines(cart.id), notice: allowed < quantity ? `Only ${allowed} available` : undefined }
}

export async function removeFromCartAction(variantId: string): Promise<CartResult> {
  const cart = await currentCart()
  if (!cart) return { lines: [] }
  await db.cartItem.deleteMany({ where: { cartId: cart.id, variantId } })
  return { lines: await cartLines(cart.id) }
}

export async function clearCartAction(): Promise<CartResult> {
  const cart = await currentCart()
  if (cart) await db.cartItem.deleteMany({ where: { cartId: cart.id } })
  return { lines: [] }
}

/** One-time upload of a cart saved in localStorage before carts lived on the server. */
export async function importLocalCartAction(lines: CartLine[]): Promise<CartResult> {
  const valid = (Array.isArray(lines) ? lines : []).filter((l) => isId(l?.variantId) && Number.isFinite(l?.quantity)).slice(0, 50)
  for (const l of valid) await addToCartAction(l.variantId, l.quantity)
  return getCartAction()
}

// ---------------------------------------------------------------------------
// Wishlist (signed-in users; guests keep theirs in localStorage until they sign in)
// ---------------------------------------------------------------------------

/** Merge local ids into the account wishlist and return the full list (null when signed out). */
export async function syncWishlistAction(localIds: string[]): Promise<string[] | null> {
  const user = await getSessionUser()
  if (!user) return null
  const ids = (Array.isArray(localIds) ? localIds : []).filter(isId).slice(0, 200)
  if (ids.length) {
    const live = await db.product.findMany({ where: { id: { in: ids } }, select: { id: true } })
    await db.wishlistItem.createMany({ data: live.map((p) => ({ userId: user.id, productId: p.id })), skipDuplicates: true })
  }
  const rows = await db.wishlistItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, select: { productId: true } })
  return rows.map((r) => r.productId)
}

export async function setWishlistedAction(productId: string, on: boolean): Promise<void> {
  const user = await getSessionUser()
  if (!user || !isId(productId)) return
  if (on) await db.wishlistItem.createMany({ data: [{ userId: user.id, productId }], skipDuplicates: true })
  else await db.wishlistItem.deleteMany({ where: { userId: user.id, productId } })
}
