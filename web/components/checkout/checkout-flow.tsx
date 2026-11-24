"use client"

import Link from "@/components/i18n/link"
import { useRouter } from "@/components/i18n/provider"
import { useEffect, useState, useTransition } from "react"
import { AlertCircle, Building2, Check, CreditCard, Loader2, QrCode, ShoppingCart, Truck, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductImage } from "@/components/product/product-image"
import { OrderSummary } from "@/components/cart/order-summary"
import { useCartItems } from "@/components/cart/use-cart-items"
import { useCart, useVoucher } from "@/stores"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { getCheckoutDefaultsAction, placeOrderAction, quoteShippingAction, type RateOption } from "@/lib/actions/checkout"
import type { PaymentMethod } from "@/lib/types"
import { useDict, useLocalePath } from "@/components/i18n/provider"
import { fmt } from "@/lib/i18n/config"

// Checkout: address → live courier rates → payment method → review. "Place order"
// runs the server transaction (re-prices, holds stock) and then hands off to Midtrans
// Snap, or to the mock payment page when Midtrans isn't configured.

const STEP_COUNT = 4

const PAYMENTS: { id: PaymentMethod; icon: typeof QrCode }[] = [
  { id: "QRIS", icon: QrCode },
  { id: "VIRTUAL_ACCOUNT", icon: Building2 },
  { id: "CREDIT_CARD", icon: CreditCard },
  { id: "EWALLET", icon: Wallet },
]

const PROVINCES = [
  "DKI Jakarta", "Jawa Barat", "Banten", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", "Bali",
  "Sumatera Utara", "Sumatera Barat", "Riau", "Sumatera Selatan", "Lampung", "Kalimantan Barat",
  "Kalimantan Timur", "Sulawesi Selatan", "Sulawesi Utara", "Nusa Tenggara Barat", "Papua",
]

type Address = { recipient: string; phone: string; street: string; district: string; city: string; province: string; postalCode: string; notes: string }
type FieldKey = keyof Address | "email"

const EMPTY: Address = { recipient: "", phone: "", street: "", district: "", city: "", province: "DKI Jakarta", postalCode: "", notes: "" }

