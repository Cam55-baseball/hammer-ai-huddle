// Plan 4 D — reads the signed-in user's Stripe subscriptions and writes their Coach/Organization
// entitlement to staff_plans (on and off). Body: {} (self) or { portal: true } → also returns a portal URL.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { staffPlanFromItems } from "../_shared/staffPlans.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    const user = u.user;
    if (!user?.email) return json({ error: "Please sign in first." }, 401);
    const body = await req.json().catch(() => ({}));

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const customerId = (await stripe.customers.list({ email: user.email, limit: 1 })).data[0]?.id;
    let best: any = null;
    if (customerId) {
      for await (const s of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
        const p = staffPlanFromItems(s.items.data as any);
        if (!p) continue;
        const live = ["active", "trialing"].includes(s.status);
        if (!best || (live && !best.live)) {
          best = { ...p, live, status: s.status, sub: s.id,
            end: (s.items.data[0] as any)?.current_period_end ?? (s as any).current_period_end };
        }
      }
    }
    if (best) {
      await admin.from("staff_plans").upsert({
        user_id: user.id, plan: best.plan, status: best.status, extra_seats: best.extra_seats, included_seats: best.included_seats,
        stripe_customer_id: customerId, stripe_subscription_id: best.sub,
        current_period_end: best.end ? new Date(best.end * 1000).toISOString() : null, updated_at: new Date().toISOString(),
      });
    } else {
      await admin.from("staff_plans").update({ status: "none", updated_at: new Date().toISOString() }).eq("user_id", user.id);
    }

    let portal: string | null = null;
    if (body?.portal && customerId) {
      const raw = req.headers.get("origin") || "";
      const origin = /^https?:\/\//i.test(raw) ? raw : "https://hammersmodality.org";
      portal = (await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/staff-plans` })).url;
    }
    return json({ plan: best?.live ? best.plan : null, status: best?.status ?? "none", extra_seats: best?.extra_seats ?? 0, included_seats: best?.included_seats ?? 0, portal });
  } catch (e) {
    console.error("[sync-staff-plan] error", e instanceof Error ? e.message : e);
    return json({ error: "Could not check your plan. Please try again." }, 500);
  }
});
