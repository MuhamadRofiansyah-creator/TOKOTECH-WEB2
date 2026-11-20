import "server-only"
import { db } from "@/lib/db"

/** Attach guest orders placed with this email to the account (guest checkout → later registration). */
export async function claimGuestOrders(userId: string, email: string) {
  const { count } = await db.order.updateMany({
    where: { userId: null, email: { equals: email, mode: "insensitive" } },
    data: { userId, guestAccessToken: null },
  })
  return count
}
