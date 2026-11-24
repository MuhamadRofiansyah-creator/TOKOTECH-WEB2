import { Skeleton } from "@/components/ui/skeleton"
import { getDictionary } from "@/lib/i18n/dictionary"

/** Static-shell placeholder while the signed-in user's data streams in. */
export async function AccountSkeleton() {
  const t = await getDictionary()
  return (
    <div className="space-y-4" aria-busy="true" aria-label={t.common.loading}>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  )
}
