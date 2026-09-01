// supabase/functions/wk-generate-daily/index.ts
// Hammer Workout & Speed — elite daily prescription generator.
//
// v2 rewrite:
//   - FULL-BODY lift template (not a single-pattern day)
//   - Phase modulation (OS Q1-Q2, OS Q3-Q4, In-Season, Post-Season)
//   - sequence_role tagged per prescription so the UI can render lifts
//     in the canonical order (arm care → trunk primer → compound →
//     unilateral → upper push → upper pull → carry → trunk finisher)
//   - Speed / Bat-Speed / Conditioning kept as distinct slots so the app
//     can render them in three separate cards (Speed & Bat before lifts,
//     conditioning next to practice)
//
// Idempotent for (user_id, plan_date, sequence_field).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveWkPhase } from "../_shared/wkPhaseQuarter.ts";
// Workout Intelligence Constitution (WIC) — see supabase/functions/_shared/wic/*
import { WIC_VERSION, type WicEngine } from "../_shared/wic/constitution.ts";
import { selectAdaptation, type AdaptationDecision } from "../_shared/wic/adaptationSelector.ts";
import { buildWhy, whyIsComplete, type WhyV2 } from "../_shared/wic/rationale.ts";
import { validate as wicValidate } from "../_shared/wic/validator.ts";
import { checkAthleteScope, auditMovementIntegrity } from "../_shared/wic/domainGate.ts";
// Phase 2 Fix 5 / 6 — canonical shared modules.
import { seasonContextFromPhase, isMovementSeasonLegal } from "../_shared/wic/season.ts";
import { applyManualOrder, assignSequenceOrder } from "../_shared/wic/ordering.ts";
// WIC engine modules — canonical slug pools per engine.
import * as StrengthEngine from "../_shared/wic/engines/strength.ts";
import { selectSpeedPicks } from "../_shared/wic/engines/speed.ts";
import {
  BAT_SPEED_STAGE_LABEL,
  selectBatSpeedPicks,
} from "../_shared/wic/engines/batSpeed.ts";
// Elite progression — block/week wave + personal-best lineage (pure, replay-safe).
import {
  buildProgressionState,
  buildProgressionPayload,
  blockLabel,
  isInReExposureWindow,
  domainForSlotRole,
  domainSessionName,
  DOMAIN_SHAPE_FLOOR,
  DOMAIN_METRIC_KEY,
  isTestDue,
  metricLabel,
  type ProgressionState,
} from "../_shared/wic/progression/progressionState.ts";
import { conditioningSlugFor, inningRestartSlug } from "../_shared/wic/engines/conditioning.ts";
// Phase 8 — Elite Lift Intelligence & Exercise Governance certifier.
import { certifyLift, coerceCanonicalCategory } from "../_shared/wic/lift/sessionBuilder.ts";
// Goal Emphasis Authority + Weekly Balance Ledger — bounded, interpretive only.
import { resolveGoalEmphasis, emphasisFor } from "../_shared/wic/goals/emphasis.ts";
import {
  buildWeeklyLedger,
  shortfallBonus,
  varietyPenalty,
  evaluateWeeklyBalance,
} from "../_shared/wic/balance/weeklyLedger.ts";
// Elite Training Methods Engine v1 — French contrast + the method library.
import { selectMethod, buildWeeklyMethodUsage } from "../_shared/wic/methods/selector.ts";
import { applyMethod, validateAppliedMethod } from "../_shared/wic/methods/apply.ts";
import {
  buildStationPools,
  movementFamily,
  resolveStations,
  shapeFromPools,
} from "../_shared/wic/methods/stations.ts";
import { METHODS_VERSION } from "../_shared/wic/methods/catalog.ts";
// Phase 9 — Explosive Performance Engine (Speed + Bat Speed) certifiers.
import { certifySpeed } from "../_shared/wic/speed/sessionBuilder.ts";
import { certifyBatSpeed } from "../_shared/wic/batSpeed/sessionBuilder.ts";
// Phase 10 — Performance Support Engines (Conditioning + Cross-Sport + Recovery + Arm Care).
import { certifyConditioning } from "../_shared/wic/conditioning/sessionBuilder.ts";
import { certifyCrossSport } from "../_shared/wic/crossSport/sessionBuilder.ts";
import { resolveCrossSportTemplate } from "../_shared/wic/crossSport/templates.ts";
import { certifyRecovery } from "../_shared/wic/recovery/sessionBuilder.ts";
import { certifyArmCare } from "../_shared/wic/armCare/sessionBuilder.ts";
import { pickArmCarePrimary, type ArmCareCatalogRow } from "../_shared/wic/armCare/picker.ts";
import {
  GAME_DAY_PRIMER_SLUGS,
  CROSS_SPORT_LOW_IMPACT_PREFERRED,
  CROSS_SPORT_COORDINATION_PREFERRED,
} from "../_shared/wic/engines/crossSport.ts";
// Phase 11–12 — Global determinism, snapshot immutability, validator registry,
// unified why_v2, and cross-engine conflict resolution.
import {
  stableSeed,
  utcPlanDate,
  governanceCatalogHash,
  buildDeterminismTrace,
  fnv1a64Hex,
  canonicalJson,
} from "../_shared/wic/determinism/globalDeterminismLock.ts";
import { hashSnapshot, assertImmutable } from "../_shared/wic/snapshots/snapshotImmutabilityGuard.ts";
import { aggregateValidatorReports, type EngineReport } from "../_shared/wic/validation/globalValidatorRegistry.ts";
import { resolveCrossEngineConflicts } from "../_shared/wic/conflictResolver/crossEngineConflictResolver.ts";
import { buildUnifiedWhyRoot, mergeUnifiedWhy, computeWhyCompleteness, freezeWhyV2, hashWhyV2 } from "../_shared/wic/whyV2/unifiedWhy.ts";
// Phase 12+ — System Freeze v1 (state compression, invariants, engine contract, telemetry).
import { compressSystemState, systemStateHash } from "../_shared/wic/stateCompression/systemStateCompressor.ts";
import { checkGlobalInvariants } from "../_shared/wic/invariants/globalInvariantChecker.ts";
import { computeEngineSignature } from "../_shared/wic/engineContract/engineContractVFinal.ts";
import { emitSystemState } from "../_shared/wic/telemetry/minimalTelemetryEmitter.ts";
// Phase 4 — Canonical Training Context (constitutional authority).
import {
  CONTEXT_VERSION as CTX_VERSION,
  resolveTrainingContext,
  type TrainingContext,
} from "../_shared/wic/trainingContext.ts";
// Phases 5–7 — Athlete / Personalization / Training-Age Contexts.
import {
  ATHLETE_CONTEXT_VERSION,
  resolveAthleteContext,
  type AthleteContext,
} from "../_shared/wic/athleteContext.ts";
import {
  PERSONALIZATION_VERSION,
  resolvePersonalizationContext,
  type PersonalizationContext,
} from "../_shared/wic/personalizationContext.ts";
import {
  TRAINING_AGE_VERSION,
  resolveTrainingAge,
  type TrainingAgeContext,
} from "../_shared/wic/trainingAge.ts";
import {
  createCategoryBudget,
  createSkipLog,
  isTrainingAgeLegal,
  skipReasonCopy,
  PRE_SELECTION_VERSION,
  type EngineDomain,
} from "../_shared/wic/legality/preSelection.ts";
import {
  DOSAGE_DOCTRINE_VERSION,
  resolveDose,
  describeDose,
  isRepDosed as doctrineIsRepDosed,
  isWithinEnvelope,
} from "../_shared/wic/dosage/doctrine.ts";



interface MovementRow {
  slug: string;
  name: string;
  category: string;
  movement_category?: string | null;
  // Categorical legality maps — these, not `min_training_age_years`, are what
  // every WIC certifier consults. The selector must read the same field or it
  // proposes picks that are guaranteed to fail certification.
  training_age_legality?: Record<string, boolean> | null;
  season_legality?: Record<string, boolean> | null;
  speed_category?: string | null;
  bat_speed_category?: string | null;
  conditioning_category?: string | null;
  cross_sport_category?: string | null;
  arm_care_category?: string | null;

  pattern: string | null;
  variant: string | null;
  sport_scope: "baseball" | "softball" | "both";
  position_scope: string[] | null;
  min_training_age_years: number;
  min_competition_level: string | null;
  cns_cost: number;
  cue: string;
  why_prescribed: string;
  contraindications: string[];
  regression_slug: string | null;
  progression_slug: string | null;
  default_sets: number | null;
  default_reps: number | null;
  default_tempo: string | null;
  default_load_pct: number | null;
  // Precise-dosage fields (added 2026-07-23) — every prescription must carry
  // at least one concrete number the athlete can execute without interpretation.
  default_duration_seconds: number | null;
  default_distance_feet: number | null;
  default_total_reps: number | null;
  dosage_unit: string | null;
  family: string | null;
  intensity_class: string | null;
  phase_allow: string[] | null;
  is_eccentric_dominant: boolean | null;
  source_philosophy: string | null;
  // WIC metadata (backfilled 2026-07-01)
  primary_adaptation: string | null;
  season_eligibility: string[] | null;
  min_age_years: number | null;
  game_day_eligible: boolean | null;
  recovery_window_hours: number | null;
  wic_metadata_complete: boolean | null;
}

interface BlockRow {
  phase: string;
  display_name: string;
  compound_style: "double_eccentric" | "eccentric" | "concentric";
  supplemental_style: "kot" | "functional_patterning" | "mixed";
  speed_cadence_hours: number;
  cross_sport_cadence: string;
  compound_min_sets: number;
  compound_max_sets: number;
  compound_min_reps: number;
  compound_max_reps: number;
  cns_unit_cap: number;
  notes: string | null;
}

type Slot = "lift" | "speed" | "bat_speed" | "conditioning" | "cross_sport" | "supplemental";

type SequenceRole =
  | "arm_care"
  | "trunk_primer"
  | "compound_lower"
  | "unilateral_lower"
  | "upper_push"
  | "upper_pull"
  | "carry_antirotation"
  | "trunk_finisher"
  | "rotation"
  | "supplemental"
  | "speed"
  | "bat_speed"
  | "conditioning"
  | "cross_sport";

interface Prescription {
  slot: Slot;
  sequence_order: number;
  sequence_role: SequenceRole;
  movement_slug: string;
  movement_name: string;
  sets: number | null;
  reps: number | null;
  tempo: string | null;
  load_pct: number | null;
  duration_seconds: number | null;
  distance_feet: number | null;
  total_reps: number | null;
  dosage_unit: string | null;
  cns_cost: number;
  cns_clamped: boolean;
  substituted_from_slug: string | null;
  substitution_reason: string | null;
  why_payload: Record<string, unknown>;
  rationale?: string;
  // WIC constitutional fields — required for publication.
  adaptation?: string;
  engine?: WicEngine;
  why_v2?: WhyV2;
  generator_version?: string;
}

