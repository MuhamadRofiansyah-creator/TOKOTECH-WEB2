"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { getCartAction, importLocalCartAction, syncWishlistAction } from "@/lib/actions/cart"
import { setWishlistSignedIn, useCart, useWishlist } from "@/stores"
import type { CartLine } from "@/lib/types"

const LEGACY_CART_KEY = "tokotech-cart"

/** A cart saved by the localStorage-only version of the store (v2: { state: { lines } }). */
function takeLegacyCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(LEGACY_CART_KEY)
    if (!raw) return []
    localStorage.removeItem(LEGACY_CART_KEY)
    const lines = JSON.parse(raw)?.state?.lines
    return Array.isArray(lines) ? lines.filter((l) => typeof l?.variantId === "string") : []
  } catch {
    return []
  }
}

/**
 * Loads the server cart (and the account wishlist) on start and whenever the session
 * changes: sign-in merges the guest cart into the account (server side) and uploads the
 * local wishlist; sign-out falls back to the guest cart.
 */
export function StoreSync() {
  const { status } = useSession()

  useEffect(() => {
    if (status === "loading") return
    let cancelled = false
    const legacy = takeLegacyCart()
    const cart = legacy.length ? importLocalCartAction(legacy) : getCartAction()
    cart.then((res) => !cancelled && useCart.getState().replace(res.lines)).catch(() => {})

    setWishlistSignedIn(status === "authenticated")
    if (status === "authenticated")
      syncWishlistAction(useWishlist.getState().ids)
        .then((ids) => !cancelled && ids && useWishlist.getState().replace(ids))
        .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [status])

  return null
}
