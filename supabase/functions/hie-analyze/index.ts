import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeaknessCluster {
  area: string;
  issue: string;
  why: string;
  impact: "high" | "medium" | "low";
  data_points: Record<string, any>;
}

interface PrescriptiveAction {
  weakness_area: string;
  drills: { name: string; description: string; module: string; constraints: string }[];
}

interface RiskAlert {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
}

// Symptom → Cause → Fix lookup
const LIMITER_MAP: Record<string, { label: string; cause: string; drills: { name: string; description: string; module: string; constraints: string }[] }> = {
  composite_bqi: {
    label: "Batting Quality Breakdown",
    cause: "Weak contact quality and/or high chase rate",
    drills: [
      { name: "Tee Work: Barrel Precision", description: "Focus on center-mass contact with intent", module: "practice-hub", constraints: "3 sets × 15 reps, 80% intent" },
      { name: "Soft Toss: Opposite Field", description: "Train late-barrel path and plate coverage", module: "practice-hub", constraints: "20 reps, game-speed timing" },
      { name: "Recognition Drill", description: "Pitch identification without swinging", module: "tex-vision", constraints: "0.4s window, 30 pitches" },
    ],
  },
  composite_fqi: {
    label: "Fielding Mechanics Gap",
    cause: "Footwork inefficiency or slow exchange time",
    drills: [
      { name: "Ground Ball Funnel", description: "Rapid ground ball reps with throw", module: "practice-hub", constraints: "25 reps, clean field focus" },
      { name: "Bare Hand Drill", description: "Soft hands and quick exchange", module: "practice-hub", constraints: "15 reps, timed exchange" },
    ],
  },
  composite_competitive: {
    label: "Competitive Performance Drop",
    cause: "Practice-to-game transfer gap or pressure response",
    drills: [
      { name: "Pressure At-Bats", description: "Simulated count scenarios with stakes", module: "practice-hub", constraints: "10 ABs, 2-strike focus" },
      { name: "Live Scrimmage Reps", description: "Game-speed competitive reps", module: "practice-hub", constraints: "Full game intent" },
    ],
  },
  composite_decision: {
    label: "Late Decision Making",
    cause: "Below-average recognition time and high chase rate vs spin",
    drills: [
      { name: "Go/No-Go Recognition", description: "Decision-only tracking, no swing", module: "tex-vision", constraints: "0.35s window, 40 pitches" },
      { name: "Whack-a-Mole Advanced", description: "High-speed decision making", module: "tex-vision", constraints: "3 min, chaos mode" },
    ],
  },
};

function computeDevelopmentStatus(scores: { score: number; date: string }[]): { status: string; trend7d: number; trend30d: number } {
  if (scores.length < 2) return { status: "stalled", trend7d: 0, trend30d: 0 };

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);

  const recent = scores[0];
  const week = scores.find(s => new Date(s.date) <= d7) ?? scores[scores.length - 1];
  const month = scores.find(s => new Date(s.date) <= d30) ?? scores[scores.length - 1];

  const trend7d = recent.score - week.score;
  const trend30d = recent.score - month.score;

  // Check consistency (stddev of last 30d scores)
  const last30 = scores.filter(s => new Date(s.date) >= d30);
  const mean = last30.reduce((a, b) => a + b.score, 0) / last30.length;
  const stddev = Math.sqrt(last30.reduce((a, b) => a + (b.score - mean) ** 2, 0) / last30.length);

  let status = "stalled";
  if (trend30d > 5 && trend7d > 2) status = "accelerating";
  else if (trend30d > 2) status = "improving";
  else if (stddev > 8) status = "inconsistent";
  else if (Math.abs(trend30d) <= 1) status = "stalled";

  return { status, trend7d: Math.round(trend7d * 10) / 10, trend30d: Math.round(trend30d * 10) / 10 };
}

