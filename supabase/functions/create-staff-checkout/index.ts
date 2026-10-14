// Plan 4 D — web checkout for the Coach ($300/mo) and Organization ($1,000/mo + extra seats $150/mo) plans.
// Body: { plan: "coach" | "organization", extra_seats?: number }
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { STAFF_PRICES, MAX_EXTRA_SEATS } from "../_shared/staffPlans.ts";
import { staffEligibility } from "../_shared/staffEligibility.ts";

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

    const { plan, extra_seats } = await req.json().catch(() => ({}));
    if (plan !== "coach" && plan !== "organization") return json({ error: "Choose the Coach or Organization plan." }, 400);
    const seats = Math.floor(Number(extra_seats ?? 0));
    if (plan === "coach" && seats) return json({ error: "Extra seats come with the Organization plan." }, 400);
    if (!Number.isFinite(seats) || seats < 0 || seats > MAX_EXTRA_SEATS) return json({ error: "Extra seats must be 0–100." }, 400);

    const [{ data: pc }, { data: roles }, { data: owned }, { data: adminOf }] = await Promise.all([
      admin.from("profiles").select("parent_controlled,date_of_birth").eq("id", user.id).maybeSingle(),
      admin.from("user_roles").select("role,status").eq("user_id", user.id),
      admin.from("organizations").select("id,verification_status,is_solo").eq("owner_user_id", user.id),
      admin.from("organization_members").select("organization_id").eq("user_id", user.id).eq("role_in_org", "admin").eq("status", "active"),
    ]);
    const roleSet = new Set((roles ?? []).filter((r: any) => !r.status || r.status === "active").map((r: any) => r.role));
    const realOrgs = (owned ?? []).filter((o: any) => !o.is_solo);
    const elig = staffEligibility({
      plan, dob: pc?.date_of_birth ?? null, parentControlled: !!pc?.parent_controlled,
      isCoach: roleSet.has("coach"),
      isOrgAdmin: realOrgs.length > 0 || (adminOf ?? []).length > 0,
      isOwnerOrAdmin: roleSet.has("owner") || roleSet.has("admin"),
    });
    if (!elig.ok) {
      console.log("[create-staff-checkout] refused", { user: user.id, plan, code: elig.code });
      return json({ error: elig.error, code: elig.code }, 403);
    }

    // Fair use (Terms v2 section 15, lawyer-approved 2026-10-13) must be accepted before checkout.
    const { data: fu } = await admin.from("consent_records").select("id").eq("user_id", user.id)
      .eq("document_slug", "terms").gte("document_version", 2).eq("choice", "accepted").limit(1);
    if (!fu?.length) return json({ error: "Please accept the fair-use terms first.", code: "fair_use_required" }, 400);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const found = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = found.data[0]?.id;
    const wanted = new Set([STAFF_PRICES.coach, STAFF_PRICES.organization]);
    if (customerId) {
      for await (const s of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
        if (["active", "trialing", "past_due"].includes(s.status) && s.items.data.some((i: any) => wanted.has(i.price.id))) {
          return json({ error: "You already have a staff plan. Change seats or cancel from Manage plan.", already_subscribed: true }, 409);
        }
      }
    }

    const line_items = [{ price: plan === "coach" ? STAFF_PRICES.coach : STAFF_PRICES.organization, quantity: 1 }];
    if (plan === "organization" && seats > 0) line_items.push({ price: STAFF_PRICES.extraSeat, quantity: seats });

    const raw = req.headers.get("origin") || "";
    const origin = /^https?:\/\//i.test(raw) ? raw : "https://hammersmodality.org";
    const meta = { user_id: user.id, staff_plan: plan, extra_seats: String(seats) };
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      mode: "subscription",
      line_items,
      allow_promotion_codes: true,
      metadata: meta,
      subscription_data: { metadata: meta },
      success_url: `${origin}/staff-plans?status=success`,
      cancel_url: `${origin}/staff-plans?status=cancel`,
    });
    console.log("[create-staff-checkout] session", { user: user.id, plan, seats, session: session.id });
    return json({ url: session.url });
  } catch (e) {
    console.error("[create-staff-checkout] error", e instanceof Error ? e.message : e);
    return json({ error: "Checkout could not start. Please try again." }, 500);
  }
});
