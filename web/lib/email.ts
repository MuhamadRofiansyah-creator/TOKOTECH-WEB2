import "server-only"
import { formatPrice } from "@/lib/format"

// Transactional email via Resend (https://resend.com/docs/api-reference/emails/send-email).
// Without RESEND_API_KEY, emails are printed to the server console instead.

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000"

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#0b1220">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <p style="font-size:20px;font-weight:bold;color:#0e9aa5;margin:0 0 16px">tokotech</p>
  <div style="background:#fff;border-radius:12px;padding:24px">
    <h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
    ${body}
  </div>
  <p style="font-size:12px;color:#64748b;margin-top:16px">TokoTech · Jakarta, Indonesia</p>
</div></body></html>`
}

const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#14b8c4;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">${esc(label)}</a></p>`

async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.info(`[email:console] to=${to} subject="${subject}"`)
    return
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "TokoTech <onboarding@resend.dev>", to: [to], subject, html }),
      cache: "no-store",
    })
    if (!res.ok) console.error(`[email] Resend ${res.status}: ${await res.text()}`)
  } catch (e) {
    // Email failures never break checkout or payment processing
    console.error("[email] send failed", e)
  }
}

type OrderLike = { number: string; email: string; total: number; shipRecipient: string; guestAccessToken: string | null }
type Line = { productName: string; variantName: string; quantity: number; lineTotal: number }

/** Link to the order: the account page, or the guest link with its secret token. */
export const orderUrl = (o: Pick<OrderLike, "number" | "guestAccessToken">) =>
  o.guestAccessToken ? `${appUrl()}/orders/${o.number}?t=${o.guestAccessToken}` : `${appUrl()}/account/orders/${o.number}`

const lines = (items: Line[]) =>
  `<table style="width:100%;border-collapse:collapse;font-size:14px">${items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${esc(i.productName)}<br><span style="color:#64748b;font-size:12px">${esc(i.variantName)} × ${i.quantity}</span></td><td style="text-align:right">${formatPrice(i.lineTotal)}</td></tr>`,
    )
    .join("")}</table>`

export function sendOrderPlaced(o: OrderLike, items: Line[], payUrl: string, expiresAt: Date | null) {
  const until = expiresAt ? expiresAt.toLocaleString("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB" : "soon"
  return send(
    o.email,
    `Order ${o.number}: complete your payment`,
    layout(
      `Thanks, ${o.shipRecipient.split(" ")[0]}! Your order is reserved`,
      `<p>We're holding your items until <b>${until}</b>. Complete the payment of <b>${formatPrice(o.total)}</b> to confirm order <b>${o.number}</b>.</p>${button(payUrl, "Pay now")}${lines(items)}<p style="font-size:13px;color:#64748b">Track your order: <a href="${esc(orderUrl(o))}">${esc(orderUrl(o))}</a></p>`,
    ),
  )
}

export function sendPaymentReceived(o: OrderLike, items: Line[]) {
  return send(
    o.email,
    `Payment received for ${o.number}`,
    layout("Payment received", `<p>We've received ${formatPrice(o.total)} for order <b>${o.number}</b>. We're packing it now.</p>${lines(items)}${button(orderUrl(o), "View order")}`),
  )
}

export function sendShipped(o: OrderLike, courier: string, waybill: string | null) {
  return send(
    o.email,
    `Order ${o.number} has shipped`,
    layout("Your order is on its way", `<p>Order <b>${o.number}</b> was handed to <b>${esc(courier)}</b>.${waybill ? ` Waybill (resi): <b>${esc(waybill)}</b>.` : ""}</p>${button(orderUrl(o), "Track order")}`),
  )
}

export function sendStaffInvite(email: string, role: string, token: string) {
  const url = `${appUrl()}/register?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
  return send(email, "You're invited to the TokoTech admin", layout("Join the TokoTech team", `<p>You've been invited as <b>${esc(role.toLowerCase())}</b>. Create your account to get started.</p>${button(url, "Accept invite")}`))
}

export function sendPasswordReset(email: string, url: string) {
  return send(email, "Reset your TokoTech password", layout("Reset your password", `<p>Someone asked to reset the password for this account. The link works for 1 hour.</p>${button(url, "Choose a new password")}<p style="font-size:13px;color:#64748b">If it wasn't you, ignore this email; your password stays the same.</p>`))
}

export function sendBackInStock(email: string, productName: string, slug: string) {
  return send(email, `${productName} is back in stock`, layout("Back in stock", `<p><b>${esc(productName)}</b> is available again.</p>${button(`${appUrl()}/p/${slug}`, "Shop now")}`))
}
