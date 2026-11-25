import type { NextRequest } from "next/server"
import { searchSuggestions } from "@/lib/data"

// GET /api/search?q=keychron → up to 6 live products for the header suggestions (typo-tolerant).
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80)
  const products = q ? await searchSuggestions(q) : []
  return Response.json({ products }, { headers: { "Cache-Control": "public, max-age=60" } })
}
