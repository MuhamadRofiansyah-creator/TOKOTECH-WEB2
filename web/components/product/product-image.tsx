import type { Category, ProductWithRelations } from "@/lib/types"
import { productColors } from "@/lib/product"
import { cn } from "@/lib/utils"
import { ProductArt } from "./product-art"

// Soft studio backdrops, echoing the neutral photo backgrounds in the reference.
const BACKDROPS = ["#eef0f3", "#efe9e4", "#e9eef0", "#f1efe9", "#e8ebf2", "#ecebef"]

export function ProductImage({
  product,
  colorHex,
  variant = 0,
  className,
}: {
  /** Variants are optional: without them pass colorHex (admin rows do) */
  product: Pick<ProductWithRelations, "id" | "accent"> & { category: Pick<Category, "art">; variants?: ProductWithRelations["variants"] }
  /** Body colour of the selected variant; defaults to the first colour */
  colorHex?: string | null
  variant?: number
  className?: string
}) {
  const n = Number(product.id.replace(/\D/g, "")) || 0
  const bg = BACKDROPS[(n + variant) % BACKDROPS.length]
  const body = colorHex ?? (product.variants ? productColors({ variants: product.variants })[0]?.hex : undefined)
  return (
    <div
      className={cn("relative flex aspect-[4/5] items-center justify-center overflow-hidden dark:brightness-[0.92]", className)}
      style={{ backgroundColor: bg }}
    >
      <div
        className="w-[90%] transition-transform duration-500 group-hover:scale-105"
        style={{ transform: variant ? `rotate(${variant % 2 ? -4 : 4}deg) scale(${1 - variant * 0.04})` : undefined }}
      >
        <ProductArt kind={product.category.art} accent={product.accent ?? "#14b8c4"} body={body} variant={variant} />
      </div>
    </div>
  )
}
