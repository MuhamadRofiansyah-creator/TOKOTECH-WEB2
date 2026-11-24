// Runs once per server process. On a long-running Node server (`next start`), sweep
// unpaid orders whose payment window has passed every 5 minutes, releasing their stock.
// Serverless hosts should call GET /api/cron/expire-orders on a schedule instead.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return
  const { expireOverduePayments } = await import("@/lib/orders/settle")
  const run = () =>
    expireOverduePayments()
      .then((n) => n && console.info(`[expire-orders] cancelled ${n} unpaid order(s)`))
      .catch((e) => console.error("[expire-orders]", e))
  setTimeout(run, 10_000)
  setInterval(run, 5 * 60_000)
}
