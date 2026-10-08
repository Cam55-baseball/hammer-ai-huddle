// Yearly renewal reminders + price-change notices (legal_v2, California auto-renewal law).
// Does nothing unless legal_v2 is ON (mode 'all'). Dry run by default.
//  - mode "renewal" (cron or staff): yearly Stripe subscriptions renewing in 15–30 days get one reminder
//    (deduped with Stripe metadata renewal_reminder_for=<period_end>).
//  - mode "price_change" (staff only): emails every active subscriber on a price with the notice text given.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { EMAIL_FROM, EMAIL_REPLY_TO } from "../_shared/email.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const money = (cents: number | null, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase() }).format((cents ?? 0) / 100);
const SETTINGS = "https://hammersmodality.org/settings/legal";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "price_change" ? "price_change" : "renewal";
  const dryRun = body.dry_run !== false;

  // Who may call: the scheduler (service key) or an owner/admin.
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  let staff = token === service;
  if (!staff) {
    const { data: u } = await admin.auth.getUser(token);
    if (u?.user) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
      staff = (roles ?? []).some((r: { role: string }) => r.role === "owner" || r.role === "admin");
    }
  }
  if (!staff) return json({ error: "not allowed" }, 403);

  const { data: sw } = await admin.from("wk_feature_switches").select("mode").eq("feature_key", "legal_v2").maybeSingle();
  if (sw?.mode !== "all" && !body.force_while_off) return json({ ok: true, skipped: "legal_v2 is not on for everyone" });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const now = Math.floor(Date.now() / 1000);
  const out: Array<Record<string, unknown>> = [];

  const send = async (to: string, subject: string, html: string) => {
    if (dryRun || !resendKey) return { status: dryRun ? "dry_run" : "no_key" };
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, reply_to: EMAIL_REPLY_TO, to: [to], subject, html }),
    });
    return { status: r.ok ? "sent" : "failed", error: r.ok ? undefined : (await r.text()).slice(0, 300) };
  };

  for await (const sub of stripe.subscriptions.list({ status: "active", limit: 100, expand: ["data.customer"] })) {
    const item = sub.items.data[0]; const price = item?.price;
    const cust = sub.customer as Stripe.Customer; const email = cust?.email;
    if (!price || !email) continue;
    const periodEnd = (item as unknown as { current_period_end?: number }).current_period_end ?? 0;
    const amount = money(price.unit_amount, price.currency);
    const name = (price.nickname ?? "Hammers Modality plan");

    if (mode === "renewal") {
      if (price.recurring?.interval !== "year") continue;
      const days = (periodEnd - now) / 86400;
      if (days < 15 || days > 30) continue;
      if (sub.metadata?.renewal_reminder_for === String(periodEnd)) continue;
      const date = new Date(periodEnd * 1000).toLocaleDateString("en-US", { dateStyle: "long" });
      const res = await send(email, `Your ${name} renews on ${date}`,
        `<div style="font-family:sans-serif"><p>Your ${esc(name)} renews automatically on <b>${date}</b> for <b>${amount}</b> per year until you cancel.</p><p>To cancel, open <a href="${SETTINGS}">Settings → Legal &amp; privacy</a> and tap <b>Cancel subscription</b>. Bought on iPhone? Cancel in your Apple ID subscriptions.</p><p>Hammers Modality LLC, 15985 Preserve Marketplace #1154, Odessa, FL 33556</p></div>`);
      if (res.status === "sent") await stripe.subscriptions.update(sub.id, { metadata: { ...sub.metadata, renewal_reminder_for: String(periodEnd) } });
      out.push({ sub: sub.id, days: Math.round(days), ...res });
    } else {
      if (body.price_id && price.id !== body.price_id) continue;
      const notice = String(body.notice ?? "").trim();
      if (!notice) return json({ error: "notice text required" }, 400);
      const res = await send(email, "A price change for your Hammers Modality plan",
        `<div style="font-family:sans-serif"><p>${esc(notice)}</p><p>Current price: ${amount}. You can cancel anytime in <a href="${SETTINGS}">Settings → Legal &amp; privacy</a>.</p><p>Hammers Modality LLC, 15985 Preserve Marketplace #1154, Odessa, FL 33556</p></div>`);
      out.push({ sub: sub.id, ...res });
    }
  }
  return json({ ok: true, mode, dry_run: dryRun, count: out.length, results: out });
});