// Phase 2 Fix 6 — legacy slug sets moved to `_shared/wic/season.ts`.
// This local re-export is intentional so any residual reference keeps working
// while the canonical authority lives in the shared module.
import { OS_ONLY_ECCENTRIC_SLUGS, IN_SEASON_BLOCKED_SLUGS } from "../_shared/wic/season.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const generationStartedAt = Date.now();
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = (await req.json().catch(() => ({}))) as {
      plan_date?: string;
      side_hit?: "L" | "R" | null;
      side_throw?: "L" | "R" | null;
      recent_ack?: { reduction_reason?: string; reduction_payload?: unknown; acknowledged_at?: string } | null;
    };
    const planDate = body.plan_date ?? todayStr();
    const recentAck = body.recent_ack ?? null;
    const sideOverride =
      (body.side_hit === "L" || body.side_hit === "R" || body.side_throw === "L" || body.side_throw === "R")
        ? { hit: (body.side_hit as any) ?? null, throw: (body.side_throw as any) ?? null }
        : null;

    // -------- Load athlete context --------
    const [
      { data: profile },
      { data: ctx },
      { data: mpiSettings },
      { data: injuries },
      { data: dailyLog },
      { data: gamesToday },
      { data: practicesToday },
      { data: sidePref },
      { data: equipmentCtx },
      { data: trainingPrefs },
      { data: latestWeight },
      { data: bodyGoals },
    ] = await Promise.all([
      admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      admin.from("athlete_context").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("athlete_mpi_settings").select("season_status,preseason_start_date,preseason_end_date,in_season_start_date,in_season_end_date,post_season_start_date,post_season_end_date").eq("user_id", user.id).maybeSingle(),
      admin.from("user_injury_progress").select("injury_slug, status").eq("user_id", user.id).in("status", ["acute", "active"]),
      admin.from("athlete_daily_log").select("*").eq("user_id", user.id).eq("log_date", planDate).maybeSingle(),
      admin.from("gp_games")
        .select("id, game_date, status, game_type")
        .eq("user_id", user.id)
        .eq("game_date", planDate)
        .not("status", "in", "(canceled,cancelled,rescheduled)")
        .limit(1),
      // Practices: exact-date rows plus recurring weekly rows (filtered below).
      admin.from("scheduled_practice_sessions")
        .select("id, scheduled_date, recurring_active, recurring_days, practice_kind, intensity, duration_minutes, session_module, title, start_time, status")
        .eq("user_id", user.id)
        .not("status", "in", "(canceled,cancelled,rescheduled)")
        .or(`scheduled_date.eq.${planDate},recurring_active.is.true`)
        .limit(50),
      admin.from("athlete_side_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("athlete_equipment_context").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("training_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("weight_entries").select("*").eq("user_id", user.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("athlete_body_goals").select("*").eq("user_id", user.id),
    ]);

    const p: any = profile ?? {};
    const sport = (p.sport ?? "baseball") as "baseball" | "softball";
    const position = p.primary_position ?? p.position ?? null;
    // Every position label the athlete holds, for the domain scope gate.
    const athletePositions: string[] = Array.from(
      new Set(
        [
          position,
          ...(Array.isArray((p as any).positions) ? (p as any).positions : []),
          ...(Array.isArray((p as any).secondary_positions) ? (p as any).secondary_positions : []),
        ]
          .filter((v) => typeof v === "string" && v.trim() !== "")
          .map((v) => String(v).trim().toLowerCase()),
      ),
    );
    const trainingAgeYears = Number(p.years_lifting ?? p.training_age_years ?? 0);
    const isProProspect = !!(p.is_pro_prospect ?? p.pro_prospect ?? false);
    const injurySlugs = new Set((injuries ?? []).map((r: any) => r.injury_slug as string));
    const isGameDay = (gamesToday ?? []).length > 0;

    // -------- Practice resolution (exact-date + recurring weekly) --------
    const planDow = new Date(`${planDate}T12:00:00Z`).getUTCDay();
    const practiceRows: any[] = (practicesToday ?? []).filter((r: any) => {
      if (r.scheduled_date === planDate) return true;
      return !!r.recurring_active
        && Array.isArray(r.recurring_days)
        && r.recurring_days.includes(planDow)
        && (!r.scheduled_date || r.scheduled_date <= planDate);
    });
    // travel / other markers are not training practices — they drive recovery, not load.
    const trainingPractices = practiceRows.filter(
      (r: any) => !["travel", "other"].includes(String(r.practice_kind ?? "team")),
    );
    const isPracticeDay = trainingPractices.length > 0;
    const isTravelDay = practiceRows.some((r: any) => String(r.practice_kind) === "travel");
    // Highest-load practice on the day drives modulation.
    const practiceKinds = trainingPractices.map((r: any) => String(r.practice_kind ?? "team"));
    const practiceIntensity: "light" | "standard" | "heavy" =
      trainingPractices.some((r: any) => r.intensity === "heavy")
        ? "heavy"
        : trainingPractices.some((r: any) => r.intensity === "standard")
          ? "standard"
          : trainingPractices.length > 0
            ? "light"
            : "standard";
    // Team practice and showcases are inherently high-volume regardless of tag.
    const isHeavyPracticeDay = isPracticeDay
      && (practiceIntensity === "heavy"
        || practiceKinds.includes("team")
        || practiceKinds.includes("showcase"));

    // -------- Resolve phase quarter --------
    // Season data lives on athlete_mpi_settings (season_status + phase date
    // windows). athlete_context.season_phase is a secondary/legacy field.
    // Merge both so an in-season athlete never gets Offseason Q1 by default.
    const mpi: any = mpiSettings ?? {};
    const ctxAny: any = ctx ?? {};
    const seasonSettings = {
      season_status: mpi.season_status ?? ctxAny.season_phase ?? null,
      preseason_start_date: mpi.preseason_start_date ?? null,
      preseason_end_date: mpi.preseason_end_date ?? null,
      in_season_start_date: mpi.in_season_start_date ?? null,
      in_season_end_date: mpi.in_season_end_date ?? null,
      post_season_start_date: mpi.post_season_start_date ?? null,
      post_season_end_date: mpi.post_season_end_date ?? null,
    };
    const phaseRes = resolveWkPhase(seasonSettings);
    const isOffseason = phaseRes.phase.startsWith("os_");
    const isDeep = phaseRes.phase === "os_q1" || phaseRes.phase === "os_q2";
    const isInSeason = phaseRes.phase === "in_season";
    const isPostSeason = phaseRes.phase === "post_season";

    // -------- Phase 4: Canonical Training Context --------
    const trainingContext: TrainingContext = resolveTrainingContext({
      planDate,
      legacyPhase: phaseRes.phase,
      isGameDay,
      isPracticeDay,
      isTournamentDay: (gamesToday ?? []).some((g: any) => g.game_type === "tournament"),
      isTravelDay,
      isRecoveryDay: false,
      isOffDay: false,
      isDeloadDay: false,
      generationId: null,
    });

    // -------- Phase 7: Training Age Context --------
    const trainingAgeContext: TrainingAgeContext = resolveTrainingAge({
      yearsLifting: trainingAgeYears,
      isProProspect,
      competitiveLevel: p.competitive_level ?? p.level ?? null,
    });

    // -------- Phase 5: Athlete Context --------
    const athleteContext: AthleteContext = resolveAthleteContext({
      userId: user.id,
      profile,
      athleteContext: ctx,
      sidePreference: sidePref,
      equipmentContext: equipmentCtx,
      trainingPreferences: trainingPrefs,
      latestWeight,
      bodyGoals: bodyGoals ?? [],
      dailyLog,
      injuries: injuries ?? [],
      gamesToday: gamesToday ?? [],
      practicesToday: practiceRows,
      trainingAgeCtx: trainingAgeContext,
      sideOverride,
    });

    // -------- Phase 6: Personalization Context --------
    const personalizationContext: PersonalizationContext = resolvePersonalizationContext({
      athleteContext,
      trainingAgeContext,
    });

    // -------- Load phase block + catalog --------
    const [{ data: blocks, error: blocksErr }, { data: catalog, error: catErr }] = await Promise.all([
      admin.from("wk_periodization_blocks").select("*").eq("phase", phaseRes.phase).maybeSingle() as unknown as Promise<{ data: BlockRow | null; error: any }>,
      admin.from("wk_movement_catalog").select("*").or(`sport_scope.eq.both,sport_scope.eq.${sport}`) as unknown as Promise<{ data: MovementRow[] | null; error: any }>,
    ]);
    if (blocksErr) throw blocksErr;
    if (catErr) throw catErr;
    const block = blocks!;
    const lib = catalog ?? [];

    // -------- Determine reductions --------
    const reductions: { reason: string; detail: string }[] = [];
    let cnsCap = block.cns_unit_cap;
    const dl: any = dailyLog ?? {};
    const sleep = Number(dl.sleep_hours ?? dl.sleep ?? 7);
    const cnsReadiness = Number(dl.cns_readiness ?? dl.readiness ?? 7);
    const soreness = Number(dl.soreness ?? 3);
    if (sleep < 6) {
      reductions.push({ reason: "sleep", detail: `Only ${sleep}h sleep — high-CNS work reduced.` });
      cnsCap = Math.max(1, cnsCap - 1);
    }
    if (cnsReadiness <= 4) {
      reductions.push({ reason: "cns", detail: `Self-reported CNS readiness ${cnsReadiness}/10 — capping CNS units.` });
      cnsCap = Math.max(1, cnsCap - 1);
    }
    if (soreness >= 8) {
      reductions.push({ reason: "soreness", detail: `Reported soreness ${soreness}/10 — substituting regressions where possible.` });
    }
    if (recentAck?.acknowledged_at) {
      const ackAgeH = (Date.now() - new Date(recentAck.acknowledged_at).getTime()) / 3600000;
      if (ackAgeH >= 0 && ackAgeH <= 48) {
        cnsCap = Math.max(1, cnsCap - 1);
        reductions.push({
          reason: "learning_loop",
          detail: `Recent recovery ack (${recentAck.reduction_reason ?? "mixed"}) — holding CNS cap conservative for one more day.`,
        });
      }
    }


    // Practice-day modulation. Team practice / showcase days carry hidden
    // volume the athlete never logs, so the lift day gets trimmed. Solo and
    // light trainer work only trims overlap, not the whole session.
    if (isHeavyPracticeDay && !isGameDay) {
      cnsCap = Math.max(1, cnsCap - 1);
      reductions.push({
        reason: "practice_load",
        detail: `${practiceKinds.includes("showcase") ? "Showcase" : "Team practice"} on the books today — CNS cap pulled back so the lift doesn't stack on top of practice volume.`,
      });
    } else if (isPracticeDay && !isGameDay && practiceIntensity !== "light") {
      reductions.push({
        reason: "practice_load",
        detail: "Practice scheduled today — skill volume trimmed to avoid duplicating what practice already covers.",
      });
    }
    if (isTravelDay && !isGameDay) {
      cnsCap = Math.max(1, cnsCap - 1);
      reductions.push({
        reason: "travel",
        detail: "Travel day — session shifts toward mobility and low-cost work.",
      });
    }



    // -------- WIC — resolve today's adaptation BEFORE selecting exercises --------
    const adaptationDecision: AdaptationDecision = selectAdaptation({
      phase: phaseRes.phase,
      isGameDay,
      isPracticeDay,
      cnsReadiness,
      sleepHours: sleep,
      soreness,
      ageYears: Number(p.age ?? p.age_years ?? p.chronological_age ?? null) || null,
      trainingAgeYears,
      hoursSinceSpeed: 9999,
      hoursSinceLift: 9999,
      injuriesActive: injurySlugs.size > 0,
    });
    const decision = adaptationDecision;
    // WIC adaptation compatibility (mirrors public.wic_adaptations_compatible SQL helper).
    // Catalog rows carry legacy / shorthand adaptation labels ("strength",
    // "rotational_force", "arm_care", …) that were never values in the
    // canonical map. Left unmapped they made ~40% of the catalog permanently
    // ineligible — which is how `full_body_strength` could demand
    // compound_upper_pull while every pull row was silently filtered out.
    // Canonicalize first, then fail OPEN on anything still unrecognized: a
    // labeling gap must never be able to starve a mandatory template slot.
    const ADAPTATION_ALIASES: Record<string, string> = {
      strength: "max_strength",
      rotational_strength: "max_strength",
      rotational_force: "power_transfer",
      rotational_power: "power_transfer",
      elastic_rotation: "power_transfer",
      pelvic_separation: "power_transfer",
      pelvic_speed: "speed_development",
      speed: "speed_development",
      bat_speed: "bat_speed_development",
    };
    const canonAdaptation = (v: string | null | undefined): string | null =>
      v ? (ADAPTATION_ALIASES[v] ?? v) : null;
    const adaptationsCompatible = (dayRaw: string | null | undefined, movRaw: string | null | undefined): boolean => {
      const day = canonAdaptation(dayRaw);
      const mov = canonAdaptation(movRaw);
      if (!day || !mov) return true;
      if (day === mov) return true;
      // Support-class work is never the primary stimulus — blocking it on
      // adaptation grounds only strands mandatory slots.
      if (mov === "arm_care" || mov === "recovery_only" || mov === "movement_literacy") return true;
      // `conditioning_repeat_explosive` is legal wherever the conditioning
      // engine itself is legal. Omitting it from in-season / game-readiness /
      // power days silently emptied the conditioning pool for the whole
      // season. It stays out of `recovery_only`, where conditioning is
      // deliberately suppressed by the adaptation selector.
      const map: Record<string, string[]> = {
        recovery_only: ["in_season_maintenance", "movement_literacy"],
        game_readiness: ["speed_development", "bat_speed_development", "movement_literacy", "in_season_maintenance", "conditioning_repeat_explosive"],
        muscle_capacity: ["max_strength", "muscle_capacity", "in_season_maintenance", "speed_development", "bat_speed_development", "conditioning_repeat_explosive", "movement_literacy"],
        max_strength: ["max_strength", "muscle_capacity", "strength_to_power", "speed_development", "bat_speed_development", "conditioning_repeat_explosive", "movement_literacy"],
        strength_to_power: ["strength_to_power", "max_strength", "muscle_capacity", "power_transfer", "speed_development", "bat_speed_development", "conditioning_repeat_explosive", "movement_literacy"],
        power_transfer: ["power_transfer", "strength_to_power", "max_strength", "muscle_capacity", "speed_development", "bat_speed_development", "in_season_maintenance", "conditioning_repeat_explosive", "movement_literacy"],
        in_season_maintenance: ["in_season_maintenance", "max_strength", "muscle_capacity", "speed_development", "bat_speed_development", "power_transfer", "conditioning_repeat_explosive", "movement_literacy"],
        movement_literacy: ["movement_literacy", "muscle_capacity", "in_season_maintenance"],
      };
      // Unknown day label → fail open rather than emptying the catalog.
      if (!map[day]) return true;
      return map[day].includes(mov);
    };

    const engineForSlotRole = (slot: Slot, role: SequenceRole): WicEngine => {
      if (slot === "speed") return "sprint";
      if (slot === "bat_speed") return "bat_speed";
      if (slot === "conditioning") return "conditioning";
      if (slot === "cross_sport") return "cross_sport";
      if (role === "arm_care") return "arm_care";
      return "strength";
    };

    // -------- Load 7d lift history + active overrides (drift guards) --------
    // 7 days feeds the Weekly Balance Ledger; the 72h slice inside it still
    // drives the compound non-repeat guard.
    const threeDaysAgo = new Date(planDate + "T00:00:00");
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(planDate + "T00:00:00");
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
    const [{ data: recentLifts }, { data: activeOverrides }] = await Promise.all([
      admin.from("wk_prescriptions")
        .select("movement_slug, plan_date, slot, why_payload")
        .eq("user_id", user.id)
        .eq("slot", "lift")
        .gte("plan_date", sevenDaysAgoStr)
        .lt("plan_date", planDate),
      admin.from("wk_movement_overrides")
        .select("movement_slug, expires_at, reason, actor_role")
        .eq("user_id", user.id)
        .eq("ack_date", planDate)
        .gt("expires_at", new Date().toISOString()),
    ]);
    // Weight-room standards act as the safety floor for advanced methods:
    // no athlete runs true French contrast before they have proven a mark.
    const { data: standardAwards } = await admin
      .from("wk_standard_awards")
      .select("tier")
      .eq("user_id", user.id)
      .limit(20);
    const strengthFloorCleared = (standardAwards ?? []).length > 0;
    const recentCompoundSlugs = new Set(
      (recentLifts ?? [])
        .filter((r: any) => String(r.plan_date) >= threeDaysAgoStr)
        .map((r: any) => r.movement_slug as string),
    );
    const overrideSlugs = new Set((activeOverrides ?? []).map((r: any) => r.movement_slug as string));
    const usedThisSession = new Set<string>();
    const usedNamesThisSession = new Set<string>();

    const isCompoundMovement = (m: MovementRow) =>
      m.category === "compound" || (m.intensity_class ?? "").includes("compound");

    // Phase 2 Fix 6 — single canonical season authority. Both the old
    // hard-block list and the catalog's `season_eligibility` array are
    // consulted inside `isMovementSeasonLegal` in `_shared/wic/season.ts`.
    const seasonCtx = seasonContextFromPhase(phaseRes.phase);

    // -------- Pre-selection legality state (Phase: selection-first) --------
    // The certifiers used to be the first place a training-age-illegal pick or
    // a duplicate single-slot category was noticed — by then the whole plan was
    // already dead. These two objects move those exact rules in FRONT of
    // selection, so an illegal candidate is never proposed in the first place.
    const trainingAgeClassForSelection: string | null =
      ((trainingAgeContext as any)?.classification ?? null) as string | null;
    const categoryBudget = createCategoryBudget();
    const selectionSkips = createSkipLog();
    /** Canonical category a row would occupy inside a given engine's session. */
    const domainCategoryOf = (m: MovementRow, domain: EngineDomain): string | null => {
      switch (domain) {
        case "lift": return coerceCanonicalCategory(m as any) ?? null;
        case "speed": return m.speed_category ?? null;
        case "bat_speed": return m.bat_speed_category ?? null;
        case "conditioning": return m.conditioning_category ?? null;
        case "cross_sport": return m.cross_sport_category ?? null;
        case "arm_care": return m.arm_care_category ?? null;
      }
    };
    const domainForSlot = (slot: Slot, role: SequenceRole): EngineDomain | null => {
      if (slot === "lift") return role === "arm_care" ? "arm_care" : "lift";
      if (slot === "speed") return "speed";
      if (slot === "bat_speed") return "bat_speed";
      if (slot === "conditioning") return "conditioning";
      if (slot === "cross_sport") return "cross_sport";
      return null;
    };

    // -------- Movement filters --------
    const eligibleWith = (
      m: MovementRow | undefined | null,
      opts?: { ignoreAdaptation?: boolean; domain?: EngineDomain },
    ): m is MovementRow => {
      if (!m) return false;
      // WIC Stage 2 — hard-block movements missing constitutional metadata.
      if (m.wic_metadata_complete === false) return false;
      if (m.min_training_age_years > trainingAgeYears && !isProProspect) return false;
      // Categorical training-age legality — the SAME field every certifier
      // reads. Never relaxable: a beginner-illegal movement is a safety call,
      // not a preference. Without this gate the selector proposed picks the
      // certifier then killed with `*_illegal_training_age`.
      if (!isTrainingAgeLegal(m as any, trainingAgeClassForSelection)) return false;
      if ((m.min_age_years ?? 0) > 0 && (m.min_age_years ?? 0) > Math.max(0, Math.floor(trainingAgeYears) + 6) && !isProProspect) return false;
      if (m.contraindications?.some((c) => injurySlugs.has(c))) return false;
      // Single canonical seasonal legality gate — overrides may unlock.
      const legality = isMovementSeasonLegal(seasonCtx, m);
      if (!legality.legal && !overrideSlugs.has(m.slug)) return false;
      // Session dedupe — no movement twice in a day.
      if (usedThisSession.has(m.slug)) return false;
      if (usedNamesThisSession.has(normalizeName(m.name))) return false;
      // 72h non-repeat for compound lifts.
      if (isCompoundMovement(m) && recentCompoundSlugs.has(m.slug)) return false;
      // Single-slot category budget for the engine that is asking. Prevents
      // two different sequence ROLES resolving to the same canonical CATEGORY
      // (the `compound_lower appears 2 times` failure).
      if (opts?.domain && !categoryBudget.hasRoom(opts.domain, domainCategoryOf(m, opts.domain))) {
        return false;
      }
      // WIC Stage 3 — day-adaptation compatibility. This is the ONLY gate the
      // template-completion fallback is allowed to relax: safety, season,
      // injury, training age and scope gates always apply.
      if (!opts?.ignoreAdaptation && decision?.primary && m.primary_adaptation) {
        if (!adaptationsCompatible(decision.primary, m.primary_adaptation)) return false;
      }
      // Constitutional scope gate — sport / discipline specialization applied
      // to every candidate, so a mis-scoped row cannot reach any card even if
      // the catalog query is later loosened.
      if (!checkAthleteScope(m as any, { sport, positions: athletePositions }).allowed) return false;
      // Catalog integrity — a row whose text or tags contradict its owning
      // domain is never prescribable, no matter which engine asks for it.
      if (auditMovementIntegrity(m as any).length > 0) return false;
      return true;
    };
    const eligible = (m: MovementRow | undefined | null): m is MovementRow => eligibleWith(m);
    /** Lift-slot eligibility — adds the lift category budget to every gate. */
    const eligibleLift = (m: MovementRow | undefined | null): m is MovementRow =>
      eligibleWith(m, { domain: "lift" });
    const swap = (m: MovementRow) => {
      if (!m.contraindications?.some((c) => injurySlugs.has(c))) return { movement: m, substitutedFrom: null as string | null, reason: null as string | null };
      if (m.regression_slug) {
        const reg = lib.find((x) => x.slug === m.regression_slug);
        if (reg) return { movement: reg, substitutedFrom: m.slug, reason: `Contraindicated by reported injury — regressed to ${reg.name}.` };
      }
      return { movement: m, substitutedFrom: null, reason: null };
    };
    const pickFirst = (slugs: string[], domain?: EngineDomain): MovementRow | undefined => {
      for (const s of slugs) {
        const m = lib.find((x) => x.slug === s);
        if (eligibleWith(m, domain ? { domain } : undefined)) return m;
      }
      return undefined;
    };
    /** Lift-slot variant of `pickFirst` — respects the single-slot budget. */
    const pickFirstLift = (slugs: string[]): MovementRow | undefined => pickFirst(slugs, "lift");
    // Last-resort picker for template-mandatory categories: relaxes ONLY the
    // day-adaptation gate. Never relaxes season legality, injury
    // contraindications, training age, scope, category budget or integrity.
    const pickFirstRelaxed = (slugs: string[], domain?: EngineDomain): MovementRow | undefined => {
      for (const s of slugs) {
        const m = lib.find((x) => x.slug === s);
        if (eligibleWith(m, { ignoreAdaptation: true, domain })) return m;
      }
      return undefined;
    };
    const pickFirstRelaxedLift = (slugs: string[]): MovementRow | undefined =>
      pickFirstRelaxed(slugs, "lift");


    // ---- Goal Emphasis Authority + Weekly Balance Ledger -------------------
    // Emphasis biases WHICH legal movement fills a discretionary slot. It can
    // never author a dose, relax a gate, or delete a required category.
    const goalEmphasis = resolveGoalEmphasis({ bodyGoals: bodyGoals ?? [], profile: p });
    const weeklyLedger = buildWeeklyLedger(
      (recentLifts ?? []).map((r: any) => ({
        plan_date: String(r.plan_date),
        movement_slug: String(r.movement_slug),
        category: coerceCanonicalCategory(
          (lib.find((x) => x.slug === r.movement_slug) ?? { slug: r.movement_slug }) as any,
        ),
      })),
    );
    const isThrowerForBalance = athletePositions.some((x) => /pitch|catch/.test(x)) ||
      goalEmphasis.ranked.includes("throwing");
    const weeklyBalanceWarnings = evaluateWeeklyBalance(weeklyLedger, {
      isThrower: isThrowerForBalance,
    });

    /**
     * Best-fit picker for discretionary slots. Scores only among movements
     * that already passed every legality gate, so the constitutional order is
     * untouched — this decides which of the LEGAL options is the best fit.
     * Deterministic: ties fall back to pool order, so a replay reproduces the
     * identical session.
     */
    const scoreCandidate = (m: MovementRow, poolIndex: number) => {
      const cat = coerceCanonicalCategory(m as any) ?? "";
      const score =
        emphasisFor(goalEmphasis, m as any) +
        (cat ? shortfallBonus(weeklyLedger, cat) : 0) -
        varietyPenalty(weeklyLedger, m.slug) -
        poolIndex * 0.001; // stable pool-order tie-break
      return Math.round(score * 1e6) / 1e6;
    };
    const pickBest = (slugs: string[], domain?: EngineDomain): MovementRow | undefined => {
      let best: MovementRow | undefined;
      let bestScore = -Infinity;
      slugs.forEach((slug, i) => {
        const m = lib.find((x) => x.slug === slug);
        if (!eligibleWith(m, domain ? { domain } : undefined)) return;
        const sc = scoreCandidate(m, i);
        if (sc > bestScore) { bestScore = sc; best = m; }
      });
      return best;
    };
    /** Lift-slot variant of `pickBest` — respects the single-slot budget. */
    const pickBestLift = (slugs: string[]): MovementRow | undefined => pickBest(slugs, "lift");
    const pickBestByCanonicalCategory = (slugs: string[], category: string): MovementRow | undefined =>
      pickBest(slugs.filter((slug) => {
        const m = lib.find((x) => x.slug === slug);
        return !!m && coerceCanonicalCategory(m as any) === category;
      }), "lift");


    /** One athlete-legible line tying a pick to their own stated goals. */
    const goalWhy = (m: MovementRow): string => {
      const cat = coerceCanonicalCategory(m as any) ?? "";
      const short = cat ? ((weeklyLedger.shortfalls as Record<string, number>)[cat] ?? 0) : 0;
      const parts: string[] = [];
      if (!goalEmphasis.isBaselineOnly && goalEmphasis.ranked.length) {
        parts.push(`you ranked ${goalEmphasis.ranked[0]} first`);
      }
      if (short > 0) parts.push(`your week is short on ${cat.replace(/_/g, " ")}`);
      return parts.length ? ` Chosen because ${parts.join(" and ")}.` : "";
    };

    const pickFirstByCanonicalCategory = (slugs: string[], category: string): MovementRow | undefined => {
      for (const s of slugs) {
        const m = lib.find((x) => x.slug === s);
        if (eligibleLift(m) && coerceCanonicalCategory(m as any) === category) return m;
      }
      return undefined;
    };

    const pickCat = (cat: string): MovementRow | undefined =>
      lib.find((m) => m.category === cat && eligible(m));

    // Cross-sport picker: must match the template's required category so the
    // certifier's `xs.<category>` template resolves cleanly. Otherwise the
    // whole plan fails with `xs_unresolved_template`.
    const pickCrossSportForTemplate = (
      requiredCategories: readonly string[],
      preferredSlugPools: string[][],
    ): MovementRow | undefined => {
      const requiredSet = new Set(requiredCategories);
      const matchesRequired = (m: MovementRow | undefined | null) =>
        !!m && requiredSet.has(String((m as any).cross_sport_category ?? ""));
      // 1) Preferred pools that match the required category.
      for (const pool of preferredSlugPools) {
        for (const slug of pool) {
          const m = lib.find((x) => x.slug === slug);
          if (eligible(m) && matchesRequired(m)) return m;
        }
      }
      // 2) Any eligible cross-sport movement with the required category.
      return lib.find(
        (m) =>
          m.category === "cross_sport" &&
          eligible(m) &&
          matchesRequired(m),
      );
    };

    // -------- Rotate unilateral lower / upper push across the week --------
    const dayOfWeek = new Date(planDate + "T00:00:00").getDay(); // 0..6

    // -------- Build full-body lift template (phase-modulated) --------
    const rxs: Prescription[] = [];
    let seq = 0;
    let cnsUsed = 0;

    const humanizeClass = (c: string | null) => {
      switch (c) {
        case "max_effort_compound": return "max-effort compound";
        case "eccentric_compound": return "eccentric-focus compound";
        case "compound": return "compound";
        case "unilateral": return "unilateral / single-leg";
        case "arm_care": return "arm-care";
        case "trunk": return "trunk / anti-rotation";
        case "carry": return "loaded carry";
        default: return c ?? "supplemental";
      }
    };
    const push = (
      slot: Slot,
      role: SequenceRole,
      m: MovementRow,
      overrides: Partial<Prescription> = {},
      why: string = "",
      meta: Record<string, unknown> = {},
    ): boolean => {
      const s = swap(m);
      if (usedThisSession.has(s.movement.slug)) return false;
      const nameKey = normalizeName(s.movement.name);
      if (usedNamesThisSession.has(nameKey)) return false;
      // Final backstop for the single-slot category budget. Selection already
      // filters for this; a swap (injury regression) can still land on a
      // category that is spoken for, and a duplicate here would fail the
      // certifier and kill the whole plan. Refusing one row is always better.
      const pushDomain = domainForSlot(slot, role);
      const pushCategory = pushDomain ? domainCategoryOf(s.movement, pushDomain) : null;
      if (pushDomain && !categoryBudget.hasRoom(pushDomain, pushCategory)) {
        selectionSkips.record({
          domain: pushDomain,
          requirement: `${role} slot`,
          reason: `${s.movement.name} was skipped because today's ${String(pushCategory).replace(/_/g, " ")} slot is already filled.`,
        });
        return false;
      }
      // Training-age legality is never bypassed by a swap either.
      if (!isTrainingAgeLegal(s.movement as any, trainingAgeClassForSelection)) {
        selectionSkips.record({
          domain: pushDomain ?? "session",
          requirement: `${role} slot`,
          reason: `${s.movement.name} is not cleared for your training level yet.`,
        });
        return false;
      }
      usedThisSession.add(s.movement.slug);
      usedNamesThisSession.add(nameKey);
      if (pushDomain) categoryBudget.commit(pushDomain, pushCategory);

      const setsBase = overrides.sets ?? s.movement.default_sets ?? null;
      const repsBase = overrides.reps ?? s.movement.default_reps ?? null;
      const totalDose =
        (overrides as any).total_reps ?? s.movement.default_total_reps ?? null;
      const durationDose =
        (overrides as any).duration_seconds ?? s.movement.default_duration_seconds ?? null;
      const distanceDose =
        (overrides as any).distance_feet ?? s.movement.default_distance_feet ?? null;
      const dosageUnitRaw =
        (overrides as any).dosage_unit ?? s.movement.dosage_unit ?? "reps";
      // Total-dose movements (innings, contacts, seconds, feet) use `sets` as
      // a container, not a load lever. Clamping "sets" on a 9-inning sim
      // would create the 8-sets-vs-9-innings mismatch users reported. For
      // those movements we never reduce `sets`; the sport-specific total
      // stays intact and CNS budget just accepts the movement in full.
      const isTotalDose =
        typeof totalDose === "number" ||
        typeof durationDose === "number" ||
        typeof distanceDose === "number" ||
        (dosageUnitRaw && dosageUnitRaw !== "reps");
      const clamped = !isTotalDose && (cnsUsed + s.movement.cns_cost) > cnsCap;
      cnsUsed += clamped ? Math.max(0, cnsCap - cnsUsed) : s.movement.cns_cost;

      // Override provenance
      const phaseBlocked = !!(s.movement.phase_allow && s.movement.phase_allow.length > 0 && !s.movement.phase_allow.includes(phaseRes.phase));
      const overrideRow = phaseBlocked ? (activeOverrides ?? []).find((o: any) => o.movement_slug === s.movement.slug) : null;
      const overrideMeta = overrideRow
        ? { reason: (overrideRow as any).reason ?? null, actor_role: "self", expires_at: (overrideRow as any).expires_at }
        : null;

      // Plain-English rationale
      const cls = humanizeClass(s.movement.intensity_class);
      const reasonPiece = why || s.movement.why_prescribed || `${cls} pick for today`;
      const reductionsPiece = reductions.length
        ? ` Volume trimmed today because ${reductions.map((r) => r.detail.toLowerCase()).join(" and ")}.`
        : "";
      const overridePiece = overrideMeta
        ? ` Unlocked for this session by your override — reason: "${overrideMeta.reason ?? "not stated"}".`
        : "";
      const rationale = `${reasonPiece}.${overridePiece}${reductionsPiece}`.replace(/\s+/g, " ").trim();

      // WIC — required constitutional payload
      const wicEngine = engineForSlotRole(slot, role);
      // ---- Zero-Drift Dosage Doctrine -------------------------------------
      // `doctrine.resolveDose` is the ONLY authority for a set/rep number.
      // Catalog defaults and call-site hints are never trusted for rep-dosed
      // movements; they survive only as the safety ceiling (`capSets/capReps`)
      // and as the dose for total-dose units (seconds / feet / innings).
      const repDosed = !isTotalDose && doctrineIsRepDosed(dosageUnitRaw);
      const doseCap = (overrides as any).dose_cap as { sets?: number; reps?: number } | undefined;
      const resolvedDose = repDosed
        ? resolveDose({
            phase: phaseRes.phase,
            role,
            category: s.movement.movement_category ?? s.movement.category,
            dosageUnit: dosageUnitRaw,
            trainingAgeYears,
            weekInBlock: null, // re-resolved with the real block week in the post-pass
            cnsClamped: clamped,
            capSets: doseCap?.sets ?? null,
            capReps: doseCap?.reps ?? null,
          })
        : null;
      const finalSets = resolvedDose
        ? resolvedDose.sets
        : (clamped && typeof setsBase === "number" ? Math.max(1, setsBase - 1) : setsBase);
      const finalReps = resolvedDose ? resolvedDose.reps : repsBase;
      const setsRepsStr = finalSets != null && finalReps != null ? `${finalSets}×${finalReps}` : "prescribed dose";

      const orderStr = `Sequence #${seq + 1} — ${role.replace(/_/g, " ")} keeps the constitutional day order intact.`;
      const recoveryStr = `${s.movement.cns_cost} CNS units; expect ~${Math.max(24, s.movement.cns_cost * 12)}h before repeating this pattern.`;
      const why_v2: WhyV2 = buildWhy({
        why_today: adaptationDecision.reason,
        why_athlete: `${adaptationDecision.reason_athlete} (${trainingAgeYears || 0}-yr training age${isProProspect ? ", pro prospect" : ""}).`,
        why_exercise: why || s.movement.why_prescribed || `${cls} implementation of the ${adaptationDecision.primary} adaptation.`,
        why_volume: resolvedDose
          ? describeDose(resolvedDose)
          : `${setsRepsStr} — dialed to ${adaptationDecision.primary} demands and today's CNS cap (${cnsCap}).`,

        why_order: orderStr,
        why_recovery: recoveryStr,
        adaptation: adaptationDecision.primary,
        engine: wicEngine,
        generator_version: WIC_VERSION,
      });
      let durationSeconds = durationDose;
      let distanceFeet = distanceDose;
      let totalReps = totalDose;
      let dosageUnit = dosageUnitRaw;
      // Unit routing — a total-dose movement must never carry its dose in the
      // `reps` column. Catalog rows historically stored "45 seconds" as
      // `default_reps: 45`, which made a 45-second couch stretch look like a
      // 45-rep compound lift and tripped the dosage-envelope validator.
      let emittedReps = finalReps;
      if (!repDosed && typeof emittedReps === "number") {
        const u = String(dosageUnit ?? "").toLowerCase();
        if (u === "seconds" || u === "sec" || u === "second") {
          if (durationSeconds == null) durationSeconds = emittedReps;
        } else if (u === "feet" || u === "ft" || u === "yards" || u === "yds") {
          if (distanceFeet == null) distanceFeet = emittedReps;
        } else if (totalReps == null) {
          totalReps = emittedReps;
        }
        emittedReps = null;
      }
      // Dosage safety net — never emit a "1 sets × 1 reps" row with no other
      // dose. If the catalog defaults are missing, backfill from the raw
      // movement row, then classify by category so mobility/warmup/FRC always
      // land on a duration and lifts land on rep counts.
      const noDose =

        (finalSets === 1 || finalSets == null) &&
        (emittedReps === 1 || emittedReps == null) &&
        !durationSeconds && !distanceFeet && !totalReps;


      if (noDose) {
        const cat = (s.movement.movement_category ?? s.movement.category ?? "").toLowerCase();
        const isTimeBased = cat.includes("mobility") || cat.includes("warmup") ||
          cat.includes("activation") || cat.includes("recovery") ||
          cat.includes("functional_patterning") || s.movement.slug.startsWith("frc_");
        if (isTimeBased) {
          durationSeconds = 120;
          dosageUnit = "seconds";
        } else {
          // Rep-based fallback for anything else — 3 x 8 is a safe default.
          dosageUnit = dosageUnit === "reps" ? "reps" : dosageUnit;
        }
      }
      rxs.push({
        slot, sequence_order: seq++, sequence_role: role,
        movement_slug: s.movement.slug, movement_name: s.movement.name,
        sets: finalSets,
        reps: emittedReps,
        tempo: overrides.tempo ?? s.movement.default_tempo,
        load_pct: overrides.load_pct ?? s.movement.default_load_pct,
        duration_seconds: durationSeconds,
        distance_feet: distanceFeet,
        total_reps: totalReps,
        dosage_unit: dosageUnit,
        cns_cost: s.movement.cns_cost,
        cns_clamped: clamped,
        substituted_from_slug: s.substitutedFrom,
        substitution_reason: s.reason,
        why_payload: {
          phase: phaseRes.phase, phase_display: phaseRes.displayName,
          generator_version: WIC_VERSION,
          game_day: isGameDay,
          training_age_years: trainingAgeYears, is_pro_prospect: isProProspect,
          intensity_class: s.movement.intensity_class,
          pattern: s.movement.pattern,
          category: s.movement.category,
          family: s.movement.family,
          source_philosophy: s.movement.source_philosophy,
          why: why || s.movement.why_prescribed,
          cue: s.movement.cue,
          rep_rule: resolvedDose
            ? `${resolvedDose.envelope.sets[0]}-${resolvedDose.envelope.sets[1]} sets × ${resolvedDose.envelope.reps[0]}-${resolvedDose.envelope.reps[1]} reps — ${resolvedDose.phase} ${resolvedDose.group} envelope (${DOSAGE_DOCTRINE_VERSION}).`
            : `Total-dose movement — measured in ${dosageUnit}, not sets × reps.`,
          dose_doctrine: resolvedDose
            ? {
                version: DOSAGE_DOCTRINE_VERSION,
                group: resolvedDose.group,
                phase: resolvedDose.phase,
                band: resolvedDose.band,
                envelope: resolvedDose.envelope,
                notes: resolvedDose.notes,
                cap_sets: (overrides as any).dose_cap?.sets ?? null,
                cap_reps: (overrides as any).dose_cap?.reps ?? null,
                role,
                category: s.movement.movement_category ?? s.movement.category ?? null,
              }
            : null,

          reductions,
          override: overrideMeta,
          wic: { adaptation: adaptationDecision.primary, engine: wicEngine },
          // Phase 4 — every card reads the same TrainingContext from here.
          training_context: trainingContext,
          // Phases 5–7 — Athlete / Personalization / Training Age contexts.
          athlete_context: athleteContext,
          personalization_context: personalizationContext,
          training_age_context: trainingAgeContext,
          ...meta,
        },
        rationale,
        adaptation: adaptationDecision.primary,
        engine: wicEngine,
        why_v2,
        generator_version: WIC_VERSION,
      } as any);
      return true;
    };

    // Resolve the cross-sport template once, so the movement we pick matches
    // the exact category the certifier will require. Mismatches produce
    // `xs_unresolved_template` and take the entire plan down.
    const xsTemplate = resolveCrossSportTemplate({
      seasonPhase: trainingContext.season_phase,
      dayType: trainingContext.day_type,
      trainingAge: (trainingAgeContext as any)?.classification,
      primaryAdaptation: adaptationDecision.primary,
      isGameDay,
      isRecoveryDay: (trainingContext as any)?.day_type === "recovery",
    });
    const xsRequired = xsTemplate.requiredCategories as readonly string[];

    if (isGameDay) {
      // WIC cross-sport engine — Weightless Object Sport Training preferred
      // for zero-CNS coordination priming before competition.
      const primer = pickCrossSportForTemplate(xsRequired, [
        CROSS_SPORT_LOW_IMPACT_PREFERRED,
        CROSS_SPORT_COORDINATION_PREFERRED,
        GAME_DAY_PRIMER_SLUGS,
      ]);
      if (primer) {
        push(
          "cross_sport",
          "cross_sport",
          primer,
          {},
          "Game-day crossover activation — short, early, and low-cost. It starts the day after warm-up instead of sitting on the back end.",
          { placement: "early_activation", sequencing_hint: "Do after warm-up and before the game. Stop before fatigue shows up.", cross_sport_template_id: xsTemplate.id, cross_sport_required_category: xsRequired[0] ?? null },
        );
      }
    }

    // In-season, non-game days: fold a short cross-sport / WOST activation
    // into the front of the day (rendered inside the Warm-up card). This
    // keeps sport-crossover work at the start of training in-season and
    // reserves the back-end "offseason_back_end" slot for the offseason.
    if (isInSeason && !isGameDay) {
      const inSeasonPrimer = pickCrossSportForTemplate(xsRequired, [
        CROSS_SPORT_COORDINATION_PREFERRED,
        CROSS_SPORT_LOW_IMPACT_PREFERRED,
        GAME_DAY_PRIMER_SLUGS,
      ]);
      if (inSeasonPrimer) {
        push(
          "cross_sport",
          "cross_sport",
          inSeasonPrimer,
          {},
          "In-season crossover primer — short, low-cost coordination drill folded into the warm-up. Frees CNS from sport patterns without stealing freshness from the day.",
          { placement: "warmup_integration", sequencing_hint: "In-season: finish the warm-up with this before speed / bat speed / lifts.", cross_sport_template_id: xsTemplate.id, cross_sport_required_category: xsRequired[0] ?? null },
        );
      }
    }


    if (!isGameDay) {
      // WIC strength engine — full-body roles.
      // 1) Arm care — every session, non-negotiable. Elite picker draws from full seeded catalog.
      const daySeedForArmCare = Math.floor(new Date(planDate + "T00:00:00").getTime() / 86400000);
      const isPitcherRole = /pitch/i.test((profile as any)?.primary_position ?? (ctx as any)?.primary_position ?? "");
      const isCatcherRole = /catch/i.test((profile as any)?.primary_position ?? "");
      // Dedup: skip lift-slot arm care when today is an active throwing day —
      // the EASS throwing block (client-composed) already opens with band prep.
      // Non-throwing / recovery days still get lift-slot arm care so the arm
      // is never neglected.
      const isThrowingDayForArmCare = !!(ctxAny.throwing_day) || isPitcherRole;
      const isRecoveryDay = decision?.primary === "recovery_only";
      const skipLiftArmCare = isThrowingDayForArmCare && !isRecoveryDay;
      if (!skipLiftArmCare) {
        const armCarePicked = pickArmCarePrimary(lib as unknown as ArmCareCatalogRow[], {
          sport,
          isPitcher: isPitcherRole,
          isCatcher: isCatcherRole,
          isThrowingDay: !isGameDay,
          isRecoveryDay,
          isGameDay: !!isGameDay,
          trainingAge: trainingAgeYears,
          ageYears: Math.max(0, Math.floor(trainingAgeYears) + 6),
          daySeed: daySeedForArmCare,
          fatigueFlag: cnsReadiness < 5 ? "high" : cnsReadiness < 7 ? "moderate" : "low",
        });
        const armCareRow = armCarePicked && eligible(armCarePicked as unknown as MovementRow)
          ? (armCarePicked as unknown as MovementRow)
          : pickFirst(StrengthEngine.ARM_CARE_SLUGS, "arm_care");
        if (armCareRow) push("lift", "arm_care", armCareRow, {}, armCareRow.why_prescribed || "Non-negotiable shoulder prep. Every session opens here.");
      }

      // 2) Trunk primer — every session
      const trunkPrimer = pickBestLift(StrengthEngine.TRUNK_PRIMER_SLUGS) ?? pickFirstLift(StrengthEngine.TRUNK_PRIMER_SLUGS);
      if (trunkPrimer) push("lift", "trunk_primer", trunkPrimer, {}, `Loaded rotation primer — wakes obliques + preps swing plane.${goalWhy(trunkPrimer)}`);

      // 3) Compound A — lower strength primer, phase legal
      const compoundSlugsByPhase = StrengthEngine.compoundSlugsFor(phaseRes.phase, dayOfWeek);
      const compound = pickBestByCanonicalCategory(compoundSlugsByPhase, "compound_lower") ??
        pickFirstByCanonicalCategory(compoundSlugsByPhase, "compound_lower") ??
        lib.find((m) => eligibleLift(m) && coerceCanonicalCategory(m as any) === "compound_lower");
      if (compound) {
        push("lift", "compound_lower", compound, {}, `${block.display_name}: ${block.compound_style.replace("_", " ")} lower-body primer — strong enough to maintain output without stealing sport freshness.${goalWhy(compound)}`);
      } else {
        selectionSkips.record({
          domain: "lift",
          requirement: "compound_lower",
          reason: skipReasonCopy("lift", "compound_lower"),
        });
      }

      // 4) Unilateral lower — rotate across the week to build all planes
      const uniLowerPool = StrengthEngine.unilateralSlugs(isInSeason, dayOfWeek);
      const uniLower = pickBestLift(uniLowerPool) ?? pickFirstLift(uniLowerPool);
      if (uniLower) {
        // Safety ceiling only: deep-flexion (ATG family) in-season stays a
        // ROM-limited durability dose. Everything else is doctrine-dosed.
        const safetyCap = StrengthEngine.unilateralDoseFor(uniLower.slug, isInSeason);
        const uniWhy = safetyCap

          ? "Single-leg durability maintenance — ROM-limited and low volume on purpose. In-season this protects the knee and hip; it is not a development block, so stop short of your deepest range and never near failure."
          : `Single-leg dominance — closes L/R imbalances the compound hides.${goalWhy(uniLower)}`;
        push("lift", "unilateral_lower", uniLower, (safetyCap ? { dose_cap: safetyCap } : {}) as any, uniWhy);
      }


      // 5) Upper push — unilateral / integrated
      const upperPushPool = StrengthEngine.upperPushSlugs(isInSeason, dayOfWeek);
      const upperPush = pickBestLift(upperPushPool) ?? pickFirstLift(upperPushPool);
      if (upperPush) {
        push("lift", "upper_push", upperPush, {}, `Upper push — enough strength signal to maintain full-body balance without chasing soreness.${goalWhy(upperPush)}`);
      }

      // 6) Upper pull — unilateral / weighted
      const upperPullPool = StrengthEngine.upperPullSlugs(isInSeason, dayOfWeek);
      const upperPull = pickBestLift(upperPullPool) ?? pickFirstLift(upperPullPool);
      if (upperPull) {
        push("lift", "upper_pull", upperPull, {}, `Upper pull — decel chain, posture, and shoulder balance stay in the plan.${goalWhy(upperPull)}`);
      }

      // 7) Carry / anti-rotation — phase legal, not a junk-volume finisher
      if (isInSeason || isDeep || phaseRes.phase === "os_q3") {
        const carryPool = StrengthEngine.carrySlugs(isInSeason, dayOfWeek);
        const carry = pickBestLift(carryPool) ?? pickFirstLift(carryPool);
        if (carry) push("lift", "carry_antirotation", carry, {}, `Carry / anti-rotation — trunk stiffness that transfers without burying the athlete.${goalWhy(carry)}`);
      }

      // 8) Trunk finisher — offseason only (in-season stays fresh)
      if (isOffseason) {
        const finisher = pickBestLift(StrengthEngine.TRUNK_FINISHER_SLUGS) ?? pickFirstLift(StrengthEngine.TRUNK_FINISHER_SLUGS);
        if (finisher) push("lift", "trunk_finisher", finisher, {}, `Loaded trunk finisher — locks the rotational strength from above.${goalWhy(finisher)}`);
      }

      ensureFullBodyLift(rxs, lib, pickFirstLift, push, isInSeason, pickFirstRelaxedLift);
    }


    // -------- Elite progression state (28-day history → block/week wave) ----
    // Loaded once and shared by EVERY engine and card. Pure read: progression
    // is interpretive only and never authors organism truth.
    const historyStart = new Date(planDate + "T00:00:00");
    historyStart.setDate(historyStart.getDate() - 28);
    const historyStartStr = historyStart.toISOString().slice(0, 10);
    const [{ data: historyRxRows }, { data: historyLogRows }] = await Promise.all([
      admin.from("wk_prescriptions")
        .select("plan_date, slot, sequence_role, movement_slug, sets, reps, distance_feet, total_reps, duration_seconds")
        .eq("user_id", user.id)
        .gte("plan_date", historyStartStr)
        .lt("plan_date", planDate),
      admin.from("wk_session_logs")
        .select("plan_date, movement_slug, sets_completed, total_reps_completed, distance_feet_completed, duration_seconds_completed, load_used, rpe, bar_feel, metrics")
        .eq("user_id", user.id)
        .gte("plan_date", historyStartStr)
        .lte("plan_date", planDate),
    ]);
    const progression: ProgressionState = buildProgressionState({
      planDate,
      prescriptions: (historyRxRows ?? []) as any,
      logs: (historyLogRows ?? []) as any,
      ageYears: Number(p.age ?? p.age_years ?? p.chronological_age ?? null) || null,
      trainingAgeYears: trainingAgeYears ?? null,
    });

    const dayOfYearSeed = Math.floor(
      (new Date(planDate + "T00:00:00").getTime() - new Date(new Date(planDate).getFullYear(), 0, 0).getTime()) / 86400000,
    );
    const isRecoveryDayCtx = (trainingContext as any)?.day_type === "recovery";

    // -------- Bat-speed engine (its own card, always pre-lift) --------
    // Game day now receives the constitutional short primer instead of nothing.
    {
      const batSpeedSelection = selectBatSpeedPicks({
        catalog: lib as any,
        template: {
          seasonPhase: trainingContext.season_phase,
          dayType: trainingContext.day_type,
          trainingAge: (trainingAgeContext as any)?.classification,
          primaryAdaptation: adaptationDecision.primary,
          isGameDay,
          isRecoveryDay: isRecoveryDayCtx,
          isReturnToPlay: false,
        },
        eligible: (m: any) => eligible(m as MovementRow),
        dayOfYearSeed,
        cnsBudget: isGameDay ? 2 : Math.max(2, Math.round(cnsCap * 0.5)),
        progression,
        isGameDay,
        isRecoveryDay: isRecoveryDayCtx,
        trainingAgeClass: (trainingAgeContext as any)?.classification,
      });
      const bsSessionName = batSpeedSelection.template.displayName;
      // Graceful degradation: if a template-required category has no legal
      // candidate for this athlete, the block is DROPPED with a reason rather
      // than published half-built and then failed by the certifier
      // (`bs_unresolved_template`), which used to kill the entire plan.
      const bsMissingRequired = batSpeedSelection.warnings
        .filter((w) => w.startsWith("bat_speed_missing_required:"))
        .map((w) => w.split(":")[1]);
      if (bsMissingRequired.length > 0) {
        for (const cat of bsMissingRequired) {
          selectionSkips.record({
            domain: "bat_speed",
            requirement: cat,
            reason: skipReasonCopy("bat_speed", cat),
          });
        }
      }
      for (const pick of bsMissingRequired.length > 0 ? [] : batSpeedSelection.picks) {

        const m = pick.movement as unknown as MovementRow;
        const payload = buildProgressionPayload({
          state: progression,
          slug: m.slug,
          metricKey: pick.stage === "intent" ? "bat_speed_mph" : null,
          sessionName: bsSessionName,
        });
        push(
          "bat_speed",
          "bat_speed",
          m,
          {},
          `${BAT_SPEED_STAGE_LABEL[pick.stage]} — ${pick.reason}${isGameDay ? "" : " Do BEFORE lifts while CNS is fresh."}`,
          {
            bat_speed_template_id: batSpeedSelection.template.id,
            bat_speed_required_category: pick.category,
            bat_speed_stage: pick.stage,
            bat_speed_stage_label: BAT_SPEED_STAGE_LABEL[pick.stage],
            session_shape: { min: batSpeedSelection.shape.min, max: batSpeedSelection.shape.max, actual: batSpeedSelection.picks.length },
            session_title: blockLabel(progression, bsSessionName),
            progression: payload,
            re_exposure_violation: isInReExposureWindow(progression, m.slug, pick.category),
          },
        );
      }
    }

    // -------- Sprint engine (its own card, cadence-gated, pre-lift) --------
    const lastSpeed = !isGameDay ? await admin
      .from("wk_prescriptions")
      .select("plan_date")
      .eq("user_id", user.id)
      .eq("slot", "speed")
      .order("plan_date", { ascending: false })
      .limit(1)
      .maybeSingle() : { data: null };
    const hoursSinceSpeed = lastSpeed.data?.plan_date
      ? Math.floor((new Date(planDate + "T00:00:00").getTime() - new Date(lastSpeed.data.plan_date + "T00:00:00").getTime()) / 3600000)
      : 9999;
    // Game-day still gets a short primer via the Phase 9 game_day_primer template.
    if (isGameDay || hoursSinceSpeed >= block.speed_cadence_hours - 6) {
      const speedSelection = selectSpeedPicks({
        catalog: lib as any,
        template: {
          seasonPhase: trainingContext.season_phase,
          dayType: trainingContext.day_type,
          trainingAge: (trainingAgeContext as any)?.classification,
          primaryAdaptation: adaptationDecision.primary,
          isGameDay,
          isPracticeDay,
          isRecoveryDay: isRecoveryDayCtx,
          isReturnToPlay: false,
        },
        eligible: (m: any) => eligible(m as MovementRow),
        sport,
        dayOfYearSeed,
        cnsBudget: Math.max(2, Math.round(cnsCap * 0.6)),
        trainingAgeClass: (trainingAgeContext as any)?.classification,
        progression,
        isGameDay,
        isRecoveryDay: isRecoveryDayCtx,
      });
      const spSessionName = speedSelection.template.displayName;
      // Same graceful-degradation rule as bat speed: an unfillable required
      // category drops the sprint block with a reason instead of publishing a
      // session the certifier will reject.
      const spMissingRequired = speedSelection.warnings
        .filter((w) => w.startsWith("speed_missing_required:"))
        .map((w) => w.split(":")[1]);
      for (const cat of spMissingRequired) {
        selectionSkips.record({
          domain: "speed",
          requirement: cat,
          reason: skipReasonCopy("speed", cat),
        });
      }
      for (const pick of spMissingRequired.length > 0 ? [] : speedSelection.picks) {

        const m = pick.movement as unknown as MovementRow;
        const metricKey =
          pick.category === "top_speed" || pick.category === "overspeed"
            ? "sprint_time_s"
            : pick.category === "acceleration"
            ? "sprint_distance_ft"
            : null;
        const payload = buildProgressionPayload({
          state: progression,
          slug: m.slug,
          metricKey,
          sessionName: spSessionName,
        });
        push(
          "speed",
          "speed",
          m,
          {},
          `${spSessionName} — ${pick.category.replace(/_/g, " ")}. ${pick.reason}`,
          {
            speed_template_id: speedSelection.template.id,
            speed_required_category: pick.category,
            session_shape: { min: speedSelection.shape.min, max: speedSelection.shape.max, actual: speedSelection.picks.length },
            session_title: blockLabel(progression, spSessionName),
            progression: payload,
            re_exposure_violation: isInReExposureWindow(progression, m.slug, pick.category),
          },
        );
      }
    }

    // -------- Conditioning (its own card, placed next to practice) --------
    // Respect the adaptation selector's suppression list. On recovery /
    // cadence-rest days conditioning must not reappear after a refresh.
    const conditioningSuppressed =
      Array.isArray(adaptationDecision.suppressed) &&
      adaptationDecision.suppressed.includes("conditioning");
    // A legal training day that resolves zero conditioning movements is a
    // defect, not an outcome — surface it in diagnostics instead of quietly
    // emitting `cond.off_day`.
    let conditioningEmptyPool = false;
    if (!isGameDay && !isPostSeason && !conditioningSuppressed) {
      const conditioning: MovementRow[] = [
        lib.find((m) => m.slug === (sport === "baseball" ? "inning_restart_sim_bb" : "inning_restart_sim_sb") && eligible(m)),
        conditioningForPosition(lib, position, eligible),
      ].filter(Boolean) as MovementRow[];
      conditioningEmptyPool = conditioning.length === 0;
      for (const m of conditioning) {
        push("conditioning", "conditioning", m, {}, "Conditioning belongs next to practice — inning-restart + position-specific.");
      }
    }

    // -------- Cross-sport (its own slot, appended) --------
    // Prefer Weightless Object Sport Training coordination for youth/beginner
    // athletes; select a movement whose cross_sport_category matches the
    // resolved template. If nothing matches, skip cleanly — an unmatched
    // pick would fail the certifier and kill the whole plan.
    if (isOffseason && !isGameDay) {
      const cross = pickCrossSportForTemplate(xsRequired, [
        CROSS_SPORT_COORDINATION_PREFERRED,
        CROSS_SPORT_LOW_IMPACT_PREFERRED,
      ]);
      if (cross) {
        push(
          "cross_sport",
          "cross_sport",
          cross,
          {},
          `Offseason cross-sport conditioning (${block.cross_sport_cadence.replace(/_/g, " ")}). Frees CNS from sport patterns after the main training day.`,
          { placement: "offseason_back_end", sequencing_hint: "Offseason only: do after the primary work, never before an in-season game.", cross_sport_template_id: xsTemplate.id, cross_sport_required_category: xsRequired[0] ?? null },
        );
      }
    }

    // -------- Universal progression pass — EVERY card, not just the explosive
    // engines. Each prescription is stamped with the domain it belongs to, that
    // domain's own history lineage, the session shape floor it was measured
    // against, the day-level orchestration budget it shared, and the career
    // horizon this block serves. Engines that already computed a richer
    // payload (speed / bat speed) keep theirs — this pass never overwrites.
    {
      const bySlot = new Map<string, number>();
      for (const rx of rxs) bySlot.set(rx.slot, (bySlot.get(rx.slot) ?? 0) + 1);

      const fullTrainingDay = !isGameDay && (trainingContext as any)?.day_type !== "recovery";
      const dayOrchestration = {
        cns_cap: cnsCap,
        cns_used: cnsUsed,
        cns_headroom: Math.max(0, cnsCap - cnsUsed),
        // One shared budget across every card — a heavy lift day is why the
        // sprint card is shorter, and the athlete can see that here.
        cards_on_plan: [...bySlot.keys()],
        items_by_card: Object.fromEntries(bySlot),
        day_type: (trainingContext as any)?.day_type ?? null,
        volume_factor: progression.volumeFactor,
        intent_factor: progression.intentFactor,
      };

      // Scheduled re-testing — measurement is planned, never incidental.
      // At most ONE item per measurable domain per day is nominated as the
      // block's re-test, chosen deterministically (first item in canonical
      // order for that domain) so the same plan replays identically.
      const testItemByDomain = new Map<string, string>();
      if (fullTrainingDay) {
        for (const rx of rxs as any[]) {
          const d = domainForSlotRole(rx.slot, rx.sequence_role);
          if (testItemByDomain.has(d)) continue;
          if (!isTestDue(progression, d)) continue;
          testItemByDomain.set(d, rx.movement_slug);
        }
      }

      for (const rx of rxs as any[]) {
        const wp = (rx.why_payload ?? {}) as Record<string, unknown>;
        const domain = domainForSlotRole(rx.slot, rx.sequence_role);
        const floor = DOMAIN_SHAPE_FLOOR[domain];
        const sessionName = domainSessionName(domain);
        const isTestItem = testItemByDomain.get(domain) === rx.movement_slug;


        wp.training_domain = domain;
        wp.career_horizon = {
          stage: progression.career.stage,
          label: progression.career.label,
          focus: progression.career.focus,
        };
        wp.day_orchestration = dayOrchestration;

        // Week-in-block wave. The doctrine dose was resolved before the
        // 28-day history was read, so it is re-resolved here with the real
        // block week. This replaces the old ad-hoc "sets - 1" deload patch:
        // the wave (and week-4 deload) is now part of the same envelope math,
        // so a deload can never drop a row below its envelope floor.
        const dd = wp.dose_doctrine as any;
        if (dd && typeof rx.sets === "number" && typeof rx.reps === "number") {
          const rewaved = resolveDose({
            phase: phaseRes.phase,
            role: dd.role ?? rx.sequence_role,
            category: dd.category,
            trainingAgeYears,
            weekInBlock: progression.weekInBlock,
            isDeloadWeek: progression.isDeloadWeek,
            cnsClamped: !!rx.cns_clamped,
            capSets: dd.cap_sets ?? null,
            capReps: dd.cap_reps ?? null,
          });
          const before = { sets: rx.sets, reps: rx.reps };
          rx.sets = rewaved.sets;
          rx.reps = rewaved.reps;
          dd.notes = rewaved.notes;
          dd.week_in_block = progression.weekInBlock;
          if (before.sets !== rx.sets || before.reps !== rx.reps) {
            dd.wave_applied = { from: `${before.sets}×${before.reps}`, to: `${rx.sets}×${rx.reps}` };
          }
          if (progression.isDeloadWeek) {
            wp.deload_applied = {
              from: before.sets,
              to: rx.sets,
              reason: "Week 4 deload — envelope floor, quality held.",
            };
          }
          if (!isWithinEnvelope(phaseRes.phase, dd.role ?? rx.sequence_role, dd.category, rx.sets, rx.reps)) {
            dd.envelope_violation = true;
          }
        }



        if (!wp.session_shape) {
          wp.session_shape = {
            // Floors only bind on a full training day; game / recovery days
            // are deliberately short and must never be flagged as thin.
            min: fullTrainingDay ? floor.min : 1,
            max: floor.max,
            actual: bySlot.get(rx.slot) ?? 0,
          };
        }
        if (!wp.session_title) wp.session_title = blockLabel(progression, sessionName);
        wp.test_day = isTestItem;
        if (isTestItem) {
          wp.test_metric = DOMAIN_METRIC_KEY[domain] ?? null;
          wp.test_metric_label = metricLabel(DOMAIN_METRIC_KEY[domain]);
        }
        if (!wp.progression) {
          wp.progression = buildProgressionPayload({
            state: progression,
            slug: rx.movement_slug,
            metricKey: DOMAIN_METRIC_KEY[domain],
            sessionName,
            domain,
            testDay: isTestItem,
          });
        } else if (typeof wp.progression === "object" && wp.progression) {
          const p = wp.progression as Record<string, unknown>;
          if (p.domain == null) p.domain = domain;
          if (p.test_day == null) {
            p.test_day = isTestItem;
            p.test_metric = isTestItem ? DOMAIN_METRIC_KEY[domain] ?? null : null;
            p.test_metric_label = isTestItem ? metricLabel(DOMAIN_METRIC_KEY[domain]) : null;
          }
          if (p.career_stage == null) {
            p.career_stage = progression.career.stage;
            p.career_label = progression.career.label;
            p.career_focus = progression.career.focus;
          }
        }

        if (wp.re_exposure_violation == null) {
          wp.re_exposure_violation = isInReExposureWindow(
            progression,
            rx.movement_slug,
            (wp.category as string) ?? (wp.pattern as string) ?? null,
          );
        }
        rx.why_payload = wp;
      }
    }

    // Phase 2 Fix 5 — deterministic canonical ordering. This is the ONLY
    // place sequence_order is assigned. Cards render by this key; no
    // component-level ordering is allowed.
    // Never ignore what a coach has done — read back any manual ordering
    // already stored for this athlete/day and preserve it through regeneration.
    let priorOrderRows: {
      slot: string;
      movement_slug: string;
      sequence_order: number | null;
      why_payload: Record<string, unknown> | null;
    }[] = [];
    try {
      const { data: priorRows } = await admin
        .from("wk_prescriptions")
        .select("slot, movement_slug, sequence_order, why_payload")
        .eq("user_id", user.id)
        .eq("plan_date", planDate);
      priorOrderRows = (priorRows ?? []) as typeof priorOrderRows;
    } catch (_e) {
      priorOrderRows = [];
    }

    const orderedRxs = assignSequenceOrder(
      applyManualOrder(dedupePrescriptions(rxs), priorOrderRows),
    );
    const finalRxs = orderedRxs;


    // -------- WIC Validation Engine — no publication without a passing report --------
    const validatorReport = wicValidate({
      phase: phaseRes.phase,
      isGameDay,
      prescriptions: finalRxs.map((r) => ({
        engine: (r as any).engine,
        slot: r.slot,
        sequence_role: r.sequence_role,
        movement_slug: r.movement_slug,
        movement_name: r.movement_name,
        sets: r.sets,
        reps: r.reps,
        dosage_unit: (r as any).dosage_unit ?? null,
        duration_seconds: (r as any).duration_seconds ?? null,
        distance_feet: (r as any).distance_feet ?? null,
        total_reps: (r as any).total_reps ?? null,

        why_v2: (r as any).why_v2,
        why_payload: (r as any).why_payload,
      })),
    });
    // Weekly Balance Ledger findings ride along as warnings — never fatal.
    // They steer tomorrow's discretionary slots; they never block a plan.
    for (const w of weeklyBalanceWarnings) {
      validatorReport.issues.push({
        code: w.code,
        severity: "warn",
        message: w.message,
      } as any);
    }
    if (conditioningEmptyPool) {
      validatorReport.issues.push({
        code: "conditioning_empty_pool",
        severity: "warn",
        message:
          "Conditioning was legal today but no catalog movement passed the eligibility gates — the card will not render.",
      } as any);
    }

    // Blocks or slots deliberately left out because no legal candidate existed
    // for this athlete. These are ALWAYS warnings: a skipped block is a valid
    // plan with an honest gap, never a failed generation.
    for (const w of selectionSkips.warnings()) {
      validatorReport.issues.push(w as any);
    }




    const allWhysComplete = finalRxs.every((r) => (r as any).why_v2 && whyIsComplete((r as any).why_v2 as WhyV2));
    if (!allWhysComplete) {
      validatorReport.issues.push({
        code: "missing_why_v2",
        severity: "fatal",
        message: "One or more prescriptions are missing constitutional why answers.",
      });
      (validatorReport as any).ok = false;
    }

    // -------- Phase 8 — Elite Lift Intelligence certification --------
    // Runs after lift rows are built. Resolves a single canonical template,
    // stamps every lift row with governance metadata + substitution ladder,
    // and blocks publication on fatal issues (not full body, illegal season,
    // illegal training age, duplicate category, unresolved substitution, etc.).
    const liftCertification = certifyLift({
      prescriptions: finalRxs as any,
      catalog: lib as any,
      template: {
        seasonPhase: trainingContext.season_phase,
        dayType: trainingContext.day_type,
        trainingAge: (trainingAgeContext as any)?.classification,
        primaryAdaptation: adaptationDecision.primary,
        isGameDay,
        isRecoveryDay: (trainingContext as any)?.day_type === "recovery",
        isReturnToPlay: false,
      },
      availableEquipment: (athleteContext as any)?.environment?.equipment ?? undefined,
      trainingAgeClass: (trainingAgeContext as any)?.classification,
    });
    // Attach governance stamp to each lift row's why_v2 + why_payload.
    for (const rx of finalRxs) {
      if (rx.slot !== "lift") continue;
      const stamp = liftCertification.stamps.get(rx.movement_slug);
      if (!stamp) continue;
      const wp = ((rx as any).why_payload ?? {}) as Record<string, unknown>;
      wp.lift_governance = {
        template_id: stamp.template_id,
        template_name: stamp.template_name,
        movement_category: stamp.category,
        substitution_family: stamp.substitution_family,
        substitution_ladder: stamp.substitution_ladder,
        substitution_ladder_score: stamp.ladder_score,
        governance_version: liftCertification.governanceVersion,
      };
      (rx as any).why_payload = wp;
      const wv = ((rx as any).why_v2 ?? {}) as Record<string, unknown>;
      wv.why_category = stamp.why_category;
      wv.why_template = stamp.why_template;
      wv.why_substitution_ladder = stamp.why_substitution_ladder;
      (rx as any).why_v2 = wv;
    }
    // Promote Phase 8 fatal issues into the validator report so publication
    // is blocked all-or-nothing under the same gate.
    for (const f of liftCertification.fatal) {
      validatorReport.issues.push({ code: f.code, severity: "fatal", message: f.message, slug: f.slug });
      (validatorReport as any).ok = false;
    }
    for (const w of liftCertification.warn) {
      validatorReport.issues.push({ code: w.code, severity: "warn", message: w.message, slug: w.slug });
    }

    // -------- Phase 9 — Explosive Performance Engine (Speed + Bat Speed) --------
    // Independent certifiers. Each resolves its own template from the same
    // constitutional context, stamps governance metadata onto the matching
    // rows, and blocks publication on fatal issues.
    const isPracticeDayCtx = String((trainingContext as any)?.day_type ?? "").startsWith("practice");
    const environmentCtx = (athleteContext as any)?.environment?.location ?? undefined;
    const availableEquipmentCtx = (athleteContext as any)?.environment?.equipment ?? undefined;

    const speedCertification = certifySpeed({
      prescriptions: finalRxs as any,
      catalog: lib as any,
      template: {
        seasonPhase: trainingContext.season_phase,
        dayType: trainingContext.day_type,
        trainingAge: (trainingAgeContext as any)?.classification,
        primaryAdaptation: adaptationDecision.primary,
        isGameDay,
        isPracticeDay: isPracticeDayCtx,
        isRecoveryDay: (trainingContext as any)?.day_type === "recovery",
        isReturnToPlay: false,
      },
      availableEquipment: availableEquipmentCtx,
      environment: environmentCtx,
      trainingAgeClass: (trainingAgeContext as any)?.classification,
    });
    const batSpeedCertification = certifyBatSpeed({
      prescriptions: finalRxs as any,
      catalog: lib as any,
      template: {
        seasonPhase: trainingContext.season_phase,
        dayType: trainingContext.day_type,
        trainingAge: (trainingAgeContext as any)?.classification,
        primaryAdaptation: adaptationDecision.primary,
        isGameDay,
        isRecoveryDay: (trainingContext as any)?.day_type === "recovery",
        isReturnToPlay: false,
      },
      availableEquipment: availableEquipmentCtx,
      environment: environmentCtx,
      trainingAgeClass: (trainingAgeContext as any)?.classification,
    });

    // Stamp Speed / Bat-Speed governance onto matching rows.
    for (const rx of finalRxs) {
      if (rx.slot === "speed") {
        const stamp = speedCertification.stamps.get(rx.movement_slug);
        if (!stamp) continue;
        const wp = ((rx as any).why_payload ?? {}) as Record<string, unknown>;
        wp.speed_governance = {
          template_id: stamp.template_id,
          template_name: stamp.template_name,
          speed_category: stamp.category,
          pap_classification: stamp.pap_classification,
          movement_velocity: stamp.movement_velocity,
          substitution_family: stamp.substitution_family,
          substitution_ladder: stamp.substitution_ladder,
          substitution_ladder_score: stamp.ladder_score,
          governance_version: speedCertification.governanceVersion,
        };
        (rx as any).why_payload = wp;
        const wv = ((rx as any).why_v2 ?? {}) as Record<string, unknown>;
        wv.why_category = stamp.why_category;
        wv.why_template = stamp.why_template;
        wv.why_athlete = stamp.why_athlete;
        wv.why_season = stamp.why_season;
        wv.why_pap = stamp.why_pap;
        wv.why_substitution_ladder = stamp.why_substitution_ladder;
        (rx as any).why_v2 = wv;
      } else if (rx.slot === "bat_speed") {
        const stamp = batSpeedCertification.stamps.get(rx.movement_slug);
        if (!stamp) continue;
        const wp = ((rx as any).why_payload ?? {}) as Record<string, unknown>;
        wp.bat_speed_governance = {
          template_id: stamp.template_id,
          template_name: stamp.template_name,
          bat_speed_category: stamp.category,
          pap_classification: stamp.pap_classification,
          movement_velocity: stamp.movement_velocity,
          substitution_family: stamp.substitution_family,
          substitution_ladder: stamp.substitution_ladder,
          substitution_ladder_score: stamp.ladder_score,
          governance_version: batSpeedCertification.governanceVersion,
        };
        (rx as any).why_payload = wp;
        const wv = ((rx as any).why_v2 ?? {}) as Record<string, unknown>;
        wv.why_category = stamp.why_category;
        wv.why_template = stamp.why_template;
        wv.why_athlete = stamp.why_athlete;
        wv.why_season = stamp.why_season;
        wv.why_pap = stamp.why_pap;
        wv.why_substitution_ladder = stamp.why_substitution_ladder;
        (rx as any).why_v2 = wv;
      }
    }

    // Promote Phase 9 fatal issues into the validator report.
    for (const f of speedCertification.fatal) {
      validatorReport.issues.push({ code: f.code, severity: "fatal", message: f.message, slug: f.slug });
      (validatorReport as any).ok = false;
    }
    for (const w of speedCertification.warn) {
      validatorReport.issues.push({ code: w.code, severity: "warn", message: w.message, slug: w.slug });
    }
    for (const f of batSpeedCertification.fatal) {
      validatorReport.issues.push({ code: f.code, severity: "fatal", message: f.message, slug: f.slug });
      (validatorReport as any).ok = false;
    }
    for (const w of batSpeedCertification.warn) {
      validatorReport.issues.push({ code: w.code, severity: "warn", message: w.message, slug: w.slug });
    }

    // -------- Phase 10 — Performance Support Engines --------
    // Conditioning → Cross-Sport → Recovery → Arm Care. Each certifier receives
    // the same constitutional inputs, stamps governance metadata onto matching
    // rows, and blocks publication on fatal issues via the shared validator.
    const trainingAgeClassCtx = (trainingAgeContext as any)?.classification;
    const positionCtx = (athleteContext as any)?.position ?? (athleteContext as any)?.primary_position;
    const isPitcherCtx = String(positionCtx ?? "").toLowerCase().includes("pitcher");
    const isTwoWayCtx = Boolean((athleteContext as any)?.two_way || (athleteContext as any)?.is_two_way);
    const isStarterCtx = Boolean((athleteContext as any)?.pitcher_role === "starter");
    const isRelieverCtx = Boolean((athleteContext as any)?.pitcher_role === "reliever");

    const conditioningCertification = certifyConditioning({
      prescriptions: finalRxs as any,
      catalog: lib as any,
      template: {
        seasonPhase: trainingContext.season_phase,
        dayType: trainingContext.day_type,
        trainingAge: trainingAgeClassCtx,
        primaryAdaptation: adaptationDecision.primary,
        isGameDay,
        isPracticeDay: isPracticeDayCtx,
        isTournamentDay: false,
        isRecoveryDay: isRecoveryDayCtx,
        isReturnToPlay: false,
        isPitcher: isPitcherCtx,
      },
      availableEquipment: availableEquipmentCtx,
      environment: environmentCtx,
      trainingAgeClass: trainingAgeClassCtx,
    });

    const crossSportCertification = certifyCrossSport({
      prescriptions: finalRxs as any,
      catalog: lib as any,
      template: {
        seasonPhase: trainingContext.season_phase,
        dayType: trainingContext.day_type,
        trainingAge: trainingAgeClassCtx,
        primaryAdaptation: adaptationDecision.primary,
        isGameDay,
        isRecoveryDay: isRecoveryDayCtx,
      },
      availableEquipment: availableEquipmentCtx,
      environment: environmentCtx,
      trainingAgeClass: trainingAgeClassCtx,
    });

    const recoveryCertification = certifyRecovery({
      prescriptions: finalRxs as any,
      catalog: lib as any,
      template: {
        seasonPhase: trainingContext.season_phase,
        dayType: trainingContext.day_type,
        primaryAdaptation: adaptationDecision.primary,
        isGameDay,
        isPostGame: Boolean((trainingContext as any)?.is_post_game),
        isTravelDay: Boolean((trainingContext as any)?.is_travel_day),
        isDeloadWeek: Boolean((trainingContext as any)?.is_deload_week),
        isRecoveryDay: isRecoveryDayCtx,
        cnsFatigue: (athleteContext as any)?.cns_fatigue,
        tissueFatigue: (athleteContext as any)?.tissue_fatigue,
      },
      availableEquipment: availableEquipmentCtx,
      environment: environmentCtx,
      trainingAgeClass: trainingAgeClassCtx,
    });

    const armCareCertification = certifyArmCare({
      prescriptions: finalRxs as any,
      catalog: lib as any,
      template: {
        seasonPhase: trainingContext.season_phase,
        dayType: trainingContext.day_type,
        trainingAge: trainingAgeClassCtx,
        primaryAdaptation: adaptationDecision.primary,
        position: positionCtx,
        isPitcher: isPitcherCtx,
        isTwoWay: isTwoWayCtx,
        isStarter: isStarterCtx,
        isReliever: isRelieverCtx,
        isThrowingDay: Boolean((trainingContext as any)?.is_throwing_day) || isGameDay || isPracticeDayCtx,
        isBullpenDay: Boolean((trainingContext as any)?.is_bullpen_day),
        isRecoveryDay: isRecoveryDayCtx,
        isReturnToPlay: false,
        workloadUnitsLast72h: (athleteContext as any)?.throwing_workload_72h,
        hasInjuryRestriction: Boolean((athleteContext as any)?.arm_injury_active),
      },
      availableEquipment: availableEquipmentCtx,
      environment: environmentCtx,
      trainingAgeClass: trainingAgeClassCtx,
    });

    // Stamp Phase 10 governance onto matching prescription rows.
    const PHASE10_STAMPS: Array<{
      slots: readonly string[];
      key: string;
      cert: { governanceVersion: string; stamps: Map<string, any> };
    }> = [
      { slots: ["conditioning"],                key: "conditioning_governance", cert: conditioningCertification },
      { slots: ["sport_block", "cross_sport"],  key: "cross_sport_governance",  cert: crossSportCertification },
      { slots: ["recovery", "mobility"],        key: "recovery_governance",     cert: recoveryCertification },
      { slots: ["arm_care", "throwing"],        key: "arm_care_governance",     cert: armCareCertification },
    ];
    for (const rx of finalRxs) {
      for (const bucket of PHASE10_STAMPS) {
        if (!bucket.slots.includes(rx.slot)) continue;
        const stamp = bucket.cert.stamps.get(rx.movement_slug);
        if (!stamp) continue;
        const wp = ((rx as any).why_payload ?? {}) as Record<string, unknown>;
        wp[bucket.key] = {
          template_id: stamp.template_id,
          template_name: stamp.template_name,
          category: stamp.category,
          substitution_family: stamp.substitution_family,
          substitution_ladder: stamp.substitution_ladder,
          substitution_ladder_score: stamp.ladder_score,
          governance_version: bucket.cert.governanceVersion,
        };
        (rx as any).why_payload = wp;
        const wv = ((rx as any).why_v2 ?? {}) as Record<string, unknown>;
        wv.why_template = stamp.why_template ?? wv.why_template;
        wv.why_athlete = stamp.why_athlete ?? wv.why_athlete;
        wv.why_season = stamp.why_season ?? wv.why_season;
        wv.why_recovery = stamp.why_recovery ?? wv.why_recovery;
        wv.why_readiness = stamp.why_readiness ?? wv.why_readiness;
        wv.why_substitution = stamp.why_substitution ?? wv.why_substitution;
        wv.why_category = stamp.why_category ?? wv.why_category;
        (rx as any).why_v2 = wv;
      }
    }

    // Promote Phase 10 fatal / warn issues into the shared validator report.
    for (const cert of [conditioningCertification, crossSportCertification, recoveryCertification, armCareCertification]) {
      for (const f of cert.fatal) {
        validatorReport.issues.push({ code: f.code, severity: "fatal", message: f.message, slug: f.slug });
        (validatorReport as any).ok = false;
      }
      for (const w of cert.warn) {
        validatorReport.issues.push({ code: w.code, severity: "warn", message: w.message, slug: w.slug });
      }
    }




    // Phase 2 Fix 7 — Canonical validation pass. Additional structural checks
    // that the shared validator does not know about (duplicates, metadata
    // completeness) are enforced here so publication is all-or-nothing.
    const slugCounts = new Map<string, number>();
    for (const r of finalRxs) slugCounts.set(r.movement_slug, (slugCounts.get(r.movement_slug) ?? 0) + 1);
    const duplicateCount = [...slugCounts.values()].reduce((s, n) => s + (n > 1 ? n - 1 : 0), 0);
    if (duplicateCount > 0) {
      validatorReport.issues.push({
        code: "duplicate_movement_slug",
        severity: "fatal",
        message: `Publication rejected — ${duplicateCount} duplicate movement slug(s) detected in the prescription set.`,
      });
      (validatorReport as any).ok = false;
    }
    const orderingOk = finalRxs.every((r, i) => r.sequence_order === i);
    if (!orderingOk) {
      validatorReport.issues.push({
        code: "sequence_order_gap",
        severity: "fatal",
        message: "Publication rejected — sequence_order is not monotonic across the prescription set.",
      });
      (validatorReport as any).ok = false;
    }
    const metadataComplete = finalRxs.every(
      (r) => !!(r as any).adaptation && !!(r as any).engine && !!(r as any).why_v2 && !!(r as any).generator_version,
    );
    if (!metadataComplete) {
      validatorReport.issues.push({
        code: "missing_wic_metadata",
        severity: "fatal",
        message: "Publication rejected — one or more prescriptions are missing WIC metadata (adaptation / engine / why_v2 / generator_version).",
      });
      (validatorReport as any).ok = false;
    }

    // Phase 4 — Constitutional TrainingContext validation.
    // Every prescription must reference exactly one identical training_context.
    let contextValidationOutcome: "ok" | "missing" | "conflicting" | "row_missing" = "ok";
    if (finalRxs.length > 0) {
      const seenPhases = new Set<string>();
      const seenDayTypes = new Set<string>();
      const seenLegality = new Set<string>();
      const seenRecovery = new Set<string>();
      const seenAdaptation = new Set<string>();
      const seenCtxVersion = new Set<string>();
      let rowMissing = false;
      for (const r of finalRxs) {
        const tc: any = (r as any)?.why_payload?.training_context;
        if (!tc) { rowMissing = true; continue; }
        if (tc.season_phase) seenPhases.add(tc.season_phase);
        if (tc.day_type) seenDayTypes.add(tc.day_type);
        if (tc.legality_profile_id) seenLegality.add(tc.legality_profile_id);
        if (tc.recovery_profile_id) seenRecovery.add(tc.recovery_profile_id);
        if (tc.adaptation_profile_id) seenAdaptation.add(tc.adaptation_profile_id);
        if (tc.context_version) seenCtxVersion.add(tc.context_version);
      }
      if (rowMissing) {
        contextValidationOutcome = "row_missing";
        validatorReport.issues.push({ code: "row_missing_training_context", severity: "fatal", message: "One or more prescriptions are missing training_context." });
        (validatorReport as any).ok = false;
      }
      const anyConflict =
        seenPhases.size > 1 || seenDayTypes.size > 1 || seenLegality.size > 1 ||
        seenRecovery.size > 1 || seenAdaptation.size > 1 || seenCtxVersion.size > 1;
      if (anyConflict) {
        contextValidationOutcome = "conflicting";
        validatorReport.issues.push({
          code: "conflicting_training_context",
          severity: "fatal",
          message: `Conflicting training_context detected — phases:${seenPhases.size} days:${seenDayTypes.size} legality:${seenLegality.size} recovery:${seenRecovery.size} adaptation:${seenAdaptation.size} version:${seenCtxVersion.size}`,
        });
        (validatorReport as any).ok = false;
      }
      // Sanity: resolved context must match the phases we just wrote.
      if (!seenPhases.has(trainingContext.season_phase)) {
        contextValidationOutcome = "missing";
        validatorReport.issues.push({
          code: "context_row_phase_mismatch",
          severity: "fatal",
          message: `Resolved context phase (${trainingContext.season_phase}) not present on any prescription row.`,
        });
        (validatorReport as any).ok = false;
      }
    }

    // Phases 5–7 — Athlete / Personalization / Training-Age validation.
    // Every prescription must reference exactly one identical instance of each.
    if (finalRxs.length > 0) {
      const seenAcVer = new Set<string>();
      const seenPersVer = new Set<string>();
      const seenTaClass = new Set<string>();
      const seenHand = new Set<string>();
      const seenPos = new Set<string>();
      const seenGoalCount = new Set<number>();
      let acMissingCount = 0;
      let taMissingCount = 0;
      for (const r of finalRxs) {
        const wp: any = (r as any)?.why_payload ?? {};
        const ac = wp.athlete_context;
        const pers = wp.personalization_context;
        const ta = wp.training_age_context;
        if (!ac) { acMissingCount++; }
        else {
          if (ac.athlete_context_version) seenAcVer.add(ac.athlete_context_version);
          if (ac.identity?.throwing_side) seenHand.add(String(ac.identity.throwing_side));
          if (ac.identity?.primary_position) seenPos.add(String(ac.identity.primary_position));
          if (Array.isArray(ac.goals)) seenGoalCount.add(ac.goals.length);
        }
        if (pers?.personalization_version) seenPersVer.add(pers.personalization_version);
        if (!ta || !ta.classification) taMissingCount++;
        else seenTaClass.add(String(ta.classification));
      }
      if (acMissingCount > 0) {
        validatorReport.issues.push({ code: "athlete_context_missing", severity: "fatal", message: `athlete_context missing on ${acMissingCount} row(s).` });
        (validatorReport as any).ok = false;
      }
      if (seenAcVer.size > 1) {
        validatorReport.issues.push({ code: "multiple_athlete_contexts", severity: "fatal", message: `Multiple athlete_context versions detected: ${[...seenAcVer].join(", ")}` });
        (validatorReport as any).ok = false;
      }
      if (seenPersVer.size > 1) {
        validatorReport.issues.push({ code: "multiple_personalization_contexts", severity: "fatal", message: `Multiple personalization_context versions detected: ${[...seenPersVer].join(", ")}` });
        (validatorReport as any).ok = false;
      }
      if (taMissingCount > 0 || seenTaClass.size > 1) {
        validatorReport.issues.push({ code: "training_age_unresolved", severity: "fatal", message: `training_age not uniformly resolved (missing=${taMissingCount}, distinct=${seenTaClass.size}).` });
        (validatorReport as any).ok = false;
      }
      if (seenGoalCount.size > 1) {
        validatorReport.issues.push({ code: "goal_resolution_inconsistent", severity: "fatal", message: `Goal list length inconsistent across rows: ${[...seenGoalCount].join(", ")}` });
        (validatorReport as any).ok = false;
      }
      if (seenHand.size > 1) {
        validatorReport.issues.push({ code: "handedness_inconsistent", severity: "fatal", message: `Handedness inconsistent across rows: ${[...seenHand].join(", ")}` });
        (validatorReport as any).ok = false;
      }
      if (seenPos.size > 1) {
        validatorReport.issues.push({ code: "position_inconsistent", severity: "fatal", message: `Primary position inconsistent across rows: ${[...seenPos].join(", ")}` });
        (validatorReport as any).ok = false;
      }
    }

    // ============================================================
    // Phase 11–12 — E2E Unification & Production Lock
    // ============================================================
    const ENGINE_EXECUTION_ORDER = [
      "lift", "speed", "bat_speed", "conditioning",
      "cross_sport", "recovery", "arm_care",
    ];
    const p1112_utcDate = utcPlanDate(planDate);
    const p1112_contextHash = fnv1a64Hex(canonicalJson({
      ctx: trainingContext, ac: athleteContext.athlete_context_version,
      pers: personalizationContext.personalization_version, ta: trainingAgeContext.training_age_version,
    }));
    const p1112_seed = stableSeed(null, user.id, p1112_contextHash);
    // -------- Elite Training Methods Engine v1 --------
    // The third layer of the prescription: not WHICH movement and not HOW MUCH,
    // but HOW the work is organized. French contrast and the method library
    // attach to an already-certified block, inside the dosage envelope, and
    // drop silently the moment the day, the athlete or the pool says no.
    const methodWeeklyUsage = buildWeeklyMethodUsage((recentLifts ?? []) as any[]);
    const methodDayCtx = {
      dayType: (trainingContext as any)?.day_type ?? null,
      isGameDay,
      isTravelDay: String((trainingContext as any)?.day_type ?? "").includes("travel"),
      isHeavyPracticeDay: isPracticeDayCtx && !isGameDay &&
        String((trainingContext as any)?.practice_intensity ?? "").toLowerCase() === "high",
      isRecoveryDay: String((trainingContext as any)?.day_type ?? "") === "recovery",
      isReturnToPlay: false,
    };
    const methodAthleteCtx = {
      trainingAgeClass: (((trainingAgeContext as any)?.classification ?? "beginner") as any),
      ageYears: ((athleteContext as any)?.ageYears ?? (Number(p.age ?? p.age_years ?? 0) || null)) as number | null,
      strengthFloorCleared,
      hasActiveInjury: injurySlugs.size > 0,
      equipment: ((availableEquipmentCtx as string[]) ?? []),
    };
    const methodReadinessCtx = {
      reductionCount: reductions.length,
      cnsClamped: (finalRxs as any[]).some((r) => r.cns_clamped === true),
      cnsReadiness: Number.isFinite(cnsReadiness) ? cnsReadiness : null,
    };
    const methodDiagnostics: Record<string, unknown> = {
      methods_version: METHODS_VERSION,
      methods_applied: [] as string[],
      methods_veto: [] as { engine: string; code: string }[],
    };

    for (const engineSlot of ["lift", "speed", "bat_speed"] as const) {
      const slotRows = (finalRxs as any[]).filter((r) => r.slot === engineSlot);
      if (slotRows.length === 0) continue;
      const anchorRow = slotRows.find((r) => String(r.sequence_role ?? "").includes("compound")) ?? slotRows[0];
      const anchorMovement = lib.find((x) => x.slug === anchorRow.movement_slug);
      if (!anchorMovement) continue;

      const legalPool = lib.filter((m) => eligible(m));
      const pools = buildStationPools(legalPool as any, movementFamily(anchorMovement as any));
      const shape = shapeFromPools(pools, {
        hasAnchor: true,
        accessoryCount: slotRows.filter((r) => !String(r.sequence_role ?? "").includes("compound")).length,
      });

      const selection = selectMethod({
        engine: engineSlot,
        phase: phaseRes.phase,
        day: methodDayCtx,
        athlete: methodAthleteCtx,
        readiness: methodReadinessCtx,
        block: shape,
        weeklyUsage: methodWeeklyUsage,
        seed: p1112_seed,
      });
      if (!selection.method) {
        (methodDiagnostics.methods_veto as any[]).push({ engine: engineSlot, code: selection.vetoCode });
        continue;
      }

      const stations = resolveStations(selection.method, anchorMovement as any, pools, p1112_seed);
      if (stations === null) {
        (methodDiagnostics.methods_veto as any[]).push({ engine: engineSlot, code: "method_station_unresolved" });
        continue;
      }

      const result = applyMethod({
        method: selection.method,
        phase: phaseRes.phase,
        role: anchorRow.sequence_role ?? null,
        category: coerceCanonicalCategory(anchorMovement as any),
        sets: Number(anchorRow.sets ?? 0) || 1,
        reps: Number(anchorRow.reps ?? 0) || 1,
        cnsCost: Number(anchorRow.cns_cost ?? 0),
        cnsHeadroom: Math.max(0, cnsCap - cnsUsed),
        resolvedStations: stations,
      });
      if (!result.applied) {
        (methodDiagnostics.methods_veto as any[]).push({ engine: engineSlot, code: result.dropCode });
        continue;
      }
      const issues = validateAppliedMethod(result.applied, {
        phase: phaseRes.phase,
        role: anchorRow.sequence_role ?? null,
        category: coerceCanonicalCategory(anchorMovement as any),
      });
      if (issues.some((i) => i.severity === "fatal")) {
        // A method never blocks publication — the plain block is already valid.
        (methodDiagnostics.methods_veto as any[]).push({ engine: engineSlot, code: issues[0].code });
        for (const w of issues) {
          validatorReport.issues.push({ code: w.code, severity: "warn", message: w.detail } as any);
        }
        continue;
      }
      for (const w of issues) {
        validatorReport.issues.push({ code: w.code, severity: "warn", message: w.detail } as any);
      }

      // Stamp the anchor row — dose stays inside the envelope, structure and
      // rationale ride along in why_payload / why_v2.
      const a = result.applied;
      const priorCns = Number(anchorRow.cns_cost ?? 0) || 0;
      anchorRow.sets = a.sets;
      anchorRow.cns_cost = a.cns_cost;
      // Keep the day's CNS ledger honest — a method that adds a set spends
      // real units, and the next slot must see that spend.
      cnsUsed = Math.max(0, cnsUsed + ((Number(a.cns_cost) || 0) - priorCns));
      const wp = (anchorRow.why_payload ?? {}) as Record<string, unknown>;
      wp.training_method_id = a.method_id;
      wp.training_method = {
        id: a.method_id,
        family: a.method_family,
        display_name: a.method_display_name,
        shape: a.method_shape,
        structure: a.method_structure,
        rounds: a.rounds,
        stations: a.stations,
        rest_between_rounds_seconds: a.rest_between_rounds_seconds,
        cue: a.method_cue,
        bailout: a.method_bailout,
        why: a.why_method,
        clamps: a.clamps,
        methods_version: a.methods_version,
      };
      anchorRow.why_payload = wp;
      const wv = (anchorRow.why_v2 ?? {}) as Record<string, unknown>;
      wv.why_method = a.why_method;
      wv.why_order = `${wv.why_order ?? ""} ${a.method_display_name}: ${a.method_shape}.`.trim();
      anchorRow.why_v2 = wv;
      anchorRow.rationale = `${anchorRow.rationale ?? ""} ${a.why_method}`.trim();
      (methodDiagnostics.methods_applied as string[]).push(`${engineSlot}:${a.method_id}`);
      methodWeeklyUsage[a.method_id] = (methodWeeklyUsage[a.method_id] ?? 0) + 1;
    }

    const p1112_govHash = governanceCatalogHash(lib as unknown as Array<Record<string, unknown>>);
    const p1112_determinismTrace = buildDeterminismTrace({
      seed: p1112_seed, utcPlanDate: p1112_utcDate, contextHash: p1112_contextHash,
      governanceCatalogHash: p1112_govHash, engineExecutionOrder: ENGINE_EXECUTION_ORDER,
    });

    // Unified why_v2 root — merged onto every prescription row.
    const p1112_whyRoot = buildUnifiedWhyRoot({
      engineChain: ENGINE_EXECUTION_ORDER,
      equipment: (availableEquipmentCtx as string[]) ?? [],
      environment: (environmentCtx as string) ?? null,
      season: trainingContext.season_phase ?? null,
      schedule: (trainingContext as any).day_type ?? null,
      readiness: (athleteContext as any)?.cns_readiness ?? null,
      seed: p1112_seed,
      governanceHash: p1112_govHash,
    });
    // Collect per-engine substitution paths from certifications.
    const subPath: Record<string, unknown[]> = {};
    for (const [k, c] of [
      ["lift", liftCertification], ["speed", speedCertification], ["bat_speed", batSpeedCertification],
      ["conditioning", conditioningCertification], ["cross_sport", crossSportCertification],
      ["recovery", recoveryCertification], ["arm_care", armCareCertification],
    ] as const) {
      const stamps = (c as any)?.stamps;
      if (stamps && typeof stamps.forEach === "function") {
        const list: unknown[] = [];
        stamps.forEach((s: any, slug: string) => list.push({ slug, ladder: s?.substitution_ladder ?? null }));
        subPath[k] = list;
      }
    }
    p1112_whyRoot.why_substitution_path = subPath;

    // Merge unified root into every rx.why_v2 and compute completeness.
    let p1112_whyMinScore = 100;
    for (const rx of finalRxs as any[]) {
      rx.why_v2 = mergeUnifiedWhy(rx.why_v2 ?? {}, p1112_whyRoot);
      const s = computeWhyCompleteness(rx.why_v2);
      if (s < p1112_whyMinScore) p1112_whyMinScore = s;
    }
    if (finalRxs.length === 0) p1112_whyMinScore = 0;
    if (p1112_whyMinScore < 100) {
      validatorReport.issues.push({
        code: "why_v2_incomplete", severity: "fatal",
        message: `Unified why_v2 completeness below 100 (min=${p1112_whyMinScore}).`,
      });
      (validatorReport as any).ok = false;
    }

    // Cross-engine conflict resolution.
    const p1112_conflict = resolveCrossEngineConflicts(
      finalRxs as any,
      {
        is_game_day: !!isGameDay,
        throwing_phase: (trainingContext as any)?.throwing_phase ?? null,
        cns_readiness: (athleteContext as any)?.cns_readiness ?? null,
        metabolic_budget: (athleteContext as any)?.metabolic_budget ?? 100,
      },
    );
    if (!p1112_conflict.ok) {
      for (const f of p1112_conflict.fatals) {
        validatorReport.issues.push({
          code: "cross_engine_conflict_detected", severity: "fatal",
          message: `${f.detail} [engines=${f.engines.join(",")}${f.slugs ? " slugs=" + f.slugs.join(",") : ""}]`,
        });
        (validatorReport as any).ok = false;
      }
    }

    // Aggregate per-engine validator reports into a unified registry view.
    const engineReports: EngineReport[] = [
      { engine: "lift", fatal: (liftCertification as any).fatal ?? [], warn: (liftCertification as any).warn ?? [] },
      { engine: "speed", fatal: (speedCertification as any).fatal ?? [], warn: (speedCertification as any).warn ?? [] },
      { engine: "bat_speed", fatal: (batSpeedCertification as any).fatal ?? [], warn: (batSpeedCertification as any).warn ?? [] },
      { engine: "conditioning", fatal: (conditioningCertification as any).fatal ?? [], warn: (conditioningCertification as any).warn ?? [] },
      { engine: "cross_sport", fatal: (crossSportCertification as any).fatal ?? [], warn: (crossSportCertification as any).warn ?? [] },
      { engine: "recovery", fatal: (recoveryCertification as any).fatal ?? [], warn: (recoveryCertification as any).warn ?? [] },
      { engine: "arm_care", fatal: (armCareCertification as any).fatal ?? [], warn: (armCareCertification as any).warn ?? [] },
    ];
    const p1112_aggReport = aggregateValidatorReports(engineReports, []);
    const p1112_globalValidatorStatus = (validatorReport as any).ok && p1112_aggReport.ok ? "ok" : "fatal";

    // Snapshot hash (computed pre-persistence; RPC re-checks post-persist).
    const p1112_snapshotHash = hashSnapshot({
      rxs: finalRxs as any,
      diag: {
        generator_version: WIC_VERSION,
        resolved_season_phase: trainingContext.season_phase,
        resolved_day_type: trainingContext.day_type,
        determinism_seed: p1112_seed,
        governance_catalog_hash: p1112_govHash,
      },
    });
    const p1112_immutability = assertImmutable(p1112_snapshotHash, p1112_snapshotHash);

    // ================= Phase 12+ — System Freeze v1 =================
    // (a) Engine contract V-Final signatures for all seven engines.
    const p12_engineSignatures = [
      computeEngineSignature("lift", liftCertification as any),
      computeEngineSignature("speed", speedCertification as any),
      computeEngineSignature("bat_speed", batSpeedCertification as any),
      computeEngineSignature("conditioning", conditioningCertification as any),
      computeEngineSignature("cross_sport", crossSportCertification as any),
      computeEngineSignature("recovery", recoveryCertification as any),
      computeEngineSignature("arm_care", armCareCertification as any),
    ];
    const p12_engineSignatureMap: Record<string, unknown> = {};
    for (const s of p12_engineSignatures) p12_engineSignatureMap[s.engine] = s;

    // (b) why_v2 normalization lock — freeze root, freeze each merged row, then hash.
    const p12_whyRootFrozen = freezeWhyV2(p1112_whyRoot);
    for (const rx of finalRxs as any[]) rx.why_v2 = freezeWhyV2(rx.why_v2);
    const p12_whyV2Hash = hashWhyV2({
      root: p12_whyRootFrozen,
      rows: (finalRxs as any[]).map((r) => r.why_v2 ?? null),
    });

    // (c) Aggregate validator hash.
    const p12_validatorAggHash = fnv1a64Hex(canonicalJson(p1112_aggReport));

    // (d) Compress the entire run into a single SystemStateV1 fingerprint.
    const p12_systemState = compressSystemState({
      seed: p1112_seed,
      engineExecutionOrder: ENGINE_EXECUTION_ORDER,
      governanceHash: p1112_govHash,
      snapshotHash: p1112_snapshotHash,
      validatorAggregate: p1112_aggReport,
      whyV2Root: p12_whyRootFrozen,
      determinismTrace: p1112_determinismTrace,
    });
    const p12_systemStateHash = systemStateHash(p12_systemState);

    // (e) Global invariant checker — final authority layer.
    const p12_invariant = checkGlobalInvariants({
      systemState: p12_systemState,
      rxs: finalRxs as any,
      diag: {
        generator_version: WIC_VERSION,
        resolved_season_phase: trainingContext.season_phase,
        resolved_day_type: trainingContext.day_type,
        determinism_seed: p1112_seed,
        governance_catalog_hash: p1112_govHash,
      },
      governanceRows: lib as unknown as Array<Record<string, unknown>>,
      whyV2CompletenessScore: p1112_whyMinScore,
      validatorFatals: p1112_aggReport.issues
        .filter((i) => i.severity === "fatal")
        .map((i) => ({ code: i.code, message: i.message })),
      lockedExecutionOrder: ENGINE_EXECUTION_ORDER,
      determinismSeedInputs: { videoId: null, athleteId: user.id, contextHash: p1112_contextHash },
    });
    const p12_globalInvariantStatus = p12_invariant.ok ? "ok" : "fatal";
    if (!p12_invariant.ok) {
      for (const f of p12_invariant.failures) {
        validatorReport.issues.push({ code: `global_invariant_failure:${f.code}`, severity: "fatal", message: f.detail });
      }
      (validatorReport as any).ok = false;
    }

    // (f) Minimal telemetry emission.
    try { emitSystemState(p12_systemState); } catch (_) { /* telemetry never blocks */ }


    const generationMs = Date.now() - generationStartedAt;
    const cardsProduced = {
      lift: finalRxs.filter((r) => r.slot === "lift").length,
      speed: finalRxs.filter((r) => r.slot === "speed").length,
      bat_speed: finalRxs.filter((r) => r.slot === "bat_speed").length,
      conditioning: finalRxs.filter((r) => r.slot === "conditioning").length,
      cross_sport: finalRxs.filter((r) => r.slot === "cross_sport").length,
      supplemental: finalRxs.filter((r) => r.slot === "supplemental").length,
    };

    // Fatal validation → reject publication entirely; still record diagnostics so
    // the failure is auditable (Fix 7 + Fix 10).
    if (!validatorReport.ok) {
      console.error("[wk-generate-daily] WIC validation failed", { user_id: user.id, plan_date: planDate, issues: validatorReport.issues });
      try {
        await admin.rpc("wk_persist_prescriptions_atomic" as any, {
          p_user: user.id,
          p_date: planDate,
          p_rows: [],
          p_diag: {
            generator_version: WIC_VERSION,
            season_phase: phaseRes.phase,
            adaptation: adaptationDecision.primary,
            generation_ms: generationMs,
            validation_status: "rejected",
            exercise_count: 0,
            duplicate_count: duplicateCount,
            ordering_ok: orderingOk,
            metadata_complete: metadataComplete,
            cards_produced: {},
            warnings: validatorReport.issues.filter((i: any) => i.severity === "warn"),
            errors: validatorReport.issues.filter((i: any) => i.severity === "fatal"),
            // Phase 4 — canonical context diagnostics
            resolved_season_phase: trainingContext.season_phase,
            resolved_day_type: trainingContext.day_type,
            context_version: trainingContext.context_version,
            legality_profile_id: trainingContext.legality_profile_id,
            recovery_profile_id: trainingContext.recovery_profile_id,
            adaptation_profile_id: trainingContext.adaptation_profile_id,
            context_validation_outcome: contextValidationOutcome,
            // Phases 5–7 diagnostics
            athlete_context_version: athleteContext.athlete_context_version,
            personalization_version: personalizationContext.personalization_version,
            training_age_version: trainingAgeContext.training_age_version,
            missing_context_fields: athleteContext.missing_fields,
            context_completeness_score: athleteContext.completeness_score,
            // Phase 8 — Elite Lift Intelligence diagnostics
            lift_template_id: liftCertification.templateId,
            lift_category_coverage: liftCertification.categoryCoverage,
            lift_full_body_ok: liftCertification.fullBodyOk,
            lift_duplicate_check_ok: liftCertification.duplicateCheckOk,
            lift_substitution_completeness: liftCertification.substitutionCompleteness,
            exercise_governance_version: liftCertification.governanceVersion,
            // Phase 9 — Explosive Performance Engine diagnostics
            speed_template_id: speedCertification.templateId,
            speed_category_coverage: speedCertification.categoryCoverage,
            speed_pap_score: speedCertification.papScore,
            speed_substitution_completeness: speedCertification.substitutionCompleteness,
            speed_validation_status: speedCertification.validationStatus,
            bat_speed_template_id: batSpeedCertification.templateId,
            bat_speed_category_coverage: batSpeedCertification.categoryCoverage,
            bat_speed_pap_score: batSpeedCertification.papScore,
            bat_speed_substitution_completeness: batSpeedCertification.substitutionCompleteness,
            bat_speed_validation_status: batSpeedCertification.validationStatus,
            explosive_governance_version: speedCertification.governanceVersion,
            // Phase 10 — Performance Support Engine diagnostics
            conditioning_template_id: conditioningCertification.templateId,
            conditioning_category_coverage: conditioningCertification.categoryCoverage,
            conditioning_validation_status: conditioningCertification.validationStatus,
            conditioning_substitution_completeness: conditioningCertification.substitutionCompleteness,
            conditioning_governance_version: conditioningCertification.governanceVersion,
            cross_sport_template_id: crossSportCertification.templateId,
            cross_sport_category_coverage: crossSportCertification.categoryCoverage,
            cross_sport_validation_status: crossSportCertification.validationStatus,
            cross_sport_substitution_completeness: crossSportCertification.substitutionCompleteness,
            cross_sport_governance_version: crossSportCertification.governanceVersion,
            recovery_template_id: recoveryCertification.templateId,
            recovery_category_coverage: recoveryCertification.categoryCoverage,
            recovery_validation_status: recoveryCertification.validationStatus,
            recovery_substitution_completeness: recoveryCertification.substitutionCompleteness,
            recovery_governance_version: recoveryCertification.governanceVersion,
            arm_care_template_id: armCareCertification.templateId,
            arm_care_category_coverage: armCareCertification.categoryCoverage,
            arm_care_validation_status: armCareCertification.validationStatus,
            arm_care_substitution_completeness: armCareCertification.substitutionCompleteness,
            arm_care_governance_version: armCareCertification.governanceVersion,
            performance_support_governance_version: "performance_support_v1",
            // Phase 11–12 — Unification & Production Lock diagnostics
            determinism_seed: p1112_seed,
            determinism_trace: p1112_determinismTrace,
            engine_execution_order: ENGINE_EXECUTION_ORDER,
            global_validator_status: p1112_globalValidatorStatus,
            snapshot_hash: p1112_snapshotHash,
            expected_snapshot_hash: p1112_snapshotHash,
            snapshot_integrity_status: p1112_immutability.status,
            governance_catalog_hash: p1112_govHash,
            why_v2_completeness_score: p1112_whyMinScore,
            // Phase 12+ — System Freeze v1 diagnostics
            system_state: p12_systemState,
            system_state_hash: p12_systemStateHash,
            engine_signature_hashes: p12_engineSignatureMap,
            why_v2_hash: p12_whyV2Hash,
            expected_why_v2_hash: p12_whyV2Hash,
            validator_aggregate_hash: p12_validatorAggHash,
            global_invariant_status: p12_globalInvariantStatus,
          },
        });
      } catch (diagErr) {
        console.error("[wk-generate-daily] diagnostics-write failed", diagErr);
      }
      // Cards consume `engine_failures` + `missing_context_fields` to show
      // the actual reason today's plan didn't publish (no more bare "Retry").
      const engineFailures: Record<string, string[]> = {};
      for (const er of engineReports) {
        if (er.fatal && er.fatal.length) {
          engineFailures[er.engine] = er.fatal.map((f: any) =>
            typeof f === "string" ? f : (f?.message ?? f?.detail ?? f?.code ?? "fatal"),
          );
        }
      }
      // Blast-radius control — a fatal raised by one movement is attributed to
      // the engine that produced it, so a lift-side problem never tells the
      // Bat Speed card that a couch stretch failed.
      const engineBySlug = new Map<string, string>();
      for (const r of finalRxs) {
        const eng = (r as any).engine;
        if (eng && r.movement_slug) engineBySlug.set(r.movement_slug, String(eng));
      }
      for (const issue of validatorReport.issues as any[]) {
        if (issue?.severity !== "fatal" || !issue?.slug) continue;
        const eng = engineBySlug.get(issue.slug);
        if (!eng) continue;
        (engineFailures[eng] ??= []).push(issue.message ?? issue.code ?? "fatal");
      }

      const missingContextFields: string[] = Array.isArray((athleteContext as any)?.missing_fields)
        ? (athleteContext as any).missing_fields
        : [];
      const primaryEngine =
        Object.keys(engineFailures)[0] ??
        (validatorReport.issues.find((i: any) => i.severity === "fatal")?.code ?? null);
      const primaryDetail =
        (primaryEngine && engineFailures[primaryEngine]?.[0]) ??
        validatorReport.issues.find((i: any) => i.severity === "fatal")?.message ??
        "Publication blocked by WIC validator.";
      return json({
        error: "wic_validation_failed",
        title: primaryEngine ? `${primaryEngine} block couldn't publish` : "Plan couldn't publish",
        detail: primaryDetail,
        adaptation: adaptationDecision.primary,
        phase: phaseRes.phase,
        engine_failures: engineFailures,
        missing_context_fields: missingContextFields,
        context_completeness_score: (athleteContext as any)?.completeness_score ?? null,
        validator_report: validatorReport,
      }, 422);
    }

    // -------- Persist — Phase 2 Fix 2 & Fix 8 — atomic RPC with full metadata --------
    // Explicit column mapping (no spread) so every WIC column is populated on every row.
    // -------- Laterality stamp --------
    // The catalog is the single authority on whether a movement is performed
    // one limb at a time. Stamping it here means the client never re-guesses
    // laterality from a slug when deciding to ask for L/R on the log sheet.
    const unilateralSlugs = new Set(
      lib.filter((m: any) => m?.unilateral === true).map((m: any) => String(m.slug)),
    );
    for (const r of finalRxs as any[]) {
      const wp = (r.why_payload ?? {}) as Record<string, unknown>;
      wp.laterality = unilateralSlugs.has(r.movement_slug) ? "unilateral" : "bilateral";
      r.why_payload = wp;
    }

    const rows = finalRxs.map((r) => ({

      slot: r.slot,
      sequence_order: r.sequence_order,
      sequence_role: r.sequence_role ?? null,
      movement_slug: r.movement_slug,
      movement_name: r.movement_name,
      phase: phaseRes.phase,
      sets: r.sets,
      reps: r.reps,
      tempo: r.tempo ?? null,
      load_pct: r.load_pct ?? null,
      duration_seconds: (r as any).duration_seconds ?? null,
      distance_feet: (r as any).distance_feet ?? null,
      total_reps: (r as any).total_reps ?? null,
      dosage_unit: (r as any).dosage_unit ?? null,
      cns_cost: r.cns_cost,
      cns_clamped: r.cns_clamped,
      substituted_from_slug: r.substituted_from_slug ?? null,
      substitution_reason: r.substitution_reason ?? null,
      why_payload: r.why_payload ?? {},
      rationale: r.rationale ?? null,
      adaptation: (r as any).adaptation ?? adaptationDecision.primary,
      engine: (r as any).engine ?? null,
      why_v2: (r as any).why_v2 ?? null,
      validator_report: validatorReport,
      generator_version: (r as any).generator_version ?? WIC_VERSION,
      status: "planned",
    }));

    const { data: diagId, error: rpcErr } = await admin.rpc("wk_persist_prescriptions_atomic" as any, {
      p_user: user.id,
      p_date: planDate,
      p_rows: rows,
      p_diag: {
        generator_version: WIC_VERSION,
        season_phase: phaseRes.phase,
        adaptation: adaptationDecision.primary,
        generation_ms: generationMs,
        validation_status: "published",
        exercise_count: rows.length,
        duplicate_count: duplicateCount,
        ordering_ok: orderingOk,
        metadata_complete: metadataComplete,
        cards_produced: cardsProduced,
        warnings: validatorReport.issues.filter((i: any) => i.severity === "warn"),
        errors: [],
        // Phase 4 — canonical context diagnostics
        resolved_season_phase: trainingContext.season_phase,
        resolved_day_type: trainingContext.day_type,
        context_version: trainingContext.context_version,
        legality_profile_id: trainingContext.legality_profile_id,
        recovery_profile_id: trainingContext.recovery_profile_id,
        adaptation_profile_id: trainingContext.adaptation_profile_id,
        context_validation_outcome: contextValidationOutcome,
        // Phases 5–7 diagnostics
        athlete_context_version: athleteContext.athlete_context_version,
        personalization_version: personalizationContext.personalization_version,
        training_age_version: trainingAgeContext.training_age_version,
        missing_context_fields: athleteContext.missing_fields,
        context_completeness_score: athleteContext.completeness_score,
        // Phase 8 — Elite Lift Intelligence diagnostics
        lift_template_id: liftCertification.templateId,
        lift_category_coverage: liftCertification.categoryCoverage,
        lift_full_body_ok: liftCertification.fullBodyOk,
        lift_duplicate_check_ok: liftCertification.duplicateCheckOk,
        lift_substitution_completeness: liftCertification.substitutionCompleteness,
        exercise_governance_version: liftCertification.governanceVersion,
        // Phase 9 — Explosive Performance Engine diagnostics
        speed_template_id: speedCertification.templateId,
        speed_category_coverage: speedCertification.categoryCoverage,
        speed_pap_score: speedCertification.papScore,
        speed_substitution_completeness: speedCertification.substitutionCompleteness,
        speed_validation_status: speedCertification.validationStatus,
        bat_speed_template_id: batSpeedCertification.templateId,
        bat_speed_category_coverage: batSpeedCertification.categoryCoverage,
        bat_speed_pap_score: batSpeedCertification.papScore,
        bat_speed_substitution_completeness: batSpeedCertification.substitutionCompleteness,
        bat_speed_validation_status: batSpeedCertification.validationStatus,
        explosive_governance_version: speedCertification.governanceVersion,
        // Phase 10 — Performance Support Engine diagnostics
        conditioning_template_id: conditioningCertification.templateId,
        conditioning_category_coverage: conditioningCertification.categoryCoverage,
        conditioning_validation_status: conditioningCertification.validationStatus,
        conditioning_substitution_completeness: conditioningCertification.substitutionCompleteness,
        conditioning_governance_version: conditioningCertification.governanceVersion,
        cross_sport_template_id: crossSportCertification.templateId,
        cross_sport_category_coverage: crossSportCertification.categoryCoverage,
        cross_sport_validation_status: crossSportCertification.validationStatus,
        cross_sport_substitution_completeness: crossSportCertification.substitutionCompleteness,
        cross_sport_governance_version: crossSportCertification.governanceVersion,
        recovery_template_id: recoveryCertification.templateId,
        recovery_category_coverage: recoveryCertification.categoryCoverage,
        recovery_validation_status: recoveryCertification.validationStatus,
        recovery_substitution_completeness: recoveryCertification.substitutionCompleteness,
        recovery_governance_version: recoveryCertification.governanceVersion,
        arm_care_template_id: armCareCertification.templateId,
        arm_care_category_coverage: armCareCertification.categoryCoverage,
        arm_care_validation_status: armCareCertification.validationStatus,
        arm_care_substitution_completeness: armCareCertification.substitutionCompleteness,
        arm_care_governance_version: armCareCertification.governanceVersion,
        performance_support_governance_version: "performance_support_v1",
        // Phase 11–12 — Unification & Production Lock diagnostics
        determinism_seed: p1112_seed,
        determinism_trace: p1112_determinismTrace,
        engine_execution_order: ENGINE_EXECUTION_ORDER,
        global_validator_status: p1112_globalValidatorStatus,
        snapshot_hash: p1112_snapshotHash,
        expected_snapshot_hash: p1112_snapshotHash,
        snapshot_integrity_status: p1112_immutability.status,
        governance_catalog_hash: p1112_govHash,
        why_v2_completeness_score: p1112_whyMinScore,
        // Phase 12+ — System Freeze v1 diagnostics
        system_state: p12_systemState,
        system_state_hash: p12_systemStateHash,
        engine_signature_hashes: p12_engineSignatureMap,
        why_v2_hash: p12_whyV2Hash,
        expected_why_v2_hash: p12_whyV2Hash,
        validator_aggregate_hash: p12_validatorAggHash,
        global_invariant_status: p12_globalInvariantStatus,
      },
    });
    if (rpcErr) throw rpcErr;

    // Methods diagnostics ride alongside the canonical run so every applied
    // method (and every veto) is replay-visible after the fact.
    if (diagId) {
      await admin
        .from("wk_generation_diagnostics")
        .update({ training_methods: methodDiagnostics } as any)
        .eq("id", diagId as any);
    }

    await admin.from("wk_cns_ledger").upsert({
      user_id: user.id, ledger_date: planDate,
      units_spent: cnsUsed, units_cap: cnsCap,
      breakdown: cardsProduced,
    }, { onConflict: "user_id,ledger_date" });

    console.info("[wk-generate-daily] ok WIC", {
      user_id: user.id, plan_date: planDate, phase: phaseRes.phase, adaptation: adaptationDecision.primary,
      cns_used: cnsUsed, cns_cap: cnsCap, blocks_n: rows.length, game_day: isGameDay, practice_day: isPracticeDay,
      validator_ok: validatorReport.ok, validator_warns: validatorReport.issues.filter((i) => i.severity === "warn").length,
      generation_ms: generationMs, diagnostics_id: diagId,
    });
    return json({
      phase: phaseRes.phase,
      phase_display: phaseRes.displayName,
      adaptation: adaptationDecision.primary,
      adaptation_reason: adaptationDecision.reason,
      generator_version: WIC_VERSION,
      // Blocks intentionally left out today, with athlete-readable reasons.
      // An empty array means every legal block was filled.
      skipped_blocks: selectionSkips.list(),
      pre_selection_version: PRE_SELECTION_VERSION,

      game_day: isGameDay,
      practice_day: isPracticeDay,
      practice_kinds: practiceKinds,
      practice_intensity: practiceIntensity,
      heavy_practice_day: isHeavyPracticeDay,
      travel_day: isTravelDay,
      cns_used: cnsUsed,
      cns_cap: cnsCap,
      reductions,
      validator_report: validatorReport,
      diagnostics_id: diagId,
      generation_ms: generationMs,
      training_context: trainingContext,
      athlete_context: athleteContext,
      personalization_context: personalizationContext,
      training_age_context: trainingAgeContext,
      prescriptions: rows,
    });
  } catch (e) {
    console.error("wk-generate-daily error", e);
    return json({ error: (e as Error).message }, 500);
  }
};

