// Read-only check used while a buyer waits for their purchase to be confirmed.
// It NEVER grants access — the Stripe webhook is the only writer of
// entitlements. It tells the app whether Stripe really took the payment, so a
// paid user is never shown a paywall, and it logs any paid-but-not-entitled
// case for support.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: u } = await admin.auth.getUser(token);
    const user = u.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.session_id === "string" ? body.session_id : "";
    const reportMissing = body?.report_missing === true;
    if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) return json({ error: "invalid session_id" }, 400);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // Only the buyer may ask about their own session.
    if (session.client_reference_id !== user.id && session.metadata?.user_id !== user.id) {
      return json({ error: "not your session" }, 403);
    }
    const paid = session.status === "complete" && (session.payment_status === "paid" || session.payment_status === "no_payment_required");

    const { data: sub } = await admin
      .from("subscriptions")
      .select("status, subscribed_modules, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (reportMissing && paid) {
      console.error("[VERIFY-CHECKOUT] PAID BUT NOT ENTITLED", { userId: user.id, sessionId, sub });
      await admin.from("audit_log").insert({
        user_id: user.id,
        action: "purchase_paid_entitlement_missing",
        table_name: "subscriptions",
        metadata: { session_id: sessionId, subscription: session.subscription, modules: sub?.subscribed_modules ?? [] },
      });
    }

    return json({
      paid,
      status: session.status,
      payment_status: session.payment_status,
      modules: sub?.status === "active" ? sub?.subscribed_modules ?? [] : [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[VERIFY-CHECKOUT] error", msg);
    return json({ error: msg }, 500);
  }
});
