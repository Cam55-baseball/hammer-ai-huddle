// Extract Patterns — anonymized behavior→outcome clustering for the moat.
// Schedule: daily at 04:53 UTC. Stores zero user_ids.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function bin(v: number, lo: number, hi: number): "low" | "med" | "high" {
  if (v < lo) return "low";
  if (v > hi) return "high";
  return "med";
}

function classify(load24h: string, recovery24h: string, freshness6h: string): string {
  if (load24h === "high" && recovery24h === "low") return "overload";
  if (load24h === "low" && recovery24h === "high") return "recovery";
  if (load24h === "high" && recovery24h === "high") return "ramp";
  if (load24h === "low" && recovery24h === "low") return "plateau";
  if (freshness6h === "high" && load24h !== "high") return "inconsistency";
  return "mixed";
}

// Phase 7 — Observability wrapper
async function logRun(supabase: any, status: 'success'|'fail'|'timeout', startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from('engine_function_logs').insert({
      function_name: 'extract-patterns',
      status,
      duration_ms: Date.now() - startMs,
      error_message: error ?? null,
      metadata: metadata ?? {},
    });
  } catch { /* silent */ }
}

// Phase 7 PART B — Pattern outcome scoring (state-transition delta)
// recover→ready=+10, caution→ready=+10, ready→prime=+10
// prime→caution=-10, ready→caution=-10, caution→recover=-10, same=0, opposite extreme=-15
const STATE_RANK: Record<string, number> = { recover: 0, caution: 1, ready: 2, prime: 3 };
function transitionScore(from: string, to: string): number {
  const f = STATE_RANK[from], t = STATE_RANK[to];
  if (f === undefined || t === undefined) return 0;
  const d = t - f;
  if (d === 0) return 0;
  if (Math.abs(d) === 3) return d > 0 ? 15 : -15;
  return d * 10;
}

serve(async (req) => {
  const startMs = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: snaps } = await supabase
      .from("hammer_state_snapshots")
      .select("user_id,cognitive_load,recovery_score,dopamine_load,overall_state,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(5000);

    type Bucket = { pattern_type: string; feature_vector: any; outcome_state: string; count: number; transitions: number[] };
    const buckets = new Map<string, Bucket>();

    // Build per-user time-ordered series for outcome scoring
    const byUser = new Map<string, any[]>();
    for (const s of snaps ?? []) {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
      byUser.get(s.user_id)!.push(s);
    }

    for (const [, userSnaps] of byUser) {
      for (let i = 0; i < userSnaps.length; i++) {
        const s = userSnaps[i];
        const next = userSnaps[i + 1];
        const loadBin = bin(Number(s.cognitive_load ?? 0), 30, 70);
        const recBin = bin(Number(s.recovery_score ?? 0), 40, 70);
        const freshBin = bin(100 - Number(s.dopamine_load ?? 0), 40, 70);
        const ptype = classify(loadBin, recBin, freshBin);
        const fv = { load_24h: loadBin, recovery_24h: recBin, freshness_6h: freshBin };
        const key = `${ptype}|${loadBin}|${recBin}|${freshBin}|${s.overall_state}`;
        const cur = buckets.get(key);
        const tScore = next ? transitionScore(s.overall_state, next.overall_state) : null;
        if (cur) {
          cur.count += 1;
          if (tScore !== null) cur.transitions.push(tScore);
        } else {
          buckets.set(key, {
            pattern_type: ptype,
            feature_vector: fv,
            outcome_state: s.overall_state,
            count: 1,
            transitions: tScore !== null ? [tScore] : [],
          });
        }
      }
    }

    let upserted = 0;
    for (const b of buckets.values()) {
      // Compute outcome score (avg) and confidence (sqrt(freq) * 10, capped 95)
      const outcomeAvg = b.transitions.length > 0
        ? b.transitions.reduce((a, c) => a + c, 0) / b.transitions.length
        : 0;
      const confidence = Math.min(95, Math.sqrt(b.count) * 10);

      // Find existing
      const { data: existing } = await supabase
        .from("anonymized_pattern_library")
        .select("id,frequency")
        .eq("pattern_type", b.pattern_type)
        .eq("outcome_state", b.outcome_state)
        .contains("feature_vector", b.feature_vector)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from("anonymized_pattern_library")
          .update({
            frequency: (existing.frequency ?? 1) + b.count,
            last_seen_at: new Date().toISOString(),
            performance_outcome_score: +outcomeAvg.toFixed(2),
            confidence: +confidence.toFixed(2),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("anonymized_pattern_library").insert({
          pattern_type: b.pattern_type,
          feature_vector: b.feature_vector,
          outcome_state: b.outcome_state,
          frequency: b.count,
          performance_outcome_score: +outcomeAvg.toFixed(2),
          confidence: +confidence.toFixed(2),
        });
      }
      upserted++;
    }

    // Prune stale
    await supabase.rpc("cleanup_old_patterns").catch(() => {});

    await logRun(supabase, 'success', startMs, undefined, { patterns_upserted: upserted, source_snapshots: snaps?.length ?? 0 });
    return new Response(JSON.stringify({ status: "ok", patterns_upserted: upserted, source_snapshots: snaps?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[extract-patterns]", err);
    await logRun(supabase, 'fail', startMs, String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
