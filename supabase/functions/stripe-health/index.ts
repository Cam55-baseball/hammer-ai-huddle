// Read-only payment/integration health check + end-to-end webhook self-test.
// Token-protected exactly like stripe-reconcile. Never returns or logs secrets,
// emails or names.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildEmailIndex, syncCustomer } from "../_shared/stripeSubscriptionSync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-reconcile-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const TOKEN_SHA256 = "20fe34c7efe0068875f99f01d769e0728de937df329748c7c632251027681537";
const WEBHOOK_URL = "https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/stripe-webhook";
const REQUIRED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
];
// Mirrors create-checkout TIER_PRICES / MODULE_PRICES.
const TIER_PRICES: Record<string, Record<string, string>> = {
  pitcher: { baseball: "price_1SKpoEGc5QIzbAH6FlPRhazY", softball: "price_1SPBwcGc5QIzbAH6XUKF9dNy" },
  "5tool": { baseball: "price_1T3jzKGc5QIzbAH6deZ4Eyit", softball: "price_1T3jxwGc5QIzbAH65j6KlJzQ" },
  golden2way: { baseball: "price_1T3jzxGc5QIzbAH6XoqPgC1b", softball: "price_1T3jycGc5QIzbAH62T36Iigg" },
};
const MODULE_PRICES: Record<string, Record<string, string>> = {
  hitting: { baseball: "price_1SLm0qGc5QIzbAH60wry3lSb", softball: "price_1SPBvTGc5QIzbAH6hkuqTPOp" },
  pitching: { baseball: "price_1SKpoEGc5QIzbAH6FlPRhazY", softball: "price_1SPBwcGc5QIzbAH6XUKF9dNy" },
  throwing: { baseball: "price_1SLm1cGc5QIzbAH69slwwgsU", softball: "price_1SPBxRGc5QIzbAH6IJfEzqqr" },
};
// Displayed in src/constants/tiers.ts (USD / month).
const DISPLAYED_USD: Record<string, number> = { pitcher: 200, "5tool": 300, golden2way: 400 };
// Same mapping _shared/googleAi.ts applies to "google/gemini-2.5-flash".
const GEMINI_MODEL = "gemini-3.6-flash";

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
async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Redact any API key / secret pattern before an error string is returned or logged
// (Stripe's own error text echoes a masked key).
const sanitize = (s: string) =>
  s
    .replace(/(sk|rk|pk)_(live|test)_[A-Za-z0-9*]+/g, "[redacted]")
    .replace(/whsec_[A-Za-z0-9]+/g, "[redacted]")
    .replace(/re_[A-Za-z0-9_]+/g, "[redacted]");
const errMsg = (e: unknown) => sanitize(e instanceof Error ? e.message : String(e)).slice(0, 300);
const bodySnippet = (t: string) => sanitize(t).slice(0, 200);
async function section<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try { return await fn(); } catch (e) { return { error: errMsg(e) }; }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sortJ = (a: string[]) => JSON.stringify([...(a ?? [])].sort());

async function listAllUsers(supabase: any) {
  const all: any[] = [];
  for (let page = 1; page <= 500; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const batch = data?.users ?? [];
    all.push(...batch);
    if (batch.length < 200) break;
  }
  return all;
}

