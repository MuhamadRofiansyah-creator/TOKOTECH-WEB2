import type { NextRequest } from "next/server"
import { lookupCatalog } from "@/lib/data"

// GET /api/catalog?products=p-001,p-002&variants=p-003-v1
// Read API for browser components that hold ids in localStorage (cart, wishlist,
// compare). Returns live products with brand, category and variants.
const MAX_IDS = 60
const ids = (v: string | null) =>
  [...new Set((v ?? "").split(",").map((s) => s.trim()).filter((s) => /^[\w-]{1,40}$/.test(s)))].slice(0, MAX_IDS).sort()

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const data = await lookupCatalog(ids(params.get("products")), ids(params.get("variants")))
  return Response.json(data, { headers: { "Cache-Control": "private, max-age=30" } })
}
