/**
 * gp-pregame-plan — generate an elite personal hitting/pitching plan.
 *
 * Input  : {
 *   sport: 'baseball' | 'softball',
 *   role: 'hitter' | 'pitcher',
 *   dossierId: uuid,           // pitcher_dossier or opponent_hitter
 *   gameId?: uuid,
 *   userContext?: { recent_form?: string, notes?: string },
 * }
 *
 * What it does:
 *   1. Loads the dossier (notes, tendencies, arsenal, archetype, attachments).
 *   2. Loads user's history vs this exact pitcher AND vs same archetype.
 *   3. Loads user planner_priors for that archetype (success-weighted advice).
 *   4. Loads recent gp_at_bats / pitches to gauge form.
 *   5. Calls Gemini with a structured prompt -> returns plan_json + plan_markdown.
 *   6. Saves to gp_pregame_plans, returns plan + plan_id.
 *
 * The plan_json shape is stable so the UI can render recommendations as
 * checkboxes that the user can mark "followed / worked" after the game.
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

const ENGINE_VERSION = "pregame-plan/v1.0";

const SYSTEM_PROMPT = `You are an elite hitting/pitching strategist. You write plans the way a top-1% MLB advance scout writes for a hitter or pitcher facing a specific opponent. Your tone is calm, confident, conversational, surgically specific. You speak in cues, not jargon.

Hard rules:
- Output STRICT JSON matching the schema below, no markdown fences, no prose outside JSON.
- Reference EXACT facts from the dossier (release height, extension, ride, slot, FPS%, usage, whiff).
- Translate facts into PHYSICAL cues ("see the ball up", "let it travel", "start your move early").
- Use the user's historical performance vs this pitcher AND vs same archetype to personalize.
- If a number is missing, do not invent it. Speak in tendency language instead.
- One paragraph "vibe" at the top, then 5-8 concrete cues, then 3 in-game triggers, then 2 mental anchors.

Schema:
{
  "headline": string,                    // one-line summary
  "vibe": string,                        // 2-4 sentence pregame paragraph
  "cues": [{ "key": string, "text": string, "tag": "see"|"timing"|"zone"|"spin"|"mental"|"avoid" }],
  "in_game_triggers": [{ "key": string, "if": string, "then": string }],
  "mental_anchors": [string],
  "matchup_grade": "lean_you"|"even"|"lean_them",
  "confidence": "low"|"medium"|"high",
  "rationale_for_user_history": string   // short note explaining how their priors shaped this plan
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const hb = startHeartbeat("gp-pregame-plan", { intervalMs: 8_000 });
  try {
    const body = await req.json();
    const { sport, role, dossierId, gameId, userContext } = body ?? {};
    if (!sport || !role || !dossierId) {
      await hb.fail(new Error("missing fields"));
      return json({ error: "missing fields" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: who } = await userClient.auth.getUser();
    const user = who?.user;
    if (!user) return json({ error: "unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE);

    // 1. dossier
    const dossierTable = role === "pitcher" ? "gp_pitcher_dossiers" : "gp_opponent_hitters";
    const { data: dossier, error: dErr } = await admin
      .from(dossierTable)
      .select("*")
      .eq("id", dossierId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (dErr || !dossier) {
      await hb.fail(dErr ?? new Error("dossier not found"));
      return json({ error: "dossier not found" }, 404);
    }
    const archetype = dossier.archetype ?? null;

    // 2. user history vs this exact pitcher / hitter
    const historyVsThis = role === "pitcher"
      ? await admin.from("gp_at_bats")
          .select("inning,result,contact_quality,exit_velo,pitch_type,notes,created_at")
          .eq("user_id", user.id)
          .eq("opponent_pitcher_id", dossierId)
          .order("created_at", { ascending: false })
          .limit(40)
      : { data: [] };

    // 3. user history vs same archetype
    const historyVsArchetype = archetype
      ? await admin.from("gp_at_bats")
          .select("inning,result,contact_quality,exit_velo,pitch_type,created_at")
          .eq("user_id", user.id)
          .eq("pitcher_archetype_snapshot", archetype)
          .order("created_at", { ascending: false })
          .limit(60)
      : { data: [] };

    // 4. planner priors
    const priors = archetype
      ? await admin.from("gp_planner_priors")
          .select("prior_json,sample_size")
          .eq("user_id", user.id)
          .eq("sport", sport)
          .eq("role", role === "pitcher" ? "hitter" : "pitcher") // user's own role is opposite
          .eq("archetype", archetype)
          .maybeSingle()
      : { data: null };

    // 5. recent form
    const recent = await admin.from("gp_at_bats")
      .select("result,contact_quality,exit_velo,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25);

    const inputs_snapshot = {
      dossier,
      archetype,
      history_vs_this: historyVsThis.data ?? [],
      history_vs_archetype: historyVsArchetype.data ?? [],
      planner_prior: priors?.data ?? null,
      recent_form: recent.data ?? [],
      user_context: userContext ?? {},
      sport,
      role,
    };

    // 6. call Gemini
    const prompt = `${SYSTEM_PROMPT}\n\nINPUT:\n${JSON.stringify(inputs_snapshot).slice(0, 180_000)}`;
    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      }),
    });
    if (!ai.ok) {
      const t = await ai.text();
      throw new Error(`Gemini ${ai.status}: ${t.slice(0, 400)}`);
    }
    const aiJson = await ai.json();
    const raw = String(aiJson?.choices?.[0]?.message?.content ?? "");
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let plan_json: any = {};
    try { plan_json = JSON.parse(cleaned); } catch { plan_json = { headline: "Plan", vibe: cleaned }; }

    const plan_markdown = renderMarkdown(plan_json);

    // 7. save
    const { data: saved, error: sErr } = await admin.from("gp_pregame_plans").insert({
      user_id: user.id,
      sport,
      dossier_kind: role,
      pitcher_dossier_id: role === "pitcher" ? dossierId : null,
      hitter_dossier_id: role === "hitter" ? dossierId : null,
      game_id: gameId ?? null,
      plan_json,
      plan_markdown,
      inputs_snapshot,
      model: "google/gemini-2.5-flash",
      engine_version: ENGINE_VERSION,
    }).select("id").maybeSingle();
    if (sErr) throw sErr;

    await hb.success({ plan_id: saved?.id, role, archetype });
    return json({ plan_id: saved?.id, plan_json, plan_markdown, archetype });
  } catch (e) {
    console.error("[gp-pregame-plan]", e);
    await hb.fail(e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function renderMarkdown(p: any): string {
  try {
    const lines: string[] = [];
    if (p.headline) lines.push(`### ${p.headline}`);
    if (p.vibe) lines.push("", p.vibe);
    if (Array.isArray(p.cues) && p.cues.length) {
      lines.push("", "**Cues**");
      for (const c of p.cues) lines.push(`- ${c.text}`);
    }
    if (Array.isArray(p.in_game_triggers) && p.in_game_triggers.length) {
      lines.push("", "**In-game triggers**");
      for (const t of p.in_game_triggers) lines.push(`- IF ${t.if} → THEN ${t.then}`);
    }
    if (Array.isArray(p.mental_anchors) && p.mental_anchors.length) {
      lines.push("", "**Mental anchors**");
      for (const m of p.mental_anchors) lines.push(`- ${m}`);
    }
    if (p.matchup_grade) lines.push("", `_Matchup_: ${p.matchup_grade} · _Confidence_: ${p.confidence ?? "medium"}`);
    return lines.join("\n");
  } catch { return ""; }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}