// ----------------------------------------------------------------- health
async function health(stripe: Stripe, stripeKey: string, supabase: any) {
  const out: Record<string, unknown> = {};

  out.stripe = await section(async () => {
    const acct: any = await stripe.accounts.retrieve();
    let banks: any = [];
    try {
      const ext = await stripe.accounts.listExternalAccounts(acct.id, { object: "bank_account", limit: 20 });
      banks = ext.data.map((b: any) => ({ bank_name: b.bank_name ?? null, last4: b.last4 ?? null, status: b.status ?? null }));
    } catch (e) {
      banks = (acct.external_accounts?.data ?? []).map((b: any) => ({ bank_name: b.bank_name ?? null, last4: b.last4 ?? null, status: b.status ?? null }));
      if (banks.length === 0) banks = { error: errMsg(e) };
    }
    return {
      key_mode: stripeKey.startsWith("sk_live_") || stripeKey.startsWith("rk_live_") ? "live"
        : stripeKey.startsWith("sk_test_") || stripeKey.startsWith("rk_test_") ? "test" : "unknown",
      charges_enabled: acct.charges_enabled ?? null,
      payouts_enabled: acct.payouts_enabled ?? null,
      details_submitted: acct.details_submitted ?? null,
      default_currency: acct.default_currency ?? null,
      payout_schedule: acct.settings?.payouts?.schedule ?? null,
      requirements_currently_due_count: acct.requirements?.currently_due?.length ?? 0,
      payout_bank_accounts: banks,
    };
  });

  out.webhook = await section(async () => {
    const endpoints: any[] = [];
    for await (const ep of stripe.webhookEndpoints.list({ limit: 100 })) {
      endpoints.push({ id: ep.id, url: ep.url, status: ep.status, api_version: ep.api_version ?? null, enabled_events: ep.enabled_events });
    }
    const ours = endpoints.filter((e) => e.url === WEBHOOK_URL);
    const enabled = ours.find((e) => e.status === "enabled");
    const ref = enabled ?? ours[0];
    const evs: string[] = ref?.enabled_events ?? [];
    const missing = ref ? (evs.includes("*") ? [] : REQUIRED_EVENTS.filter((x) => !evs.includes(x))) : REQUIRED_EVENTS;
    return { endpoints, points_at_app_webhook: ours.length > 0, enabled: !!enabled, missing_events: missing };
  });

  out.tax = await section(async () => {
    const settings: any = await stripe.tax.settings.retrieve();
    const regs: any[] = [];
    for await (const r of stripe.tax.registrations.list({ status: "active", limit: 100 })) {
      const opt: any = (r as any).country_options?.[(r.country ?? "").toLowerCase()];
      regs.push({ country: r.country, state: opt?.state ?? null });
    }
    return { settings_status: settings.status ?? null, active_registrations: regs };
  });

  out.prices = await section(async () => {
    const cache = new Map<string, any>();
    const get = async (id: string) => {
      if (cache.has(id)) return cache.get(id);
      let v: any;
      try {
        const p: any = await stripe.prices.retrieve(id, { expand: ["product"] });
        v = {
          id, product_name: typeof p.product === "object" ? p.product?.name ?? null : null,
          unit_amount: p.unit_amount, currency: p.currency, interval: p.recurring?.interval ?? null, active: p.active,
        };
      } catch (e) { v = { id, error: errMsg(e) }; }
      cache.set(id, v);
      return v;
    };
    const tier: any[] = [];
    const mismatches: any[] = [];
    for (const [t, bySport] of Object.entries(TIER_PRICES)) {
      for (const [sport, id] of Object.entries(bySport)) {
        const p = await get(id);
        tier.push({ tier: t, sport, ...p });
        const expected = DISPLAYED_USD[t] * 100;
        if (p.error || p.unit_amount !== expected || p.currency !== "usd" || p.interval !== "month" || p.active !== true) {
          mismatches.push({ tier: t, sport, id, app_displays: `${DISPLAYED_USD[t]} usd / month`,
            stripe: p.error ? p.error : `${(p.unit_amount ?? 0) / 100} ${p.currency} / ${p.interval}${p.active ? "" : " (inactive)"}` });
        }
      }
    }
    const legacy: any[] = [];
    for (const [m, bySport] of Object.entries(MODULE_PRICES)) {
      for (const [sport, id] of Object.entries(bySport)) legacy.push({ module: m, sport, ...(await get(id)) });
    }
    return { tier_prices: tier, legacy_module_prices: legacy, tier_mismatches: mismatches };
  });

  out.ai = await section(async () => {
    const gKey = Deno.env.get("GOOGLE_AI_API_KEY");
    const oKey = Deno.env.get("OPENAI_API_KEY");
    const gemini = !gKey ? { configured: false } : await section(async () => {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": gKey },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }], generationConfig: { maxOutputTokens: 1 } }),
      });
      const t = await r.text();
      return { model: GEMINI_MODEL, http_status: r.status, ...(r.status !== 200 ? { error: bodySnippet(t) } : {}) };
    });
    const openai = !oKey ? { configured: false } : await section(async () => {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${oKey}` },
        body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
      });
      const t = await r.text();
      return { model: "gpt-4o-mini", http_status: r.status, ...(r.status !== 200 ? { error: bodySnippet(t) } : {}) };
    });
    return { gemini, openai };
  });

  out.resend = await section(async () => {
    const k = Deno.env.get("RESEND_API_KEY");
    if (!k) return { configured: false };
    const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${k}` } });
    const t = await r.text();
    const body: any = (() => { try { return JSON.parse(t); } catch { return null; } })();
    return {
      http_status: r.status,
      domains: (body?.data ?? []).map((d: any) => ({ name: d.name, status: d.status })),
      ...(r.status !== 200 ? { error: bodySnippet(t) } : {}),
    };
  });

  out.roboflow = await section(async () => {
    const k = Deno.env.get("ROBOFLOW_API_KEY");
    if (!k) return { configured: false };
    const r = await fetch(`https://api.roboflow.com/?api_key=${encodeURIComponent(k)}`);
    const body: any = await r.json().catch(() => null);
    return { http_status: r.status, workspace: typeof body?.workspace === "string" ? body.workspace : null };
  });

  out.accounts = await section(async () => {
    const users = await listAllUsers(supabase);
    const idx = await buildEmailIndex(supabase);
    return { total_auth_users: users.length, email_index_size: idx.size, match: users.length === idx.size };
  });

  return out;
}

