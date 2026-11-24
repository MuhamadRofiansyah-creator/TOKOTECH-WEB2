import { Skeleton } from "@/components/ui/skeleton"
import { ProductGridSkeleton } from "@/components/product/product-card-skeleton"

export function CatalogSkeleton() {
  return (
    <div className="container-page pt-6 sm:pt-8">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-4 h-7 w-64" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <div className="hidden space-y-3 lg:block">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
        <div>
          <Skeleton className="mb-5 h-10 w-full" />
          <ProductGridSkeleton />
        </div>
      </div>
    </div>
  )
}