export function CheckoutFlow() {
  const router = useRouter()
  const t = useDict()
  const localPath = useLocalePath()
  const { mounted, items, subtotal, savings, count } = useCartItems()
  const voucher = useVoucher((s) => s.rule)
  const [step, setStep] = useState(0)
  const [signedIn, setSignedIn] = useState(false)
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState<Address>(EMPTY)
  const [saveAddress, setSaveAddress] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [rates, setRates] = useState<RateOption[] | null>(null)
  const [rateError, setRateError] = useState("")
  const [rateId, setRateId] = useState("")
  const [payment, setPayment] = useState<PaymentMethod>("QRIS")
  const [formError, setFormError] = useState("")
  const [placing, startPlacing] = useTransition()

  // Prefill from the account (email + default address)
  useEffect(() => {
    getCheckoutDefaultsAction()
      .then((d) => {
        setSignedIn(d.signedIn)
        if (d.email) setEmail(d.email)
        if (d.address) setAddress({ ...EMPTY, ...d.address, notes: d.address.notes ?? "" })
      })
      .catch(() => {})
  }, [])

  // Live courier rates for the postal code once the shipping step opens
  useEffect(() => {
    if (step !== 1) return
    let cancelled = false
    quoteShippingAction(address.postalCode)
      .then((r) => {
        if (cancelled) return
        setRates(r.rates)
        setRateError(r.error ?? "")
        setRateId((current) => (r.rates.some((x) => x.id === current) ? current : (r.rates[0]?.id ?? "")))
      })
      .catch(() => !cancelled && setRateError(t.checkout.ratesFailed))
    return () => {
      cancelled = true
    }
    // Re-quote when the cart total changes (free-shipping threshold)
  }, [step, address.postalCode, subtotal, t.checkout.ratesFailed])

  const rate = rates?.find((r) => r.id === rateId)

  if (!mounted)
    return (
      <div className="container-page mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-[480px] rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )

  if (!items.length)
    return (
      <div className="container-page mt-6">
        <EmptyState icon={ShoppingCart} title={t.cart.empty} body={t.checkout.emptyBody}>
          <Button asChild>
            <Link href="/">{t.checkout.browse}</Link>
          </Button>
        </EmptyState>
      </div>
    )

  const validateAddress = () => {
    const e: typeof errors = {}
    if (!signedIn && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t.checkout.errors.email
    if (address.recipient.trim().length < 2) e.recipient = t.checkout.errors.recipient
    if (!/^[0-9+\s-]{9,20}$/.test(address.phone)) e.phone = t.checkout.errors.phone
    if (address.street.trim().length < 5) e.street = t.checkout.errors.street
    if (address.district.trim().length < 2) e.district = t.checkout.errors.district
    if (!address.city.trim()) e.city = t.checkout.errors.city
    if (!/^\d{5}$/.test(address.postalCode)) e.postalCode = t.checkout.errors.postal
    setErrors(e)
    return !Object.keys(e).length
  }

  const next = () => {
    if (step === 0 && !validateAddress()) return
    if (step === 1 && !rate) return
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const place = () =>
    startPlacing(async () => {
      setFormError("")
      const res = await placeOrderAction({ email, address, rateId, method: payment, voucherCode: voucher?.code ?? null, saveAddress })
      if (!res.ok) {
        if (res.fieldErrors) {
          const tr: Record<string, string> = { ...t.checkout.errors, postalCode: t.checkout.errors.postal }
          setErrors(Object.fromEntries(Object.keys(res.fieldErrors).map((k) => [k, tr[k] ?? res.fieldErrors![k]])) as typeof errors)
          setStep(0)
        }
        setFormError(res.error ?? t.checkout.checkFields)
        return
      }
      useCart.getState().replace([])
      useVoucher.getState().set(null)
      const url = new URL(res.redirect, window.location.origin)
      if (url.origin === window.location.origin) router.push(url.pathname + url.search)
      else window.location.replace(url.toString()) // Midtrans Snap payment page
    })

  const field = (key: keyof Address, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={address[key]}
        onChange={(e) => setAddress((a) => ({ ...a, [key]: e.target.value }))}
        aria-invalid={!!errors[key]}
        className="h-10"
        {...props}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="container-page mt-4">
      <h1 className="text-2xl font-medium tracking-tight">{t.checkout.title}</h1>

      {/* Stepper */}
      <ol className="mt-6 flex items-center gap-2" aria-label={t.checkout.stepsLabel}>
        {t.checkout.steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2 last:flex-none">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              aria-current={i === step ? "step" : undefined}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  i < step && "border-primary bg-primary text-primary-foreground",
                  i === step && "border-primary text-primary",
                  i > step && "text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("hidden sm:inline", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
            </button>
            {i < STEP_COUNT - 1 && <span className={cn("h-px flex-1", i < step ? "bg-primary" : "bg-border")} />}
          </li>
        ))}
      </ol>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          {formError && (
            <p role="alert" className="mb-5 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" /> {formError}
            </p>
          )}

          {step === 0 && (
            <section aria-labelledby="h-address">
              <h2 id="h-address" className="text-lg font-medium">
                {t.checkout.address}
              </h2>
              {!signedIn && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.checkout.guest}{" "}
                  <Link href={`/login?next=${encodeURIComponent(localPath("/checkout"))}`} className="text-primary hover:underline">
                    {t.common.signIn}
                  </Link>{" "}
                  {t.checkout.signInSaved}
                </p>
              )}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {!signedIn && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="email">{t.checkout.email}</Label>
                    <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} className="h-10" />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                )}
                {field("recipient", t.checkout.recipient, { autoComplete: "name" })}
                {field("phone", t.checkout.phone, { autoComplete: "tel", inputMode: "tel" })}
                <div className="sm:col-span-2">{field("street", t.checkout.street, { autoComplete: "street-address" })}</div>
                {field("district", t.checkout.district)}
                {field("city", t.checkout.city, { autoComplete: "address-level2" })}
                <div className="space-y-1.5">
                  <Label htmlFor="province">{t.checkout.province}</Label>
                  <Select value={address.province} onValueChange={(v) => setAddress((a) => ({ ...a, province: v }))}>
                    <SelectTrigger id="province" className="h-10! w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {field("postalCode", t.checkout.postal, { autoComplete: "postal-code", inputMode: "numeric", maxLength: 5 })}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="notes">{t.checkout.notes}</Label>
                  <Textarea
                    id="notes"
                    value={address.notes}
                    onChange={(e) => setAddress((a) => ({ ...a, notes: e.target.value }))}
                    placeholder={t.checkout.notesPlaceholder}
                  />
                </div>
                {signedIn && (
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Checkbox id="save" checked={saveAddress} onCheckedChange={(v) => setSaveAddress(v === true)} />
                    <Label htmlFor="save" className="font-normal text-muted-foreground">
                      {t.checkout.saveAddress}
                    </Label>
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="h-ship">
              <h2 id="h-ship" className="text-lg font-medium">
                {t.checkout.shippingMethod}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {fmt(t.checkout.liveRates, { place: `${address.district}, ${address.city} ${address.postalCode}` })}
              </p>
              {rateError && <p className="mt-4 text-sm text-destructive">{rateError}</p>}
              {rates === null && !rateError && (
                <div className="mt-5 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              )}
              {rates && (
                <RadioGroup value={rateId} onValueChange={setRateId} className="mt-5 gap-3">
                  {rates.map((r) => (
                    <Label
                      key={r.id}
                      htmlFor={r.id}
                      className={cn("flex cursor-pointer items-center gap-4 rounded-xl border p-4 font-normal transition-colors", rateId === r.id && "border-primary bg-accent/50")}
                    >
                      <RadioGroupItem value={r.id} id={r.id} />
                      <Truck className="size-5 text-muted-foreground" />
                      <span className="flex-1">
                        <span className="block font-medium">{r.label}</span>
                        <span className="block text-xs text-muted-foreground">{r.eta}</span>
                      </span>
                      <span className={cn("text-right text-sm tabular-nums", r.price === 0 && "font-medium text-success")}>
                        {r.price === 0 ? t.common.free : formatPrice(r.price)}
                        {r.price === 0 && r.cost > 0 && <span className="block text-[11px] font-normal text-muted-foreground line-through">{formatPrice(r.cost)}</span>}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              )}
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="h-pay">
              <h2 id="h-pay" className="text-lg font-medium">
                {t.checkout.paymentMethod}
              </h2>
              <RadioGroup value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)} className="mt-5 gap-3">
                {PAYMENTS.map(({ id, icon: Icon }) => (
                  <Label
                    key={id}
                    htmlFor={id}
                    className={cn("flex cursor-pointer items-center gap-4 rounded-xl border p-4 font-normal transition-colors", payment === id && "border-primary bg-accent/50")}
                  >
                    <RadioGroupItem value={id} id={id} />
                    <Icon className="size-5 text-muted-foreground" />
                    <span>
                      <span className="block font-medium">{t.checkout.payments[id].name}</span>
                      <span className="block text-xs text-muted-foreground">{t.checkout.payments[id].desc}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
              <p className="mt-4 text-xs text-muted-foreground">{t.checkout.payNote}</p>
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="h-review" className="space-y-6">
              <h2 id="h-review" className="text-lg font-medium">
                {t.checkout.review}
              </h2>
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <ReviewBlock title={t.checkout.deliverTo} onEdit={() => setStep(0)}>
                  {address.recipient} · {address.phone}
                  <br />
                  {address.street}, {address.district}, {address.city}, {address.province} {address.postalCode}
                </ReviewBlock>
                <ReviewBlock title={t.checkout.shipping} onEdit={() => setStep(1)}>
                  {rate?.label}
                  <br />
                  {rate?.eta}
                </ReviewBlock>
                <ReviewBlock title={t.checkout.payment} onEdit={() => setStep(2)}>
                  {t.checkout.payments[payment].name}
                </ReviewBlock>
              </dl>
              <ul className="divide-y rounded-xl border">
                {items.map(({ product: p, variant: v, variantId, quantity }) => (
                  <li key={variantId} className="flex items-center gap-3 p-3">
                    <ProductImage product={p} colorHex={v.colorHex} className="aspect-square w-14 shrink-0 rounded-md" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.variants.length > 1 && <>{v.name} · </>}{fmt(t.checkout.qty, { n: quantity })}
                      </span>
                    </span>
                    <span className="text-sm tabular-nums">{formatPrice(v.price * quantity)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-8 flex justify-between gap-3 border-t pt-5">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || placing}>
              {t.checkout.back}
            </Button>
            {step < STEP_COUNT - 1 ? (
              <Button size="lg" className="h-11 px-6" onClick={next} disabled={step === 1 && !rate}>
                {fmt(t.checkout.continueTo, { step: t.checkout.steps[step + 1].toLowerCase() })}
              </Button>
            ) : (
              <Button size="lg" className="h-11 px-6" onClick={place} disabled={placing}>
                {placing && <Loader2 className="animate-spin" />}
                {t.checkout.place}
              </Button>
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-2xl border bg-card p-4">
            <p className="mb-3 text-sm font-medium">{count} items</p>
            <ul className="max-h-60 space-y-3 overflow-y-auto">
              {items.map(({ product: p, variant: v, variantId, quantity }) => (
                <li key={variantId} className="flex items-center gap-3">
                  <span className="relative">
                    <ProductImage product={p} colorHex={v.colorHex} className="aspect-square w-12 rounded-md" />
                    <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] text-background">
                      {quantity}
                    </span>
                  </span>
                  <span className="line-clamp-2 flex-1 text-xs">{p.name}</span>
                  <span className="text-xs tabular-nums">{formatPrice(v.price * quantity)}</span>
                </li>
              ))}
            </ul>
          </div>
          <OrderSummary subtotal={subtotal} savings={savings} itemCount={count} shipping={step >= 1 && rate ? rate.price : undefined} />
        </aside>
      </div>
    </div>
  )
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  const t = useDict()
  return (
    <div className="rounded-xl bg-muted/60 p-4">
      <dt className="flex items-center justify-between text-xs text-muted-foreground">
        {title}
        <button type="button" onClick={onEdit} className="text-primary hover:underline">
          {t.common.edit}
        </button>
      </dt>
      <dd className="mt-1.5 leading-relaxed">{children}</dd>
    </div>
  )
}
