"use client"

import { useRouter } from "@/components/i18n/provider"
import { GitCompareArrows, Heart, ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { COMPARE_MAX, useCart, useCompare, useMounted, useWishlist } from "@/stores"
import { cn } from "@/lib/utils"
import { useDict } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"

export function WishlistButton({
  productId,
  productName,
  className,
  variant = "icon",
}: {
  productId: string
  productName: string
  className?: string
  variant?: "icon" | "outline"
}) {
  const t = useDict()
  const mounted = useMounted()
  const active = useWishlist((s) => s.ids.includes(productId)) && mounted
  const toggle = useWishlist((s) => s.toggle)

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const added = toggle(productId)
    toast(added ? t.product.savedToWishlist : t.product.removedFromWishlist, { description: productName })
  }

  if (variant === "outline")
    return (
      <Button variant="outline" size="lg" className={cn("h-11 px-4", className)} onClick={onClick} aria-pressed={active}>
        <Heart className={cn(active && "fill-destructive text-destructive")} />
        {active ? t.product.saved : t.product.wishlist}
      </Button>
    )

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? t.product.removeWishlist : t.product.addWishlist}
      aria-pressed={active}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <Heart className={cn("size-4", active && "fill-destructive text-destructive")} />
    </button>
  )
}

export function CompareButton({ productId, className }: { productId: string; className?: string }) {
  const t = useDict()
  const mounted = useMounted()
  const active = useCompare((s) => s.ids.includes(productId)) && mounted
  const toggle = useCompare((s) => s.toggle)
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("text-muted-foreground", active && "text-primary", className)}
      onClick={(e) => {
        e.preventDefault()
        const before = useCompare.getState().ids.includes(productId)
        const changed = toggle(productId)
        if (!changed && !before) toast.error(fmt(t.product.compareMax, { n: COMPARE_MAX }))
        else toast(changed ? t.product.addedCompare : t.product.removedCompare)
      }}
      aria-pressed={active}
    >
      <GitCompareArrows />
      {active ? t.product.comparing : t.product.compare}
    </Button>
  )
}

export function AddToCartButton({
  variantId,
  productName,
  quantity = 1,
  disabled,
  size = "default",
  className,
  label,
}: {
  variantId: string
  productName: string
  quantity?: number
  disabled?: boolean
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  label?: string
}) {
  const t = useDict()
  const add = useCart((s) => s.add)
  const router = useRouter()
  return (
    <Button
      size={size}
      disabled={disabled}
      className={className}
      aria-label={size === "icon" ? (label ?? t.product.addToCart) : undefined}
      onClick={(e) => {
        e.preventDefault()
        add(variantId, quantity)
        toast.success(t.product.addedToCart, {
          description: `${quantity} × ${productName}`,
          action: { label: t.product.viewCart, onClick: () => router.push("/cart") },
        })
      }}
    >
      <ShoppingCart />
      {size !== "icon" && (label ?? t.product.addToCart)}
    </Button>
  )
}
