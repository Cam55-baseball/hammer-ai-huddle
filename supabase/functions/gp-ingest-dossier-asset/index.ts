/**
 * gp-ingest-dossier-asset — extract pitcher/hitter intel from a notes blob,
 * a screenshot (Trackman/Synergy), a CSV/PDF, or video frames.
 *
 * Input  : { dossierId, role: 'pitcher'|'hitter', sport, bucket?, path?, text? }
 * Output : { tendencies: {...}, archetype: string|null, summary: string }
 *
 * If a file path is supplied it is downloaded and sent to Gemini.
 * If `text` is supplied (notes paste) it is parsed directly.
 *
 * The extraction is MERGED with existing dossier.tendencies — never overwritten —
 * so users keep adding to the profile over time.
 */
// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { startHeartbeat } from "../_shared/withHeartbeat.ts";
import { chatCompletion } from "../_shared/googleAi.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PITCHER_SCHEMA = `Extract pitcher intel. Output STRICT JSON:
{
  "throws": "R"|"L"|null,
  "arm_slot": "over_the_top"|"high_three_quarter"|"three_quarter"|"low_three_quarter"|"sidearm"|"submarine"|null,
  "release_height_in": number|null,
  "extension_ft": number|null,
  "arsenal": [{"pitch": string, "usage": number|null, "velo": number|null, "ivb": number|null, "hb": number|null, "whiff_pct": number|null}],
  "fps_pct": number|null,
  "zone_usage": { "in": number|null, "middle": number|null, "away": number|null, "up": number|null, "down": number|null },
  "tendencies_text": string,
  "confidence_state": "elite"|"high"|"neutral"|"shaky"|"off"|null,
  "summary": string
}
Only include data you can identify. Use null when missing. No prose outside JSON.`;

const HITTER_SCHEMA = `Extract hitter intel. Output STRICT JSON:
{
  "bats": "R"|"L"|"S"|null,
  "chase_pct": number|null,
  "first_pitch_swing_pct": number|null,
  "whiff_pct": number|null,
  "pull_pct": number|null,
  "power_zone": "in"|"middle"|"away"|null,
  "cold_pitch_types": [string],
  "tendencies_text": string,
  "summary": string
}
Only include data you can identify. Use null when missing. No prose outside JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const hb = startHeartbeat("gp-ingest-dossier-asset", { intervalMs: 8_000 });
  try {
    const { dossierId, role, sport, bucket, path, text } = await req.json();
    if (!dossierId || !role) {
      await hb.fail(new Error("missing fields"));
      return json({ error: "missing fields" }, 400);
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!LOVABLE && !GOOGLE) return json({ error: "AI service not configured" }, 500);

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: who } = await userClient.auth.getUser();
    const user = who?.user;
    if (!user) return json({ error: "unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE);

    const dossierTable = role === "pitcher" ? "gp_pitcher_dossiers" : "gp_opponent_hitters";
    const { data: existing, error: eErr } = await admin
      .from(dossierTable).select("*").eq("id", dossierId).eq("user_id", user.id).maybeSingle();
    if (eErr || !existing) return json({ error: "dossier not found" }, 404);

    const messageContent: any[] = [{ type: "text", text: role === "pitcher" ? PITCHER_SCHEMA : HITTER_SCHEMA }];

    if (bucket && path) {
      const dl = await admin.storage.from(bucket).download(path);
      if (dl.error) throw dl.error;
      const blob = dl.data!;
      const mime = (blob as any).type || "application/octet-stream";
      const buf = new Uint8Array(await blob.arrayBuffer());
      let b64 = "";
      const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk) b64 += String.fromCharCode(...buf.subarray(i, i + chunk));
      b64 = btoa(b64);
      if (mime.startsWith("image/")) {
        messageContent.push({ type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } });
      } else {
        messageContent.push({ type: "text", text: `Attachment (${mime}) base64 head:\n${b64.slice(0, 180_000)}` });
      }
    }
    if (text) messageContent.push({ type: "text", text: `Notes:\n${String(text).slice(0, 60_000)}` });

    const ai = await chatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: messageContent }],
      temperature: 0.1,
    }, { timeoutMs: 90_000 });
    if (!ai.ok) throw new Error(`AI provider ${ai.status}: ${(ai.errorBody ?? "").slice(0, 400)}`);
    const raw = String(ai.data.choices?.[0]?.message?.content ?? "");
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(cleaned); } catch { parsed = { summary: cleaned }; }

    // merge
    const prevTend = existing.tendencies ?? {};
    const tendencies = { ...prevTend, ...parsed, last_ingest_at: new Date().toISOString() };
    const archetype = parsed.archetype ?? existing.archetype ?? null;
    const update: any = { tendencies };
    if (role === "pitcher") {
      if (parsed.throws) update.throws = parsed.throws;
      if (parsed.arm_slot) update.arm_slot = parsed.arm_slot;
      if (Array.isArray(parsed.arsenal) && parsed.arsenal.length) update.repertoire = parsed.arsenal;
    } else if (parsed.bats) update.bats = parsed.bats;
    update.archetype = archetype;

    await admin.from(dossierTable).update(update).eq("id", dossierId).eq("user_id", user.id);

    await hb.success({ dossier_id: dossierId, role, has_text: !!text, has_file: !!path });
    return json({ tendencies, archetype, summary: parsed.summary ?? "" });
  } catch (e) {
    console.error("[gp-ingest-dossier-asset]", e);
    await hb.fail(e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}
