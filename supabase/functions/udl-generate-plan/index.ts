import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Inline defaults (mirrors src/data/udlDefaults.ts for edge runtime) ───

interface ConstraintDef {
  key: string;
  label: string;
  category: string;
  threshold: number;
  severity_weight: number;
  description: string;
}

interface DrillTemplate {
  drill_key: string;
  drill_name: string;
  setup: string;
  execution: string;
  constraints: string[];
  reps: string;
  goal_metric: string;
  difficulty_level: number;
  is_high_intensity: boolean;
}

const CONSTRAINTS: ConstraintDef[] = [
  { key: "late_timing_vs_velocity", label: "Late Timing vs Velocity", category: "timing", threshold: 45, severity_weight: 9, description: "Consistently late on fastballs." },
  { key: "early_timing_offspeed", label: "Early Timing on Off-Speed", category: "timing", threshold: 45, severity_weight: 8, description: "Pulling off against off-speed." },
  { key: "poor_pitch_selection", label: "Poor Pitch Selection", category: "decision", threshold: 40, severity_weight: 10, description: "Swinging at pitches outside the zone." },
  { key: "low_contact_quality", label: "Low Contact Quality", category: "execution", threshold: 42, severity_weight: 8, description: "Weak contact or mis-hits." },
  { key: "slow_reaction_time", label: "Slow Reaction Time", category: "reaction", threshold: 40, severity_weight: 7, description: "CNS reaction speed below baseline." },
  { key: "low_explosiveness", label: "Low Explosiveness", category: "explosiveness", threshold: 38, severity_weight: 6, description: "Sprint speed below targets." },
  { key: "fatigue_risk", label: "Neurological Fatigue Risk", category: "readiness", threshold: 35, severity_weight: 10, description: "Elevated fatigue indicators." },
  { key: "execution_inconsistency", label: "Execution Inconsistency", category: "execution", threshold: 44, severity_weight: 7, description: "High variance in execution." },
];

