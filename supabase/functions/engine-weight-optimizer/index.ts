// Engine Weight Optimizer — converts sentinel + adversarial + advisory failure
// signals into bounded weight adjustments. Static rule table; auditable.
// Schedule: every 6h at :43 (after adversarial at :23).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Axis = "arousal" | "recovery" | "motor" | "cognitive" | "dopamine";

const PER_RUN_DELTA_CAP = 0.05;
const MIN_WEIGHT = 0.5;
const MAX_WEIGHT = 1.5;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// Static rule table: (scenario | sentinel signal) → axis adjustment
function deltaForAdversarial(scenario: string, expected: string, actual: string): { axis: Axis; delta: number } | null {
  if (actual === expected) return null;
  switch (scenario) {
    case "overload_spike":
      if (actual === "prime" || actual === "ready") return { axis: "dopamine", delta: -0.02 };
      return null;
    case "fake_recovery":
      if (actual === "prime") return { axis: "recovery", delta: -0.02 };
      return null;
    case "stale_dominance":
      if (actual === "recover") return { axis: "recovery", delta: +0.02 };
      return null;
    case "low_load_high_readiness":
      if (actual === "caution" || actual === "recover") return { axis: "arousal", delta: +0.02 };
      return null;
    case "noise_chaos":
      if (actual === "prime" || actual === "recover") return { axis: "cognitive", delta: +0.01 };
      return null;
    default:
      return null;
  }
}

function deltaForSentinel(driftScore: number, axis: Axis, direction: "up" | "down"): number {
  // Bounded toward truth: scale by drift severity
  const base = driftScore >= 30 ? 0.02 : driftScore >= 15 ? 0.01 : 0.005;
  return direction === "up" ? base : -base;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [advRes, sentRes, advisoryRes] = await Promise.all([
      supabase.from("engine_adversarial_logs")
        .select("scenario,expected_state,actual_state,run_at")
        .eq("pass", false).gte("run_at", since),
      supabase.from("engine_sentinel_logs")
        .select("expected_state,actual_state,drift_score,inputs_snapshot,run_at")
        .eq("drift_flag", true).gte("run_at", since),
      supabase.from("advisory_feedback_logs")
        .select("advice_state,user_action_inferred,effectiveness_score,created_at")
        .gte("created_at", since)
        .not("effectiveness_score", "is", null),
    ]);

    // Aggregate proposed deltas per axis
    const perAxis: Record<Axis, number> = {
      arousal: 0, recovery: 0, motor: 0, cognitive: 0, dopamine: 0,
    };
    const adjustments: Array<{ source: string; scenario: string | null; drift_score: number | null; axis: Axis; delta: number; metadata: any }> = [];

    for (const row of advRes.data ?? []) {
      const d = deltaForAdversarial(row.scenario, row.expected_state, row.actual_state ?? "");
      if (!d) continue;
      perAxis[d.axis] += d.delta;
      adjustments.push({
        source: "adversarial", scenario: row.scenario, drift_score: null,
        axis: d.axis, delta: d.delta,
        metadata: { expected: row.expected_state, actual: row.actual_state, run_at: row.run_at },
      });
    }

    for (const row of sentRes.data ?? []) {
      // If engine said recover but truth said ready/prime → recovery weight too high → -
      if (row.actual_state === "recover" && (row.expected_state === "ready" || row.expected_state === "prime")) {
        const delta = deltaForSentinel(row.drift_score ?? 0, "recovery", "down");
        perAxis.recovery += delta;
        adjustments.push({ source: "sentinel", scenario: null, drift_score: row.drift_score, axis: "recovery", delta, metadata: { expected: row.expected_state, actual: row.actual_state } });
      }
      // If engine said prime but truth said caution/recover → recovery weight too low → +
      if (row.actual_state === "prime" && (row.expected_state === "caution" || row.expected_state === "recover")) {
        const delta = deltaForSentinel(row.drift_score ?? 0, "recovery", "up");
        perAxis.recovery += delta;
        adjustments.push({ source: "sentinel", scenario: null, drift_score: row.drift_score, axis: "recovery", delta, metadata: { expected: row.expected_state, actual: row.actual_state } });
      }
    }

    // Advisory feedback: persistent low effectiveness on a state → flag axis
    const byState: Record<string, { sum: number; count: number }> = {};
    for (const row of advisoryRes.data ?? []) {
      const s = row.advice_state ?? "unknown";
      byState[s] ??= { sum: 0, count: 0 };
      byState[s].sum += Number(row.effectiveness_score ?? 0);
      byState[s].count += 1;
    }
    for (const [state, agg] of Object.entries(byState)) {
      if (agg.count < 3) continue;
      const avg = agg.sum / agg.count;
      if (avg < -30) {
        // advice is being opposed → state misjudged → bump opposite axis slightly
        const axis: Axis = state === "recover" ? "recovery" : state === "prime" ? "arousal" : "cognitive";
        const delta = -0.01;
        perAxis[axis] += delta;
        adjustments.push({ source: "advisory", scenario: null, drift_score: null, axis, delta, metadata: { advice_state: state, avg_effectiveness: avg, sample: agg.count } });
      } else if (avg > 50) {
        const axis: Axis = state === "recover" ? "recovery" : state === "prime" ? "arousal" : "cognitive";
        const delta = +0.005;
        perAxis[axis] += delta;
        adjustments.push({ source: "advisory", scenario: null, drift_score: null, axis, delta, metadata: { advice_state: state, avg_effectiveness: avg, sample: agg.count } });
      }
    }

    // Cap per-run delta per axis
    for (const axis of Object.keys(perAxis) as Axis[]) {
      perAxis[axis] = clamp(perAxis[axis], -PER_RUN_DELTA_CAP, PER_RUN_DELTA_CAP);
    }

    // Load current weights
    const { data: currentWeights } = await supabase
      .from("engine_dynamic_weights").select("axis,weight");
    const current: Record<string, number> = Object.fromEntries(
      (currentWeights ?? []).map((r: any) => [r.axis, Number(r.weight)])
    );

    // Apply: clamp final to 0.5..1.5
    const axesModified: string[] = [];
    for (const axis of Object.keys(perAxis) as Axis[]) {
      if (perAxis[axis] === 0) continue;
      const cur = current[axis] ?? 1.0;
      const next = clamp(cur + perAxis[axis], MIN_WEIGHT, MAX_WEIGHT);
      if (next !== cur) {
        await supabase.from("engine_dynamic_weights").upsert({
          axis, weight: next, updated_at: new Date().toISOString(),
          metadata: { previous_weight: cur, applied_delta: perAxis[axis] },
        }, { onConflict: "axis" });
        axesModified.push(axis);
      }
    }

    // Insert audit rows
    if (adjustments.length > 0) {
      await supabase.from("engine_weight_adjustments").insert(
        adjustments.map(a => ({ ...a, applied: axesModified.includes(a.axis) }))
      );
    }

    // Audit log summary
    await supabase.from("audit_log").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      action: "engine_weight_optimizer_run",
      table_name: "engine_dynamic_weights",
      metadata: {
        adjustments_proposed: adjustments.length,
        axes_modified: axesModified,
        per_axis_delta: perAxis,
        signals_consumed: {
          adversarial_failures: advRes.data?.length ?? 0,
          sentinel_drifts: sentRes.data?.length ?? 0,
          advisory_evaluations: advisoryRes.data?.length ?? 0,
        },
      },
    });

    return new Response(JSON.stringify({
      status: "ok",
      adjustments_applied: axesModified.length,
      axes_modified: axesModified,
      per_axis_delta: perAxis,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[engine-weight-optimizer]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
