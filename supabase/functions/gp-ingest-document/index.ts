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
 *  3. Insert as DRAFT rows (status='draft') so the loggers show them but the
 *     user must confirm each inning before they count.
 *  4. Stamp gp_documents.status='processed', extraction JSON, and counts.
 */
// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
  try {
    const { documentId, gameId, sport, bucket, path } = await req.json();
    if (!documentId || !gameId || !bucket || !path) {
      return json({ error: "missing fields" }, 400);
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: who } = await userClient.auth.getUser();
    const user = who?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);

    // 1. download
    const dl = await admin.storage.from(bucket).download(path);
    if (dl.error) throw dl.error;
    const buf = new Uint8Array(await dl.data!.arrayBuffer());
    const mime = (dl.data as any).type || "application/octet-stream";
    let base64 = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      base64 += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    base64 = btoa(base64);

    // 2. call gemini
    await admin.from("gp_documents").update({ parse_status: "processing" }).eq("id", documentId);
    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
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
      }),
    });
    if (!ai.ok) {
      const t = await ai.text();
      await admin.from("gp_documents").update({
        parse_status: "error", parse_error: `gemini ${ai.status}`,
      }).eq("id", documentId);
      throw new Error(`Gemini error ${ai.status}: ${t.slice(0, 400)}`);
    }
    const aiJson = await ai.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "";
    const cleaned = String(raw).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(cleaned); } catch { parsed = {}; }
    const atBats = Array.isArray(parsed.at_bats) ? parsed.at_bats : [];
    const pitches = Array.isArray(parsed.pitches) ? parsed.pitches : [];
    const defense = Array.isArray(parsed.defense) ? parsed.defense : [];
    const baserun = Array.isArray(parsed.baserun) ? parsed.baserun : [];

    // 3. insert drafts — map to ACTUAL gp_* columns.
    const inserts: Promise<any>[] = [];
    if (atBats.length) inserts.push(admin.from("gp_at_bats").insert(
      atBats.map((a: any) => ({
        user_id: user.id, game_id: gameId,
        inning: a.inning ?? null,
        ab_order: a.pa_no ?? null,
        result: a.result ?? null,
        rbi: a.rbi ?? null,
        exit_velo: a.exit_velo_mph ?? null,
        launch_angle: a.launch_angle_deg ?? null,
        batting_side: a.batter_handedness ?? null,
        notes: a.notes ?? null,
      }))
    ));
    if (pitches.length) inserts.push(admin.from("gp_pitches").insert(
      pitches.map((p: any) => ({
        user_id: user.id, game_id: gameId,
        inning: p.inning ?? null,
        pitch_no: p.pitch_no ?? null,
        pitch_type: p.pitch_type ?? null,
        pitch_velo: p.pitch_velo ?? null,
        result: p.result ?? null,
        perspective: p.perspective === "pitcher" ? "pitcher" : "hitter",
        location: p.zone ? { zone: p.zone } : null,
        notes: "ai_draft",
      }))
    ));
    if (defense.length) inserts.push(admin.from("gp_defense_plays").insert(
      defense.map((d: any) => ({
        user_id: user.id, game_id: gameId,
        inning: d.inning ?? null,
        position: d.position ?? null,
        play_type: d.play_type ?? null,
        result: d.result ?? null,
        notes: d.notes ?? null,
      }))
    ));
    if (baserun.length) inserts.push(admin.from("gp_baserun_events").insert(
      baserun.map((b: any) => ({
        user_id: user.id, game_id: gameId,
        inning: b.inning ?? null,
        event_type: b.event_type ?? null,
        base_from: b.from_base ?? null,
        base_to: b.to_base ?? null,
        success: b.result === "safe" ? true : b.result === "out" ? false : null,
        notes: b.notes ?? null,
      }))
    ));
    const results = await Promise.allSettled(inserts);
    const failed = results.filter((r) => r.status === "rejected");

    const summary = {
      atBats: atBats.length, pitches: pitches.length,
      defense: defense.length, baserun: baserun.length,
    };
    await admin.from("gp_documents").update({
      parse_status: failed.length ? "partial" : "processed",
      parsed_events: { summary, failures: failed.length, raw: parsed },
    }).eq("id", documentId);

    return json({ summary, failures: failed.length });
  } catch (e) {
    console.error("[gp-ingest-document]", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}
