import type { Metadata } from "next"
import { CheckoutFlow } from "@/components/checkout/checkout-flow"
import { getDictionary } from "@/lib/i18n/dictionary"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.checkout }
}

export default function CheckoutPage() {
  return <CheckoutFlow />
}
