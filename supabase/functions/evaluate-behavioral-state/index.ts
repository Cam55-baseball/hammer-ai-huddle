// Phase 9 — Behavioral State Evaluator (v2: custom_activity_logs as source of truth)
// Source: custom_activity_logs (completion_state='completed' = logged day)
// Override: athlete_daily_log.injury_mode = injury_hold day
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_USER = "00000000-0000-0000-0000-000000000001";

type IdentityTier = "building" | "consistent" | "locked_in" | "elite" | "slipping";

function deriveIdentityTier(score: number, performanceStreak: number, _prev: IdentityTier | null): IdentityTier {
  if (score < 50) return "slipping";
  if (score >= 90 && performanceStreak >= 21) return "elite";
  if (score >= 80 && performanceStreak >= 10) return "locked_in";
  if (score >= 65) return "consistent";
  return "building";
}

function dayStr(d: Date): string { return d.toISOString().split("T")[0]; }

async function evaluateUser(supabase: any, userId: string, todayUTC: string) {
  const since30 = dayStr(new Date(Date.now() - 30 * 86400000));

  // 1. Activity completions from custom_activity_logs (source of truth)
  const { data: actLogs } = await supabase
    .from("custom_activity_logs")
    .select("entry_date, completion_state, template_id")
    .eq("user_id", userId)
    .gte("entry_date", since30);

  // completedByDay: dates that had ≥1 completed activity
  // anyLogByDay: dates that had ANY activity row (for discipline streak)
  const completedByDay = new Set<string>();
  const anyLogByDay = new Set<string>();
  const completedTemplatesByDay = new Map<string, Set<string>>();
  for (const l of actLogs ?? []) {
    anyLogByDay.add(l.entry_date);
    if (l.completion_state === "completed") {
      completedByDay.add(l.entry_date);
      if (!completedTemplatesByDay.has(l.entry_date)) completedTemplatesByDay.set(l.entry_date, new Set());
      completedTemplatesByDay.get(l.entry_date)!.add(l.template_id);
    }
  }

  // 2. Injury overrides from athlete_daily_log
  const { data: dailyLogs } = await supabase
    .from("athlete_daily_log")
    .select("entry_date, injury_mode")
    .eq("user_id", userId)
    .gte("entry_date", since30);

  const injuryByDay = new Set<string>();
  for (const d of dailyLogs ?? []) if (d.injury_mode) injuryByDay.add(d.entry_date);

  // 3. 30-day window
  const today = new Date(todayUTC + "T00:00:00Z");
  let logged = 0, missed = 0, injuryHold = 0;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
    const ds = dayStr(d);
    if (injuryByDay.has(ds)) { injuryHold++; continue; }
    if (completedByDay.has(ds)) logged++;
    else missed++;
  }

  // 4. NN templates
  const { data: nnTemplates } = await supabase
    .from("custom_activity_templates")
    .select("id")
    .eq("user_id", userId)
    .eq("is_non_negotiable", true)
    .is("deleted_at", null);
  const nnIds: string[] = (nnTemplates ?? []).map((t: any) => t.id);

  // 5. Streaks back from today
  // performance_streak: consecutive days with NN met (or any completion if no NN templates), break on miss
  // discipline_streak: consecutive days with ANY activity row, break on empty day
  let perfStreak = 0, discStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
    const ds = dayStr(d);
    if (injuryByDay.has(ds)) continue; // injury days don't break streaks
    let dayMetPerf: boolean;
    if (nnIds.length > 0) {
      const done = completedTemplatesByDay.get(ds) ?? new Set<string>();
      dayMetPerf = nnIds.every(id => done.has(id));
    } else {
      dayMetPerf = completedByDay.has(ds);
    }
    if (dayMetPerf) perfStreak++; else break;
  }
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
    const ds = dayStr(d);
    if (injuryByDay.has(ds)) continue;
    if (anyLogByDay.has(ds)) discStreak++; else break;
  }

  const denom = Math.max(1, 30 - injuryHold);
  const score = Math.round((logged / denom) * 100);

  // 6. NN miss count (last 7d)
  let nnMiss7 = 0;
  if (nnIds.length > 0) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
      const ds = dayStr(d);
      if (injuryByDay.has(ds)) continue;
      const done = completedTemplatesByDay.get(ds) ?? new Set<string>();
      for (const id of nnIds) if (!done.has(id)) nnMiss7++;
    }
  }

  // 7. Damping
  let damp = 1.0;
  if (missed >= 4) damp = 0.85;
  else if (missed >= 2) damp = 0.95;
  if (score >= 80) damp = 1.0;

  // 8. Previous tier
  const { data: prevSnap } = await supabase
    .from("user_consistency_snapshots")
    .select("identity_tier, consistency_score")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevTier = (prevSnap?.identity_tier ?? null) as IdentityTier | null;
  const tier = deriveIdentityTier(score, perfStreak, prevTier);

  // 9. Upsert snapshot
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
    inputs: { denom, nn_template_count: nnIds.length, source: "custom_activity_logs_v2" },
  }, { onConflict: "user_id,snapshot_date" });

  // 10. Behavioral events
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
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const targetUser: string | null = body?.user_id ?? null;

    let userIds: string[];
    if (targetUser && targetUser !== SYSTEM_USER) {
      userIds = [targetUser];
    } else {
      // Eligible: anyone with custom_activity_logs in last 30d, excluding system user
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const { data: activeRows } = await supabase
        .from("custom_activity_logs")
        .select("user_id")
        .gte("entry_date", since30)
        .neq("user_id", SYSTEM_USER);
      userIds = Array.from(new Set((activeRows ?? []).map((r: any) => r.user_id)))
        .filter((u) => u !== SYSTEM_USER);
    }

    const results: any[] = [];
    for (const uid of userIds) {
      try { results.push(await evaluateUser(supabase, uid, todayUTC)); }
      catch (e) { results.push({ userId: uid, error: String(e) }); }
    }

    await supabase.from("engine_function_logs").insert({
      function_name: "evaluate-behavioral-state",
      status: "success",
      duration_ms: Date.now() - startMs,
      metadata: { processed: results.length, today: todayUTC, source: "custom_activity_logs_v2" },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({ status: "ok", processed: results.length, today: todayUTC, results }),
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