// ----------------------------------------------------------------- selftest
async function postSigned(payload: string, secret: string) {
  const t = Math.floor(Date.now() / 1000);
  const v1 = await hmacHex(secret, `${t}.${payload}`);
  return fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": `t=${t},v1=${v1}` }, body: payload });
}
function makeEvent(type: string, obj: unknown) {
  return {
    id: `evt_selftest_${crypto.randomUUID()}`,
    object: "event",
    api_version: "2025-08-27.basil",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type,
    data: { object: obj },
  };
}

async function selftest(stripe: Stripe, supabase: any) {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const result: Record<string, unknown> = {};
  const eventIds: string[] = [];

  // a. Signature check
  result.signature_check = await section(async () => {
    const r = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": "t=1,v1=invalid" },
      body: JSON.stringify(makeEvent("customer.subscription.updated", { id: "sub_invalid" })),
    });
    await r.text();
    return { http_status: r.status, pass: r.status === 400 };
  });

  if (!secret) {
    result.unlock_test = { skipped: "STRIPE_WEBHOOK_SECRET not set" };
    result.cancel_test = { skipped: "STRIPE_WEBHOOK_SECRET not set" };
    return result;
  }

  // Load all Stripe subscriptions grouped by customer (once).
  const byCustomer = new Map<string, Stripe.Subscription[]>();
  for await (const s of stripe.subscriptions.list({ status: "all", limit: 100 })) {
    const cid = typeof s.customer === "string" ? s.customer : s.customer.id;
    if (!byCustomer.has(cid)) byCustomer.set(cid, []);
    byCustomer.get(cid)!.push(s);
  }

  // b. Unlock test
  result.unlock_test = await section(async () => {
    const { data: staff } = await supabase.from("user_roles").select("user_id").in("role", ["owner", "admin"]).eq("status", "active");
    const staffIds = [...new Set<string>((staff ?? []).map((s: any) => s.user_id))];
    if (staffIds.length === 0) return { skipped: "no active owner/admin accounts" };
    const { data: rows } = await supabase.from("subscriptions").select("user_id, stripe_customer_id").in("user_id", staffIds);
    const users = await listAllUsers(supabase);
    const sorted = [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const rank = new Map<string, number>(sorted.map((u, i) => [u.id, i]));
    const candidates = (rows ?? [])
      .filter((r: any) => r.stripe_customer_id && (byCustomer.get(r.stripe_customer_id) ?? []).some((s) => s.status === "active"))
      .sort((a: any, b: any) => (rank.get(b.user_id) ?? 0) - (rank.get(a.user_id) ?? 0)); // oldest first
    if (candidates.length === 0) return { skipped: "no owner/admin account with an active Stripe subscription" };
    const pick = candidates.find((c: any) => (rank.get(c.user_id) ?? 0) >= 50) ?? candidates[0];
    const userId: string = pick.user_id;
    const customerId: string = pick.stripe_customer_id;
    const newer = rank.get(userId) ?? null;

    const { data: snapshot, error: snapErr } = await supabase.from("subscriptions").select("*").eq("user_id", userId).single();
    if (snapErr || !snapshot) throw new Error(`snapshot failed: ${snapErr?.message ?? "no row"}`);

    const started = Date.now();
    let status = 0, pass = false, expected: string[] = [], got: string[] = [];
    try {
      const liveSubs = (byCustomer.get(customerId) ?? []).filter((s) => s.status !== "canceled");
      const exp = await syncCustomer({
        supabase, stripe, customerId, userId, computeOnly: true, subscriptions: liveSubs,
        currentRow: { subscribed_modules: [], module_subscription_mapping: snapshot.module_subscription_mapping },
      });
      expected = exp.subscribed_modules;

      const { error: clrErr } = await supabase.from("subscriptions").update({ subscribed_modules: [], status: "inactive" }).eq("user_id", userId);
      if (clrErr) throw new Error(`clear failed: ${clrErr.message}`);

      const activeSub = (byCustomer.get(customerId) ?? []).find((s) => s.status === "active")!;
      const real = await stripe.subscriptions.retrieve(activeSub.id);
      const ev = makeEvent("customer.subscription.updated", real);
      eventIds.push(ev.id);
      const r = await postSigned(JSON.stringify(ev), secret);
      status = r.status;
      await r.text();

      while (Date.now() - started < 15000) {
        const { data } = await supabase.from("subscriptions").select("subscribed_modules").eq("user_id", userId).single();
        got = data?.subscribed_modules ?? [];
        if (expected.length > 0 && sortJ(got) === sortJ(expected)) { pass = true; break; }
        await sleep(1000);
      }
    } finally {
      const { error: restoreErr } = await supabase.from("subscriptions").update(snapshot).eq("user_id", userId);
      if (restoreErr) console.error(`[STRIPE-HEALTH] unlock snapshot restore failed - ${restoreErr.message}`);
    }
    return {
      http_status: status, pass, accounts_newer_than_test_account: newer,
      seconds: Math.round((Date.now() - started) / 100) / 10,
      expected_module_count: expected.length, restored: true,
    };
  });

  // c. Cancel test
  result.cancel_test = await section(async () => {
    const allCanceled = [...byCustomer.entries()].filter(([, subs]) => subs.length > 0 && subs.every((s) => s.status === "canceled"));
    if (allCanceled.length === 0) return { skipped: "no customer with only canceled subscriptions" };
    const { data: rows } = await supabase.from("subscriptions").select("*").in("stripe_customer_id", allCanceled.map(([c]) => c));
    // Prefer a row without hand-granted modules so the pass criterion is meaningful.
    const isManual = (r: any) => (r.subscribed_modules ?? []).some((m: string) => {
      const e = r.module_subscription_mapping?.[m];
      return !e || typeof e.subscription_id !== "string" || !e.subscription_id.startsWith("sub_");
    });
    const row = (rows ?? []).find((r: any) => !isManual(r)) ?? (rows ?? [])[0];
    if (!row) return { skipped: "no canceled-only customer is linked to a subscriptions row" };
    const sub = byCustomer.get(row.stripe_customer_id)![0];

    const started = Date.now();
    let status = 0, pass = false;
    try {
      const real = await stripe.subscriptions.retrieve(sub.id);
      const ev = makeEvent("customer.subscription.deleted", real);
      eventIds.push(ev.id);
      const r = await postSigned(JSON.stringify(ev), secret);
      status = r.status;
      await r.text();
      if (status === 200) {
        while (Date.now() - started < 15000) {
          const { data } = await supabase.from("subscriptions").select("status, subscribed_modules").eq("user_id", row.user_id).single();
          if (data?.status === "inactive" && (data?.subscribed_modules ?? []).length === 0) { pass = true; break; }
          await sleep(1000);
        }
      }
    } finally {
      // Leave the account exactly as found; the self-test must not change anyone's access.
      const { error: restoreErr } = await supabase.from("subscriptions").update(row).eq("user_id", row.user_id);
      if (restoreErr) console.error(`[STRIPE-HEALTH] cancel snapshot restore failed - ${restoreErr.message}`);
    }
    return { http_status: status, pass, seconds: Math.round((Date.now() - started) / 100) / 10, row_had_manual_modules: isManual(row), restored: true };
  });

  // d. Clean up self-test idempotency rows.
  result.cleanup = await section(async () => {
    const { error, count } = await supabase.from("processed_webhook_events").delete({ count: "exact" }).like("stripe_event_id", "evt_selftest_%");
    if (error) throw new Error(error.message);
    return { deleted: count ?? 0 };
  });

  return result;
}

