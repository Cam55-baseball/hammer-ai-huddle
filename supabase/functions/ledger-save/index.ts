// Owner-approved Nov 8 (Release 0): the ONE client save path for measurements into the ledger.
// Every number is checked by _shared/ledger/saveRules.ts, saved through public.ledger_save (retried),
// and any final failure is logged for the owner's System checks card (never pushed, never silent).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { judgeMeasurement, withRetries, type DictRow, type IncomingMeasurement } from "../_shared/ledger/saveRules.ts";
import { verifyAssertion, assertionClientData, AttestError, ASSERTION_MAX_AGE_MS } from "../_shared/appAttest/verify.ts";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const Measurement = z.object({
  metric_key: z.string().min(1).max(80),
  value: z.number().finite(),
  unit: z.string().max(30).nullish(),
  captured_at: z.string().datetime().nullish(),
  source_kind: z.enum(["cv_measured", "manual", "healthkit", "derived"]),
  capture_fps: z.number().positive().max(2000).nullish(),
  device_model: z.string().max(80).nullish(),
  capture_conditions: z.object({
    lighting: z.string().max(40).optional(), distance_m: z.number().min(0).max(200).optional(),
    camera_height_m: z.number().min(0).max(20).optional(), view_angle: z.string().max(40).optional(), tilt_deg: z.number().min(-90).max(90).optional(),
  }).strict().nullish(),
  session_id: z.string().uuid().nullish(),
  rep_index: z.number().int().min(0).max(10000).nullish(),
  confidence: z.number().min(0).max(1).nullish(),
  source_row_id: z.string().max(120).nullish(),
  side: z.enum(["left", "right"]).nullish(),
});
const Body = z.object({
  platform: z.enum(["ios", "web"]),
  app_build: z.string().max(40).nullish(),
  measurements: z.array(Measurement).min(1).max(50),
  attest: z.object({ key_id: z.string().min(16).max(200), assertion: z.string().min(20).max(5000), timestamp_ms: z.number().int() }).nullish(),
});

function appId(): string | null {
  const team = Deno.env.get("APPLE_TEAM_ID") ?? Deno.env.get("APNS_TEAM_ID");
  const bundle = Deno.env.get("APPLE_BUNDLE_ID");
  return team && bundle ? `${team}.${bundle}` : null;
}

async function logFailure(userId: string, m: IncomingMeasurement | null, reason: string, error: string, attempts: number) {
  await db.from("ledger_write_failures").insert({ user_id: userId, source: "ledger-save", metric_key: m?.metric_key ?? null, value: m?.value ?? null, reason, error: error.slice(0, 500), attempts, payload: m });
  await db.from("plan_check_failures").insert({ user_id: userId, check_key: "measurement_save", error: `${reason}: ${m?.metric_key ?? "?"} — ${error}`.slice(0, 500) });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await db.auth.getUser(token);
  if (!u?.user) return json({ error: "Not signed in" }, 401);
  const userId = u.user.id;
  const raw = await req.text();
  let bodyJson: unknown;
  try { bodyJson = JSON.parse(raw); } catch { return json({ error: "Bad request" }, 400); }
  const parsed = Body.safeParse(bodyJson);
  if (!parsed.success) return json({ error: "Bad request", details: parsed.error.flatten().fieldErrors }, 400);
  const body = parsed.data;

  try {
    const [{ data: consent }, { data: defs }] = await Promise.all([
      db.rpc("movement_consent_state", { _user: userId }),
      db.from("measurement_definitions").select("metric_key, unit, physical_min, physical_max, required_fps, in_app_only, privacy_class")
        .eq("is_canonical", true).in("metric_key", [...new Set(body.measurements.map((m) => m.metric_key))]),
    ]);
    const [{ data: consentOn }, { data: attestOn }] = await Promise.all([
      db.rpc("switch_on_for", { _key: "movement_consent_v1", _user: userId }),
      db.rpc("switch_on_for", { _key: "app_attest_v1", _user: userId }),
    ]);

    // App Attest: the assertion signs SHA-256(measurements JSON) + timestamp.
    let attested = false;
    if (body.attest && body.platform === "ios") {
      const fresh = Math.abs(Date.now() - body.attest.timestamp_ms) <= ASSERTION_MAX_AGE_MS;
      const { data: key } = await db.from("app_attest_keys").select("id, public_key_spki, sign_count")
        .eq("key_id", body.attest.key_id).eq("user_id", userId).is("revoked_at", null).maybeSingle();
      const id = appId();
      if (fresh && key && id) {
        try {
          const clientData = await assertionClientData(JSON.stringify(body.measurements), body.attest.timestamp_ms);
          const r = await verifyAssertion({ assertionB64: body.attest.assertion, clientData, publicKeySpkiB64: key.public_key_spki, previousCount: Number(key.sign_count), appId: id });
          await db.from("app_attest_keys").update({ sign_count: r.signCount, last_used_at: new Date().toISOString() }).eq("id", key.id);
          attested = true;
        } catch (e) { if (!(e instanceof AttestError)) throw e; }
      }
    }

    const byKey = new Map(((defs ?? []) as DictRow[]).map((d) => [d.metric_key, d]));
    const ctx = { platform: body.platform, movementConsentOn: consentOn === true, movementConsentActive: consent === "active", attestOn: attestOn === true, attested };
    const verdicts = body.measurements.map((m) => judgeMeasurement(byKey.get(m.metric_key), m, ctx));
    const firstNo = verdicts.find((v) => !v.ok);
    if (firstNo && !firstNo.ok) return json({ error: firstNo.reason, results: verdicts }, firstNo.status);

    const results: Array<{ metric_key: string; id: string | null; saved: boolean }> = [];
    for (const m of body.measurements) {
      const payload = {
        user_id: userId, source: m.source_kind === "cv_measured" ? "app_capture" : "manual_entry", metric_key: m.metric_key, value: m.value, unit: m.unit ?? byKey.get(m.metric_key)!.unit,
        recorded_at: m.captured_at ?? new Date().toISOString(), source_kind: m.source_kind, capture_fps: m.capture_fps ?? null,
        device_model: m.device_model ?? null, capture_conditions: m.capture_conditions ?? null, session_id: m.session_id ?? null,
        rep_index: m.rep_index ?? null, confidence: m.confidence ?? null, platform: body.platform, app_build: body.app_build ?? null, attested,
        source_row_id: m.source_row_id ?? crypto.randomUUID(), engine_version: `ledger-save:${body.app_build ?? "web"}`,
        capture_context: m.side ? { side: m.side } : {},
      };
      const r = await withRetries(async () => {
        const { data, error } = await db.rpc("ledger_save", { _p: payload });
        if (error) throw new Error(error.message);
        return data as string | null;
      });
      if (!r.ok) { await logFailure(userId, m, "save_failed", r.error, r.attempts); results.push({ metric_key: m.metric_key, id: null, saved: false }); continue; }
      results.push({ metric_key: m.metric_key, id: r.value, saved: true });
    }
    const failed = results.filter((r) => !r.saved).length;
    return json({ ok: failed === 0, attested, results }, failed ? 500 : 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ledger-save]", msg);
    await logFailure(userId, null, "save_failed", msg, 1).catch(() => undefined);
    return json({ error: "Save failed" }, 500);
  }
});
