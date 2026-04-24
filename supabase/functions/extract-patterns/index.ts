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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: snaps } = await supabase
      .from("hammer_state_snapshots")
      .select("cognitive_load,recovery_score,dopamine_load,overall_state,created_at")
      .gte("created_at", since)
      .limit(5000);

    type Bucket = { pattern_type: string; feature_vector: any; outcome_state: string; count: number };
    const buckets = new Map<string, Bucket>();

    for (const s of snaps ?? []) {
      const loadBin = bin(Number(s.cognitive_load ?? 0), 30, 70);
      const recBin = bin(Number(s.recovery_score ?? 0), 40, 70);
      const freshBin = bin(100 - Number(s.dopamine_load ?? 0), 40, 70);
      const ptype = classify(loadBin, recBin, freshBin);
      const fv = { load_24h: loadBin, recovery_24h: recBin, freshness_6h: freshBin };
      const key = `${ptype}|${loadBin}|${recBin}|${freshBin}|${s.overall_state}`;
      const cur = buckets.get(key);
      if (cur) cur.count += 1;
      else buckets.set(key, { pattern_type: ptype, feature_vector: fv, outcome_state: s.overall_state, count: 1 });
    }

    let upserted = 0;
    for (const b of buckets.values()) {
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
          .update({ frequency: (existing.frequency ?? 1) + b.count, last_seen_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("anonymized_pattern_library").insert({
          pattern_type: b.pattern_type,
          feature_vector: b.feature_vector,
          outcome_state: b.outcome_state,
          frequency: b.count,
        });
      }
      upserted++;
    }

    // Prune stale
    await supabase.rpc("cleanup_old_patterns").catch(() => {});

    return new Response(JSON.stringify({ status: "ok", patterns_upserted: upserted, source_snapshots: snaps?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[extract-patterns]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
