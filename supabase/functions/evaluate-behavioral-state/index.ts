// Phase 9 — Behavioral State Evaluator
// Runs nightly at 23:59 local-day cutoff (UTC sweep covers all TZs by running hourly).
// For each user: computes consistency snapshot, NN miss detection, identity tier,
// and emits behavioral_events for downstream pattern detection + Hammer State.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_USER = "00000000-0000-0000-0000-000000000001";

type IdentityTier = "building" | "consistent" | "locked_in" | "elite" | "slipping";

function deriveIdentityTier(score: number, performanceStreak: number, prevTier: IdentityTier | null): IdentityTier {
  if (score < 50) return "slipping";
  if (score >= 90 && performanceStreak >= 21) return "elite";
  if (score >= 80 && performanceStreak >= 10) return "locked_in";
  if (score >= 65) return "consistent";
  return "building";
}

async function evaluateUser(supabase: any, userId: string, todayUTC: string) {
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  // 1. Pull last 30 days of athlete_daily_log
  const { data: logs } = await supabase
    .from("athlete_daily_log")
    .select("entry_date, day_status, injury_mode")
    .eq("user_id", userId)
    .gte("entry_date", since30);

  const statusMap = new Map<string, { status: string; injury: boolean }>();
  for (const l of logs ?? []) statusMap.set(l.entry_date, { status: l.day_status, injury: !!l.injury_mode });

  // 2. Build 30-day window
  let logged = 0, missed = 0, injuryHold = 0, perfStreak = 0, discStreak = 0;
  const today = new Date(todayUTC + "T00:00:00Z");
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
    const ds = d.toISOString().split("T")[0];
    const e = statusMap.get(ds);
    if (e?.injury) { injuryHold++; continue; }
    if (e && e.status !== "missed") logged++; else missed++;
  }

  // Streaks (back from today)
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
    const ds = d.toISOString().split("T")[0];
    const e = statusMap.get(ds);
    if (e && e.status !== "missed") perfStreak++; else break;
  }
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
    const ds = d.toISOString().split("T")[0];
    if (statusMap.has(ds)) discStreak++; else break;
  }

  const denom = Math.max(1, 30 - injuryHold);
  const score = Math.round((logged / denom) * 100);

  // 3. Non-Negotiable miss detection — scan last 7 days
  const { data: nnTemplates } = await supabase
    .from("custom_activity_templates")
    .select("id")
    .eq("user_id", userId)
    .eq("is_non_negotiable", true)
    .is("deleted_at", null);

  const nnIds = (nnTemplates ?? []).map((t: any) => t.id);
  let nnMiss7 = 0;
  if (nnIds.length > 0) {
    const since7 = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const { data: nnLogs } = await supabase
      .from("custom_activity_logs")
      .select("template_id, entry_date, completion_state")
      .eq("user_id", userId)
      .in("template_id", nnIds)
      .gte("entry_date", since7);
    const completedByDay = new Map<string, Set<string>>();
    for (const l of nnLogs ?? []) {
      if (l.completion_state === "completed") {
        if (!completedByDay.has(l.entry_date)) completedByDay.set(l.entry_date, new Set());
        completedByDay.get(l.entry_date)!.add(l.template_id);
      }
    }
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
      const ds = d.toISOString().split("T")[0];
      const done = completedByDay.get(ds) ?? new Set();
      for (const id of nnIds) if (!done.has(id)) nnMiss7++;
    }
  }

  // 4. Damping
  let damp = 1.0;
  if (missed >= 4) damp = 0.85;
  else if (missed >= 2) damp = 0.95;
  if (score >= 80) damp = 1.0;

  // 5. Previous tier (for transition events)
  const { data: prevSnap } = await supabase
    .from("user_consistency_snapshots")
    .select("identity_tier, consistency_score")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevTier = (prevSnap?.identity_tier ?? null) as IdentityTier | null;
  const tier = deriveIdentityTier(score, perfStreak, prevTier);

  // 6. Upsert snapshot
  await supabase.from("user_consistency_snapshots").upsert({
    user_id: userId,
    snapshot_date: todayUTC,
    consistency_score: score,
    logged_days: logged,
    missed_days: missed,
    injury_hold_days: injuryHold,
    performance_streak: perfStreak,
    discipline_streak: discStreak,
    nn_miss_count_7d: nnMiss7,
    identity_tier: tier,
    damping_multiplier: damp,
    inputs: { denom, nn_template_count: nnIds.length },
  }, { onConflict: "user_id,snapshot_date" });

  // 7. Emit behavioral events
  const events: any[] = [];
  if (prevTier && prevTier !== tier) {
    events.push({ user_id: userId, event_type: "identity_tier_change", magnitude: null,
      metadata: { from: prevTier, to: tier, score } });
  }
  if (prevSnap && Number(prevSnap.consistency_score) >= 80 && score < 65) {
    events.push({ user_id: userId, event_type: "consistency_drop",
      magnitude: Number(prevSnap.consistency_score) - score, metadata: {} });
  }
  if (prevSnap && Number(prevSnap.consistency_score) < 65 && score >= 80) {
    events.push({ user_id: userId, event_type: "consistency_recover",
      magnitude: score - Number(prevSnap.consistency_score), metadata: {} });
  }
  if (nnMiss7 > 0) {
    events.push({ user_id: userId, event_type: "nn_miss", magnitude: nnMiss7, metadata: { window_days: 7 } });
  }
  if (events.length) await supabase.from("behavioral_events").insert(events);

  return { userId, score, tier, perfStreak, discStreak, nnMiss7, damp, prevTier };
}

serve(async (req) => {
  const startMs = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const todayUTC = new Date().toISOString().split("T")[0];

    // Eligible users: anyone with athlete_daily_log activity in last 30d, excluding system user
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const { data: activeRows } = await supabase
      .from("athlete_daily_log")
      .select("user_id")
      .gte("entry_date", since30);

    const userIds = Array.from(new Set((activeRows ?? []).map((r: any) => r.user_id)))
      .filter((u) => u !== SYSTEM_USER);

    const results: any[] = [];
    for (const uid of userIds) {
      try { results.push(await evaluateUser(supabase, uid, todayUTC)); }
      catch (e) { results.push({ userId: uid, error: String(e) }); }
    }

    await supabase.from("engine_function_logs").insert({
      function_name: "evaluate-behavioral-state",
      status: "success",
      duration_ms: Date.now() - startMs,
      metadata: { processed: results.length, today: todayUTC },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({ status: "ok", processed: results.length, today: todayUTC }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[evaluate-behavioral-state]", err);
    await supabase.from("engine_function_logs").insert({
      function_name: "evaluate-behavioral-state",
      status: "fail",
      duration_ms: Date.now() - startMs,
      error_message: String(err),
    }).then(() => {}, () => {});
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
