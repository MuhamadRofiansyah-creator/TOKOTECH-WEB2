import type { Metadata } from "next"
import { getAddresses } from "@/lib/data"
import { Suspense } from "react"
import { requireUser } from "@/lib/auth/session"
import { AccountSkeleton } from "@/components/account/account-skeleton"
import { AddressBook } from "@/components/account/address-book"
import { getDictionary, getLocale } from "@/lib/i18n/dictionary"
import { localizePath } from "@/lib/i18n/config"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.addresses }
}

export default function AddressesPage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <AddressesContent />
    </Suspense>
  )
}

async function AddressesContent() {
  const locale = await getLocale()
  const user = await requireUser(localizePath("/account/addresses", locale))
  const addresses = await getAddresses(user.id)
  return <AddressBook addresses={addresses} />
}
