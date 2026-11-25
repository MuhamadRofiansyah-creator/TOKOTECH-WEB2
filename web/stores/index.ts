"use client"

import { useSyncExternalStore } from "react"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { toast } from "sonner"
import {
  addToCartAction,
  clearCartAction,
  removeFromCartAction,
  setCartQuantityAction,
  setWishlistedAction,
  type CartResult,
} from "@/lib/actions/cart"
import type { CartLine } from "@/lib/types"
import type { VoucherRule } from "@/lib/pricing"

// Client stores.
// - Cart: a client copy of the server cart (Cart/CartItem rows). Mutations update the
//   copy optimistically, call a server action, then take the server's answer.
//   <StoreSync /> loads it on start and again whenever the session changes.
// - Wishlist: localStorage for guests; mirrored to WishlistItem rows when signed in.
// - Compare: localStorage only (no table; it's a browsing aid).

const storage = createJSONStorage(() => localStorage)

type CartState = {
  lines: CartLine[]
  /** True once the server cart has been loaded */
  loaded: boolean
  replace: (lines: CartLine[]) => void
  add: (variantId: string, quantity?: number) => Promise<void>
  setQuantity: (variantId: string, quantity: number) => Promise<void>
  remove: (variantId: string) => Promise<void>
  clear: () => Promise<void>
}

const clampQty = (n: number) => Math.max(1, Math.min(99, n))

export const useCart = create<CartState>()((set, get) => {
  /** Apply an optimistic change, run the server action, then adopt the server's lines. */
  async function run(optimistic: CartLine[], action: () => Promise<CartResult>) {
    const before = get().lines
    set({ lines: optimistic })
    try {
      const res = await action()
      set({ lines: res.lines })
      if (res.notice) toast(res.notice)
    } catch {
      set({ lines: before })
      toast.error("Couldn't update your cart. Check your connection and try again.")
    }
  }
  return {
    lines: [],
    loaded: false,
    replace: (lines) => set({ lines, loaded: true }),
    add: (variantId, quantity = 1) => {
      const lines = get().lines
      const optimistic = lines.some((l) => l.variantId === variantId)
        ? lines.map((l) => (l.variantId === variantId ? { ...l, quantity: clampQty(l.quantity + quantity) } : l))
        : [...lines, { variantId, quantity: clampQty(quantity) }]
      return run(optimistic, () => addToCartAction(variantId, quantity))
    },
    setQuantity: (variantId, quantity) =>
      run(
        get().lines.map((l) => (l.variantId === variantId ? { ...l, quantity: clampQty(quantity) } : l)),
        () => setCartQuantityAction(variantId, quantity),
      ),
    remove: (variantId) => run(get().lines.filter((l) => l.variantId !== variantId), () => removeFromCartAction(variantId)),
    clear: () => run([], () => clearCartAction()),
  }
})

type ListState = {
  ids: string[]
  toggle: (id: string) => boolean
  remove: (id: string) => void
  clear: () => void
  replace: (ids: string[]) => void
}

/** Set by <StoreSync /> so the wishlist knows to mirror changes to the server. */
let wishlistSignedIn = false
export const setWishlistSignedIn = (v: boolean) => {
  wishlistSignedIn = v
}

function listStore(name: string, { max = Infinity, mirror = false } = {}) {
  return create<ListState>()(
    persist(
      (set, get) => ({
        ids: [],
        toggle: (id) => {
          const has = get().ids.includes(id)
          if (!has && get().ids.length >= max) return false
          set({ ids: has ? get().ids.filter((x) => x !== id) : [...get().ids, id] })
          if (mirror && wishlistSignedIn) void setWishlistedAction(id, !has)
          return !has
        },
        remove: (id) => {
          set({ ids: get().ids.filter((x) => x !== id) })
          if (mirror && wishlistSignedIn) void setWishlistedAction(id, false)
        },
        clear: () => {
          const ids = get().ids
          set({ ids: [] })
          if (mirror && wishlistSignedIn) ids.forEach((id) => void setWishlistedAction(id, false))
        },
        replace: (ids) => set({ ids }),
      }),
      { name, storage },
    ),
  )
}

export const useWishlist = listStore("tokotech-wishlist", { mirror: true })
export const COMPARE_MAX = 4
export const useCompare = listStore("tokotech-compare", { max: COMPARE_MAX })

/** True after hydration — use to avoid SSR/localStorage mismatches. */
export function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

export function useCartCount() {
  const mounted = useMounted()
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0))
  return mounted ? count : 0
}

/** The voucher applied in the cart, carried into checkout (validated by checkVoucher, re-validated when the order is placed). */
export const useVoucher = create<{ rule: VoucherRule | null; set: (rule: VoucherRule | null) => void }>()((set) => ({
  rule: null,
  set: (rule) => set({ rule }),
}))
