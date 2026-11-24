"use client"

import { ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useCart } from "@/stores"
import { useDict } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"

export function BundleAddButton({ items }: { items: { variantId: string; name: string; inStock: boolean }[] }) {
  const t = useDict()
  const add = useCart((s) => s.add)
  const available = items.filter((i) => i.inStock)
  return (
    <Button
      className="mt-3 h-10 w-full"
      disabled={!available.length}
      onClick={() => {
        available.forEach((i) => add(i.variantId))
        toast.success(fmt(t.product.addedItems, { n: available.length }))
      }}
    >
      <ShoppingCart /> {fmt(t.product.addAll, { n: available.length })}
    </Button>
  )
}
