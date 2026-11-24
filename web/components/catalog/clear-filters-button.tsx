"use client"

import { Button } from "@/components/ui/button"
import { useCatalog } from "./catalog-context"
import { useDict } from "@/components/i18n/provider"

export function ClearFiltersButton() {
  const t = useDict()
  const { clearAll } = useCatalog()
  return <Button onClick={clearAll}>{t.catalog.clearFilters}</Button>
}
