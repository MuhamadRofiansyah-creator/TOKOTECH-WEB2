"use client"

import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { useDict } from "@/components/i18n/provider"

export default function ShopError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useDict()
  return (
    <div className="container-page py-16">
      <EmptyState icon={TriangleAlert} title={t.errors.title} body={t.errors.body}>
        <Button onClick={reset}>{t.common.tryAgain}</Button>
      </EmptyState>
    </div>
  )
}
