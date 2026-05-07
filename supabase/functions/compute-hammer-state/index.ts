// Compute Hammer State — aggregates last-24h inputs across all neuro systems
// and writes a snapshot to hammer_state_snapshots.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveSeasonPhase, getSeasonProfile, type SeasonPhase } from "../_shared/seasonPhase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Phase 7 — Observability wrapper (silent, never breaks function)
async function logRun(supabase: any, status: 'success'|'fail'|'timeout', startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from('engine_function_logs').insert({
      function_name: 'compute-hammer-state',
      status,
      duration_ms: Date.now() - startMs,
      error_message: error ?? null,
      metadata: metadata ?? {},
    });
  } catch { /* silent */ }
}

interface HammerInputs {
  arousal: Record<string, any>;
  recovery: Record<string, any>;
  motor: Record<string, any>;
  cognitive: Record<string, any>;
  dopamine: Record<string, any>;
}

function clamp(v: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

async function computeForUser(supabase: any, userId: string) {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const since3d = new Date(Date.now() - 3 * DAY_MS).toISOString();
  const inputs: HammerInputs = { arousal: {}, recovery: {}, motor: {}, cognitive: {}, dopamine: {} };

  // Pull all signals in parallel
  const [
    focusQ, texQ, mindQ, perfQ, customQ, physioQ, nutritionQ, moodQ, wearQ,
  ] = await Promise.all([
    supabase.from("vault_focus_quizzes").select("*").eq("user_id", userId)
      .gte("created_at", since3d).order("created_at", { ascending: false }).limit(7),
    supabase.from("tex_vision_sessions").select("*").eq("user_id", userId)
      .gte("created_at", since).order("created_at", { ascending: false }),
    supabase.from("mindfulness_sessions").select("*").eq("user_id", userId)
      .gte("created_at", since).order("created_at", { ascending: false }).limit(5),
    supabase.from("performance_sessions").select("id,module,created_at,perceived_intensity")
      .eq("user_id", userId).is("deleted_at", null)
      .gte("created_at", since3d).order("created_at", { ascending: false }),
    supabase.from("custom_activity_logs").select("id,template_id,entry_date,created_at,actual_duration_minutes")
      .eq("user_id", userId).gte("created_at", since3d).order("created_at", { ascending: false }),
    supabase.from("physio_daily_reports").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(1),
    supabase.from("vault_nutrition_logs").select("id,created_at,minutes_since_last_meal")
      .eq("user_id", userId).gte("created_at", since).order("created_at", { ascending: false }),
    supabase.from("session_start_moods").select("*").eq("user_id", userId)
      .gte("captured_at", since).order("captured_at", { ascending: false }),
    supabase.from("wearable_metrics").select("*").eq("user_id", userId)
      .gte("captured_at", since).order("captured_at", { ascending: false }).limit(1),
  ]);

  // ── AROUSAL: reaction time, mental readiness, tex_vision accuracy ──
  let arousalScore = 50, arousalConf = 0;
  const latestFocus = focusQ.data?.[0];
  if (latestFocus?.reaction_time_ms) {
    // 200ms = elite (100), 500ms = poor (0)
    const rtScore = clamp(100 - ((latestFocus.reaction_time_ms - 200) / 3));
    arousalScore = rtScore;
    arousalConf += 0.4;
    inputs.arousal.reaction_time_ms = latestFocus.reaction_time_ms;
  }
  if (latestFocus?.mental_readiness != null) {
    const mr = clamp(latestFocus.mental_readiness * 10);
    arousalScore = arousalConf > 0 ? (arousalScore + mr) / 2 : mr;
    arousalConf += 0.3;
    inputs.arousal.mental_readiness = latestFocus.mental_readiness;
  }
  if (texQ.data?.length) {
    const accs = texQ.data.map((t: any) => t.accuracy ?? t.score ?? 0).filter((n: number) => n > 0);
    if (accs.length) {
      const avg = accs.reduce((a: number, b: number) => a + b, 0) / accs.length;
      arousalScore = arousalConf > 0 ? (arousalScore + avg) / 2 : avg;
      arousalConf += 0.3;
      inputs.arousal.tex_vision_avg_accuracy = Math.round(avg);
      inputs.arousal.tex_vision_session_count = texQ.data.length;
    }
  }
  if (moodQ.data?.length) {
    const eAvg = moodQ.data.reduce((s: number, m: any) => s + (m.energy ?? 3), 0) / moodQ.data.length;
    inputs.arousal.energy_self_report = +eAvg.toFixed(2);
    arousalScore = (arousalScore * 0.7) + (eAvg * 20 * 0.3);
  }

  // ── RECOVERY: sleep, pain, perceived recovery, regulation ──
  let recoveryScore = 50, recoveryConf = 0;
  if (latestFocus?.hours_slept != null) {
    const sleepScore = clamp(((latestFocus.hours_slept - 4) / 4) * 100);
    recoveryScore = sleepScore;
    recoveryConf += 0.3;
    inputs.recovery.hours_slept = latestFocus.hours_slept;
  }
  if (latestFocus?.sleep_quality != null) {
    const sq = clamp(latestFocus.sleep_quality * 20);
    recoveryScore = recoveryConf > 0 ? (recoveryScore + sq) / 2 : sq;
    recoveryConf += 0.2;
    inputs.recovery.sleep_quality = latestFocus.sleep_quality;
  }
  if (latestFocus?.pain_scale != null) {
    const pain = clamp(100 - latestFocus.pain_scale * 10);
    recoveryScore = (recoveryScore + pain) / 2;
    recoveryConf += 0.2;
    inputs.recovery.pain_scale = latestFocus.pain_scale;
  }
  if (latestFocus?.perceived_recovery != null) {
    const pr = clamp(latestFocus.perceived_recovery * 10);
    recoveryScore = (recoveryScore + pr) / 2;
    recoveryConf += 0.2;
    inputs.recovery.perceived_recovery = latestFocus.perceived_recovery;
  }
  if (physioQ.data?.[0]?.regulation_score != null) {
    const rs = clamp(physioQ.data[0].regulation_score);
    recoveryScore = (recoveryScore + rs) / 2;
    recoveryConf += 0.3;
    inputs.recovery.regulation_score = rs;
  }

  // ── MOTOR LEARNING STATE: based on session spacing ──
  const allSessions = [
    ...(perfQ.data ?? []).map((s: any) => ({ at: s.created_at, src: "perf" })),
    ...(customQ.data ?? []).map((c: any) => ({ at: c.created_at, src: "custom" })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  let motorState: "acquisition" | "consolidation" | "retention" | "idle" = "idle";
  if (allSessions.length > 0) {
    const lastAt = new Date(allSessions[0].at).getTime();
    const ageH = (Date.now() - lastAt) / (60 * 60 * 1000);
    if (ageH < 24) motorState = "acquisition";
    else if (ageH < 72) motorState = "consolidation";
    else motorState = "retention";
    inputs.motor.last_session_hours_ago = +ageH.toFixed(1);
    inputs.motor.session_count_3d = allSessions.length;
  }

  // ── COGNITIVE LOAD ──
  let cognitiveLoad = 0;
  if (texQ.data?.length) {
    cognitiveLoad += Math.min(40, texQ.data.length * 8);
    inputs.cognitive.tex_vision_count_24h = texQ.data.length;
  }
  if (mindQ.data?.length) {
    cognitiveLoad += Math.min(20, mindQ.data.length * 5);
    inputs.cognitive.mindfulness_count_24h = mindQ.data.length;
  }
  if (perfQ.data?.length) {
    const intensitySum = perfQ.data.reduce((s: number, p: any) => s + (p.perceived_intensity ?? 5), 0);
    cognitiveLoad += Math.min(40, intensitySum);
    inputs.cognitive.perf_session_count_3d = perfQ.data.length;
  }
  cognitiveLoad = clamp(cognitiveLoad);

  // ── DOPAMINE THROTTLE: completion frequency in last 6h ──
  const since6h = Date.now() - 6 * 60 * 60 * 1000;
  const recentCompletions = (customQ.data ?? []).filter((c: any) =>
    new Date(c.created_at).getTime() > since6h
  ).length;
  const dopamineLoad = clamp(recentCompletions * 20);
  inputs.dopamine.completions_last_6h = recentCompletions;
  inputs.dopamine.cooldown_recommended = dopamineLoad > 80;

  // Wearable boost
  if (wearQ.data?.[0]?.hrv_ms) {
    inputs.recovery.hrv_ms = wearQ.data[0].hrv_ms;
    recoveryConf += 0.2;
  }

  // Nutrition fuel timing
  if (nutritionQ.data?.[0]?.minutes_since_last_meal != null) {
    inputs.recovery.minutes_since_last_meal = nutritionQ.data[0].minutes_since_last_meal;
  }

  // ── ADDITIVE HOOK 1: Dynamic weights from self-healing optimizer ──
  // Safe fallback: missing table/empty → all multipliers = 1 → identical to static behavior
  let w: Record<string, number> = {};
  try {
    const { data: weights } = await supabase
      .from("engine_dynamic_weights").select("axis,weight");
    w = Object.fromEntries((weights ?? []).map((r: any) => [r.axis, Number(r.weight)]));
  } catch (_) { /* zero-risk fallback */ }

  // ── ADDITIVE HOOK 2: User personalization profile (bounded ±10%) ──
  try {
    const { data: prof } = await supabase
      .from("user_engine_profile").select("*").eq("user_id", userId).maybeSingle();
    if (prof && prof.sample_size >= 10) {
      const sensMod = clamp((Number(prof.sensitivity_to_load) - 1) * 0.1, -0.1, 0.1);
      const recMod  = clamp((Number(prof.recovery_speed) - 1) * 0.1, -0.1, 0.1);
      // Higher sensitivity → recovery feels lower (athlete needs more rest)
      recoveryScore = clamp(recoveryScore * (1 - sensMod));
      // Higher recovery_speed → recovery feels higher
      recoveryScore = clamp(recoveryScore * (1 + recMod));
    }
  } catch (_) { /* zero-risk fallback */ }

  // ── HAMMER STATE v3 — behavior-weighted, time-decayed ──
  let consistencyScore = 50;
  let dampingMultiplier = 1.0;
  let performanceStreak = 0;
  let nnMissCount7d = 0;
  let restDays7d = 0;
  let recoveryModeToday = false;
  let maxRestPerWeek = 2;
  try {
    const { data: snap } = await supabase
      .from("user_consistency_snapshots")
      .select("consistency_score,damping_multiplier,performance_streak,nn_miss_count_7d,rest_days_7d,recovery_mode_today,inputs")
      .eq("user_id", userId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (snap) {
      consistencyScore = Number(snap.consistency_score ?? 50);
      dampingMultiplier = Number(snap.damping_multiplier ?? 1.0);
      performanceStreak = Number(snap.performance_streak ?? 0);
      nnMissCount7d = Number(snap.nn_miss_count_7d ?? 0);
      restDays7d = Number((snap as any).rest_days_7d ?? 0);
      recoveryModeToday = Boolean((snap as any).recovery_mode_today ?? false);
      maxRestPerWeek = Number(((snap as any).inputs?.max_rest_per_week) ?? 2);
    }
  } catch (_) { /* zero-risk fallback */ }

  const since30d = new Date(Date.now() - 30 * DAY_MS).toISOString();
  let bucket48h = 0, bucket3to7 = 0, bucket8to30 = 0;
  try {
    const { data: logs30 } = await supabase
      .from("custom_activity_logs")
      .select("created_at,actual_duration_minutes,completion_state")
      .eq("user_id", userId)
      .gte("created_at", since30d);
    const now = Date.now();
    for (const l of logs30 ?? []) {
      if ((l as any).completion_state !== "completed") continue;
      const ageH = (now - new Date((l as any).created_at).getTime()) / (60 * 60 * 1000);
      const intensity = 1 + Number((l as any).actual_duration_minutes ?? 0) / 60;
      if (ageH <= 48) bucket48h += intensity;
      else if (ageH <= 168) bucket3to7 += intensity;
      else bucket8to30 += intensity;
    }
  } catch (_) { /* fallback: zeros */ }
  const norm = (x: number) => clamp(100 * (1 - Math.exp(-x / 5)));
  const activityScore =
    norm(bucket48h) * 0.50 +
    norm(bucket3to7) * 0.30 +
    norm(bucket8to30) * 0.20;

  const neuroBlend =
    arousalScore        * 0.3 * (w.arousal   ?? 1) +
    recoveryScore       * 0.4 * (w.recovery  ?? 1) +
    (100 - cognitiveLoad) * 0.2 * (w.cognitive ?? 1) +
    (100 - dopamineLoad)  * 0.1 * (w.dopamine  ?? 1);

  const base = (activityScore * 0.55) + (consistencyScore * 0.25) + (neuroBlend * 0.20);
  const nnPenalty = Math.min(nnMissCount7d * 8, 30);
  const streakBoost = Math.min(performanceStreak * 1.5, 15);
  const restFactor = restDays7d <= maxRestPerWeek
    ? 5
    : -Math.min((restDays7d - maxRestPerWeek) * 5, 15);
  let finalScore = clamp(base * dampingMultiplier - nnPenalty + streakBoost + restFactor);

  // ── SEASON PHASE thresholds ──
  // In-season: tighter ceilings → flips to caution/recover sooner to protect bandwidth.
  // Pre-season: standard ceilings.
  // Post-season: very tight (favor recovery).
  // Off-season: looser, allow grinding.
  let seasonPhase: SeasonPhase = 'off_season';
  let seasonPhaseSource: string = 'default';
  try {
    const { data: mpi } = await supabase
      .from('athlete_mpi_settings')
      .select('season_status, preseason_start_date, preseason_end_date, in_season_start_date, in_season_end_date, post_season_start_date, post_season_end_date')
      .eq('user_id', userId)
      .maybeSingle();
    const r = resolveSeasonPhase(mpi ?? null);
    seasonPhase = r.phase;
    seasonPhaseSource = r.source;
  } catch (_) { /* keep defaults */ }
  const PHASE_THRESHOLDS: Record<SeasonPhase, { prime: number; ready: number; caution: number }> = {
    preseason:   { prime: 80, ready: 60, caution: 40 },
    in_season:   { prime: 85, ready: 68, caution: 48 },  // ~15% tighter
    post_season: { prime: 90, ready: 72, caution: 52 },
    off_season:  { prime: 78, ready: 55, caution: 35 },
  };
  const t = PHASE_THRESHOLDS[seasonPhase];

  let overall: "prime" | "ready" | "caution" | "recover" = "ready";
  if (finalScore >= t.prime && recoveryScore >= 60) overall = "prime";
  else if (finalScore >= t.ready) overall = "ready";
  else if (finalScore >= t.caution) overall = "caution";
  else overall = "recover";

  // Recovery mode floor: planned rest day never drops below "ready"
  if (recoveryModeToday && (overall === "recover" || overall === "caution")) {
    overall = "ready";
  }

  const blended = finalScore;

  const confidence = Math.min(1, (arousalConf + recoveryConf) / 2);

  // Insert snapshot
  const { data: inserted, error } = await supabase.from("hammer_state_snapshots").insert({
    user_id: userId,
    arousal_score: +arousalScore.toFixed(1),
    arousal_inputs: inputs.arousal,
    recovery_score: +recoveryScore.toFixed(1),
    recovery_inputs: inputs.recovery,
    motor_state: motorState,
    motor_inputs: inputs.motor,
    cognitive_load: +cognitiveLoad.toFixed(1),
    cognitive_inputs: inputs.cognitive,
    dopamine_load: +dopamineLoad.toFixed(1),
    dopamine_inputs: inputs.dopamine,
    overall_state: overall,
    confidence: +confidence.toFixed(2),
  }).select("id").maybeSingle();
  if (error) throw error;

  // ── ADDITIVE HOOK 3: Fire-and-forget elite layer generation (non-blocking) ──
  if (inserted?.id) {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-elite-layer`;
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ snapshot_id: inserted.id, user_id: userId, state: overall, confidence }),
    }).catch(() => { /* never block engine */ });
  }

  // ── ADDITIVE HOOK 4 (Phase 6): Reproducibility — snapshot_versions row ──
  if (inserted?.id) {
    const outputRow = {
      arousal_score: +arousalScore.toFixed(1),
      recovery_score: +recoveryScore.toFixed(1),
      motor_state: motorState,
      cognitive_load: +cognitiveLoad.toFixed(1),
      dopamine_load: +dopamineLoad.toFixed(1),
      overall_state: overall,
      confidence: +confidence.toFixed(2),
      blended,
    };
    let profileSnap: any = null;
    try {
      const { data: prof } = await supabase
        .from("user_engine_profile").select("*").eq("user_id", userId).maybeSingle();
      profileSnap = prof;
    } catch (_) {}
    supabase.from("engine_snapshot_versions").insert({
      snapshot_id: inserted.id,
      user_id: userId,
      engine_version: "v3.0.0",
      weights: { ...w, hammer_v3: true, activity_w: 0.55, consistency_w: 0.25, neuro_w: 0.20 },
      profile: profileSnap,
      inputs: {
        load_24h: cognitiveLoad,
        recovery_score_used: recoveryScore,
        freshness_6h: recentCompletions,
        consistency_score: consistencyScore,
        damping_multiplier: dampingMultiplier,
        performance_streak: performanceStreak,
        nn_miss_count_7d: nnMissCount7d,
        bucket_48h: bucket48h,
        bucket_3to7: bucket3to7,
        bucket_8to30: bucket8to30,
        activity_score: activityScore,
        neuro_blend: neuroBlend,
        nn_penalty: nnPenalty,
        streak_boost: streakBoost,
        rest_factor: restFactor,
        rest_days_7d: restDays7d,
        recovery_mode_today: recoveryModeToday,
        final_score: finalScore,
        arousal_inputs: inputs.arousal,
        recovery_inputs: inputs.recovery,
        motor_inputs: inputs.motor,
        cognitive_inputs: inputs.cognitive,
        dopamine_inputs: inputs.dopamine,
      },
      output: outputRow,
    }).then(({ error: vErr }: any) => {
      if (vErr) console.warn("[snapshot_versions] insert failed:", vErr.message);
    });
  }

  return { user_id: userId, overall, confidence };
}

serve(async (req) => {
  const startMs = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const targetUser: string | null = body?.user_id ?? null;

    if (targetUser) {
      const result = await computeForUser(supabase, targetUser);
      // Fire-and-forget logging — zero added latency on user-facing path
      try {
        // @ts-ignore EdgeRuntime is available in Supabase edge functions
        EdgeRuntime.waitUntil(logRun(supabase, 'success', startMs, undefined, { mode: 'single', user_id: targetUser }));
      } catch { logRun(supabase, 'success', startMs, undefined, { mode: 'single' }).catch(() => {}); }
      return new Response(JSON.stringify({ status: "ok", result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch mode: all users with activity in last 24h
    const since = new Date(Date.now() - DAY_MS).toISOString();
    const { data: activeUsers } = await supabase
      .from("athlete_mpi_settings")
      .select("user_id")
      .limit(500);

    let processed = 0, failed = 0;
    for (const u of activeUsers ?? []) {
      try {
        await computeForUser(supabase, u.user_id);
        processed++;
      } catch (err) {
        failed++;
        console.error(`[hammer-state] ${u.user_id}:`, err);
      }
    }
    try {
      // @ts-ignore
      EdgeRuntime.waitUntil(logRun(supabase, 'success', startMs, undefined, { mode: 'batch', processed, failed }));
    } catch { logRun(supabase, 'success', startMs, undefined, { mode: 'batch', processed, failed }).catch(() => {}); }
    return new Response(JSON.stringify({ status: "batch", processed, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[hammer-state] fatal:", err);
    try {
      // @ts-ignore
      EdgeRuntime.waitUntil(logRun(supabase, 'fail', startMs, String(err)));
    } catch { logRun(supabase, 'fail', startMs, String(err)).catch(() => {}); }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
