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
// Phase 2 Fix 5 / 6 — canonical shared modules.
import { seasonContextFromPhase, isMovementSeasonLegal } from "../_shared/wic/season.ts";
import { assignSequenceOrder } from "../_shared/wic/ordering.ts";
// WIC engine modules — canonical slug pools per engine.
import * as StrengthEngine from "../_shared/wic/engines/strength.ts";
import { sprintSlugs } from "../_shared/wic/engines/sprint.ts";
import { BAT_SPEED_PREFERRED } from "../_shared/wic/engines/batSpeed.ts";
import { conditioningSlugFor, inningRestartSlug } from "../_shared/wic/engines/conditioning.ts";
// Phase 8 — Elite Lift Intelligence & Exercise Governance certifier.
import { certifyLift } from "../_shared/wic/lift/sessionBuilder.ts";
import { GAME_DAY_PRIMER_SLUGS } from "../_shared/wic/engines/crossSport.ts";
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

interface MovementRow {
  slug: string;
  name: string;
  category: string;
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
      recent_ack?: { reduction_reason?: string; reduction_payload?: unknown; acknowledged_at?: string } | null;
    };
    const planDate = body.plan_date ?? todayStr();
    const recentAck = body.recent_ack ?? null;

    // -------- Load athlete context --------
    const [
      { data: profile },
      { data: ctx },
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
      admin.from("user_injury_progress").select("injury_slug, status").eq("user_id", user.id).in("status", ["acute", "active"]),
      admin.from("athlete_daily_log").select("*").eq("user_id", user.id).eq("log_date", planDate).maybeSingle(),
      admin.from("gp_games")
        .select("id, game_date, status, game_type")
        .eq("user_id", user.id)
        .eq("game_date", planDate)
        .not("status", "in", "(canceled,cancelled,rescheduled)")
        .limit(1),
      admin.from("scheduled_practice_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("session_date", planDate)
        .limit(1),
      admin.from("athlete_side_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("athlete_equipment_context").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("training_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("weight_entries").select("*").eq("user_id", user.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("athlete_body_goals").select("*").eq("user_id", user.id),
    ]);

    const p: any = profile ?? {};
    const sport = (p.sport ?? "baseball") as "baseball" | "softball";
    const position = p.primary_position ?? p.position ?? null;
    const trainingAgeYears = Number(p.years_lifting ?? p.training_age_years ?? 0);
    const isProProspect = !!(p.is_pro_prospect ?? p.pro_prospect ?? false);
    const injurySlugs = new Set((injuries ?? []).map((r: any) => r.injury_slug as string));
    const isGameDay = (gamesToday ?? []).length > 0;
    const isPracticeDay = (practicesToday ?? []).length > 0;

    // -------- Resolve phase quarter --------
    const phaseRes = resolveWkPhase(ctx ?? null);
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
      isTournamentDay: false,
      isTravelDay: false,
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
      practicesToday: practicesToday ?? [],
      trainingAgeCtx: trainingAgeContext,
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
    const adaptationsCompatible = (day: string | null | undefined, mov: string | null | undefined): boolean => {
      if (!day || !mov) return true;
      if (day === mov) return true;
      const map: Record<string, string[]> = {
        recovery_only: ["in_season_maintenance", "movement_literacy"],
        game_readiness: ["speed_development", "bat_speed_development", "movement_literacy", "in_season_maintenance"],
        muscle_capacity: ["max_strength", "muscle_capacity", "in_season_maintenance", "speed_development", "bat_speed_development", "conditioning_repeat_explosive", "movement_literacy"],
        max_strength: ["max_strength", "muscle_capacity", "strength_to_power", "speed_development", "bat_speed_development", "movement_literacy"],
        strength_to_power: ["strength_to_power", "max_strength", "power_transfer", "speed_development", "bat_speed_development", "movement_literacy"],
        power_transfer: ["power_transfer", "strength_to_power", "speed_development", "bat_speed_development", "in_season_maintenance", "movement_literacy"],
        in_season_maintenance: ["in_season_maintenance", "max_strength", "muscle_capacity", "speed_development", "bat_speed_development", "power_transfer", "movement_literacy"],
        movement_literacy: ["movement_literacy", "muscle_capacity", "in_season_maintenance"],
      };
      return (map[day] ?? []).includes(mov);
    };
    const engineForSlotRole = (slot: Slot, role: SequenceRole): WicEngine => {
      if (slot === "speed") return "sprint";
      if (slot === "bat_speed") return "bat_speed";
      if (slot === "conditioning") return "conditioning";
      if (slot === "cross_sport") return "cross_sport";
      if (role === "arm_care") return "arm_care";
      return "strength";
    };

    // -------- Load 72h lift history + active overrides (drift guards) --------
    const threeDaysAgo = new Date(planDate + "T00:00:00");
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().slice(0, 10);
    const [{ data: recentLifts }, { data: activeOverrides }] = await Promise.all([
      admin.from("wk_prescriptions")
        .select("movement_slug, plan_date, slot")
        .eq("user_id", user.id)
        .eq("slot", "lift")
        .gte("plan_date", threeDaysAgoStr)
        .lt("plan_date", planDate),
      admin.from("wk_movement_overrides")
        .select("movement_slug, expires_at, reason, actor_role")
        .eq("user_id", user.id)
        .eq("ack_date", planDate)
        .gt("expires_at", new Date().toISOString()),
    ]);
    const recentCompoundSlugs = new Set((recentLifts ?? []).map((r: any) => r.movement_slug as string));
    const overrideSlugs = new Set((activeOverrides ?? []).map((r: any) => r.movement_slug as string));
    const usedThisSession = new Set<string>();
    const usedNamesThisSession = new Set<string>();

    const isCompoundMovement = (m: MovementRow) =>
      m.category === "compound" || (m.intensity_class ?? "").includes("compound");

    // Phase 2 Fix 6 — single canonical season authority. Both the old
    // hard-block list and the catalog's `season_eligibility` array are
    // consulted inside `isMovementSeasonLegal` in `_shared/wic/season.ts`.
    const seasonCtx = seasonContextFromPhase(phaseRes.phase);

    // -------- Movement filters --------
    const eligible = (m: MovementRow | undefined | null): m is MovementRow => {
      if (!m) return false;
      // WIC Stage 2 — hard-block movements missing constitutional metadata.
      if (m.wic_metadata_complete === false) return false;
      if (m.min_training_age_years > trainingAgeYears && !isProProspect) return false;
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
      // WIC Stage 3 — day-adaptation compatibility.
      if (decision?.primary && m.primary_adaptation) {
        if (!adaptationsCompatible(decision.primary, m.primary_adaptation)) return false;
      }
      return true;
    };
    const swap = (m: MovementRow) => {
      if (!m.contraindications?.some((c) => injurySlugs.has(c))) return { movement: m, substitutedFrom: null as string | null, reason: null as string | null };
      if (m.regression_slug) {
        const reg = lib.find((x) => x.slug === m.regression_slug);
        if (reg) return { movement: reg, substitutedFrom: m.slug, reason: `Contraindicated by reported injury — regressed to ${reg.name}.` };
      }
      return { movement: m, substitutedFrom: null, reason: null };
    };
    const pickFirst = (slugs: string[]): MovementRow | undefined => {
      for (const s of slugs) {
        const m = lib.find((x) => x.slug === s);
        if (eligible(m)) return m;
      }
      return undefined;
    };
    const pickCat = (cat: string): MovementRow | undefined =>
      lib.find((m) => m.category === cat && eligible(m));

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
    const humanizePhilosophy = (p: string | null) => p ? p.replace(/_/g, " ") : null;

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
      usedThisSession.add(s.movement.slug);
      usedNamesThisSession.add(nameKey);
      const setsBase = overrides.sets ?? s.movement.default_sets ?? null;
      const repsBase = overrides.reps ?? s.movement.default_reps ?? null;
      const clamped = (cnsUsed + s.movement.cns_cost) > cnsCap;
      cnsUsed += clamped ? Math.max(0, cnsCap - cnsUsed) : s.movement.cns_cost;

      // Override provenance
      const phaseBlocked = !!(s.movement.phase_allow && s.movement.phase_allow.length > 0 && !s.movement.phase_allow.includes(phaseRes.phase));
      const overrideRow = phaseBlocked ? (activeOverrides ?? []).find((o: any) => o.movement_slug === s.movement.slug) : null;
      const overrideMeta = overrideRow
        ? { reason: (overrideRow as any).reason ?? null, actor_role: "self", expires_at: (overrideRow as any).expires_at }
        : null;

      // Plain-English rationale
      const philo = humanizePhilosophy(s.movement.source_philosophy);
      const cls = humanizeClass(s.movement.intensity_class);
      const ageStr = trainingAgeYears > 0 ? `${trainingAgeYears}-year training age` : "beginner training age";
      const proStr = isProProspect ? " (pro prospect)" : "";
      const reasonPiece = why || s.movement.why_prescribed || `${cls} pick for today`;
      const reductionsPiece = reductions.length
        ? ` Volume trimmed today because ${reductions.map((r) => r.detail.toLowerCase()).join(" and ")}.`
        : "";
      const overridePiece = overrideMeta
        ? ` Unlocked for this session by your override — reason: "${overrideMeta.reason ?? "not stated"}".`
        : "";
      const philoPiece = philo ? ` Doctrine: ${philo}.` : "";
      const rationale = `Chosen because you're in ${phaseRes.displayName} with a ${ageStr}${proStr}, and this is a ${cls}. ${reasonPiece}.${philoPiece}${overridePiece}${reductionsPiece}`.replace(/\s+/g, " ").trim();

      // WIC — required constitutional payload
      const wicEngine = engineForSlotRole(slot, role);
      const finalSets = clamped && typeof setsBase === "number" ? Math.max(1, setsBase - 1) : setsBase;
      const setsRepsStr = finalSets != null && repsBase != null ? `${finalSets}×${repsBase}` : "prescribed dose";
      const orderStr = `Sequence #${seq + 1} — ${role.replace(/_/g, " ")} keeps the constitutional day order intact.`;
      const recoveryStr = `${s.movement.cns_cost} CNS units; expect ~${Math.max(24, s.movement.cns_cost * 12)}h before repeating this pattern.`;
      const why_v2: WhyV2 = buildWhy({
        why_today: adaptationDecision.reason,
        why_athlete: `${adaptationDecision.reason_athlete} (${trainingAgeYears || 0}-yr training age${isProProspect ? ", pro prospect" : ""}).`,
        why_exercise: why || s.movement.why_prescribed || `${cls} implementation of the ${adaptationDecision.primary} adaptation.`,
        why_volume: `${setsRepsStr} — dialed to ${adaptationDecision.primary} demands and today's CNS cap (${cnsCap}).`,
        why_order: orderStr,
        why_recovery: recoveryStr,
        adaptation: adaptationDecision.primary,
        engine: wicEngine,
        generator_version: WIC_VERSION,
      });
      rxs.push({
        slot, sequence_order: seq++, sequence_role: role,
        movement_slug: s.movement.slug, movement_name: s.movement.name,
        sets: finalSets,
        reps: repsBase,
        tempo: overrides.tempo ?? s.movement.default_tempo,
        load_pct: overrides.load_pct ?? s.movement.default_load_pct,
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
          rep_rule: `${block.compound_min_sets}-${block.compound_max_sets} sets × ${block.compound_min_reps}-${block.compound_max_reps} reps (phase doctrine).`,
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

    if (isGameDay) {
      // WIC cross-sport engine
      const primer = pickFirst(GAME_DAY_PRIMER_SLUGS);
      if (primer) {
        push(
          "cross_sport",
          "cross_sport",
          primer,
          { sets: 1, reps: primer.slug === "contralateral_cross_crawl" ? 20 : 1 },
          "Game-day crossover activation — short, early, and low-cost. It starts the day after warm-up instead of sitting on the back end.",
          { placement: "early_activation", sequencing_hint: "Do after warm-up and before the game. Stop before fatigue shows up." },
        );
      }
    }

    if (!isGameDay) {
      // WIC strength engine — full-body roles.
      // 1) Arm care — every session, non-negotiable
      const armCare = pickFirst(StrengthEngine.ARM_CARE_SLUGS);
      if (armCare) push("lift", "arm_care", armCare, { sets: 1, reps: 1 }, "Non-negotiable shoulder prep. Every session opens here.");

      // 2) Trunk primer — every session
      const trunkPrimer = pickFirst(StrengthEngine.TRUNK_PRIMER_SLUGS);
      if (trunkPrimer) push("lift", "trunk_primer", trunkPrimer, { sets: 1, reps: isInSeason ? 6 : 10 }, "Loaded rotation primer — wakes obliques + preps swing plane.");

      // 3) Compound A — lower strength primer, phase legal
      const compoundSlugsByPhase = StrengthEngine.compoundSlugsFor(phaseRes.phase);
      const compound = pickFirst(compoundSlugsByPhase) ?? lib.find((m) => m.category === "compound" && eligible(m) && ["squat", "hinge"].includes(m.pattern ?? ""));
      if (compound) {
        const sets = isInSeason ? 2 : clamp(2, block.compound_min_sets, block.compound_max_sets);
        const reps = isInSeason ? 3 : clamp(3, block.compound_min_reps, block.compound_max_reps);
        push("lift", "compound_lower", compound, { sets, reps }, `${block.display_name}: ${block.compound_style.replace("_", " ")} lower-body primer — strong enough to maintain output without stealing sport freshness.`);
      }

      // 4) Unilateral lower — rotate across the week to build all planes
      const uniLower = pickFirst(StrengthEngine.unilateralSlugs(isInSeason, dayOfWeek));
      if (uniLower) {
        const d = StrengthEngine.unilateralDose(isInSeason);
        push("lift", "unilateral_lower", uniLower, { sets: d.sets, reps: d.reps }, "Single-leg dominance — closes L/R imbalances the compound hides.");
      }

      // 5) Upper push — unilateral / integrated
      const upperPush = pickFirst(StrengthEngine.upperPushSlugs(isInSeason, dayOfWeek));
      if (upperPush) {
        const d = StrengthEngine.upperDose(isInSeason);
        push("lift", "upper_push", upperPush, { sets: d.sets, reps: d.reps }, "Upper push — enough strength signal to maintain full-body balance without chasing soreness.");
      }

      // 6) Upper pull — unilateral / weighted
      const upperPull = pickFirst(StrengthEngine.upperPullSlugs(isInSeason, dayOfWeek));
      if (upperPull) {
        const d = StrengthEngine.upperDose(isInSeason);
        push("lift", "upper_pull", upperPull, { sets: d.sets, reps: d.reps }, "Upper pull — decel chain, posture, and shoulder balance stay in the plan.");
      }

      // 7) Carry / anti-rotation — phase legal, not a junk-volume finisher
      if (isInSeason || isDeep || phaseRes.phase === "os_q3") {
        const carry = pickFirst(StrengthEngine.carrySlugs(isInSeason));
        if (carry) push("lift", "carry_antirotation", carry, { sets: isInSeason ? 1 : undefined, reps: isInSeason ? 6 : undefined }, "Carry / anti-rotation — trunk stiffness that transfers without burying the athlete.");
      }

      // 8) Trunk finisher — offseason only (in-season stays fresh)
      if (isOffseason) {
        const finisher = pickFirst(StrengthEngine.TRUNK_FINISHER_SLUGS);
        if (finisher) push("lift", "trunk_finisher", finisher, { sets: 1, reps: 10 }, "Loaded trunk finisher — locks the rotational strength from above.");
      }

      ensureFullBodyLift(rxs, pickFirst, push, isInSeason);
    }

    // -------- Bat-speed engine (its own card, always pre-lift) --------
    if (!isGameDay) {
      const batSpeedPool = lib.filter((m) => m.category === "bat_speed" && eligible(m));
      const bat = batSpeedPool.find((m) => BAT_SPEED_PREFERRED.includes(m.slug)) ?? batSpeedPool[0];
      if (bat) {
        push("bat_speed", "bat_speed", bat, {}, "Rotational power primer — direct bat-speed transfer. Do BEFORE lifts while CNS is fresh.");
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
    if (!isGameDay && hoursSinceSpeed >= block.speed_cadence_hours - 6) {
      const speedSet: MovementRow[] = sprintSlugs(sport)
        .map((s) => lib.find((m) => m.slug === s && eligible(m)))
        .filter(Boolean) as MovementRow[];
      for (const m of speedSet) {
        push("speed", "speed", m, {}, `${sport === "baseball" ? "Baseball" : "Softball"} Speed Lab — cadence every ${block.speed_cadence_hours}h.`);
      }
    }

    // -------- Conditioning (its own card, placed next to practice) --------
    if (!isGameDay && !isPostSeason) {
      const conditioning: MovementRow[] = [
        lib.find((m) => m.slug === (sport === "baseball" ? "inning_restart_sim_bb" : "inning_restart_sim_sb") && eligible(m)),
        conditioningForPosition(lib, position, eligible),
      ].filter(Boolean) as MovementRow[];
      for (const m of conditioning) {
        push("conditioning", "conditioning", m, {}, "Conditioning belongs next to practice — inning-restart + position-specific.");
      }
    }

    // -------- Cross-sport (its own slot, appended) --------
    const cross = lib.find((m) => m.category === "cross_sport" && eligible(m));
    if (cross && isOffseason && !isGameDay) {
      push(
        "cross_sport",
        "cross_sport",
        cross,
        { sets: 1, reps: 1 },
        `Offseason cross-sport conditioning (${block.cross_sport_cadence.replace(/_/g, " ")}). Frees CNS from sport patterns after the main training day.`,
        { placement: "offseason_back_end", sequencing_hint: "Offseason only: do after the primary work, never before an in-season game." },
      );
    }

    // Phase 2 Fix 5 — deterministic canonical ordering. This is the ONLY
    // place sequence_order is assigned. Cards render by this key; no
    // component-level ordering is allowed.
    const orderedRxs = assignSequenceOrder(dedupePrescriptions(rxs));
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
        why_v2: (r as any).why_v2,
      })),
    });
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
          },
        });
      } catch (diagErr) {
        console.error("[wk-generate-daily] diagnostics-write failed", diagErr);
      }
      return json({
        error: "wic_validation_failed",
        adaptation: adaptationDecision.primary,
        phase: phaseRes.phase,
        validator_report: validatorReport,
      }, 422);
    }

    // -------- Persist — Phase 2 Fix 2 & Fix 8 — atomic RPC with full metadata --------
    // Explicit column mapping (no spread) so every WIC column is populated on every row.
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
      },
    });
    if (rpcErr) throw rpcErr;

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
      game_day: isGameDay,
      practice_day: isPracticeDay,
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
) {
  const liftRoles = new Set(rxs.filter((r) => r.slot === "lift").map((r) => r.sequence_role));

  if (!liftRoles.has("arm_care")) {
    const m = pickFirst(["crossover_symmetry_full", "jband_full_chart"]);
    if (m) push("lift", "arm_care", m, { sets: 1, reps: 1 }, "Full-body guardrail: arm care is mandatory, not optional.");
  }

  if (!liftRoles.has("trunk_primer")) {
    const m = pickFirst(["paloff_press", "trap_bar_trunk_twist", "contralateral_cross_crawl"]);
    if (m) push("lift", "trunk_primer", m, { sets: 1, reps: isInSeason ? 6 : 10 }, "Full-body guardrail: trunk primer keeps the lift from becoming lower-body-only.");
  }

  if (!liftRoles.has("compound_lower")) {
    const m = pickFirst(isInSeason
      ? ["goblet_squat", "hip_thrust_concentric", "rdl_concentric", "back_squat_concentric"]
      : ["back_squat_double_ecc", "front_squat_double_ecc", "trap_bar_dl_double_ecc", "hip_thrust_concentric", "back_squat_concentric"]);
    if (m) push("lift", "compound_lower", m, { sets: isInSeason ? 2 : 3, reps: 3 }, "Full-body guardrail: one legal lower-body compound anchors the session.");
  }

  if (!liftRoles.has("unilateral_lower")) {
    const m = pickFirst(isInSeason ? ["lateral_db_step_up", "sl_deadlift_fat_grips"] : ["lateral_db_step_up", "kot_lunge", "sl_deadlift_fat_grips"]);
    if (m) push("lift", "unilateral_lower", m, { sets: isInSeason ? 1 : 2, reps: 3 }, "Full-body guardrail: unilateral work covers side-to-side asymmetry without junk volume.");
  }

  if (!liftRoles.has("upper_push")) {
    const m = pickFirst(isInSeason
      ? ["db_bench", "push_press_concentric", "bench_press_concentric", "sa_db_chest_press", "landmine_row_to_press"]
      : ["sa_db_chest_press", "landmine_row_to_press", "db_bench", "bench_press_concentric", "push_press_concentric"]);
    if (m) push("lift", "upper_push", m, { sets: isInSeason ? 1 : 2, reps: 3 }, "Full-body guardrail: upper push is required so the day is not lower-body-only.");
  }

  if (!liftRoles.has("upper_pull")) {
    const m = pickFirst(isInSeason
      ? ["sa_standing_cable_row", "lat_pulldown", "db_row_bench", "weighted_pullup_concentric", "renegade_row"]
      : ["weighted_pullup_full", "sa_standing_cable_row", "lat_pulldown", "db_row_bench", "weighted_pullup_concentric", "renegade_row"]);
    if (m) push("lift", "upper_pull", m, { sets: isInSeason ? 1 : 2, reps: 3 }, "Full-body guardrail: upper pull is mandatory for throwing decel and shoulder balance.");
  }
}

Deno.serve(handler);
