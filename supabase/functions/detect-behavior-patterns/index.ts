// Phase 9 — Behavior Pattern Detection
// Mines behavioral_events + athlete_daily_log for recurring patterns:
// weekday_skip, time_of_day_drift, post_game_collapse, nn_avoidance,
// recovery_responder, streak_fragile, streak_resilient
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_USER = "00000000-0000-0000-0000-000000000001";
const WINDOW_DAYS = 60;

async function detectForUser(supabase: any, userId: string) {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString().split("T")[0];

  const { data: dlog } = await supabase
    .from("athlete_daily_log")
    .select("entry_date, day_status, injury_mode")
    .eq("user_id", userId)
    .gte("entry_date", since);

  const { data: events } = await supabase
    .from("behavioral_events")
    .select("event_type, event_date, magnitude, metadata, created_at")
    .eq("user_id", userId)
    .gte("event_date", since);

  const patterns: Array<{ key: string; type: string; confidence: number; meta: any }> = [];

  // Pattern 1 — weekday_skip: which weekday gets missed most often
  const weekdayMiss: Record<number, number> = {};
  const weekdayTotal: Record<number, number> = {};
  for (const r of dlog ?? []) {
    const d = new Date(r.entry_date + "T00:00:00Z").getUTCDay();
    weekdayTotal[d] = (weekdayTotal[d] ?? 0) + 1;
    if (r.day_status === "missed") weekdayMiss[d] = (weekdayMiss[d] ?? 0) + 1;
  }
  for (const k of Object.keys(weekdayMiss)) {
    const day = Number(k);
    const rate = weekdayMiss[day] / Math.max(1, weekdayTotal[day]);
    if (rate >= 0.5 && weekdayTotal[day] >= 4) {
      patterns.push({
        key: `weekday_skip_${day}`,
        type: "weekday_skip",
        confidence: Math.min(1, rate),
        meta: { weekday: day, miss_rate: rate, sample: weekdayTotal[day] },
      });
    }
  }

  // Pattern 2 — nn_avoidance: nn_miss events appearing repeatedly
  const nnMisses = (events ?? []).filter((e: any) => e.event_type === "nn_miss");
  if (nnMisses.length >= 3) {
    patterns.push({
      key: "nn_avoidance",
      type: "nn_avoidance",
      confidence: Math.min(1, nnMisses.length / 10),
      meta: { count: nnMisses.length, window_days: WINDOW_DAYS },
    });
  }

  // Pattern 3 — recovery_responder: consistency_recover events
  const recoveries = (events ?? []).filter((e: any) => e.event_type === "consistency_recover");
  const drops = (events ?? []).filter((e: any) => e.event_type === "consistency_drop");
  if (recoveries.length >= 2 && recoveries.length >= drops.length) {
    patterns.push({
      key: "recovery_responder",
      type: "recovery_responder",
      confidence: Math.min(1, recoveries.length / 5),
      meta: { recoveries: recoveries.length, drops: drops.length },
    });
  }

  // Pattern 4 — streak_fragile vs resilient: tier flapping
  const tierChanges = (events ?? []).filter((e: any) => e.event_type === "identity_tier_change");
  if (tierChanges.length >= 4) {
    patterns.push({
      key: "streak_fragile",
      type: "streak_fragile",
      confidence: Math.min(1, tierChanges.length / 8),
      meta: { changes: tierChanges.length, window_days: WINDOW_DAYS },
    });
  } else if (tierChanges.length <= 1 && (dlog?.length ?? 0) >= 30) {
    patterns.push({
      key: "streak_resilient",
      type: "streak_resilient",
      confidence: 0.7,
      meta: { changes: tierChanges.length, sample: dlog?.length ?? 0 },
    });
  }

  // Upsert patterns
  for (const p of patterns) {
    await supabase.from("user_behavior_patterns").upsert({
      user_id: userId,
      pattern_key: p.key,
      pattern_type: p.type,
      confidence: p.confidence,
      occurrences: 1,
      last_seen_at: new Date().toISOString(),
      metadata: p.meta,
    }, { onConflict: "user_id,pattern_key" });
  }

  return { userId, detected: patterns.length };
}

serve(async (req) => {
  const startMs = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString().split("T")[0];
    const { data: rows } = await supabase
      .from("athlete_daily_log")
      .select("user_id")
      .gte("entry_date", since);
    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)))
      .filter((u) => u !== SYSTEM_USER);

    const results: any[] = [];
    for (const uid of userIds) {
      try { results.push(await detectForUser(supabase, uid)); }
      catch (e) { results.push({ userId: uid, error: String(e) }); }
    }

    await supabase.from("engine_function_logs").insert({
      function_name: "detect-behavior-patterns",
      status: "success",
      duration_ms: Date.now() - startMs,
      metadata: { processed: results.length },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({ status: "ok", processed: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[detect-behavior-patterns]", err);
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
