import { AccountNav } from "@/components/account/account-nav"
import { AccountIdentity } from "@/components/account/account-identity"

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page pt-6 sm:pt-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-10">
        <aside className="space-y-4 lg:space-y-6">
          <AccountIdentity />
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
