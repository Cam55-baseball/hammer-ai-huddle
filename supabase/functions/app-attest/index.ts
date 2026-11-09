// Owner-approved Nov 8 (Release 0, app_attest_v1): registers an iPhone's App Attest key.
//   { action: "challenge" }                                   → one-time challenge (5 minutes)
//   { action: "attest", key_id, attestation, challenge, app_build } → verifies with Apple's root and stores the key
// Assertions (per-request proof) are checked inside ledger-save with the stored key.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { verifyAttestation, AttestError } from "../_shared/appAttest/verify.ts";
import { APPLE_APP_ATTEST_ROOT_PEM } from "../_shared/appAttest/appleRoot.ts";
import { bytesToB64 } from "../_shared/appAttest/der.ts";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("challenge") }),
  z.object({
    action: z.literal("attest"),
    key_id: z.string().min(16).max(200),
    attestation: z.string().min(100).max(20000),
    challenge: z.string().min(16).max(200),
    app_build: z.string().max(40).optional(),
  }),
]);

export function appIdFromEnv(get: (k: string) => string | undefined): string | null {
  const team = get("APPLE_TEAM_ID") ?? get("APNS_TEAM_ID");
  const bundle = get("APPLE_BUNDLE_ID");
  return team && bundle ? `${team}.${bundle}` : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await db.auth.getUser(token);
  if (!u?.user) return json({ error: "Not signed in" }, 401);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Bad request", details: parsed.error.flatten().fieldErrors }, 400);
  const { data: on } = await db.rpc("switch_on_for", { _key: "app_attest_v1", _user: u.user.id });
  if (on !== true) return json({ error: "App Attest is not on for this account" }, 403);

  try {
    if (parsed.data.action === "challenge") {
      const challenge = bytesToB64(crypto.getRandomValues(new Uint8Array(32)));
      const { error } = await db.from("app_attest_challenges").insert({ user_id: u.user.id, challenge });
      if (error) throw new Error(error.message);
      return json({ challenge });
    }
    const p = parsed.data;
    const now = new Date().toISOString();
    const { data: ch } = await db.from("app_attest_challenges").update({ used_at: now })
      .eq("challenge", p.challenge).eq("user_id", u.user.id).is("used_at", null).gt("expires_at", now).select("id").maybeSingle();
    if (!ch) return json({ error: "Challenge expired or already used" }, 400);
    const appId = appIdFromEnv((k) => Deno.env.get(k));
    if (!appId) return json({ error: "App Attest isn't set up yet" }, 500);
    const r = await verifyAttestation({ attestationB64: p.attestation, keyIdB64: p.key_id, challenge: p.challenge, appId, rootPem: APPLE_APP_ATTEST_ROOT_PEM });
    const { error } = await db.from("app_attest_keys").upsert({
      user_id: u.user.id, key_id: p.key_id, public_key_spki: r.publicKeySpkiB64, sign_count: 0, environment: r.environment,
      app_build: p.app_build ?? null, receipt: r.receiptB64, revoked_at: null,
    }, { onConflict: "key_id" });
    if (error) throw new Error(error.message);
    return json({ ok: true, environment: r.environment });
  } catch (e) {
    if (e instanceof AttestError) return json({ error: "Attestation rejected", code: e.code }, 400);
    console.error("[app-attest]", e instanceof Error ? e.message : e);
    return json({ error: "Attestation failed" }, 500);
  }
});