const PRESCRIPTIONS: Record<string, DrillTemplate[]> = {
  late_timing_vs_velocity: [
    { drill_key: "high_velo_inner_third", drill_name: "High Velocity Inner Third", setup: "Machine at 85-95 MPH, inner third.", execution: "Start load before release. Aggressive hip rotation.", constraints: ["No stride delay", "Attack early"], reps: "3 × 8 swings", goal_metric: "≥75% on-time contact", difficulty_level: 4, is_high_intensity: true },
    { drill_key: "timing_trigger_drill", drill_name: "Timing Trigger Drill", setup: "Front toss at varied speeds.", execution: "Initiate load on trigger call.", constraints: ["Consistent load timing"], reps: "3 × 10 swings", goal_metric: "Load within 50ms of trigger", difficulty_level: 3, is_high_intensity: false },
  ],
  early_timing_offspeed: [
    { drill_key: "changeup_recognition", drill_name: "Changeup Recognition", setup: "Mixed FB/CH sequence, 60-40 off-speed.", execution: "Hold stride longer. Read spin.", constraints: ["Stay back", "Read spin first"], reps: "3 × 10 pitches", goal_metric: "≥70% correct decisions", difficulty_level: 4, is_high_intensity: false },
    { drill_key: "two_speed_tracking", drill_name: "Two-Speed Tracking", setup: "Alternate FB and off-speed every 2 pitches.", execution: "Same load rhythm. Hands adjust only.", constraints: ["Same load rhythm"], reps: "2 × 12 pitches", goal_metric: "Consistent barrel path", difficulty_level: 3, is_high_intensity: false },
  ],
  poor_pitch_selection: [
    { drill_key: "zone_discipline_drill", drill_name: "Zone Discipline Drill", setup: "Live pitching. Call ball/strike before arrival.", execution: "Only swing at designated zone.", constraints: ["No chasing", "Pre-pitch plan"], reps: "3 × 12 pitches", goal_metric: "≥80% correct decisions", difficulty_level: 3, is_high_intensity: false },
    { drill_key: "pitch_recognition_flash", drill_name: "Pitch Recognition Flash", setup: "Video or Tex Vision spin module.", execution: "ID pitch type within 200ms.", constraints: ["Trust first instinct"], reps: "50 reps", goal_metric: "≥85% accuracy", difficulty_level: 2, is_high_intensity: false },
  ],
  low_contact_quality: [
    { drill_key: "barrel_precision_tee", drill_name: "Barrel Precision Tee Work", setup: "Tee at various heights/depths.", execution: "Center-barrel contact every swing.", constraints: ["Center contact", "Full extension"], reps: "4 × 10 swings", goal_metric: "≥80% barrel contact", difficulty_level: 2, is_high_intensity: false },
    { drill_key: "live_bp_quality_focus", drill_name: "Live BP – Quality Focus", setup: "Standard BP, quality over distance.", execution: "Hit line drives. Rate each contact 1-5.", constraints: ["Line drives only"], reps: "3 × 8 swings", goal_metric: "Avg rating ≥ 3.5", difficulty_level: 3, is_high_intensity: true },
  ],
  slow_reaction_time: [
    { drill_key: "reaction_ball_work", drill_name: "Reaction Ball Work", setup: "Reaction ball against wall.", execution: "React and catch. Increase distance.", constraints: ["Athletic stance", "Quick first step"], reps: "3 × 2 minutes", goal_metric: "≥80% catch rate", difficulty_level: 2, is_high_intensity: false },
    { drill_key: "light_board_reaction", drill_name: "Light Board Reaction Training", setup: "BlazePod or Tex Vision system.", execution: "Touch lights ASAP.", constraints: ["Stay balanced"], reps: "3 × 30 seconds", goal_metric: "Avg < 400ms", difficulty_level: 3, is_high_intensity: true },
  ],
  low_explosiveness: [
    { drill_key: "sprint_acceleration_work", drill_name: "Sprint Acceleration Work", setup: "10-yd and 20-yd sprint starts.", execution: "Explosive first step. Full recovery.", constraints: ["Max effort"], reps: "6 × 10yd, 4 × 20yd", goal_metric: "Improve 10-yd by 0.05s", difficulty_level: 4, is_high_intensity: true },
    { drill_key: "plyometric_box_jumps", drill_name: "Plyometric Box Jumps", setup: "Box at knee-hip height.", execution: "Explosive jump. Soft landing.", constraints: ["Full hip extension"], reps: "3 × 6 jumps", goal_metric: "Consistent height", difficulty_level: 3, is_high_intensity: true },
  ],
  fatigue_risk: [
    { drill_key: "active_recovery_movement", drill_name: "Active Recovery Movement", setup: "Light movement flow.", execution: "Dynamic stretching, foam rolling, band work.", constraints: ["Keep heart rate low"], reps: "15-20 minutes", goal_metric: "No fatigue increase", difficulty_level: 1, is_high_intensity: false },
    { drill_key: "visual_focus_meditation", drill_name: "Visual Focus & Meditation", setup: "Quiet space.", execution: "Box breathing. Visualization.", constraints: ["Stay present"], reps: "10-15 minutes", goal_metric: "Reduced fatigue", difficulty_level: 1, is_high_intensity: false },
  ],
  execution_inconsistency: [
    { drill_key: "controlled_rep_tracking", drill_name: "Controlled Rep Tracking", setup: "Tee or soft toss. Self-grade each rep.", execution: "Rate 1-5. Aim for consistency.", constraints: ["Honest self-assessment"], reps: "4 × 10 swings", goal_metric: "Std dev < 1.0", difficulty_level: 2, is_high_intensity: false },
    { drill_key: "pressure_simulation_set", drill_name: "Pressure Simulation Set", setup: "Live BP with at-bat scenarios.", execution: "Quality contact over power.", constraints: ["Situational hitting"], reps: "3 × 6 at-bats", goal_metric: "≥65% quality ABs", difficulty_level: 4, is_high_intensity: true },
  ],
};

// ─── Helpers ───

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function reactionMsToScore(ms: number): number {
  if (ms <= 200) return 100;
  if (ms >= 600) return 0;
  return clamp(((600 - ms) / 400) * 100);
}

function sprintToScore(seconds: number): number {
  if (seconds <= 6.5) return 100;
  if (seconds >= 8.5) return 0;
  return clamp(((8.5 - seconds) / 2.0) * 100);
}

// ─── Feedback Loop: Compute difficulty adjustment from recent completions ───

