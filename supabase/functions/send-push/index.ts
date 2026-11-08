// Owner-approved Nov 8 (Release A, native_push_v1): sends the phone push that goes with an
// in-app notification. Called by the database right after the notification is saved
// ({ outbox_id }), or by the owner for a test push to their own phone ({ test: true }).
// The caller can never choose who receives a push or what it says: both come from the
// saved notification row.
import { SignJWT, importPKCS8 } from "npm:jose@5.9.6";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { makeProviderTokenCache, normalizePem, sendToToken, type PushMessage, type PushToken, type SendOutcome } from "../_shared/push/apns.ts";
import { PUSH_SOURCE_TABLES, deliveriesFor, pushAllowedByPrefs, type FanoutLookup, type PushSourceTable } from "../_shared/push/fanout.ts";
import { isSwitchOnFor } from "../_shared/wic/flags/featureSwitches.ts";

const FLAG = "native_push_v1";
const Body = z.union([
  z.object({ outbox_id: z.string().uuid() }),
  z.object({ test: z.literal(true) }),
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const db: SupabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const providerToken = makeProviderTokenCache(async () => {
  const keyId = Deno.env.get("APNS_KEY_ID"), teamId = Deno.env.get("APNS_TEAM_ID"), pem = Deno.env.get("APNS_PRIVATE_KEY");
  if (!keyId || !teamId || !pem) throw new Error("apns_not_configured");
  const key = await importPKCS8(normalizePem(pem), "ES256");
  return await new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: keyId }).setIssuer(teamId).setIssuedAt().sign(key);
});

const lookup: FanoutLookup = {
  async roles(userId) {
    const { data } = await db.from("user_roles").select("role").eq("user_id", userId);
    return (data ?? []).map((r: any) => String(r.role));
  },
  async name(userId) {
    const { data } = await db.from("profiles").select("full_name, first_name").eq("id", userId).maybeSingle();
    return (data as any)?.full_name || (data as any)?.first_name || null;
  },
  async authorizingParents(athleteId) {
    const { data } = await db.from("parent_athlete_links").select("parent_user_id").eq("athlete_user_id", athleteId).eq("status", "active");
    const out: string[] = [];
    for (const p of data ?? []) {
      const { data: ok } = await db.rpc("is_authorizing_parent", { _parent: (p as any).parent_user_id, _athlete: athleteId } as any);
      if (ok === true) out.push((p as any).parent_user_id);
    }
    return out;
  },
  async firstInSeries(seriesId) {
    const { data } = await db.from("coach_prescriptions").select("id").eq("series_id", seriesId)
      .order("plan_date", { ascending: true }).order("id", { ascending: true }).limit(1).maybeSingle();
    return (data as any)?.id ?? null;
  },
};

async function sendToUser(userId: string, msg: PushMessage): Promise<SendOutcome[]> {
  const { data: tokens } = await db.from("push_device_tokens").select("id, token, apns_env").eq("user_id", userId).is("disabled_at", null);
  if (!tokens?.length) return [];
  const topic = Deno.env.get("APPLE_BUNDLE_ID");
  if (!topic) throw new Error("apns_not_configured");
  const jwt = await providerToken();
  const results: SendOutcome[] = [];
  for (const t of tokens as PushToken[]) {
    const r = await sendToToken((url, init) => fetch(url, init), jwt, topic, t, msg);
    results.push(r);
    const now = new Date().toISOString();
    if (r.status === "sent") await db.from("push_device_tokens").update({ apns_env: r.env, last_error: null, last_seen_at: t.apns_env === r.env ? undefined : now }).eq("id", t.id);
    else if (r.status === "disabled") await db.from("push_device_tokens").update({ disabled_at: now, disabled_reason: r.reason }).eq("id", t.id);
    else await db.from("push_device_tokens").update({ last_error: r.error.slice(0, 300) }).eq("id", t.id);
  }
  return results;
}

const tally = (all: SendOutcome[]) => ({
  sent: all.filter((r) => r.status === "sent").length,
  disabled: all.filter((r) => r.status === "disabled").length,
  failed: all.filter((r) => r.status === "failed").length,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Bad request" }, 400);

  try {
    // Owner-only test push to the owner's own phones.
    if ("test" in parsed.data) {
      const auth = req.headers.get("Authorization") ?? "";
      const { data: u } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
      if (!u?.user) return json({ error: "Not signed in" }, 401);
      const { data: own } = await db.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "owner");
      if (!own?.length) return json({ error: "Owner only" }, 403);
      const results = await sendToUser(u.user.id, { title: "Hammers test", body: "Push notifications work on this phone.", link: "/dashboard" });
      return json({ ok: true, tokens: results.length, ...tally(results), errors: results.filter((r) => r.status === "failed").map((r: any) => r.error) });
    }

    // Claim the outbox row once; stale or already-handled rows are ignored.
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { data: claimed } = await db.from("push_outbox").update({ status: "sending", attempts: 1 })
      .eq("id", parsed.data.outbox_id).eq("status", "pending").gte("created_at", since).select("*").maybeSingle();
    if (!claimed) return json({ ok: true, skipped: "not_pending" });
    const finish = (status: string, result: unknown, last_error: string | null = null) =>
      db.from("push_outbox").update({ status, result, last_error, processed_at: new Date().toISOString() }).eq("id", claimed.id);

    const table = claimed.source_table as PushSourceTable;
    if (!(PUSH_SOURCE_TABLES as readonly string[]).includes(table)) { await finish("skipped", { reason: "unknown_source" }); return json({ ok: true, skipped: "unknown_source" }); }
    const { data: row } = await db.from(table).select("*").eq("id", claimed.source_id).maybeSingle();
    if (!row) { await finish("skipped", { reason: "source_missing" }); return json({ ok: true, skipped: "source_missing" }); }

    const { data: sw } = await db.from("wk_feature_switches").select("feature_key, mode, allowlist, updated_by").eq("feature_key", FLAG).maybeSingle();
    const deliveries = await deliveriesFor(table, row, lookup);
    const all: SendOutcome[] = [];
    let skippedRecipients = 0;
    for (const d of deliveries) {
      if (!isSwitchOnFor(sw as any, d.userId)) { skippedRecipients++; continue; }
      const { data: pref } = await db.from("notification_preferences").select("push").eq("user_id", d.userId).maybeSingle();
      if (!pushAllowedByPrefs(pref as any)) { skippedRecipients++; continue; }
      all.push(...await sendToUser(d.userId, d));
    }
    const t = tally(all);
    await finish(t.sent > 0 ? "sent" : t.failed > 0 ? "failed" : "skipped", { recipients: deliveries.length, skippedRecipients, ...t });
    return json({ ok: true, recipients: deliveries.length, ...t });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[send-push]", msg);
    if ("outbox_id" in parsed.data) await db.from("push_outbox").update({ status: "failed", last_error: msg.slice(0, 300), processed_at: new Date().toISOString() }).eq("id", parsed.data.outbox_id);
    return json({ error: msg === "apns_not_configured" ? "Push isn't set up yet" : "Push failed" }, 500);
  }
});
