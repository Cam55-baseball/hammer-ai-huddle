// Repair tool: make public.subscriptions match Stripe. Dry-run by default.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildEmailIndex, resolveUserId, syncCustomer, type SyncRow } from "../_shared/stripeSubscriptionSync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-reconcile-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKEN_SHA256 = "20fe34c7efe0068875f99f01d769e0728de937df329748c7c632251027681537";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256Hex(v: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

type Slim = { status: string | null; subscribed_modules: string[]; tier: string | null };
const slim = (r: any): Slim => ({
  status: r?.status ?? null,
  subscribed_modules: [...(r?.subscribed_modules ?? [])].sort(),
  tier: r?.tier ?? null,
});
function differs(cur: any, next: SyncRow) {
  if (!cur) return true;
  const a = slim(cur), b = slim(next);
  return a.status !== b.status || a.tier !== b.tier ||
    JSON.stringify(a.subscribed_modules) !== JSON.stringify(b.subscribed_modules) ||
    (cur.stripe_customer_id ?? null) !== next.stripe_customer_id ||
    !!cur.has_pending_cancellations !== next.has_pending_cancellations;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = req.headers.get("x-reconcile-token");
  if (!token || !safeEqual(await sha256Hex(token), TOKEN_SHA256)) return json({ error: "unauthorized" }, 401);

  let dryRun = true;
  try {
    const body = await req.json();
    if (body && typeof body.dry_run === "boolean") dryRun = body.dry_run;
  } catch { /* empty body → dry run */ }

  const startedAt = Date.now();
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });

    // 1. All Stripe subscriptions grouped by customer.
    const byCustomer = new Map<string, Stripe.Subscription[]>();
    let subscriptionsChecked = 0;
    for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
      subscriptionsChecked++;
      const cid = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      if (!byCustomer.has(cid)) byCustomer.set(cid, []);
      byCustomer.get(cid)!.push(sub);
    }

    // 2. Current rows + customers present only in the database.
    const { data: rows, error: rowsErr } = await supabase
      .from("subscriptions")
      .select("user_id, status, subscribed_modules, tier, stripe_customer_id, has_pending_cancellations, module_subscription_mapping");
    if (rowsErr) throw new Error(`subscriptions read failed: ${rowsErr.message}`);
    const rowByUser = new Map<string, any>((rows ?? []).map((r: any) => [r.user_id, r]));
    for (const r of rows ?? []) {
      if (r.stripe_customer_id && !byCustomer.has(r.stripe_customer_id)) byCustomer.set(r.stripe_customer_id, []);
    }

    // 3. Protected staff accounts.
    const { data: staff } = await supabase
      .from("user_roles").select("user_id, role, status").in("role", ["owner", "admin"]).eq("status", "active");
    const protectedIds = new Set<string>((staff ?? []).map((s: any) => s.user_id));

    const emailIndex = await buildEmailIndex(supabase);
    const productCache = new Map<string, Stripe.Product>();

    const counts = { customers_checked: 0, subscriptions_checked: subscriptionsChecked, unchanged: 0, would_grant_or_change: 0, would_revoke: 0, unmatched: 0, skipped_staff: 0 };
    const changes: any[] = [];
    const unmatched: any[] = [];
    const errors: any[] = [];

    const entries = [...byCustomer.entries()];
    const worker = async (customerId: string, subs: Stripe.Subscription[]) => {
      counts.customers_checked++;
      const newest = [...subs].sort((a, b) => b.created - a.created)[0] ?? null;
      const resolved = await resolveUserId({ supabase, stripe, customerId, subscription: newest, emailIndex });
      if (!resolved.userId) {
        counts.unmatched++;
        unmatched.push({ stripe_customer_id: customerId, active_subscription_count: subs.filter((s) => s.status === "active").length });
        return;
      }
      if (protectedIds.has(resolved.userId)) { counts.skipped_staff++; return; }

      // Same set the webhook uses: Stripe's default list (everything except canceled).
      const cur = rowByUser.get(resolved.userId);
      const liveSubs = subs.filter((s) => s.status !== "canceled");
      const next = await syncCustomer({ supabase, stripe, customerId, userId: resolved.userId, computeOnly: true, subscriptions: liveSubs, productCache, currentRow: cur ?? null });
      if (!differs(cur, next)) { counts.unchanged++; return; }

      const before = slim(cur);
      const after = slim(next);
      const lost = before.subscribed_modules.some((m) => !after.subscribed_modules.includes(m));
      if (lost || (before.status === "active" && after.status !== "active")) counts.would_revoke++;
      else counts.would_grant_or_change++;

      changes.push({
        user_id: resolved.userId,
        stripe_customer_id: customerId,
        resolved_via: resolved.via,
        before, after,
        stripe_subscriptions: subs.map((s) => ({
          id: s.id,
          status: s.status,
          canceled_at: s.canceled_at ? new Date(s.canceled_at * 1000).toISOString() : null,
          current_period_end: s.items?.data?.[0]?.current_period_end
            ? new Date(s.items.data[0].current_period_end * 1000).toISOString() : null,
        })),
      });

      if (!dryRun) {
        await syncCustomer({ supabase, stripe, customerId, userId: resolved.userId, subscriptions: liveSubs, productCache, currentRow: cur ?? null });
      }
    };

    const CONCURRENCY = 6;
    let i = 0;
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
      while (i < entries.length) {
        const [cid, subs] = entries[i++];
        try { await worker(cid, subs); }
        catch (e) { errors.push({ stripe_customer_id: cid, error: e instanceof Error ? e.message : String(e) }); }
      }
    }));

    try {
      await supabase.from("engine_function_logs").insert({
        function_name: "stripe-reconcile",
        status: errors.length > 0 ? "error" : "ok",
        duration_ms: Date.now() - startedAt,
        metadata: { dry_run: dryRun, counts, errors_count: errors.length },
      });
    } catch (e) {
      console.error(`[RECONCILE] log insert failed - ${e instanceof Error ? e.message : String(e)}`);
    }
    console.log(`[RECONCILE] done - ${JSON.stringify({ dryRun, ...counts, errors: errors.length })}`);
    return json({ dry_run: dryRun, counts, changes, unmatched, errors });
  } catch (e) {
    console.error(`[RECONCILE] ERROR - ${e instanceof Error ? e.message : String(e)}`);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