async function computeFeedbackAdjustment(
  serviceClient: any,
  userId: string,
  sevenDaysAgo: string,
): Promise<{ difficulty_delta: number; reason: string } | null> {
  // Get last 7 days of plans + completions
  const { data: recentPlans } = await serviceClient
    .from("udl_daily_plans")
    .select("id, prescribed_drills, plan_date")
    .eq("user_id", userId)
    .gte("plan_date", sevenDaysAgo)
    .order("plan_date", { ascending: true });

  if (!recentPlans || recentPlans.length < 3) return null;

  const { data: recentCompletions } = await serviceClient
    .from("udl_drill_completions")
    .select("plan_id, drill_key, completed_at")
    .eq("user_id", userId)
    .in("plan_id", recentPlans.map((p: any) => p.id));

  const completionSet = new Set(
    (recentCompletions ?? [])
      .filter((c: any) => c.completed_at)
      .map((c: any) => `${c.plan_id}:${c.drill_key}`),
  );

  // Calculate daily compliance
  const dailyRates: number[] = [];
  for (const plan of recentPlans) {
    const drills = plan.prescribed_drills ?? [];
    if (drills.length === 0) continue;
    const completed = drills.filter((d: any) =>
      completionSet.has(`${plan.id}:${d.drill_key}`),
    ).length;
    dailyRates.push(completed / drills.length);
  }

  if (dailyRates.length < 3) return null;

  // Check last 3 days for streak pattern
  const last3 = dailyRates.slice(-3);
  const highStreak = last3.every((r) => r >= 0.8);
  const lowStreak = last3.every((r) => r < 0.3);

  if (highStreak) {
    return { difficulty_delta: 1, reason: "3+ day completion streak (≥80%)" };
  }
  if (lowStreak) {
    return { difficulty_delta: -1, reason: "3+ day low completion (<30%)" };
  }
  return null;
}

