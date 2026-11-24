"use client"

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import type { ProductWithRelations } from "@/lib/types"
import { ProductCard } from "@/components/product/product-card"

export function ProductRail({ products }: { products: ProductWithRelations[] }) {
  return (
    <Carousel opts={{ align: "start", slidesToScroll: "auto" }} className="group/rail">
      <CarouselContent className="-ml-3 sm:-ml-5">
        {products.map((p) => (
          <CarouselItem key={p.id} className="basis-[46%] pl-3 sm:basis-1/3 sm:pl-5 lg:basis-1/4 xl:basis-1/5">
            <ProductCard product={p} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="top-[34%] bottom-auto -left-4 hidden size-10 bg-background shadow-md lg:inline-flex" />
      <CarouselNext className="top-[34%] bottom-auto -right-4 hidden size-10 bg-background shadow-md lg:inline-flex" />
    </Carousel>
  )
}