function computeReadiness(vaultData: any[]): { score: number; recommendation: string } {
  if (!vaultData || vaultData.length === 0) return { score: 70, recommendation: "No readiness data — train at moderate intensity" };

  const latest = vaultData[0];
  const sleep = latest.sleep_quality ?? 3;
  const stress = latest.stress_level ?? 3;
  const pain = latest.pain_level ?? 0;

  const sleepScore = (sleep / 5) * 40;
  const stressScore = ((5 - stress) / 5) * 30;
  const painPenalty = Math.min(pain * 5, 30);
  const score = Math.round(Math.max(0, Math.min(100, sleepScore + stressScore + 30 - painPenalty)));

  let recommendation: string;
  if (score >= 80) recommendation = "You are " + score + "% ready → Train full intent";
  else if (score >= 60) recommendation = "You are " + score + "% ready → Standard training volume";
  else if (score >= 40) recommendation = "You are " + score + "% ready → Reduce volume, focus on timing and mechanics";
  else recommendation = "You are " + score + "% ready → Active recovery only";

  return { score, recommendation };
}

function computeConfidence(sessionCount: number, dataRecencyDays: number, hasCoachValidation: boolean): number {
  let score = 0;
  // Session volume (max 40 pts)
  score += Math.min(sessionCount / 30 * 40, 40);
  // Data recency (max 30 pts)
  if (dataRecencyDays <= 2) score += 30;
  else if (dataRecencyDays <= 7) score += 20;
  else if (dataRecencyDays <= 14) score += 10;
  // Coach validation (max 30 pts)
  if (hasCoachValidation) score += 30;
  return Math.round(score);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { user_id, sport = "baseball" } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Fetch MPI scores (all time, ordered by date)
    const { data: mpiScores } = await supabase
      .from("mpi_scores")
      .select("adjusted_global_score, composite_bqi, composite_fqi, composite_competitive, composite_decision, calculation_date")
      .eq("user_id", user_id)
      .order("calculation_date", { ascending: false })
      .limit(30);

    // 2. Fetch recent sessions (90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
    const { data: sessions } = await supabase
      .from("performance_sessions")
      .select("id, session_type, session_date, player_grade, drill_blocks, micro_layer_data, coach_grade, created_at")
      .eq("user_id", user_id)
      .gte("session_date", ninetyDaysAgo)
      .is("deleted_at", null)
      .order("session_date", { ascending: false });

    // 3. Fetch vault data (readiness)
    const { data: vaultData } = await supabase
      .from("vault_focus_quizzes")
      .select("sleep_quality, stress_level, pain_level, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(7);

    // 4. Fetch daily log (overtraining detection)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
    const { data: dailyLogs } = await supabase
      .from("athlete_daily_log")
      .select("day_status, entry_date, cns_load_actual")
      .eq("user_id", user_id)
      .gte("entry_date", fourteenDaysAgo)
      .order("entry_date", { ascending: false });

    // 5. Fetch MPI settings (coach validation)
    const { data: settings } = await supabase
      .from("athlete_mpi_settings")
      .select("coach_validation_met, primary_coach_id")
      .eq("user_id", user_id)
      .maybeSingle();

    // === COMPUTE DEVELOPMENT STATUS ===
    const scoreHistory = (mpiScores ?? []).map((s: any) => ({
      score: s.adjusted_global_score ?? 0,
      date: s.calculation_date,
    }));
    const { status: developmentStatus, trend7d, trend30d } = computeDevelopmentStatus(scoreHistory);

    // === COMPUTE PRIMARY LIMITER + WEAKNESS CLUSTERS ===
    const latestMPI = mpiScores?.[0];
    const composites: Record<string, number> = {
      composite_bqi: latestMPI?.composite_bqi ?? 50,
      composite_fqi: latestMPI?.composite_fqi ?? 50,
      composite_competitive: latestMPI?.composite_competitive ?? 50,
      composite_decision: latestMPI?.composite_decision ?? 50,
    };

    const sortedComposites = Object.entries(composites).sort(([, a], [, b]) => a - b);
    const bottomThree = sortedComposites.slice(0, 3);

    const primaryLimiterKey = bottomThree[0][0];
    const limiterInfo = LIMITER_MAP[primaryLimiterKey] ?? { label: "General Development Needed", cause: "Multiple areas need attention", drills: [] };
    const primaryLimiter = limiterInfo.label;

    const weaknessClusters: WeaknessCluster[] = bottomThree.map(([key, value]) => {
      const info = LIMITER_MAP[key];
      return {
        area: key,
        issue: info?.label ?? key.replace("composite_", "").toUpperCase() + " needs work",
        why: info?.cause ?? "Score below average",
        impact: value < 35 ? "high" : value < 45 ? "medium" : "low",
        data_points: { score: value },
      };
    });

    // === PRESCRIPTIVE ACTIONS ===
    const prescriptiveActions: PrescriptiveAction[] = bottomThree.map(([key]) => {
      const info = LIMITER_MAP[key];
      return {
        weakness_area: info?.label ?? key,
        drills: info?.drills ?? [],
      };
    });

    // === READINESS ===
    const { score: readinessScore, recommendation: readinessRecommendation } = computeReadiness(vaultData ?? []);

    // === RISK ALERTS ===
    const riskAlerts: RiskAlert[] = [];

    // Overtraining check
    const heavyDays = (dailyLogs ?? []).filter((l: any) => ["full_training", "game_only"].includes(l.day_status));
    if (heavyDays.length >= 12) {
      riskAlerts.push({ type: "overtraining", severity: "warning", message: `${heavyDays.length} heavy days in last 14. Schedule recovery.` });
    }

    // Decline check (3+ sessions with dropping grades)
    const recentGrades = (sessions ?? []).slice(0, 5).map((s: any) => s.player_grade).filter(Boolean);
    if (recentGrades.length >= 3) {
      const declining = recentGrades.every((g: number, i: number) => i === 0 || g <= recentGrades[i - 1]);
      if (declining && recentGrades[0] < recentGrades[recentGrades.length - 1]) {
        riskAlerts.push({ type: "decline", severity: "warning", message: "Performance declining across recent sessions" });
      }
    }

    // Stagnation
    if (developmentStatus === "stalled" && (sessions ?? []).length > 10) {
      riskAlerts.push({ type: "stagnation", severity: "info", message: "Progress has plateaued. Consider varying training approach." });
    }

    // === DEVELOPMENT CONFIDENCE ===
    const sessionCount = (sessions ?? []).length;
    const lastSessionDate = sessions?.[0]?.session_date;
    const dataRecencyDays = lastSessionDate ? Math.floor((Date.now() - new Date(lastSessionDate).getTime()) / 86400000) : 999;
    const developmentConfidence = computeConfidence(sessionCount, dataRecencyDays, settings?.coach_validation_met ?? false);

    // === MPI SCORE ===
    const mpiScore = latestMPI?.adjusted_global_score ?? null;

    // === UPSERT SNAPSHOT ===
    const snapshot = {
      user_id,
      sport,
      computed_at: new Date().toISOString(),
      development_status: developmentStatus,
      primary_limiter: primaryLimiter,
      weakness_clusters: weaknessClusters,
      prescriptive_actions: prescriptiveActions,
      readiness_score: readinessScore,
      readiness_recommendation: readinessRecommendation,
      risk_alerts: riskAlerts,
      development_confidence: developmentConfidence,
      smart_week_plan: [],
      before_after_trends: [],
      drill_effectiveness: [],
      mpi_score: mpiScore,
      mpi_trend_7d: trend7d,
      mpi_trend_30d: trend30d,
    };

    const { error: upsertError } = await supabase
      .from("hie_snapshots")
      .upsert(snapshot, { onConflict: "user_id,sport" });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify(snapshot), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("HIE analyze error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
