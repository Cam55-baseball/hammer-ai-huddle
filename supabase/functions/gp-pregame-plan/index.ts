/**
 * gp-pregame-plan — generate an elite personal hitting/pitching plan.
 *
 * v2 schema — Elite Situational Intelligence:
 *   pitcher_attack_on_me     how THIS pitcher tries to get YOU out
 *   my_attack_on_pitcher     how YOU beat THIS pitcher (best zones/pitches/hot count)
 *   sequence_reading         tells, ahead-in-count rules, behind-in-count survival
 *   count_plan               per-count look/take/swing for 0-0..3-2
 *   situational_hitting      per base/out state goal+pitch+zones+swing-shape
 *   matchup_edges            platoon, velo-band response, spin-axis, tunneling pairs
 *   headline/vibe/cues/in_game_triggers/mental_anchors/matchup_grade/confidence
 *
 * Inputs (B2): dossier, direct history, archetype history, planner priors,
 * recent form, plus zone-aggregated pitch heatmaps and situational base rates.
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

const ENGINE_VERSION = "pregame-plan/v2.0-elite-situational";

const SITUATION_KEYS = [
  "bases_empty_0out","bases_empty_1out","bases_empty_2out",
  "runner_1B_0out","runner_1B_1out","runner_1B_2out",
  "runner_2B_0out","runner_2B_1out","runner_2B_2out",
  "runner_3B_0out","runner_3B_1out","runner_3B_2out",
  "runners_1B_2B_0out","runners_1B_2B_1out","runners_1B_2B_2out",
  "runners_1B_3B_0out","runners_1B_3B_1out","runners_1B_3B_2out",
  "runners_2B_3B_0out","runners_2B_3B_1out","runners_2B_3B_2out",
  "bases_loaded_0out","bases_loaded_1out","bases_loaded_2out",
];

const COUNT_KEYS = ["0-0","0-1","0-2","1-0","1-1","1-2","2-0","2-1","2-2","3-0","3-1","3-2"];

const HITTER_SYSTEM_PROMPT = `You are an elite advance scout writing a surgical matchup plan for ONE hitter against ONE pitcher. You speak in physical cues, not jargon. You answer EVERY question the athlete might ask: how this pitcher gets me out, the best way to beat him, how to read his sequencing to stay ahead, the best pitch to hunt, the best zones to attack, the worst zones, and what to do in every base/out situation.

Hard rules:
- Output STRICT JSON matching the schema. No markdown fences, no prose outside JSON.
- Reference EXACT facts from the dossier (release, extension, ride, slot, FPS%, usage, whiff, velo bands).
- Translate facts into PHYSICAL cues ("see the ball up", "let it travel", "start your move early").
- Use the user's direct history vs this pitcher FIRST; fall back to archetype history when sparse.
- Tag every situational/count entry with confidence (low|med|high) and source (direct_history|archetype|prior|ai_inference).
- If a number is missing, do not invent it — speak in tendency language.
- Sport-aware: baseball uses FB/SL/CB/CH/SI/FC/FS and 3x3 zones; softball uses FB/rise/drop/screw/change/curve with rise-emphasized top of zone.
- Zones are 1..9 (1-3 top, 4-6 mid, 7-9 bottom; left→right from catcher's view). For RHB: inner = 3/6/9, outer = 1/4/7. For LHB: mirror.

Schema (return EXACTLY this shape):
{
  "headline": string,
  "vibe": string,
  "matchup_grade": "lean_you"|"even"|"lean_them",
  "confidence": "low"|"medium"|"high",
  "rationale_for_user_history": string,
  "pitcher_attack_on_me": { "primary_sequence": [string], "putaway_pitch": string, "putaway_zone": string, "early_count_tendency": string, "two_strike_tendency": string, "weakness_exploited": string },
  "my_attack_on_pitcher": { "best_pitch_to_hunt": string, "best_zones": [string], "avoid_zones": [string], "hot_count": string, "count_plan": { "0-0": { "look": string, "take": string, "swing": string, "note": string }, "0-1": {...}, "0-2": {...}, "1-0": {...}, "1-1": {...}, "1-2": {...}, "2-0": {...}, "2-1": {...}, "2-2": {...}, "3-0": {...}, "3-1": {...}, "3-2": {...} } },
  "sequence_reading": { "tells": [string], "ahead_in_count_rules": string, "behind_in_count_survival": string },
  "situational_hitting": { "<situation_key>": { "goal": string, "pitch_to_hunt": string, "zones": [string], "avoid_zones": [string], "swing_shape": string, "avoid": string, "confidence": "low"|"med"|"high", "source": "direct_history"|"archetype"|"prior"|"ai_inference" } },
  "matchup_edges": { "platoon_split_note": string, "velo_band_response": string, "spin_axis_weakness": string, "tunneling_pairs_to_watch": [string] },
  "cues": [{ "key": string, "text": string, "tag": "see"|"timing"|"zone"|"spin"|"mental"|"avoid" }],
  "in_game_triggers": [{ "key": string, "if": string, "then": string }],
  "mental_anchors": [string]
}

The situational_hitting object MUST include entries for these keys when relevant: ${SITUATION_KEYS.join(", ")}.`;

const PITCHER_SYSTEM_PROMPT = `You are an elite advance scout writing a surgical PITCHING plan for the athlete vs ONE opposing hitter. You write in the exact style of a premium scouting report — narrative early/mid/late game strategy, then tactical cues. Example line: "Offspeed early to allow fastballs to have a chance to overpower this guy late in the game. He may beat us early but not late."

Hard rules:
- Output STRICT JSON matching the schema. No markdown fences.
- Speak in physical cues, not jargon. Reference dossier facts (bats, spray, chase, first-pitch swing %, notes) exactly.
- team_game_plan MUST read like a premium scouting-report narrative, not a list of settings.
- Tag confidence conservatively — if data is thin, say so.

Schema (return EXACTLY this shape):
{
  "headline": string,
  "vibe": string,
  "matchup_grade": "lean_you"|"even"|"lean_them",
  "confidence": "low"|"medium"|"high",
  "rationale": string,
  "team_game_plan": {
    "early_game": string,
    "mid_game": string,
    "late_game": string,
    "key_adjustment": string,
    "risk": string,
    "why": string
  },
  "pitching_plan": {
    "primary_sequence": [string],
    "putaway_pitch": string,
    "putaway_zone": string,
    "pitches_to_avoid": [string],
    "attack_zones": [string],
    "avoid_zones": [string]
  },
  "count_plan": {
    "0-0": { "throw": string, "location": string, "note": string },
    "0-1": {...}, "0-2": {...}, "1-0": {...}, "1-1": {...}, "1-2": {...},
    "2-0": {...}, "2-1": {...}, "2-2": {...}, "3-0": {...}, "3-1": {...}, "3-2": {...}
  },
  "situational_pitching": {
    "runners_on_note": string,
    "risp_note": string,
    "two_out_note": string
  },
  "cues": [{ "key": string, "text": string, "tag": "see"|"timing"|"zone"|"spin"|"mental"|"avoid" }],
  "in_game_triggers": [{ "key": string, "if": string, "then": string }],
  "mental_anchors": [string]
}

Example team_game_plan for a hitter who crushes early fastballs: { "early_game": "Feed him offspeed and soft stuff early — change, curve, off the plate. Don't give him a fastball to time.", "mid_game": "Mix in the fastball once his eye is on soft; use it up-and-in to disrupt.", "late_game": "Now the fastball plays — his hands are geared for soft. Attack with heat top-of-zone late.", "key_adjustment": "If he stays back on offspeed, elevate the fastball a tick earlier.", "risk": "He may catch you early on a mistake — accept the trade for the late-game edge.", "why": "Hitters who sit dead-red early cool down on velo when they've been fed offspeed for two ABs." }`;

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
      .from(dossierTable).select("*").eq("id", dossierId).eq("user_id", user.id).maybeSingle();
    if (dErr || !dossier) {
      await hb.fail(dErr ?? new Error("dossier not found"));
      return json({ error: "dossier not found" }, 404);
    }
    const archetype = dossier.archetype ?? null;

    // 2. direct history vs this pitcher (at-bats)
    const historyVsThis = role === "pitcher"
      ? await admin.from("gp_at_bats")
          .select("inning,outs,base_state,result,contact_quality,exit_velo,pitch_type,balls,strikes,notes,created_at")
          .eq("user_id", user.id)
          .eq("opponent_pitcher_id", dossierId)
          .order("created_at", { ascending: false })
          .limit(80)
      : { data: [] };

    // 3. direct pitches vs this pitcher (zone heatmap input)
    const abIds = (historyVsThis.data ?? []).map((a: any) => a.id).filter(Boolean);
    const pitchesVsThis = abIds.length > 0
      ? await admin.from("gp_pitches")
          .select("zone,pitch_type,result,contact_quality,balls,strikes,velo")
          .in("at_bat_id", abIds)
          .limit(800)
      : { data: [] };

    // 4. archetype history (cold-start fallback)
    const historyVsArchetype = archetype
      ? await admin.from("gp_at_bats")
          .select("inning,outs,base_state,result,contact_quality,exit_velo,pitch_type,balls,strikes,created_at")
          .eq("user_id", user.id)
          .eq("pitcher_archetype_snapshot", archetype)
          .order("created_at", { ascending: false })
          .limit(120)
      : { data: [] };

    // 5. global zone tendencies — all user's recent pitches as hitter
    const globalRecentPitches = await admin.from("gp_pitches")
      .select("zone,pitch_type,result,contact_quality,velo")
      .order("created_at", { ascending: false })
      .limit(600);

    // 6. planner priors (learning loop)
    const priors = archetype
      ? await admin.from("gp_planner_priors")
          .select("prior_json,sample_size")
          .eq("user_id", user.id)
          .eq("sport", sport)
          .eq("role", role === "pitcher" ? "hitter" : "pitcher")
          .eq("archetype", archetype)
          .maybeSingle()
      : { data: null };

    // 7. recent form
    const recent = await admin.from("gp_at_bats")
      .select("result,contact_quality,exit_velo,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25);

    // ---- Aggregations (numerical inputs to the AI) ----
    const zoneAggDirect = aggregateZones(pitchesVsThis.data ?? []);
    const zoneAggGlobal = aggregateZones(globalRecentPitches.data ?? []);
    const situationalBaseRates = aggregateSituational(historyVsArchetype.data ?? historyVsThis.data ?? []);
    const veloBandSplits = aggregateVeloBands(globalRecentPitches.data ?? []);

    const inputs_snapshot = {
      sport, role, archetype,
      dossier,
      history_vs_this_count: (historyVsThis.data ?? []).length,
      history_vs_this_sample: (historyVsThis.data ?? []).slice(0, 25),
      pitches_vs_this_count: (pitchesVsThis.data ?? []).length,
      zone_agg_direct: zoneAggDirect,
      zone_agg_global: zoneAggGlobal,
      history_vs_archetype_count: (historyVsArchetype.data ?? []).length,
      history_vs_archetype_sample: (historyVsArchetype.data ?? []).slice(0, 30),
      situational_base_rates: situationalBaseRates,
      velo_band_splits: veloBandSplits,
      planner_prior: priors?.data ?? null,
      recent_form: recent.data ?? [],
      user_context: userContext ?? {},
    };

    // ---- AI call ----
    const systemPrompt = role === "hitter" ? PITCHER_SYSTEM_PROMPT : HITTER_SYSTEM_PROMPT;
    const prompt = `${systemPrompt}\n\nINPUT:\n${JSON.stringify(inputs_snapshot).slice(0, 180_000)}`;
    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        response_format: { type: "json_object" },
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

// -------- Aggregation helpers --------

function aggregateZones(pitches: any[]) {
  const z: Record<string, { n: number; ok: number; miss: number; barrel: number }> = {};
  for (const p of pitches) {
    const key = String(p.zone ?? "").trim();
    if (!/^[1-9]$/.test(key)) continue;
    z[key] ??= { n: 0, ok: 0, miss: 0, barrel: 0 };
    z[key].n += 1;
    if (p.result === "swing_miss") z[key].miss += 1;
    if (p.result === "in_play") {
      if (p.contact_quality === "barrel") { z[key].barrel += 1; z[key].ok += 1; }
      else if (p.contact_quality === "solid") z[key].ok += 1;
    }
  }
  return z;
}

function aggregateSituational(atBats: any[]) {
  const tally: Record<string, { n: number; on_base: number; hard_contact: number }> = {};
  for (const ab of atBats) {
    const k = ab.base_state ? `${ab.base_state}_${ab.outs ?? 0}out` : null;
    if (!k) continue;
    tally[k] ??= { n: 0, on_base: 0, hard_contact: 0 };
    tally[k].n += 1;
    if (["1B","2B","3B","HR","BB","HBP"].includes(ab.result)) tally[k].on_base += 1;
    if (["barrel","solid"].includes(ab.contact_quality)) tally[k].hard_contact += 1;
  }
  return tally;
}

function aggregateVeloBands(pitches: any[]) {
  const bands = { "<85": init(), "85-89": init(), "90-93": init(), "94+": init() };
  function init() { return { n: 0, whiff: 0, hard: 0 }; }
  for (const p of pitches) {
    const v = Number(p.velo);
    if (!Number.isFinite(v)) continue;
    const b = v < 85 ? "<85" : v < 90 ? "85-89" : v < 94 ? "90-93" : "94+";
    bands[b].n += 1;
    if (p.result === "swing_miss") bands[b].whiff += 1;
    if (p.contact_quality === "barrel" || p.contact_quality === "solid") bands[b].hard += 1;
  }
  return bands;
}

function renderMarkdown(p: any): string {
  try {
    const lines: string[] = [];
    if (p.headline) lines.push(`### ${p.headline}`);
    if (p.vibe) lines.push("", p.vibe);
    if (p.team_game_plan) {
      const g = p.team_game_plan;
      lines.push("", "**Team game plan**");
      if (g.early_game) lines.push(`- **Early:** ${g.early_game}`);
      if (g.mid_game) lines.push(`- **Mid:** ${g.mid_game}`);
      if (g.late_game) lines.push(`- **Late:** ${g.late_game}`);
      if (g.key_adjustment) lines.push(`- **Adjust:** ${g.key_adjustment}`);
      if (g.risk) lines.push(`- **Risk:** ${g.risk}`);
      if (g.why) lines.push(`- **Why:** ${g.why}`);
    }
    if (p.my_attack_on_pitcher?.best_pitch_to_hunt) {
      lines.push("", `**Hunt:** ${p.my_attack_on_pitcher.best_pitch_to_hunt}`);
    }
    if (p.pitching_plan?.putaway_pitch) {
      lines.push("", `**Putaway:** ${p.pitching_plan.putaway_pitch}${p.pitching_plan.putaway_zone ? ` (${p.pitching_plan.putaway_zone})` : ""}`);
    }
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
