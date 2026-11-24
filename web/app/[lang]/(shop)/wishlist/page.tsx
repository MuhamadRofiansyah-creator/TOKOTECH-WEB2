import type { Metadata } from "next"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { WishlistView } from "@/components/cart/wishlist-view"
import { getDictionary } from "@/lib/i18n/dictionary"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.wishlist }
}

export default async function WishlistPage() {
  const t = await getDictionary()
  return (
    <div className="container-page pt-6 sm:pt-8">
      <Breadcrumbs items={[{ label: t.meta.wishlist }]} />
      <WishlistView />
    </div>
  )
}
