/**
 * gp-ingest-document — multimodal AI extraction.
 *
 * Input  : { documentId, gameId, sport, bucket, path }
 * Output : { summary: { atBats, pitches, defense, baserun }, draftIds: { ... } }
 *
 * Pipeline:
 *  1. Download the file from storage as base64.
 *  2. Send to Gemini 2.0 Flash via Lovable AI Gateway with a strict JSON
 *     schema asking it to extract at-bats, pitches, defense, baserun events.
 *  3. Store extraction only in the saved document review buffer.
 *     Unconfirmed extraction never enters the live event ledger.
 *  4. Stamp gp_documents.status='processed', extraction JSON, and counts.
 */
// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { startHeartbeat } from "../_shared/withHeartbeat.ts";
import { chatCompletion } from "../_shared/googleAi.ts";
import { ownsImport } from "./ownership.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCHEMA_PROMPT = `You are a baseball/softball scorebook OCR + parser.
Extract events from the attached document. Output STRICT JSON with this shape:

{
  "at_bats": [{ "inning": number, "pa_no": number|null, "result": string|null,
                "rbi": number|null, "pitches_seen": number|null,
                "exit_velo_mph": number|null, "launch_angle_deg": number|null,
                "spray_angle_deg": number|null, "batter_handedness": "L"|"R"|null,
                "notes": string|null }],
  "pitches": [{ "inning": number, "pitch_no": number|null,
                "pitch_type": string|null, "pitch_velo": number|null,
                "zone": number|null, "result": string|null,
                "perspective": "pitcher"|"hitter" }],
  "defense": [{ "inning": number, "position": string|null, "play_type": string|null,
                "result": string|null, "notes": string|null }],
  "baserun": [{ "inning": number, "event_type": string|null, "from_base": number|null,
                "to_base": number|null, "result": string|null, "notes": string|null }]
}

Rules:
- Only include events you can actually identify. Skip uncertain rows.
- Numbers must be JSON numbers (not strings).
- Inning is 1..9+ integer.
- Do NOT invent counts/locations. Use null when unknown.
- Output ONLY the JSON object. No prose, no markdown fences.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const hb = startHeartbeat("gp-ingest-document", { intervalMs: 8_000 });
  try {
    const { documentId, gameId, sport, bucket, path } = await req.json();
    if (![documentId, gameId, bucket, path].every((value) => typeof value === "string" && value.length > 0)) {
      await hb.fail(new Error("missing fields"));
      return json({ error: "missing fields" }, 400);
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE || !ANON) return json({ error: "Service not configured" }, 500);
    const OPENAI = Deno.env.get("OPENAI_API_KEY");
    const GOOGLE = Deno.env.get("GOOGLE_AI_API_KEY");

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: who } = await userClient.auth.getUser();
    const user = who?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);

    const [documentResult, gameResult] = await Promise.all([
      admin.from("gp_documents").select("user_id,game_id,file_url").eq("id", documentId).eq("user_id", user.id).maybeSingle(),
      admin.from("gp_games").select("user_id,deleted_at").eq("id", gameId).eq("user_id", user.id).maybeSingle(),
    ]);
    if (documentResult.error || gameResult.error) return json({ error: "Couldn't check this import" }, 500);
    if (!ownsImport(user.id, gameId, bucket, path, documentResult.data, gameResult.data)) {
      return json({ error: "This document is not available for this game" }, 403);
    }
    if (!OPENAI && !GOOGLE) return json({ error: "AI service not configured" }, 500);

    // 1. download
    const dl = await admin.storage.from(bucket).download(path);
    if (dl.error) throw dl.error;
    if (!dl.data) throw new Error("Document download returned no file");
    const buf = new Uint8Array(await dl.data.arrayBuffer());
    const mime = (dl.data as any).type || "application/octet-stream";
    let base64 = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      base64 += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    base64 = btoa(base64);

    // 2. call gemini
    await admin.from("gp_documents").update({ parse_status: "processing" }).eq("id", documentId);
    const ai = await chatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `${SCHEMA_PROMPT}\n\nSport: ${sport ?? "baseball"}` },
          mime.startsWith("image/")
            ? { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } }
            : { type: "text", text: `Document (${mime}) base64:\n${base64.slice(0, 200_000)}` },
        ],
      }],
      temperature: 0,
    }, { timeoutMs: 90_000 });
    if (!ai.ok) {
      await admin.from("gp_documents").update({
        parse_status: "error", parse_error: `ai ${ai.status}`,
      }).eq("id", documentId);
      throw new Error(`AI provider ${ai.status}: ${(ai.errorBody ?? "").slice(0, 400)}`);
    }
    const raw = ai.data.choices?.[0]?.message?.content ?? "";
    const cleaned = String(raw).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(cleaned); } catch { parsed = {}; }
    const atBats = Array.isArray(parsed.at_bats) ? parsed.at_bats : [];
    const pitches = Array.isArray(parsed.pitches) ? parsed.pitches : [];
    const defense = Array.isArray(parsed.defense) ? parsed.defense : [];
    const baserun = Array.isArray(parsed.baserun) ? parsed.baserun : [];

    // Extraction stays on the existing document as a review buffer, never
    // in the live event ledger before explicit confirmation.
    const summary = {
      atBats: atBats.length, pitches: pitches.length,
      defense: defense.length, baserun: baserun.length,
    };
    const saved = await admin.from("gp_documents").update({
      parse_status: "processed",
      parsed_events: { summary, failures: 0, raw: parsed, review_status: "pending" },
    }).eq("id", documentId);

    if (saved.error) throw saved.error;
    await hb.success({ ...summary, failures: 0, document_id: documentId });
    return json({ summary, failures: 0, review_status: "pending" });
  } catch (e) {
    console.error("[gp-ingest-document]", e);
    await hb.fail(e, { document_id: undefined });
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}
