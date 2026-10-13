// Owner-only, READ-ONLY Stripe snapshot for the owner's regression report (Stripe guardrail 2026-10-13).
// Lists IDs + key fields of products, prices, coupons, promotion codes, webhook endpoints,
// and active subscription counts by price. Never writes to Stripe. Returns no customer data.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: u } = await admin.auth.getUser((req.headers.get("Authorization") ?? "").replace("Bearer ", ""));
  if (!u.user) return json({ error: "Sign in first." }, 401);
  const { data: owner } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "owner").maybeSingle();
  if (!owner) return json({ error: "Owner only." }, 403);

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
  const all = async (list: any) => { const out: any[] = []; for await (const x of list) out.push(x); return out; };
  const products = (await all(stripe.products.list({ limit: 100 }))).map((p) => ({ id: p.id, name: p.name, active: p.active, updated: p.updated }));
  const prices = (await all(stripe.prices.list({ limit: 100 }))).map((p) => ({ id: p.id, product: p.product, active: p.active, unit_amount: p.unit_amount, interval: p.recurring?.interval ?? null }));
  const coupons = (await all(stripe.coupons.list({ limit: 100 }))).map((c) => ({ id: c.id, name: c.name, percent_off: c.percent_off, amount_off: c.amount_off, duration: c.duration, valid: c.valid, times_redeemed: c.times_redeemed }));
  const promotion_codes = (await all(stripe.promotionCodes.list({ limit: 100 }))).map((p) => ({ id: p.id, code: p.code, active: p.active, times_redeemed: p.times_redeemed }));
  const webhook_endpoints = (await all(stripe.webhookEndpoints.list({ limit: 100 }))).map((w) => ({ id: w.id, status: w.status, events: (w.enabled_events ?? []).length }));
  const subsByPrice: Record<string, number> = {};
  let activeSubs = 0;
  for await (const s of stripe.subscriptions.list({ status: "active", limit: 100 })) {
    activeSubs++;
    for (const i of s.items.data) subsByPrice[i.price.id] = (subsByPrice[i.price.id] ?? 0) + 1;
  }
  return json({
    taken_at: new Date().toISOString(),
    counts: { products: products.length, prices: prices.length, coupons: coupons.length, promotion_codes: promotion_codes.length, webhook_endpoints: webhook_endpoints.length, active_subscriptions: activeSubs },
    products, prices, coupons, promotion_codes, webhook_endpoints, active_subscriptions_by_price: subsByPrice,
  });
});
