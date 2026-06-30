/**
 * gp-update-priors — learning loop.
 *
 * After a gp_plan_outcomes row is inserted, this is invoked to bump
 * gp_planner_priors weights for the relevant (sport, role, archetype) bucket.
 * Capped + EWMA-decayed so one bad game doesn't tank advice.
 *
 * Input: { planId: uuid }
 */
// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DECAY = 0.92;       // each new outcome decays prior weight 8%
const MAX_WEIGHT = 50;    // cap so one archetype can't dominate
const MAX_SAMPLES = 400;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { planId } = await req.json();
    if (!planId) return json({ error: "planId required" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    // Load plan + its outcomes.
    const { data: plan } = await admin.from("gp_pregame_plans")
      .select("id,user_id,sport,dossier_kind,pitcher_dossier_id,hitter_dossier_id,plan_json,inputs_snapshot")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) return json({ error: "plan not found" }, 404);

    const archetype = plan.inputs_snapshot?.archetype ?? plan.plan_json?.archetype ?? null;
    if (!archetype) return json({ ok: true, skipped: "no archetype" });

    const { data: outcomes } = await admin.from("gp_plan_outcomes")
      .select("recommendation_key, followed, worked")
      .eq("plan_id", planId);

    const userRole = plan.dossier_kind === "pitcher" ? "hitter" : "pitcher";

    // Tally per recommendation_key.
    const tally: Record<string, { ok: number; fail: number }> = {};
    for (const o of outcomes ?? []) {
      if (o.worked == null) continue;
      const k = o.recommendation_key ?? "general";
      tally[k] ??= { ok: 0, fail: 0 };
      if (o.worked) tally[k].ok += 1; else tally[k].fail += 1;
    }
    if (Object.keys(tally).length === 0) return json({ ok: true, skipped: "no outcomes" });

    // Load existing prior.
    const { data: existing } = await admin.from("gp_planner_priors")
      .select("*")
      .eq("user_id", plan.user_id)
      .eq("sport", plan.sport)
      .eq("role", userRole)
      .eq("archetype", archetype)
      .maybeSingle();

    const prior_json = (existing?.prior_json ?? {}) as Record<string, { weight: number; ok: number; fail: number }>;
    let sample_size = existing?.sample_size ?? 0;

    for (const [k, v] of Object.entries(tally)) {
      const cur = prior_json[k] ?? { weight: 0, ok: 0, fail: 0 };
      cur.ok = Math.min(MAX_SAMPLES, Math.round(cur.ok * DECAY + v.ok));
      cur.fail = Math.min(MAX_SAMPLES, Math.round(cur.fail * DECAY + v.fail));
      // weight = bounded net signal in [-MAX_WEIGHT, MAX_WEIGHT]
      const net = (cur.ok - cur.fail);
      cur.weight = Math.max(-MAX_WEIGHT, Math.min(MAX_WEIGHT, net));
      prior_json[k] = cur;
      sample_size += v.ok + v.fail;
    }
    sample_size = Math.min(MAX_SAMPLES, sample_size);

    if (existing?.id) {
      await admin.from("gp_planner_priors")
        .update({ prior_json, sample_size, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await admin.from("gp_planner_priors").insert({
        user_id: plan.user_id,
        sport: plan.sport,
        role: userRole,
        archetype,
        prior_json,
        sample_size,
      });
    }

    return json({ ok: true, archetype, updated_keys: Object.keys(tally).length });
  } catch (e) {
    console.error("[gp-update-priors]", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}