function conditioningForPosition(
  lib: MovementRow[],
  position: string | null,
  eligible: (m: MovementRow | undefined | null) => m is MovementRow,
): MovementRow | undefined {
  const pos = (position ?? "").toLowerCase();
  const findEligible = (slug: string) => {
    const m = lib.find((x) => x.slug === slug);
    return eligible(m) ? m : undefined;
  };
  if (pos.includes("catch")) return findEligible("catcher_up_downs");
  if (pos.includes("pitch")) return findEligible("pitcher_field_and_cover");
  if (pos.includes("of") || pos.includes("outfield")) return findEligible("of_read_and_go");
  if (pos === "ss" || pos === "2b" || pos.includes("mid") || pos.includes("infield")) return findEligible("mif_turn_and_fire");
  if (pos.includes("if")) return findEligible("if_lateral_repeat");
  return findEligible("bases_1st_3rd");
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[—–-].*$/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupePrescriptions(rxs: Prescription[]): Prescription[] {
  const seenSlug = new Set<string>();
  const seenName = new Set<string>();
  return rxs.filter((rx) => {
    const nameKey = normalizeName(rx.movement_name);
    if (seenSlug.has(rx.movement_slug) || seenName.has(nameKey)) return false;
    seenSlug.add(rx.movement_slug);
    seenName.add(nameKey);
    return true;
  });
}

function ensureFullBodyLift(
  rxs: Prescription[],
  catalog: MovementRow[],
  pickFirst: (slugs: string[]) => MovementRow | undefined,
  push: (
    slot: Slot,
    role: SequenceRole,
    m: MovementRow,
    overrides?: Partial<Prescription>,
    why?: string,
    meta?: Record<string, unknown>,
  ) => boolean,
  isInSeason: boolean,
  pickFirstRelaxed?: (slugs: string[]) => MovementRow | undefined,
) {
  const catalogBySlug = new Map(catalog.map((m) => [m.slug, m] as const));
  const categoryForRx = (rx: Prescription) => coerceCanonicalCategory(catalogBySlug.get(rx.movement_slug) as any);
  const hasLiftRole = (role: SequenceRole) => rxs.some((r) => r.slot === "lift" && r.sequence_role === role);
  const hasLiftCategory = (category: string) => rxs.some((r) => r.slot === "lift" && categoryForRx(r) === category);
  const pickFirstCategory = (slugs: string[], category: string): MovementRow | undefined => {
    for (const slug of slugs) {
      const candidate = pickFirst([slug]);
      if (candidate && coerceCanonicalCategory(candidate as any) === category) return candidate;
    }
    return undefined;
  };
  // Template-mandatory categories may never be left empty. Ladder:
  //   1. preferred pool, fully gated
  //   2. preferred pool with ONLY the day-adaptation gate relaxed
  //   3. any catalog row of that category, day-adaptation gate relaxed
  // Safety, season legality, injury, training age and scope always apply.
  const relaxed = pickFirstRelaxed ?? (() => undefined);
  const pickMandatoryCategory = (
    slugs: string[],
    category: string,
  ): { movement: MovementRow; relaxed: boolean } | undefined => {
    const strict = pickFirstCategory(slugs, category);
    if (strict) return { movement: strict, relaxed: false };
    for (const slug of slugs) {
      const c = relaxed([slug]);
      if (c && coerceCanonicalCategory(c as any) === category) return { movement: c, relaxed: true };
    }
    const wholeCatalog = catalog
      .filter((m) => coerceCanonicalCategory(m as any) === category)
      .map((m) => m.slug);
    for (const slug of wholeCatalog) {
      const c = relaxed([slug]);
      if (c) return { movement: c, relaxed: true };
    }
    return undefined;
  };
  const mandatoryWhy = (base: string, wasRelaxed: boolean) =>
    wasRelaxed
      ? `${base} Selected outside today's primary adaptation because the template requires this category and no same-adaptation option was available — kept at maintenance intent.`
      : base;

  if (!hasLiftRole("arm_care")) {
    const m = pickFirstCategory(["crossover_symmetry_full", "jband_full_chart", "lift_er_at_90", "lift_band_pullapart"], "arm_care") ??
      pickFirst(["crossover_symmetry_full", "jband_full_chart"]);
    if (m) push("lift", "arm_care", m, {}, "Full-body guardrail: arm care is mandatory, not optional.");
  }

  if (!hasLiftRole("trunk_primer")) {
    const m = pickFirst(["paloff_press", "trap_bar_trunk_twist", "contralateral_cross_crawl", "lift_deadbug_band_press", "lift_mcgill_big3"]);
    if (m) push("lift", "trunk_primer", m, {}, "Full-body guardrail: trunk primer keeps the lift from becoming lower-body-only.");
  }

  if (!hasLiftCategory("core")) {
    const hit = pickMandatoryCategory([
      "lift_deadbug_band_press",
      "lift_mcgill_big3",
      "lift_ab_wheel_rollout",
      "lift_side_plank_leg_lift",
      "paloff_press",
    ], "core");
    if (hit) {
      push(
        "lift",
        hasLiftRole("trunk_primer") ? "trunk_finisher" : "trunk_primer",
        hit.movement,
        {},
        mandatoryWhy("Full-body guardrail: core category is mandatory for a complete lift session.", hit.relaxed),
      );
    }
  }

  // WIC certifier requires movement_category=rotation to be present in every
  // full-body lift template. Use the same canonical category coercion as the
  // certifier instead of a fragile hardcoded slug test.
  if (!hasLiftCategory("rotation")) {
    const hit = pickMandatoryCategory([
      "trap_bar_trunk_twist",
      "band_resisted_swings",
      "cable_chops",
      "heavy_russian_twist",
      "med_ball_shot_put",
    ], "rotation");
    if (hit) {
      push(
        "lift",
        "rotation",
        hit.movement,
        {},
        mandatoryWhy("Full-body guardrail: rotation category is mandatory in every WIC lift template.", hit.relaxed),
      );
    }
  }

  if (!hasLiftCategory("compound_lower")) {
    const hit = pickMandatoryCategory(isInSeason
      ? ["goblet_squat", "back_squat_concentric", "lift_atg_split_squat", "lift_anderson_squat", "lift_box_squat_wide"]
      : ["back_squat_double_ecc", "front_squat_double_ecc", "safety_bar_box_squat", "lift_safety_bar_squat", "lift_box_squat_wide", "back_squat_concentric", "goblet_squat"], "compound_lower");
    if (hit) {
      push("lift", "compound_lower", hit.movement, {}, mandatoryWhy("Full-body guardrail: one legal lower-body compound anchors the session.", hit.relaxed));
    }
  }

  if (!hasLiftRole("unilateral_lower")) {
    const m = pickFirst(isInSeason ? ["lateral_db_step_up", "sl_deadlift_fat_grips"] : ["lateral_db_step_up", "kot_lunge", "sl_deadlift_fat_grips"]);
    if (m) push("lift", "unilateral_lower", m, {}, "Full-body guardrail: unilateral work covers side-to-side asymmetry without junk volume.");
  }

  if (!hasLiftCategory("compound_upper_push")) {
    const hit = pickMandatoryCategory(isInSeason
      ? ["db_bench", "bench_press_concentric", "push_press_concentric", "sa_db_chest_press", "lift_landmine_press", "lift_hk_landmine_press", "incline_bench_double_ecc"]
      : ["bench_press_double_ecc", "incline_bench_double_ecc", "db_bench", "bench_press_concentric", "push_press_concentric", "lift_floor_press", "lift_swiss_bar_bench"], "compound_upper_push");
    if (hit) {
      push("lift", "upper_push", hit.movement, {}, mandatoryWhy("Full-body guardrail: upper push is required so the day is not lower-body-only.", hit.relaxed));
    }
  }

  if (!hasLiftCategory("compound_upper_pull")) {
    const hit = pickMandatoryCategory(isInSeason
      ? ["sa_standing_cable_row", "lat_pulldown", "db_row_bench", "weighted_pullup_concentric", "lift_1arm_cable_row", "lift_ring_row"]
      : ["weighted_pullup_full", "sa_standing_cable_row", "lat_pulldown", "db_row_bench", "weighted_pullup_concentric", "weighted_pullup_double_ecc", "lift_chest_tbar_row", "lift_meadows_row"], "compound_upper_pull");
    if (hit) {
      push("lift", "upper_pull", hit.movement, {}, mandatoryWhy("Full-body guardrail: upper pull is mandatory for throwing decel and shoulder balance.", hit.relaxed));
    }
  }
}


Deno.serve(handler);