// ─── Main handler ───

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    // Check for existing plan today
    const today = new Date().toISOString().split("T")[0];
    const { data: existingPlan } = await supabase
      .from("udl_daily_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_date", today)
      .maybeSingle();

    if (existingPlan) {
      return new Response(JSON.stringify({ plan: existingPlan, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── 1. Gather data (parallel) ───

    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    const [sessionsRes, mpiRes, vaultRes, speedRes] = await Promise.all([
      supabase
        .from("performance_sessions")
        .select("id, effective_grade, drill_blocks, composite_indexes, session_date, module")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .gte("session_date", fourteenDaysAgo)
        .order("session_date", { ascending: false })
        .limit(20),
      supabase
        .from("mpi_scores")
        .select("composite_decision, composite_competitive, composite_bqi, composite_fqi, adjusted_global_score")
        .eq("user_id", userId)
        .order("calculation_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("vault_focus_quizzes")
        .select("physical_readiness, sleep_quality, perceived_recovery, reaction_time_ms, stress_level")
        .eq("user_id", userId)
        .order("quiz_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("speed_lab_sessions")
        .select("sprint_60_time, sprint_home_to_first")
        .eq("user_id", userId)
        .order("session_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const sessions = sessionsRes.data ?? [];
    const mpi = mpiRes.data;
    const vault = vaultRes.data;
    const speed = speedRes.data;

    // ─── 2. Normalize into PlayerState ───

    let timingScore = 50;
    if (sessions.length > 0) {
      const grades = sessions.map((s: any) => s.effective_grade ?? 50);
      const avg = grades.reduce((a: number, b: number) => a + b, 0) / grades.length;
      timingScore = clamp(avg * 1.1);
    }

    let decisionScore = 50;
    if (mpi?.composite_decision != null) {
      decisionScore = clamp(mpi.composite_decision);
    }

    let executionScore = 50;
    if (sessions.length >= 3) {
      const grades = sessions.map((s: any) => s.effective_grade ?? 50);
      const avg = grades.reduce((a: number, b: number) => a + b, 0) / grades.length;
      const variance = grades.reduce((acc: number, g: number) => acc + (g - avg) ** 2, 0) / grades.length;
      const stdDev = Math.sqrt(variance);
      executionScore = clamp(avg - stdDev * 0.5);
    }

    let reactionScore = 50;
    if (vault?.reaction_time_ms != null) {
      reactionScore = reactionMsToScore(vault.reaction_time_ms);
    }

    let explosivenessScore = 50;
    if (speed?.sprint_60_time != null) {
      explosivenessScore = sprintToScore(speed.sprint_60_time);
    } else if (speed?.sprint_home_to_first != null) {
      const h2f = speed.sprint_home_to_first;
      explosivenessScore = h2f <= 4.2 ? 100 : h2f >= 5.5 ? 0 : clamp(((5.5 - h2f) / 1.3) * 100);
    }

    let readinessScore = 60;
    let fatigueFlag = false;
    const sleepQuality = (vault as any)?.sleep_quality ?? 3;
    const stressLevel = (vault as any)?.stress_level ?? 2;

    if (vault) {
      const physical = vault.physical_readiness ?? 3;
      const sleep = sleepQuality;
      const recovery = vault.perceived_recovery ?? 3;
      readinessScore = clamp(((physical + sleep + recovery) / 15) * 100);
      fatigueFlag = readinessScore < 40;
    }

    let inconsistencyScore = 60;
    if (sessions.length >= 5) {
      const grades = sessions.map((s: any) => s.effective_grade ?? 50);
      const avg = grades.reduce((a: number, b: number) => a + b, 0) / grades.length;
      const variance = grades.reduce((acc: number, g: number) => acc + (g - avg) ** 2, 0) / grades.length;
      const stdDev = Math.sqrt(variance);
      inconsistencyScore = clamp(100 - stdDev * 5);
    }

    const playerState: Record<string, number | boolean> = {
      timing_score: timingScore,
      decision_score: decisionScore,
      execution_score: executionScore,
      reaction_score: reactionScore,
      explosiveness_score: explosivenessScore,
      readiness_score: readinessScore,
      fatigue_flag: fatigueFlag,
      inconsistency_score: inconsistencyScore,
      sessions_count: sessions.length,
    };

    // ─── 3. Load owner overrides ───

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: overrides } = await serviceClient
      .from("udl_constraint_overrides")
      .select("constraint_key, threshold_overrides, enabled, prescription_overrides");

    const overrideMap = new Map<string, any>();
    (overrides ?? []).forEach((o: any) => overrideMap.set(o.constraint_key, o));

    // ─── 3b. Feedback Loop (Phase 3) ───

    const feedbackAdj = await computeFeedbackAdjustment(serviceClient, userId, sevenDaysAgo);
    const feedbackApplied = feedbackAdj ?? {};

    // ─── 4. Diagnose: find constraints ───

    const scoreMap: Record<string, number> = {
      late_timing_vs_velocity: timingScore,
      early_timing_offspeed: timingScore,
      poor_pitch_selection: decisionScore,
      low_contact_quality: executionScore,
      slow_reaction_time: reactionScore,
      low_explosiveness: explosivenessScore,
      fatigue_risk: readinessScore,
      execution_inconsistency: inconsistencyScore,
    };

    type DetectedConstraint = { key: string; label: string; score: number; severity: number; description: string };
    const detected: DetectedConstraint[] = [];

    for (const c of CONSTRAINTS) {
      const override = overrideMap.get(c.key);
      if (override?.enabled === false) continue;

      const threshold = override?.threshold_overrides?.threshold ?? c.threshold;
      const score = scoreMap[c.key] ?? 50;

      if (score < threshold) {
        detected.push({
          key: c.key,
          label: c.label,
          score,
          severity: c.severity_weight * ((threshold - score) / threshold),
          description: c.description,
        });
      }
    }

    detected.sort((a, b) => b.severity - a.severity);
    const top3 = detected.slice(0, 3);

    // ─── 5. Prescribe drills (with feedback difficulty adjustment) ───

    const difficultyDelta = feedbackAdj?.difficulty_delta ?? 0;

    let prescribedDrills: any[] = [];
    for (const constraint of top3) {
      const override = overrideMap.get(constraint.key);
      let drills: DrillTemplate[];

      if (override?.prescription_overrides?.drills) {
        drills = override.prescription_overrides.drills;
      } else {
        drills = PRESCRIPTIONS[constraint.key] ?? [];
      }

      if (drills.length > 0) {
        // Pick drill closest to adjusted difficulty
        const targetDiff = clamp(drills[0].difficulty_level + difficultyDelta, 1, 5);
        const sorted = [...drills].sort(
          (a, b) => Math.abs(a.difficulty_level - targetDiff) - Math.abs(b.difficulty_level - targetDiff),
        );
        const chosen = sorted[0];
        prescribedDrills.push({
          ...chosen,
          difficulty_level: clamp(chosen.difficulty_level + difficultyDelta, 1, 5),
          for_constraint: constraint.key,
          constraint_label: constraint.label,
        });
      }
    }

    // ─── 6. Apply readiness + cross-module adjustments (Phase 4) ───

    const readinessAdj: any = {};
    const crossModuleNotes: string[] = [];

    // CNS readiness < 40
    if (reactionScore < 40) {
      crossModuleNotes.push("CNS readiness low — drill intensity reduced.");
    }

    // Sleep quality ≤ 2
    if (sleepQuality <= 2) {
      crossModuleNotes.push("Low sleep quality — explosive drills removed.");
      prescribedDrills = prescribedDrills.filter((d) => !d.is_high_intensity);
    }

    // Stress level ≥ 4
    if (stressLevel >= 4) {
      readinessAdj.volume_modifier = Math.min(readinessAdj.volume_modifier ?? 1, 0.8);
      crossModuleNotes.push("Elevated stress — volume reduced by 20%.");
    }

    // Fatigue / low readiness
    if (fatigueFlag || readinessScore < 40) {
      readinessAdj.volume_modifier = 0.7;
      crossModuleNotes.push("Elevated fatigue — volume reduced, high-intensity removed.");
      prescribedDrills = prescribedDrills.filter((d) => !d.is_high_intensity);

      if (prescribedDrills.length === 0) {
        prescribedDrills = (PRESCRIPTIONS["fatigue_risk"] ?? []).slice(0, 2).map((d) => ({
          ...d,
          for_constraint: "fatigue_risk",
          constraint_label: "Neurological Fatigue Risk",
        }));
      }
    } else if (readinessScore < 55) {
      readinessAdj.volume_modifier = Math.min(readinessAdj.volume_modifier ?? 1, 0.85);
      crossModuleNotes.push("Moderate recovery — slight volume reduction.");
    }

    if (crossModuleNotes.length > 0) {
      readinessAdj.note = crossModuleNotes.join(" ");
    }

    prescribedDrills = prescribedDrills.slice(0, 3);

    // ─── 6b. Video Linking (Phase 4) — map sessions to constraints ───

    const linkedSessions: Array<{ session_id: string; constraint_key: string }> = [];
    if (sessions.length > 0) {
      // Link most recent sessions to diagnosed constraints
      for (const constraint of top3) {
        const relevantSession = sessions[0]; // most recent
        if (relevantSession?.id) {
          linkedSessions.push({
            session_id: relevantSession.id,
            constraint_key: constraint.key,
          });
        }
      }
    }

    // ─── 7. Save to database ───

    const planRow = {
      user_id: userId,
      plan_date: today,
      constraints_detected: top3,
      prescribed_drills: prescribedDrills,
      readiness_adjustments: readinessAdj,
      player_state: playerState,
      generated_at: new Date().toISOString(),
      feedback_applied: feedbackApplied,
      linked_sessions: linkedSessions,
    };

    const { data: savedPlan, error: saveError } = await supabase
      .from("udl_daily_plans")
      .upsert(planRow, { onConflict: "user_id,plan_date" })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      return new Response(JSON.stringify({ plan: planRow, saved: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── 8. Write audit log entry ───

    await serviceClient.from("udl_audit_log").insert({
      action: "plan_generated",
      user_id: userId,
      metadata: {
        plan_id: savedPlan?.id,
        constraints: top3.map((c) => c.key),
        drills: prescribedDrills.map((d: any) => d.drill_key),
        feedback: feedbackApplied,
      },
    });

    // ─── 9. Generate alerts (inline, Phase 3) ───

    try {
      // Check for performance drops vs 7-day rolling average
      const { data: recentPlans } = await serviceClient
        .from("udl_daily_plans")
        .select("player_state, plan_date")
        .eq("user_id", userId)
        .gte("plan_date", sevenDaysAgo)
        .neq("plan_date", today)
        .order("plan_date", { ascending: false });

      if (recentPlans && recentPlans.length >= 3) {
        const scoreKeys = ["timing_score", "decision_score", "execution_score", "reaction_score", "explosiveness_score"];
        for (const key of scoreKeys) {
          const oldAvg =
            recentPlans.reduce((sum: number, p: any) => sum + ((p.player_state as any)?.[key] ?? 50), 0) /
            recentPlans.length;
          const current = (playerState as any)[key] ?? 50;
          if (typeof oldAvg === "number" && typeof current === "number" && oldAvg - current > 15) {
            await serviceClient.from("udl_alerts").insert({
              target_user_id: userId,
              alert_type: "performance_drop",
              severity: oldAvg - current > 25 ? "high" : "medium",
              message: `${key.replace(/_/g, " ")} dropped ${Math.round(oldAvg - current)} points below 7-day average.`,
              metadata: { score_key: key, current, rolling_avg: Math.round(oldAvg), delta: Math.round(oldAvg - current) },
            });
          }
        }
      }

      // Check for consecutive fatigue
      if (fatigueFlag && recentPlans && recentPlans.length >= 1) {
        const yesterdayFatigue = (recentPlans[0]?.player_state as any)?.fatigue_flag;
        if (yesterdayFatigue === true) {
          await serviceClient.from("udl_alerts").insert({
            target_user_id: userId,
            alert_type: "fatigue_spike",
            severity: "high",
            message: "Fatigue flag active for 2+ consecutive days. Consider rest day.",
            metadata: { readiness_score: readinessScore, consecutive_days: 2 },
          });
        }
      }
    } catch (alertErr) {
      console.error("Alert generation error (non-fatal):", alertErr);
    }

    return new Response(JSON.stringify({ plan: savedPlan, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("UDL Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