// ----------------------------------------------------------------- email_test
// Sends exactly one email to Resend's test inbox, using the same "from" address
// as send-recap-email / notify-guardian-minor-signup.
const EMAIL_FROM = "Hammers Modality <onboarding@resend.dev>";
async function emailTest() {
  const k = Deno.env.get("RESEND_API_KEY");
  if (!k) return { configured: false };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${k}` },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: ["delivered@resend.dev"],
      subject: "Hammers Modality email health check",
      text: "Automated email health check from stripe-health. No action needed.",
    }),
  });
  const t = await r.text();
  return { from: EMAIL_FROM, http_status: r.status, ...(r.status !== 200 ? { error: bodySnippet(t) } : {}) };
}

// ------------------------------------------------------- fix_webhook_events
// Adds any missing required events to OUR webhook endpoint only.
async function fixWebhookEvents(stripe: Stripe) {
  let ours: Stripe.WebhookEndpoint | null = null;
  for await (const ep of stripe.webhookEndpoints.list({ limit: 100 })) {
    if (ep.url === WEBHOOK_URL && ep.status === "enabled") { ours = ep; break; }
    if (ep.url === WEBHOOK_URL && !ours) ours = ep;
  }
  if (!ours) return { error: "no webhook endpoint points at the app webhook url" };
  const before = ours.enabled_events ?? [];
  if (before.includes("*")) return { endpoint_id: ours.id, events_before: before, events_after: before, changed: false };
  const missing = REQUIRED_EVENTS.filter((e) => !before.includes(e));
  if (missing.length === 0) return { endpoint_id: ours.id, events_before: before, events_after: before, changed: false };
  const after = [...before, ...missing];
  await stripe.webhookEndpoints.update(ours.id, { enabled_events: after as Stripe.WebhookEndpointUpdateParams.EnabledEvent[] });
  return { endpoint_id: ours.id, events_before: before, events_after: after, changed: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const token = req.headers.get("x-reconcile-token");
  if (!token || !safeEqual(await sha256Hex(token), TOKEN_SHA256)) return json({ error: "unauthorized" }, 401);

  let action: "health" | "selftest" | "email_test" | "fix_webhook_events" = "health";
  try {
    const body = await req.json();
    if (body?.action === "selftest" || body?.action === "email_test" || body?.action === "fix_webhook_events") action = body.action;
  } catch { /* default health */ }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });
    const data = action === "selftest" ? await selftest(stripe, supabase)
      : action === "email_test" ? await emailTest()
      : action === "fix_webhook_events" ? await fixWebhookEvents(stripe)
      : await health(stripe, stripeKey, supabase);
    return json({ action, ...data });
  } catch (e) {
    console.error(`[STRIPE-HEALTH] ERROR - ${errMsg(e)}`);
    return json({ error: errMsg(e) }, 500);
  }
});
