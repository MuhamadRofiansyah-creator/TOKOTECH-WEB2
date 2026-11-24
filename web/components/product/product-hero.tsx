"use client"

import Link from "@/components/i18n/link"
import { useRouter } from "@/components/i18n/provider"
import { useState } from "react"
import { BadgeCheck, Check, RotateCcw, ShieldCheck, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuantityStepper } from "@/components/shared/quantity-stepper"
import { useCart } from "@/stores"
import type { ProductWithRelations } from "@/lib/types"
import { discountPercent, formatCount } from "@/lib/format"
import { available, defaultVariant, optionGroups, resolveVariant } from "@/lib/product"
import { cn } from "@/lib/utils"
import { ProductImage } from "./product-image"
import { DeliveryEstimate } from "./delivery-estimate"
import { StockAlertButton } from "./stock-alert-button"
import { BrandMark, Price, ProductBadges, Rating } from "./primitives"
import { AddToCartButton, CompareButton, WishlistButton } from "./product-actions"
import { useDict } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"

const VIEWS = [0, 1, 2, 3]

export function ProductHero({ product }: { product: ProductWithRelations }) {
  const router = useRouter()
  const t = useDict()
  const add = useCart((s) => s.add)
  const groups = optionGroups(product)
  const [variant, setVariant] = useState(() => defaultVariant(product))
  const [view, setView] = useState(0)
  const [qty, setQty] = useState(1)
  const off = discountPercent(variant.price, variant.compareAtPrice)
  const stock = available(variant)
  const soldOut = stock === 0
  const maxQty = Math.max(1, Math.min(10, stock))
  const choose = (key: string, value: string) => {
    setVariant(resolveVariant(product, { ...variant.options, [key]: value }, key))
    setQty(1)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      {/* Gallery */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <div className="no-scrollbar flex gap-2 overflow-x-auto sm:flex-col" role="tablist" aria-label={t.product.images}>
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              aria-label={fmt(t.product.view, { n: v + 1 })}
              onClick={() => setView(v)}
              className={cn(
                "w-16 shrink-0 overflow-hidden rounded-lg ring-offset-2 ring-offset-background transition sm:w-20",
                view === v ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100",
              )}
            >
              <ProductImage product={product} colorHex={variant.colorHex} variant={v} className="aspect-square" />
            </button>
          ))}
        </div>
        <div className="relative flex-1 overflow-hidden rounded-2xl">
          <ProductImage product={product} colorHex={variant.colorHex} variant={view} className="aspect-square sm:aspect-[5/5]" />
          <ProductBadges badges={product.badges} discount={off} className="absolute top-4 left-4" />
        </div>
      </div>

      {/* Info + purchase */}
      <div>
        <Link
          href={`/search?q=${encodeURIComponent(product.brand.name)}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <BrandMark brand={product.brand} /> {product.brand.name}
          <BadgeCheck className="size-4 text-primary" aria-label={t.product.officialStore} />
        </Link>
        <h1 className="mt-2 text-2xl leading-tight font-medium tracking-tight sm:text-3xl">{product.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Rating value={product.ratingAvg} count={product.ratingCount} size="md" />
          <span className="text-muted-foreground">{fmt(t.product.sold, { n: formatCount(product.soldCount) })}</span>
        </div>

        <div className="mt-5 rounded-xl bg-muted/60 p-4">
          <Price price={variant.price} compareAt={variant.compareAtPrice} size="lg" />
          <p className="mt-1 text-xs text-muted-foreground">
            {fmt(t.product.installment, { amount: Math.round(variant.price / 12).toLocaleString("id-ID") })}
          </p>
        </div>

        <ul className="mt-5 space-y-1.5 text-sm">
          {product.highlights.map((h) => (
            <li key={h} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {h}
            </li>
          ))}
        </ul>

        {groups.map((g) =>
          g.key === "color" ? (
            <fieldset key={g.key} className="mt-6">
              <legend className="text-sm">
                {t.product.options[g.key] ?? g.label}: <span className="font-medium">{variant.options.color}</span>
              </legend>
              <div className="mt-2.5 flex gap-2.5">
                {g.values.map((value) => {
                  const hex = product.variants.find((v) => v.options.color === value)?.colorHex ?? "#9ca3af"
                  const selected = variant.options.color === value
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-label={value}
                      aria-pressed={selected}
                      onClick={() => choose("color", value)}
                      className={cn(
                        "size-8 rounded-full ring-1 ring-black/10 ring-offset-2 ring-offset-background transition-shadow",
                        selected && "ring-2 ring-primary",
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  )
                })}
              </div>
            </fieldset>
          ) : (
            <fieldset key={g.key} className="mt-6">
              <legend className="text-sm">{t.product.options[g.key] ?? g.label}</legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {g.values.map((value) => {
                  const selected = variant.options[g.key] === value
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => choose(g.key, value)}
                      className={cn(
                        "h-9 rounded-lg border px-3.5 text-sm transition-colors hover:border-primary",
                        selected && "border-primary bg-accent font-medium text-accent-foreground",
                      )}
                    >
                      {value}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ),
        )}

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>{t.common.quantity}</span>
            {soldOut ? (
              <span className="text-muted-foreground">{t.product.outOfStock}</span>
            ) : stock <= 15 ? (
              <span className="font-medium text-destructive">{fmt(t.product.onlyLeft, { n: stock })}</span>
            ) : (
              <span className="text-success">{t.product.readyToShip}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <QuantityStepper value={qty} onChange={setQty} max={maxQty} />
            <AddToCartButton
              variantId={variant.id}
              productName={`${product.name} (${variant.name})`}
              quantity={qty}
              disabled={soldOut}
              size="lg"
              className="h-11 flex-1"
            />
            <Button
              size="lg"
              variant="outline"
              disabled={soldOut}
              className="h-11 flex-1 border-primary text-primary hover:bg-accent hover:text-primary sm:flex-none sm:px-6"
              onClick={() => {
                add(variant.id, qty)
                router.push("/checkout")
              }}
            >
              <Zap /> {t.product.buyNow}
            </Button>
          </div>
          {soldOut && (
            <div className="mt-2">
              <StockAlertButton productId={product.id} slug={product.slug} />
            </div>
          )}
          <div className="mt-3 flex items-center gap-1">
            <WishlistButton productId={product.id} productName={product.name} variant="outline" className="h-9 border-0 px-2 text-muted-foreground shadow-none" />
            <CompareButton productId={product.id} />
          </div>
        </div>

        <div className="mt-6 divide-y rounded-xl border text-sm">
          <DeliveryEstimate />
          <div className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <p>
              <span className="font-medium">{fmt(t.product.officialWarranty, { brand: product.brand.name })}</span>
              <span className="block text-muted-foreground">
                {fmt(t.product.warrantyVia, {
                  warranty: product.warrantyMonths
                    ? product.warrantyMonths >= 12
                      ? fmt(t.product.warrantyYears, { n: product.warrantyMonths / 12 })
                      : fmt(t.product.warrantyMonths, { n: product.warrantyMonths })
                    : t.product.warranty,
                  sku: variant.sku,
                })}
              </span>
            </p>
          </div>
          <div className="flex items-start gap-3 p-4">
            <RotateCcw className="mt-0.5 size-5 shrink-0 text-primary" />
            <p>
              <span className="font-medium">{t.product.freeReturns}</span>
              <span className="block text-muted-foreground">{t.product.freeReturnsBody}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
