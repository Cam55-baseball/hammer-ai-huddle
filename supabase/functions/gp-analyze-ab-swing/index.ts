/**
 * gp-analyze-ab-swing — analyze a single at-bat swing video in the context of
 * the specific pitcher faced. Produces mechanics notes + drills + cues that
 * are TUNED to the archetype, not generic.
 *
 * Input  : { abId, gameId?, dossierId?, bucket, path, userThoughts? }
 * Output : { analysisId, summary, mechanics_json, drills, cues }
 */
// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { startHeartbeat } from "../_shared/withHeartbeat.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCHEMA = `You are an elite swing analyst. You receive a single at-bat clip and the pitcher context. Output STRICT JSON:
{
  "summary": string,
  "mechanics_json": {
    "load": string, "stride": string, "hands": string, "barrel_path": string,
    "contact_point": string, "balance": string, "vision": string
  },
  "what_pitcher_did_to_you": string,
  "cues": [string],
  "drills": [string],
  "next_ab_adjustment": string
}
No prose outside JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const hb = startHeartbeat("gp-analyze-ab-swing", { intervalMs: 8_000 });
  try {
    const { abId, gameId, dossierId, bucket, path, userThoughts } = await req.json();
    if (!abId || !bucket || !path) {
      await hb.fail(new Error("missing fields"));
      return json({ error: "missing fields" }, 400);
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: who } = await userClient.auth.getUser();
    const user = who?.user;
    if (!user) return json({ error: "unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE);

    // pitcher context
    let pitcher_context: any = {};
    if (dossierId) {
      const { data: d } = await admin.from("gp_pitcher_dossiers")
        .select("name,throws,arm_slot,archetype,repertoire,tendencies")
        .eq("id", dossierId).maybeSingle();
      pitcher_context = d ?? {};
    }
    const { data: ab } = await admin.from("gp_at_bats")
      .select("inning,result,count_balls,count_strikes,pitch_type,contact_quality,notes")
      .eq("id", abId).maybeSingle();

    // download video
    const dl = await admin.storage.from(bucket).download(path);
    if (dl.error) throw dl.error;
    const blob = dl.data!;
    const mime = (blob as any).type || "video/mp4";
    const buf = new Uint8Array(await blob.arrayBuffer());
    let b64 = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) b64 += String.fromCharCode(...buf.subarray(i, i + chunk));
    b64 = btoa(b64);

    const content: any[] = [
      { type: "text", text: SCHEMA },
      { type: "text", text: `PITCHER CONTEXT:\n${JSON.stringify(pitcher_context)}\nAT-BAT:\n${JSON.stringify(ab ?? {})}\nUSER THOUGHTS:\n${userThoughts ?? ""}` },
    ];
    if (mime.startsWith("video/")) {
      content.push({ type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } });
    } else {
      content.push({ type: "text", text: `Asset (${mime}) base64 head:\n${b64.slice(0, 180_000)}` });
    }

    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
        temperature: 0.2,
      }),
    });
    if (!ai.ok) throw new Error(`Gemini ${ai.status}: ${(await ai.text()).slice(0, 400)}`);
    const aiJson = await ai.json();
    const raw = String(aiJson?.choices?.[0]?.message?.content ?? "");
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(cleaned); } catch { parsed = { summary: cleaned }; }

    // public url for the saved video (signed, 1-day)
    const signed = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24);
    const video_url = signed.data?.signedUrl ?? null;

    const { data: saved, error: sErr } = await admin.from("gp_ab_swing_analyses").insert({
      user_id: user.id,
      ab_id: abId,
      game_id: gameId ?? null,
      pitcher_dossier_id: dossierId ?? null,
      video_url,
      mechanics_json: parsed.mechanics_json ?? {},
      pitcher_context,
      drills: Array.isArray(parsed.drills) ? parsed.drills : [],
      cues: Array.isArray(parsed.cues) ? parsed.cues : [],
      summary: parsed.summary ?? null,
      model: "google/gemini-2.5-flash",
    }).select("id").maybeSingle();
    if (sErr) throw sErr;

    await hb.success({ ab_id: abId, analysis_id: saved?.id });
    return json({
      analysisId: saved?.id,
      summary: parsed.summary ?? "",
      mechanics_json: parsed.mechanics_json ?? {},
      drills: parsed.drills ?? [],
      cues: parsed.cues ?? [],
      video_url,
    });
  } catch (e) {
    console.error("[gp-analyze-ab-swing]", e);
    await hb.fail(e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}
