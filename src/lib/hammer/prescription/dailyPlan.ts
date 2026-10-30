import { sortByWarmupStage } from "./warmupStages";
import { GAME_IQ_AVAILABLE_TO_ATHLETES } from "../athleteFeatureAvailability";
import { mapPhysio, PREHAB_SLUGS, type PhysioMapping } from '../../../../supabase/functions/_shared/health/physioMapping';
import { WARMUP_LIBRARY } from './warmupLibrary';
import { enforceSkillStageOrder, validatePlanSanity } from './planSanity';
import { recoveryDrills } from './recoveryDrills';
import {applyMasteryFocus,masteryGoalWeights,type MasteryPlanFocus} from './masteryFocus';
import { applyBuntingPlan, type BuntCatalogItem } from './buntingPlan';
import type { BuntingEvidence } from './buntingEvidence';
import type { BuntingFacts } from '../../../../supabase/functions/_shared/wic/buntingProgram';
import { isSoftRecovery } from "../../../../supabase/functions/_shared/wic/schedule/softRecovery";
import { weeklyGoalBlocks, secondGoalFirst } from './weeklyGoalBlocks';
import { priorityAccess } from '../priorityAccess';
import { subscriptionSchedule } from './subscriptionSchedule';
import { planningGear } from '../../../../supabase/functions/_shared/planSwap/planningGear';
import { pitchingDay, guardArmDrills, eassArmEvent, windmillPlanningDrills, type PlanningArmHistory } from './pitchingDay';
import { structureSkillSession } from './skillSessionStructure';
import { restrictedFielding } from './restrictedFielding';
import { applyPracticePlanContext } from './practicePlanContext';
import { categoryPracticeLoads, type PracticeLoadRecord, type CategoryPracticeLoad } from './categoryPracticeLoad';
import type { OutingFacts } from "../../../../supabase/functions/_shared/wic/pitching/outingFacts";
/**
 * Hammer Daily Plan — 9-modality orchestrator.
 *
 * Elite-execution overhaul: every block carries an explicit `drills` array
 * (name, setup, dosage, cue, stopIf), a `roadmapReason` explaining today's
 * phase (build / sharpen / maintain / deload / recover), a `gamePlanTemplate`
 * the UI hands to `createTemplate(...)` to spawn a real loggable Game Plan
 * card, and a `missingContextKeys` list pointing at canonical knowledge gaps
 * so the UI can ask the right onboarding question inline instead of
 * dead-end navigating to /command.
 *
 * Routing fix: warm-up no longer silently navigates to /tex-vision. Tex Vision
 * is surfaced separately when relevant.
 *
 * Every block remains pure (no I/O), preserves missingness, never fabricates.
 */
import type { HammerAthleteContext, ContextVariable } from "@/lib/hammer/context/athleteContext";
import {
  projectEnvelope,
  selectSpeedFocus,
  type AthleteContextProjection,
  type SpeedFocusDecision,
} from "@/lib/hammer/context/decisionFilters";
import { buildAnthroProfile, hasAnyAnthroSignal } from "@/lib/hammer/anthro/profile";
import { selectStrengthSwaps } from "@/lib/hammer/prescription/strengthSelector";
import { selectThrowingAdaptations } from "@/lib/hammer/prescription/throwingSelector";
import {
  modalityToCategory,
  rankFor,
  intentFor,
  CATEGORY_INTENTS,
  CATEGORY_LABELS,
  summarizeGoals,
} from "@/lib/hammer/goals/categoryGoals";
import { buildWarmup, resolveWarmupContext, lifecycleFor } from "./warmupLibrary";
import { guideFor as _guideForMovement } from "./movementGuide";
import { getSeasonHPI } from "@/lib/seasonPhase";
import {
  buildEassPrescription,
  normalizePosition,
  normalizeSport,
  type EassContext,
} from "./eassLibrary";
import { selectDefenseDrills, resolveDefenseTier } from "./defenseLibrary";
import { mergeOwnerSlotDrills } from "@/lib/prescription/ownerPlanDrills";
import {
  resolveWeeklyTemplate,
  applyMicrocycle,
  projectWeeklyRoadmap,
  SIX_DAY_REST_DOW,
  SCHEDULABLE_MODALITIES,
  type ResolvedMicrocycle,
  type ModalityDayDecision,
  type RoadmapDay,
  type WeeklyTemplate,
} from "./weeklyMicrocycle";
import {
  resolveRoadmapRung,
  RUNG_ORDER,
  type RoadmapRungDescriptor,
} from "@/lib/hammer/roadmap/roadmapLadder";
import {
  resolveSeasonQuarter,
  type QuarterDescriptor,
} from "@/lib/hammer/roadmap/seasonQuarters";
import {
  applyRecoveryWindows,
  type RecentCompletions,
} from "@/lib/hammer/roadmap/recoveryWindows";
import {
  prescribeThrowingLadder,
  type ThrowingLadderPrescription,
} from "@/lib/hammer/roadmap/throwingLadder";
import {
  resolveEliteTarget,
  type EliteTarget,
} from "@/lib/hammer/roadmap/eliteTarget";
import {
  SKILL_MODALITIES,
  resolveSkillDaysTarget,
  projectSkillLadder,
  type SkillModality,
  type SkillLadderRow,
} from "@/lib/hammer/roadmap/skillFrequencyLadder";
import { coercePositionTokens, firstPositionToken } from "@/lib/hammer/positions/positionNormalizer";



export type ModalityKey =
  | "warmup"
  | "speed"
  | "strength"
  | "hitting"
  | "throwing"
  | "pitching"
  | "defense"
  | "baserunning"
  | "game_iq"
  | "game"
  | "fueling"
  | "recovery";

export type BlockStatus = "ready" | "awaiting-input" | "suppressed" | "off-day";
export type BlockPhase = "build" | "sharpen" | "maintain" | "deload" | "recover" | "skill";

export interface DrillStep {
  /** Owner-declared metadata only; never proof of efficacy or dose authority. */
  readonly ownerDrillId?: string;
  readonly routineRole?: string | null;
  readonly skillArea?: string | null;
  readonly batSpeedKind?: string | null;
  readonly videoUrl?: string | null;
  readonly libraryVideoId?: string | null;
  readonly bunt?: {side:'R'|'L';type:import('../../../../supabase/functions/_shared/wic/buntingProgram').BuntType;attempts:number;sourceAttempts:number;sourceSuccesses:number};
  readonly name: string;
  readonly armEvent?: import('../../../../supabase/functions/_shared/wic/phases/armLedger').ThrowEvent;
  readonly armCard?: 'pitching'|'throwing';
  readonly slug?: string;
  readonly setup?: string;
  readonly dosage: string;
  readonly speedMix?: ReadonlyArray<{ slug: string; name: string; category: "speed"; intent: "acceleration" | "max_velocity"; reps: number; distanceYards: number; restSeconds: number; cue?: string }>;
  readonly cue?: string;
  readonly stopIf?: string;
  /** Athlete-facing "You need:" line when the drill requires equipment. */
  readonly equipmentNote?: string;
  /** Session structure: prep → drills → full-go execution → log. */
  readonly stage?: "prep" | "drills" | "full_go" | "log";
  /** Catalog-declared existing non-throwing reps, not inferred from an exercise name. */
  readonly executionKind?: 'fielding_reads' | 'baserunning_scenarios';
  readonly guide?: import("./movementGuide").MovementGuide;
  /** Keeps owner routing and downstream analysis overlays auditable. */
  readonly prescriptionOrigin?: "owner" | "analysis";
  readonly analysisEnrollment?: { videoId: string; issueKey: string; drillId: string };
  readonly analysisInfluence?: import("@/lib/prescription/applyFaultPlanInfluence").AnalysisInfluenceTrace;
}


export interface GamePlanTemplateSeed {
  readonly title: string;
  readonly activityType:
    | "warmup"
    | "workout"
    | "running"
    | "practice"
    | "short_practice"
    | "recovery"
    | "meal";
  readonly icon: string;
  readonly color: string;
  readonly durationMinutes: number | null;
  readonly description: string;
  readonly checklist: ReadonlyArray<string>;
  readonly source: string;
}

export type LateralSide = "L" | "R" | null;

export interface PrescribedBlock {
  readonly modality: ModalityKey;
  readonly title: string;
  readonly why: string;
  readonly roadmapReason: string;
  /** Stage 2: why drills for a fault eased — a newer clip genuinely checked it and didn't see it. */
  readonly cleanClipNote?: string;
  /** Plain "Because" lines naming the real signal that changed this card (link e). Never invented. */
  readonly because?: ReadonlyArray<string>;
  /** Trace of actual same-category practice inputs; doseChanged is true only when the drill floor rule really cut sets. */
  readonly practiceContext?: {
    readonly category: string;
    readonly sourceIds: readonly string[];
    readonly sessions: number;
    readonly minutes: number;
    readonly intensityMinutes: number;
    readonly missingMinutes: number;
    readonly missingIntensity: number;
    readonly consecutiveDays: number;
    readonly doseChanged: boolean;
  };
  readonly phase: BlockPhase;
  readonly steps: ReadonlyArray<string>;
  readonly drills: ReadonlyArray<DrillStep>;
  readonly cues: ReadonlyArray<string>;
  readonly stopRules: ReadonlyArray<string>;
  readonly durationMin: number | null;
  readonly route: string;
  readonly ctaLabel: string;
  readonly status: BlockStatus;
  readonly missing: ReadonlyArray<string>;
  /** Knowledge-gap ids the UI can ask inline (Answer Hammer). */
  readonly missingContextKeys: ReadonlyArray<string>;
  readonly gamePlanTemplate: GamePlanTemplateSeed | null;
  /**
   * One plain-English line stating what Hammer assumed when a piece of the
   * athlete's context was missing. Cards must prescribe on an assumption
   * rather than render as a request for information.
   */
  readonly assumption?: string;
  /**
   * Set on a defense block that is already the short pre-game primer — the
   * schedule modulator must not suppress it a second time.
   */
  readonly gameDayPrimer?: boolean;
  /**
   * Card is intentionally off today (rest / schedule) but the athlete may
   * opt into a short light version. Drives the one-tap override control.
   */
  readonly offDayOverridable?: boolean;
  /**
   * Laterality tag for switch hitters / ambidextrous throwers — when set,
   * this block represents ONE side (L or R) and is expected to appear
   * alongside a mirror-side block. UI keys DOM ids + completion task ids
   * off this so L and R checklists stay independent.
   */
  readonly side?: LateralSide;
}

const ALL_MODALITIES: ModalityKey[] = [
  "warmup",
  "speed",
  "strength",
  "hitting",
  "throwing",
  "defense",
  "baserunning",
  "game_iq",
  "fueling",
  "recovery",
];

interface BuilderArgs {
  readonly pitchingType?: ReturnType<typeof pitchingDay>;
  readonly armHistory?: PlanningArmHistory;
  readonly planDate?: string;
  readonly armRole?: 'pitcher'|'two_way';
  readonly positionThrowing?: boolean;
  readonly pitchingPhase?: string;
  readonly skillExecutionAllowed?: boolean;
  readonly pitcherOutings?: OutingFacts | null;
  readonly modality: ModalityKey;
  readonly ctx: HammerAthleteContext;
  readonly proj: AthleteContextProjection;
  readonly speed: SpeedFocusDecision;
  /** Athlete-chosen position for today (defense swap control). */
  readonly positionOverride?: string | null;
  /**
   * Warm-up only. Derived from the slots that actually landed in today's
   * plan, so the prep matches the work. `null` keeps prior behaviour.
   */
  readonly modalityBiasOverride?: "speed" | "lift" | "throwing" | "hitting" | null;
}

const BODYWEIGHT_EQUIPMENT = new Set(["bodyweight", "bands", "hotel"]);

/**
 * EQUIPMENT LAW: declared equipment must actually change the hitting drills.
 * Built from the same vocabulary tokens the athlete's equipment profile and
 * the `drill_equipment` tags use, so both sides speak one language.
 * Every branch still returns real work — never an empty card.
 */
function hittingDrillsForEquipment(
  owned: ReadonlySet<string>,
  seasonPhase: string | null,
): DrillStep[] {
  const inSeason = seasonPhase === "in";
  const heavy = seasonPhase === "off";
  const has = (t: string) => owned.has(t);
  const drills: DrillStep[] = [
    { name: "Dry swings — barrel path", dosage: inSeason ? "2 rounds of 8" : "3 rounds of 10", cue: "shoulder-to-shoulder hold, no hand push", stage: "prep" },
  ];
  if (has("tee")) {
    drills.push({
      name: "Tee work — barrel path",
      dosage: inSeason ? "10 quality swings" : heavy ? "30 swings (3 rounds of 10)" : "20 swings",
      cue: "hit the back of the ball, finish balanced",
    });
  }
  if (has("screen") || (has("ball") && has("net"))) {
    drills.push({
      name: "Front toss — sequence drill",
      dosage: inSeason ? "10 swings" : heavy ? "25 swings" : "15 swings",
      cue: "land, see, then swing",
    });
  }
  if (has("pitching_machine")) {
    drills.push({
      name: "Full-go: machine at-bats with counts",
      dosage: inSeason ? "15 swings" : heavy ? "40 swings" : "25 swings",
      cue: "game speed; play each at-bat from a count (start 1-1, 2-2); every swing with intent; track every pitch — even no-swings",
      stage: "full_go",
      equipmentNote: "Pitching machine",
    });
  } else if (has("net")) {
    drills.push({
      name: "Full-go: cage at-bats with counts",
      dosage: inSeason ? "10 swings (quality > volume)" : heavy ? "40 swings" : "25 swings",
      cue: "game speed; play each round from a count (start 1-1, 2-2); every swing with intent — compete on every pitch",
      stage: "full_go",
    });
  }
  if (has("overload_bat") || has("underload_bat")) {
    drills.push({
      name: "Heavy / light bat contrast",
      dosage: "3 heavy, 3 light, 3 game bat × 3 rounds",
      cue: "same intent every swing, do not muscle the heavy bat",
      equipmentNote: has("overload_bat") && has("underload_bat") ? "Heavy bat and light bat" : has("overload_bat") ? "Heavy bat" : "Light bat",
    });
  }
  if (drills.length === 1) {
    // Bat only, or gear we can't build a ball round from — still real work.
    drills.push({ name: "Mirror or shadow swings — path check", dosage: "3 rounds of 8", cue: "watch the barrel enter the zone, not your hands" });
  }
  if (has("bat_sensor")) {
    drills.push({ name: "Log bat speed on your best round", dosage: "1 round", equipmentNote: "Bat sensor" });
  }
  drills.push({ name: "Log it: film 5 swings and tag them, write your swing count", dosage: "best 5 swings", stage: "log" });
  return drills.map((d) => (d.stage ? d : { ...d, stage: "drills" as const }));
}

function goalLine(proj: AthleteContextProjection): string | null {
  if (!proj.goalSummary) return null;
  return proj.goalHorizon
    ? `Goal: ${proj.goalSummary} (${proj.goalHorizon}-horizon).`
    : `Goal: ${proj.goalSummary}.`;
}

function drillsToSteps(drills: ReadonlyArray<DrillStep>): string[] {
  return drills.map((d) =>
    d.setup ? `${d.name} — ${d.dosage} (${d.setup})` : `${d.name} — ${d.dosage}`,
  );
}

function drillsToChecklist(drills: ReadonlyArray<DrillStep>): string[] {
  return drills.map((d) => `${d.name} — ${d.dosage}`);
}

function builder({ modality, ctx, proj, speed, positionOverride, modalityBiasOverride, pitcherOutings, pitchingType, pitchingPhase, armHistory, planDate, armRole, positionThrowing, skillExecutionAllowed = true }: BuilderArgs): PrescribedBlock {
  const declaredPos =
    firstPositionToken(ctx.get<unknown>("position_primary")?.value) ??
    firstPositionToken(ctx.get<unknown>("position")?.value) ??
    null;
  const pos = firstPositionToken(positionOverride) ?? declaredPos;
  const liftingAge = proj.liftingAgeYears;
  const seasonPhase = proj.seasonPhase;
  const injury = proj.injury;
  const injuryRegions = proj.injuryRegions;
  const readiness = ctx.get<{ score?: number }>("readiness")?.value ?? null;
  const equipment = proj.equipment;
  const lifecycleBand = proj.lifecycleBand;
  const availDays = proj.weeklyAvailabilityDays;
  const devPriorities = proj.developmentPriorities;
  const workloadHigh = proj.workloadHigh;
  const anthro = buildAnthroProfile(ctx.get<unknown>("anthropometrics")?.value);
  const anthroSignal = hasAnyAnthroSignal(anthro);

  // Readiness may arrive as a bare number or { score }; read both the same way
  // decisionFilters does so a low score is never silently ignored.
  const readinessScore =
    typeof readiness === "number"
      ? readiness
      : typeof (readiness as { score?: number } | null)?.score === "number"
        ? (readiness as { score: number }).score
        : null;
  const recoverDay = readinessScore !== null && readinessScore < 0.4;
  const youthScale =
    lifecycleBand === "u10" || lifecycleBand === "u12" || lifecycleBand === "u14";
  const lowAvail = typeof availDays === "number" && availDays <= 2;
  const bodyweightOnly = equipment !== null && BODYWEIGHT_EQUIPMENT.has(equipment);
  const goal = goalLine(proj);


  switch (modality) {
    case "warmup": {
      // Elite warmup library — fascial / ECM / fast-twitch / mobility /
      // activation / arm-care, composed by context (game / practice / speed
      // day / lift day / throwing / hitting / off-season / recovery / travel)
      // and scaled by training-age lifecycle so beginners → pros all get an
      // appropriate prep sequence.
      const scheduleAny = proj as unknown as { schedule?: { isGameDay?: boolean; isPracticeDay?: boolean; isTravelDay?: boolean; isRecoveryDay?: boolean } };
      const sched = scheduleAny?.schedule ?? {};
      const isGameDay = !!sched.isGameDay;
      const isPracticeDay = !!sched.isPracticeDay;
      const isTravelDay = !!sched.isTravelDay;
      const isRecoveryDay = !!sched.isRecoveryDay || recoverDay;
      const lifecycle = lifecycleFor(lifecycleBand, liftingAge);
      // Day-of-year seed so drills rotate day-to-day but stay stable within a day.
      const now = new Date();
      const daySeed = (now.getUTCFullYear() * 366) + (now.getUTCMonth() * 31) + now.getUTCDate();
      const contextArgs = {
        seasonPhase: seasonPhase as "off" | "pre" | "in" | "post" | null,
        isGameDay,
        isPracticeDay,
        isTravelDay,
        isRecoveryDay,
      };
      const biasedContext = resolveWarmupContext({
        ...contextArgs,
        modalityBias: modalityBiasOverride ?? null,
      });
      const unbiasedContext = resolveWarmupContext({ ...contextArgs, modalityBias: null });
      // Minimum-drill fallback: a bias may only ever ADD specificity. If the
      // biased template resolves thinner than the unbiased one, the athlete
      // keeps the unbiased warm-up.
      const MIN_WARMUP_DRILLS = 4;
      let context = biasedContext;
      // Arm care is ALWAYS owned by the throwing block (EASS band prep / cooldown / arm-protected mode).
      // Strip arm_care from the warmup so arm care is never duplicated.
      // Equipment is honest: only drills the athlete can actually run ship,
      // and the twitch layer is vetoed outright on low-readiness/travel days.
      const projAny = proj as unknown as {
        equipmentList?: ReadonlyArray<string>;
        equipmentVenue?: string | null;
      };
      const warmupArgs = {
        context,
        lifecycle,
        gameDay: isGameDay,
        daySeed,
        suppressArmCare: true,
        equipment: projAny.equipmentList ?? (equipment ? [equipment] : []),
        venue: projAny.equipmentVenue ?? equipment ?? null,
        injuryRegions: injuryRegions ?? [],
        suppressTwitch: isRecoveryDay || recoverDay || isTravelDay,
        sport: normalizeSport(ctx.get<unknown>("sport_primary")?.value ?? null) === "softball" ? "softball" as const : "baseball" as const,
        isThrower: pos === "P" || pos === "C",
      };
      let built = buildWarmup(warmupArgs);
      if (
        biasedContext !== unbiasedContext &&
        built.drills.length < MIN_WARMUP_DRILLS
      ) {
        const fallback = buildWarmup({ ...warmupArgs, context: unbiasedContext });
        if (fallback.drills.length > built.drills.length) {
          context = unbiasedContext;
          built = fallback;
        }
      }
      // Owner-approved narrow addition: swap one slot for an eligible owner drill.
      const drills: DrillStep[] = mergeOwnerSlotDrills(built.drills.map((d) => ({
        name: d.name,
        slug: d.slug,
        setup: d.setup,
        dosage: d.dosage,
        cue: d.cue,
        stopIf: d.stopIf,
        equipmentNote: d.equipmentNote,
        guide: d.guide,
      })), ["hammers_today:warmup"], { sport: normalizeSport(ctx.get<unknown>("sport_primary")?.value ?? null) === "softball" ? "softball" : "baseball", owned: new Set((proj as unknown as { equipmentList?: ReadonlyArray<string> }).equipmentList ?? []) });

      // Su Wen / Neijing micro-dose: on low-readiness / recovery days, lead the
      // warm-up with a 60-second season-aware breath primer so we downshift
      // sympathetic tone before any movement load. Additive only — never
      // replaces a drill, only prepends a primer step.
      if (isRecoveryDay || recoverDay) {
        const primer = getSeasonHPI(seasonPhase);
        drills.splice(1, 0, {
          name: "Breath primer (60 sec)",
          slug: "hpi-breath-primer",
          setup: "Seated or standing tall, shoulders soft, tongue on the roof of the mouth.",
          dosage: primer.breathPrimer,
          cue: `${primer.element} phase — ${primer.qiDirective}`,
          stopIf: "Lightheaded — stop, breathe normally, then continue.",
          guide: {
            what: "A short breath-first primer that regulates the autonomic system before movement.",
            setup: "Seated or standing tall, shoulders soft, tongue on the roof of the mouth.",
            goodRep: ["Slow, quiet nasal breathing.", "Ribs expand 360°, not just the chest.", "Exhale is longer than the inhale."],
            badRep: ["Mouth breathing.", "Shoulders shrugging up on the inhale.", "Rushing the tempo."],
            feel: "Calm, warm, slightly heavier — sympathetic tone dropping.",
            whyToday: "Long exhales bias parasympathetic recovery; box breathing steadies focus before performance.",
            nextLink: "hammer:open-hpi",
            stopIf: "Lightheaded — stop, breathe normally, then continue.",
          },
        });
      }
      // Order only (owner 2026-10-11): sort by warm-up stage; nothing added or removed.
      {
        const roleBySlug = new Map(built.drills.map((d) => [d.slug, d.role as string]));
        const sorted = sortByWarmupStage(drills, (d) => d.slug ?? "", (d) => roleBySlug.get(d.slug ?? "") ?? null);
        drills.splice(0, drills.length, ...sorted);
      }
      const titleByContext: Record<string, string> = {
        game_day: "Warm-up — game-day neural primer",
        in_season_practice: "Warm-up — practice-ready",
        in_season_default: "Warm-up — in-season maintenance",
        speed_day: "Warm-up — speed-day fast-twitch prep",
        lift_day: "Warm-up — lift-day joint + stability prep",
        throwing_day: "Warm-up — throwing-day arm-care prep",
        hitting_day: "Warm-up — hitting-day rotational prep",
        offseason_extended: "Warm-up — off-season extended (fascial + fast-twitch)",
        recovery_day: "Warm-up — recovery flow",
        travel_day: "Warm-up — travel-day movement prep",
        default: "Warm-up — dynamic",
      };
      const whyByContext: Record<string, string> = {
        game_day: "Prime the fascial system and fire fast-twitch pathways without spending — you want the CNS awake, not fatigued.",
        in_season_practice: "Restore tissue glide, wake up stabilizers, spark the fast-twitch reflex — carry patterns stay sharp inside the warm-up so you save legs for practice.",
        in_season_default: "Short elite prep so you're honest before skill work — CARs and fascial rotation open the joints, low-cost neural priming keeps quickness alive.",
        speed_day: "Fast-twitch prep is the whole point — controlled joint circles open the joints, ankle bounces and pogos wake stiffness, altitude drops sharpen ground contact.",
        lift_day: "Controlled joint circles and trunk holds prepare you to lift — resist turning and hold your side steady before the barbell.",
        throwing_day: "Warm the tissue, open the thorax, and progress arm-care so the shoulder complex is ready before the first throw.",
        hitting_day: "Fascial rotation, hip mobility, and low-volume rotational power ready the swing without pre-fatiguing it.",
        offseason_extended: "Full spectrum — tissue hydration, CARs, fascial spirals, mobility, stability, neural priming, and fast-twitch primer — because volume today demands honest prep.",
        recovery_day: "Breathwork, tissue prep, and slow CARs to move fluid, drop tone, and set the parasympathetic state.",
        travel_day: "Reset the ribcage, decompress the spine, wake the glutes — undo the seat.",
        default: "Elite prep calibrated to today's session length.",
      };
      const roadmapByContext: Record<string, string> = {
        game_day: "Game today — short neural primer so the CNS is on but not spent.",
        in_season_practice: "Practice today — enough prep to move well, low enough cost to save legs.",
        in_season_default: "In-season maintenance — quick tissue prep, CARs, and neural spark.",
        speed_day: "Speed day — the warm-up IS part of the stimulus. Wake the ankle stiffness first.",
        lift_day: "Lift day — earn the load with CARs, activation, and stability primers.",
        throwing_day: "Throwing day — arm-care volume front-loaded so the shoulder is ready.",
        hitting_day: "Hitting day — rotational prep primes elastic transfer through the swing.",
        offseason_extended: "Off-season — extended prep so you can handle today's volume honestly.",
        recovery_day: "Readiness is low — moving fluid, downshifting tone, no CNS spend.",
        travel_day: "Travel day — undo the seat, restore breathing, wake the posterior chain.",
        default: "Standard elite warm-up.",
      };
      const dur = built.estMinutes;
      const contextKey = built.context;
      const hpi = getSeasonHPI(seasonPhase);
      // Twitch transparency — the athlete is told exactly what the fast-twitch
      // layer is doing today, why it is single-leg biased, and what was
      // swapped for the gear they actually have. Never silent.
      const twitchNote =
        built.singleLegShare === null
          ? built.diagnostics.some((d) => d.code === "twitch_suppressed")
            ? "No fast-twitch work today — prep only, we're protecting the CNS."
            : ""
          : `Fast-twitch layer: ${Math.round(built.singleLegShare * 100)}% single-leg. Baseball and softball are one-leg, quick-burst games — quickness is built one leg at a time.`;
      // Equipment-substitution diagnostics remain on `built.diagnostics` for
      // internal replay/debugging only — they are never surfaced in athlete
      // copy. Each drill already carries its own "You need: …" line.
      return {
        modality,
        title: titleByContext[contextKey] ?? titleByContext.default,
        why: [whyByContext[contextKey] ?? whyByContext.default, twitchNote, hpi.qiDirective]
          .filter(Boolean)
          .join(" "),
        roadmapReason: `${roadmapByContext[contextKey] ?? roadmapByContext.default} (${hpi.element} phase — ${hpi.yinYangEmphasis})`,

        phase: isGameDay || isRecoveryDay ? "maintain" : "build",
        steps: drillsToSteps(drills),
        drills,
        cues: [
          "Move slow first, fast last — tissue before intent.",
          "Every rep is honest — no drift, no going through the motions.",
          "Fascial and fast-twitch drills earn everything downstream.",
          "Quick feet, quiet feet — the ground gets hit hard and left fast.",
        ],
        stopRules: [
          "Sharp pain (not muscle soreness) — stop and update Hammer where.",
          "Any pull or tightness on a fast-twitch drill — end the fast-twitch portion.",
          "Ground contacts getting loud or slow — the twitch work is done for today.",
          "Dizziness or shortness of breath — pause, hydrate, restart slower.",
        ],

        durationMin: dur,
        route: "hammer:open-warmup-generator",
        ctaLabel: "Open warm-up",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: titleByContext[contextKey] ?? "Hammer warm-up",
          activityType: "warmup",
          icon: "flame",
          color: "#f97316",
          durationMinutes: dur,
          description: whyByContext[contextKey] ?? "Daily dynamic warm-up prescribed by Hammer.",
          checklist: drillsToChecklist(drills),
          source: `hammer.daily.warmup.${contextKey}`,
        },
      };
    }

    case "speed": {
      const focus = speed.focus;
      const titleMap: Record<typeof focus, string> = {
        deload: "Speed — deload",
        tempo_recovery: "Speed — tempo recovery",
        unilateral_symmetry: "Speed — unilateral symmetry",
        offseason_volume: "Speed — off-season volume",
        inseason_freshness: "Speed — in-season freshness",
        max_velocity: "Speed — max velocity",
        acceleration_base: "Speed — acceleration base",
      };
      const drillsMap: Record<typeof focus, DrillStep[]> = {
        deload: [
          { name: "Easy tempo runs", dosage: "4 x 60 yards @ 60%", cue: "smooth and tall, no straining" },
          { name: "Mobility cool-down", dosage: "5 min hips + ankles" },
        ],
        tempo_recovery: [
          { name: "A-skips", dosage: "2 x 20 yards", cue: "tall posture, quick foot strike" },
          { name: "Build-up runs", dosage: "2 x 40 yards (build to 70%)", cue: "accelerate gradually, no jerks" },
          { name: "Tempo runs", dosage: `${speed.recommendedReps} x 60 yards @ 70%`, cue: "even pace, full recovery walk back", stopIf: "any tightness — switch to walk only" },
        ],
        unilateral_symmetry: [
          { name: "A-skips", dosage: "2 x 20 yards" },
          { name: "Single-leg pogos", dosage: "3 x 6 per side", cue: "stiff ankle, equal hop height both sides" },
          { name: "Unilateral bounds", dosage: `${speed.recommendedReps} x 20 yards alternating`, cue: "land balanced, no collapse" },
          { name: "Split-stance starts", dosage: "4 x 10 yards per side", cue: "drive the back knee, punch the ground" },
        ],
        offseason_volume: [
          { name: "A-skips + B-skips", dosage: "2 x 20 yards each" },
          { name: "Build-up runs", dosage: "2 x 40 yards (build to 90%)" },
          { name: "40-yard sprints", dosage: `${speed.recommendedReps} x 40 yards @ 90%`, cue: "drive arms knee-to-cheek, eyes down for first 10y", stopIf: "any pull or strain — shut it down" },
          { name: "Resisted starts (sled or band)", dosage: "3 x 10 yards", cue: "push the ground back, stay angled forward" },
          { name: "Long-acceleration runs", dosage: "2 x 60 yards @ 95%", cue: "smooth rise, no top-end straining" },
        ],
        inseason_freshness: [
          { name: "A-skips", dosage: "2 x 20 yards" },
          { name: "Build-up runs", dosage: "2 x 30 yards (to 90%)", cue: "smooth, no maximal effort yet" },
          { name: "20-yard sprints", dosage: `${speed.recommendedReps} x 20 yards @ 95%`, cue: "full 60s recovery between reps", stopIf: "any tightness whatsoever — stop today" },
        ],
        max_velocity: [
          { name: "A-skips", dosage: "2 x 20 yards" },
          { name: "Build-up runs", dosage: "3 x 40 yards (build to 95%)" },
          { name: "Flying 20s", dosage: `${speed.recommendedReps} x 20 yards @ 100% (with 20y build-in)`, cue: "tall posture, relaxed face, fast turnover", stopIf: "any pull — stop the session" },
          { name: "Walk-back recovery", dosage: "2-3 min between reps", cue: "fully recovered before next rep — speed work is not conditioning" },
        ],
        acceleration_base: [
          { name: "A-skips", dosage: "2 x 20 yards" },
          { name: "Build-up runs", dosage: "2 x 30 yards (to 90%)" },
          { name: "10-yard starts", dosage: `${speed.recommendedReps} x 10 yards @ 100%`, cue: "low body angle, punch the ground, drive arms hard", stopIf: "any pull or strain" },
          { name: "Optional resisted starts", dosage: "3 x 10 yards (sled or band)" },
        ],
      };
      const durationMap: Record<typeof focus, number> = {
        deload: 12,
        tempo_recovery: 18,
        unilateral_symmetry: 22,
        offseason_volume: 30,
        inseason_freshness: 15,
        max_velocity: 25,
        acceleration_base: 22,
      };
      const phaseMap: Record<typeof focus, BlockPhase> = {
        deload: "deload",
        tempo_recovery: "recover",
        unilateral_symmetry: "build",
        offseason_volume: "build",
        inseason_freshness: "sharpen",
        max_velocity: "sharpen",
        acceleration_base: "build",
      };
      const suppressed = focus === "deload" || focus === "tempo_recovery";
      const drills = recoverDay
        ? ([{ name: "Easy walk or light tempo", dosage: "10 min", cue: "no max effort today" }] as DrillStep[])
        : drillsMap[focus];
      return {
        modality,
        title: recoverDay ? "Speed — skipped (recovery)" : titleMap[focus],
        why: recoverDay
          ? "Readiness is low. Protecting tomorrow's session matters more than today's reps."
          : speed.rationale + (goal ? ` ${goal}` : ""),
        roadmapReason: recoverDay
          ? "Today is recover-first because your readiness signal dropped below 40%."
          : `Today is ${phaseMap[focus]} because ${speed.rationale}.`,
        phase: recoverDay ? "recover" : phaseMap[focus],
        steps: drillsToSteps(drills),
        drills,
        cues: [
          "Speed work is not conditioning — full recovery between reps.",
          "Quality over quantity. One great rep beats five mediocre ones.",
        ],
        stopRules: [
          "Any pull, twinge, or sudden tightness — stop the session entirely.",
          "Times dropping more than 10% from your best of the day — stop, you're done.",
        ],
        durationMin: recoverDay ? 0 : durationMap[focus],
        route: recoverDay || suppressed ? "/bounce-back-bay" : "/my-daily-game-plan",
        ctaLabel: recoverDay ? "Recover instead" : "Open Hammers Today",
        status: recoverDay ? "suppressed" : "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: recoverDay
          ? null
          : {
              title: `Hammer speed — ${focus.replace(/_/g, " ")}`,
              activityType: "running",
              icon: "zap",
              color: "#0ea5e9",
              durationMinutes: durationMap[focus],
              description: `Speed session: ${speed.rationale}`,
              checklist: drillsToChecklist(drills),
              source: `hammer.daily.speed.${focus}`,
            },
      };
    }

    case "strength": {
      // INPUT-INTEGRITY LAW: a card may never render as a request for
      // information. With no lifting history on file we prescribe the
      // conservative entry-level session, say the assumption out loud, and
      // let the athlete correct it.
      if (liftingAge === null) {
        const drills: DrillStep[] = [
          { name: "Goblet squat", dosage: "3 x 8, light — leave 4 reps in the tank", cue: "chest tall, knees track over toes", stopIf: "Knee or back pain" },
          { name: "Push-up (or incline push-up)", dosage: "3 x 8", cue: "body in one line, elbows about 45 degrees" },
          { name: "Split squat", dosage: "3 x 6 each leg", cue: "back knee straight down, front foot flat" },
          { name: "Single-arm row", dosage: "3 x 8 each side", cue: "pull to the hip, no twisting" },
          { name: "Dead bug", dosage: "3 x 6 each side", cue: "low back stays glued to the floor" },
        ];
        return {
          modality,
          title: "Strength — conservative start",
          why: "I don't have your lifting history yet, so I'm starting you light and safe rather than skipping the day.",
          assumption:
            "Assuming you're new to structured lifting. Update Hammer how long you've been lifting and I'll load this properly.",
          roadmapReason: "No lifting history on file — prescribing the entry-level session until you tell me otherwise.",
          phase: "build",
          steps: drillsToSteps(drills),
          drills,
          cues: ["Technique before load. Every rep looks the same."],
          stopRules: ["Any sharp pain — stop the exercise.", "If a set gets ugly, end it there."],
          durationMin: 30,
          route: "/training-block",
          ctaLabel: "Open lift",
          status: "ready",
          missing: ["lifting_history"],
          missingContextKeys: ["lifting_history"],
          gamePlanTemplate: {
            title: "Hammer strength — conservative start",
            activityType: "workout",
            icon: "dumbbell",
            color: "#dc2626",
            durationMinutes: 30,
            description: "Entry-level strength session.",
            checklist: drillsToChecklist(drills),
            source: "internal",
          },
        };
      }

      const phaseTemplate =
        seasonPhase === "off"
          ? { name: "off-season volume", sets: "4x6", durationBase: 55, phase: "build" as BlockPhase }
          : seasonPhase === "pre"
            ? { name: "pre-season strength", sets: "4x4", durationBase: 50, phase: "build" as BlockPhase }
            : seasonPhase === "in"
              ? { name: "in-season potentiation", sets: "3x3", durationBase: 35, phase: "maintain" as BlockPhase }
              : seasonPhase === "post"
                ? { name: "post-season recovery", sets: "2x8", durationBase: 30, phase: "recover" as BlockPhase }
                : { name: "standard", sets: "3x5", durationBase: 50, phase: "build" as BlockPhase };

      const heavyLiftBlocked =
        injuryRegions.includes("back") ||
        injuryRegions.includes("lumbar") ||
        injuryRegions.includes("knee") ||
        injuryRegions.includes("hamstring");

      const drills: DrillStep[] = bodyweightOnly
        ? [
            { name: "Bodyweight squat or split squat", dosage: "3 x 8 quality reps", cue: "knees track toes, chest tall" },
            { name: "Push-up progression", dosage: "3 x 8", cue: "body in a straight line, full lock-out" },
            { name: "Band row", dosage: "3 x 10", cue: "pull elbows back, squeeze the shoulder blades" },
            { name: "Plank + dead-bug finisher", dosage: "2 x 30s", cue: "ribs down, no lower-back arch" },
          ]
        : youthScale
          ? [
              { name: "Bodyweight squat or goblet squat (light)", dosage: "2 x 8", cue: "movement quality only" },
              { name: "Push-up progression", dosage: "2 x 6" },
              { name: "Row variation", dosage: "2 x 8" },
              { name: "Plank + bird-dog finisher", dosage: "2 x 30s" },
            ]
          : heavyLiftBlocked
            ? [
                { name: "Goblet squat or hip hinge (sub-max)", dosage: `3 x 8`, cue: "smooth, controlled, no grinding reps", stopIf: "any sharp pain in injured area" },
                { name: "DB bench or push-up", dosage: "3 x 6" },
                { name: "Row or chin-up", dosage: "3 x 8" },
                { name: "Posterior chain accessory (controlled)", dosage: "2 x 10" },
              ]
            : [
                { name: "Main lift: trap-bar deadlift or squat", dosage: phaseTemplate.sets, cue: "brace hard, drive the floor away", stopIf: "form breakdown — drop the weight" },
                { name: "Push: bench press or DB press", dosage: phaseTemplate.sets, cue: "feet planted, full lock-out" },
                { name: "Pull: row or chin-up", dosage: "3 x 8" },
                { name: "Posterior chain accessory", dosage: "2 x 10" },
              ];

      if (devPriorities.includes("power")) {
        drills.push({ name: "Power finisher: jump or med-ball throw", dosage: "4 x 3", cue: "max intent, full recovery" });
      } else if (devPriorities.includes("mobility")) {
        drills.push({ name: "Mobility finisher", dosage: "8 min hips + t-spine" });
      } else if (devPriorities.includes("speed")) {
        drills.push({ name: "Short-contact pogos", dosage: "3 x 8", cue: "stiff ankles" });
      }

      // Anthropometric swaps — inject preferred patterns + rationale.
      const anthroOut = anthroSignal && !youthScale && !bodyweightOnly
        ? selectStrengthSwaps(anthro)
        : { swaps: [] as ReturnType<typeof selectStrengthSwaps>["swaps"], rationale: null };
      for (const sw of anthroOut.swaps) {
        drills.push({
          name: sw.preferred,
          dosage: phaseTemplate.sets,
          cue: sw.cue,
          setup: sw.demote ? `Preferred over: ${sw.demote}` : undefined,
        });
      }


      const duration = recoverDay
        ? 30
        : workloadHigh
          ? Math.max(25, phaseTemplate.durationBase - 15)
          : youthScale
            ? 25
            : bodyweightOnly
              ? lowAvail ? 25 : 30
              : lowAvail ? Math.max(35, phaseTemplate.durationBase - 10) : phaseTemplate.durationBase;

      return {
        modality,
        title: youthScale
          ? "Strength — youth template"
          : bodyweightOnly
            ? `Strength — bodyweight (${equipment})`
            : heavyLiftBlocked
              ? "Strength — injury-modified"
              : workloadHigh
                ? `Strength — auto-deload (${phaseTemplate.name})`
                : `Strength — ${phaseTemplate.name}`,
        why: recoverDay
          ? "Deload day — preserve quality, drop volume."
          : workloadHigh
            ? "Workload is high — protecting recovery; volume reduced."
            : heavyLiftBlocked
              ? `Injury-aware template (${injuryRegions.join(", ")}) — sub-max patterning only.`
              : youthScale
                ? "Movement quality bias for developing athletes; no max-effort loading."
                : `Force production (${phaseTemplate.name}).` + (goal ? ` ${goal}` : ""),
        roadmapReason: (workloadHigh
          ? "Auto-deload — workload elevated across the last 7 days."
          : recoverDay
            ? "Reduced today because readiness dropped below 40%."
            : `Today is ${phaseTemplate.phase} because we're in ${seasonPhase ?? "an undeclared"} season phase.`)
          + (anthroOut.rationale ? ` ${anthroOut.rationale}` : ""),

        phase: workloadHigh || recoverDay ? "deload" : phaseTemplate.phase,
        steps: drillsToSteps(drills),
        drills,
        cues: [
          "Every rep is a deposit. Trash reps cost the same as quality reps.",
          "If you can't keep technique on the last rep, the set is over.",
        ],
        stopRules: [
          "Sharp pain (especially back, knee, shoulder) — stop the lift immediately.",
          "Two missed reps in a row at the prescribed weight — drop the weight 10%.",
        ],
        durationMin: duration,
        route: "/training-block",
        ctaLabel: "Open lift",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: `Hammer strength — ${phaseTemplate.name}`,
          activityType: "workout",
          icon: "dumbbell",
          color: "#dc2626",
          durationMinutes: duration,
          description: `Strength session: ${phaseTemplate.name}.`,
          checklist: drillsToChecklist(drills),
          source: "internal",
        },
      };
    }

    case "hitting": {
      // INPUT-INTEGRITY LAW: never withhold the hitting prescription waiting
      // on equipment. With nothing on file we assume the most common minimum
      // (a bat and somewhere to swing), say so, and let them correct it.
      const ownedHitting = new Set(
        (proj as unknown as { equipmentList?: ReadonlyArray<string> }).equipmentList ?? [],
      );
      const equipmentUnknown = proj.equipmentScope === null && (ctx.get<unknown>('equipment_effective')?.value == null || Array.isArray(ctx.get('equipment_effective')?.value) && (ctx.get<string[]>('equipment_effective')?.value?.length ?? 0) === 0);
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      // NOTE: switch-hitter split is handled downstream by splitLateralityBlocks,
      // which duplicates this block into two full-volume side-tagged blocks
      // (Left and Right). Do NOT halve volume or interleave sides here.
      // EQUIPMENT LAW: what the athlete declared actually changes the drills.
      const declaredDrills = ownedHitting.size > 0 ? hittingDrillsForEquipment(ownedHitting, seasonPhase) : null;
      // Owner-approved narrow addition: swap one slot for an eligible owner drill.
      const drills: DrillStep[] = structureSkillSession(mergeOwnerSlotDrills<DrillStep>(declaredDrills ?? (equipmentUnknown
        ? [
            { name: "Dry swings — barrel path", dosage: "3 rounds of 10", cue: "shoulder-to-shoulder hold, no hand push", stage: "prep" },
            { name: "Dry swing drill — balanced finish", dosage: "20 swings", cue: "keep the barrel on path, finish balanced", stage: "drills" },
            { name: "Game-speed dry swings with counts", dosage: "15 swings", stage: "full_go",
              setup: "Use your bat in a clear, safe space. Picture an at-bat starting 1-1, then 2-2. No ball, tee or partner is needed. Use these same 15 swings; do not add more.",
              cue: "Every swing with intent; see an imaginary pitch, decide, then swing. Reset fully between swings.",
              stopIf: "Hand or wrist pain, unsafe space or loss of balance — stop the game-speed round." },
            { name: "Film 5 swings on your phone and tag them", dosage: "best 5 swings", stage: "log" },
          ]
        : inSeason
        ? [
            { name: "Tee work — barrel path", dosage: "10 quality swings", cue: "stay through the ball, do not pull off" },
            { name: "Front toss — pitch recognition", dosage: "10 swings", cue: "see ball deep, hands stay back" },
            { name: "Live BP — game-quality", dosage: "10 swings (quality > volume)" },
          ]
        : offSeason
          ? [
              { name: "Tee work — barrel path", dosage: "30 swings (3 rounds of 10)", cue: "shoulder-to-shoulder hold, no hand push" },
              { name: "Front toss — sequence drill", dosage: "25 swings", cue: "land, see, then swing" },
              { name: "Live BP or machine", dosage: "40 swings", cue: "track every pitch, even no-swings" },
              { name: "Video + tag swings in PIE", dosage: "5-10 best swings flagged" },
            ]
          : [
              { name: "Tee work — barrel path", dosage: "20 swings", cue: "shoulder-to-shoulder hold" },
              { name: "Front toss — sequence drill", dosage: "15 swings" },
              { name: "Live BP or machine", dosage: "25 swings" },
              { name: "Video + tag in PIE", dosage: "best 5 swings flagged" },
            ]), ["hammers_today:skill"], { sport: normalizeSport(ctx.get<unknown>("sport_primary")?.value ?? null) === "softball" ? "softball" : "baseball", owned: ownedHitting, skill: "hitting" }), { skill: 'hitting', sport: normalizeSport(ctx.get<unknown>("sport_primary")?.value ?? null) === 'softball' ? 'softball' : 'baseball', owned: ownedHitting, injuryRegions, recoveryDay: recoverDay });
      return {
        modality,
        title: equipmentUnknown
          ? "Hitting — bat-and-space session"
          : declaredDrills
            ? `Hitting — built from your gear${inSeason ? " (in-season)" : offSeason ? " (off-season)" : ""}`
            : inSeason ? "Hitting — in-season quality" : offSeason ? "Hitting — off-season build" : "Hitting",
        assumption: equipmentUnknown
          ? "Assuming you have a bat and somewhere safe to swing. Update Hammer what you actually have and I'll upgrade this."
          : undefined,
        why: (inSeason ? "Sharpen timing without spending." : offSeason ? "Volume + mechanical rebuild." : "Quality reps targeting your weakness pattern.") + (goal ? ` ${goal}` : ""),
        roadmapReason: inSeason
          ? "In-season — focus on timing and feel, not volume."
          : offSeason
            ? "Off-season — high volume + mechanical work while there is no game pressure."
            : "Default hitting block calibrated to season phase.",
        phase: inSeason ? "sharpen" : offSeason ? "build" : "skill",
        steps: drillsToSteps(drills),
        drills,
        cues: [
          "Track every pitch, even no-swings.",
          "Quality first — bail on a round if you start grooving bad habits.",
        ],
        stopRules: ["Hand or wrist pain — stop and switch to dry swings only.", "If timing breaks down badly, end the round, reset, restart."],
        durationMin: inSeason ? 20 : offSeason ? 45 : 35,
        route: "/practice?module=hitting",
        ctaLabel: "Open hitting",
        status: "ready",
        missing: equipmentUnknown ? ["equipment_access"] : [],
        missingContextKeys: equipmentUnknown ? ["equipment_effective"] : [],
        gamePlanTemplate: {
          title: `Hammer hitting — ${inSeason ? "in-season" : offSeason ? "off-season" : "standard"}`,
          activityType: "practice",
          icon: "target",
          color: "#8b5cf6",
          durationMinutes: inSeason ? 20 : offSeason ? 45 : 35,
          description: "Hitting block with tee, toss, and live BP work.",
          checklist: drillsToChecklist(drills),
          source: "internal",
        },
      };
    }

    case "throwing": {
      if (pos === "DH" || pos === "designated_hitter") {
        return {
          modality,
          title: "Throwing — not in your role",
          why: "Position does not require a throwing block today.",
          roadmapReason: "DH role — throwing block suppressed.",
          phase: "skill",
          steps: [],
          drills: [],
          cues: [],
          stopRules: [],
          durationMin: 0,
          route: "/practice",
          ctaLabel: "Skip",
          status: "suppressed",
          missing: [],
          missingContextKeys: [],
          gamePlanTemplate: null,
        };
      }

      // EASS — Elastic Arm Speed & Underload Throwing System.
      // Whole-body, fast-object-first, position + sport aware, safety supreme.
      const sportRaw = ctx.get<unknown>("sport_primary")?.value ?? null;
      const scheduleAny = proj as unknown as { schedule?: { isGameDay?: boolean; isRecoveryDay?: boolean; isThrowingDay?: boolean } };
      const sched = scheduleAny?.schedule ?? {};
      const armSore = !!(ctx.get<{ arm_sore?: boolean }>("daily_log")?.value as { arm_sore?: boolean })?.arm_sore;
      const ageYears = (ctx.get<number>("age_years")?.value as number | null) ?? null;
      const readinessScore = typeof readiness === 'number' ? readiness :
        typeof (readiness as { score?: number })?.score === "number"
          ? (readiness as { score: number }).score
          : null;

      const eassCtx: EassContext = {
        sport: normalizeSport(sportRaw),
        position: positionThrowing && normalizePosition(pos)==='pitcher' ? 'utility' : normalizePosition(pos),
        seasonPhase: seasonPhase as EassContext["seasonPhase"],
        ageYears,
        trainingAgeYears: liftingAge ?? null,
        injuryRegions: [...injuryRegions],
        armSore,
        isGameDay: !!sched.isGameDay || !!pitcherOutings?.startsToday || pitchingType === 'available',
        // If schedule doesn't declare throwing day explicitly, treat non-game days as throwing days
        // when the athlete's development priorities include throwing/velocity, otherwise alternate.
        isThrowingDay: pitcherOutings?.startsTomorrow || pitcherOutings?.relieverAvailableSoon
          ? false : pitchingType ? ['bullpen','side','long_toss'].includes(pitchingType) : sched.isThrowingDay ?? !sched.isGameDay,
        isRecoveryDay: !!sched.isRecoveryDay || recoverDay || !!pitcherOutings?.pitchedYesterday || pitchingType === 'flush' || pitchingType === 'rest',
        readinessScore,
      };

      const eass = buildEassPrescription(eassCtx);
      if(armRole && normalizeSport(sportRaw)==='softball'){
        const care=eass.drills.filter(d=>['band_prep','cooldown','recovery'].includes(d.category));
        const phase=pitchingPhase??(seasonPhase==='off'?'os_q1':seasonPhase==='pre'?'preseason':seasonPhase==='in'?'in_season':'post_season');
        eass.drills=[...care,...(planDate?windmillPlanningDrills({date:planDate,phase,age:ageYears,readiness:readinessScore,armPain:armSore||injuryRegions.some(r=>['shoulder','elbow','ucl','forearm'].includes(r)),equipment:[...proj.equipmentList],history:armHistory,outings:pitcherOutings}):[])];
      }
      if(armRole==='two_way') {
        const position=normalizePosition(declaredPos)==='pitcher'?normalizePosition(ctx.get('position_secondary')?.value):normalizePosition(declaredPos);
        const positionWork=buildEassPrescription({...eassCtx,position:position==='pitcher'?'utility':position,isThrowingDay:!pitcherOutings?.startsToday&&!pitcherOutings?.startsTomorrow&&!pitcherOutings?.pitchedYesterday,isRecoveryDay:eassCtx.isRecoveryDay||!!pitcherOutings?.startsToday||!!pitcherOutings?.startsTomorrow});
        eass.drills=[...eass.drills.map(d=>({...d,armCard:'pitching' as const})),...positionWork.drills.filter(d=>!['band_prep','cooldown','recovery'].includes(d.category)).map(d=>({...d,armCard:'throwing' as const}))];
      }
      if (pitchingType) {
        // The existing full-go pitch budget rotates between bullpen/design and
        // live counts; never create a second pitch dose for a presentation stage.
        eass.drills = eass.drills.map(d => d.stage === 'full_go' && pitchingType === 'bullpen'
          ? { ...d, name: planDate && new Date(`${planDate}T12:00:00Z`).getUTCDay() === 6 ? 'Live at-bats — existing pitch budget' : d.name,
            cue: `${d.cue} Pitch design: use your saved pitch types, change the target and count strikes. Live at-bats use this same pitch count, never an added round.` } : d);
      }
      if(pitchingType==='side'||pitchingType==='touch'){
        eass.drills=eass.drills.filter(d=>d.category!=='intent'&&d.category!=='overload').map(d=>d.stage==='full_go'?{...d,name:'Flat-ground command — existing pitch budget',stage:'drills' as const,cue:`${d.cue} Flat ground only, easy feel; use the same listed count.`}:d);
      }
      if(armRole && ['shoulder','elbow','ucl','forearm'].some(r=>injuryRegions.includes(r)))eass.drills=eass.drills.filter(d=>['band_prep','cooldown','recovery'].includes(d.category));
      if (planDate && armRole) eass.drills = guardArmDrills(eass.drills, {date:planDate,sport:normalizeSport(sportRaw),role:armRole,age:ageYears,level:ctx.get<string>('competition_level')?.value??null,history:armHistory});
      const outingReason = pitcherOutings?.pitchedYesterday
        ? "You pitched yesterday. Today's arm care is easy recovery work."
        : pitcherOutings?.startsToday ? "You start today. Save your throwing work for the outing."
        : pitcherOutings?.startsTomorrow ? "You start tomorrow. Today's throwing keeps you ready."
        : pitcherOutings?.relieverAvailableSoon ? "You're available to pitch. Keep your arm ready without a separate hard session."
        : "";

      // Ambidextrous throwers get TWO independent throwing cards downstream
      // via splitLateralityBlocks (dominant + non-dominant), each with its own
      // dosage envelope and completion checklist. Do not push mirror drills here.

      // Map EASS drills → DrillStep shape used by the UI.
      // Owner-approved narrow addition: swap one slot for an eligible owner drill.
      const mappedDrills = eass.drills.map((d) => ({
        name: d.name,
        slug: (d as { slug?: string }).slug,
        setup: d.setup,
        dosage: d.dosage,
        stage: d.stage ?? (d.intensity === 'prep' ? 'prep' : 'drills'),
        armCard:d.armCard,
        ...(armRole && eassArmEvent(d) ? {armEvent:eassArmEvent(d)??undefined} : {}),
        cue: d.cue,
        stopIf: d.stopIf,
        guide: _guideForMovement((d as { slug?: string }).slug) ?? _guideForMovement(d.name) ?? undefined,
      }));
      // An unmeasured owner replacement cannot inherit a judged arm count.
      const drills: DrillStep[] = armRole ? mappedDrills : mergeOwnerSlotDrills(mappedDrills, ["hammers_today:skill"], { sport: normalizeSport(sportRaw) === "softball" ? "softball" : "baseball", owned: new Set((proj as unknown as { equipmentList?: ReadonlyArray<string> }).equipmentList ?? []), skill: "throwing" });

      // Anthropometric throwing cues + supplemental drills (additive overlay, non-authoritative).
      const thrOut = anthroSignal ? selectThrowingAdaptations(anthro) : {
        cues: [] as ReturnType<typeof selectThrowingAdaptations>["cues"],
        supplemental: [] as ReturnType<typeof selectThrowingAdaptations>["supplemental"],
        rationale: null,
      };
      for (const s of armRole ? [] : thrOut.supplemental) {
        drills.push({
          name: s.name,
          dosage: s.dosage,
          cue: s.cue,
        });
      }
      const anthroCues = thrOut.cues.map((c) => c.cue);

      return {
        modality,
        title: eass.title,
        why: eass.why + (outingReason ? ` ${outingReason}` : "") + (goal ? ` ${goal}` : ""),
        roadmapReason: eass.roadmapReason + (thrOut.rationale ? ` ${thrOut.rationale}` : ""),
        phase:
          eass.mode === "arm_protected" || eass.mode === "recovery_day"
            ? "recover"
            : eass.mode === "throwing_day_maintain" || eass.mode === "game_day_prep"
              ? "maintain"
              : "build",
        steps: drillsToSteps(drills),
        drills,
        cues: [...eass.cues, ...anthroCues],

        stopRules: eass.stopRules,
        durationMin: eass.durationMin,
        route: "/practice?module=throwing",
        ctaLabel:
          eass.mode === "arm_protected" ? "Open arm-care"
          : eass.mode === "recovery_day" ? "Open recovery"
          : "Open throwing",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: `Hammer throwing — EASS (${eass.mode})`,
          activityType: eass.mode === "arm_protected" || eass.mode === "recovery_day" ? "recovery" : "practice",
          icon: eass.mode === "arm_protected" || eass.mode === "recovery_day" ? "heart" : "target",
          color: eass.mode === "arm_protected" || eass.mode === "recovery_day" ? "#f43f5e" : "#0ea5e9",
          durationMinutes: eass.durationMin,
          description: eass.why,
          checklist: drillsToChecklist(drills),
          source: `hammer.daily.throwing.eass.${eass.mode}`,
        },
      };
    }

    case "defense": {
      const ownedDefense = new Set((proj as unknown as { equipmentList?: ReadonlyArray<string> }).equipmentList ?? []);
      // This catalog includes catching/throwing and live-field work. Merely
      // declining to promote full_go does not make its existing reps gear-free.
      const missingGear = [
        ...(!ownedDefense.has('field') && !ownedDefense.has('open_space') ? ['safe field space'] : []),
        ...(!ownedDefense.has('glove') ? ['glove'] : []),
        ...(!ownedDefense.has('ball') ? ['ball'] : []),
      ];
      if (missingGear.length && !pos) return {
        modality,
        title: pos ? `Defense — ${pos}` : 'Defense — general fundamentals',
        why: 'Fielding equipment has not been confirmed.',
        roadmapReason: `Your fielding work needs ${missingGear.join(', ')}. Confirm what you have before starting.`,
        because: ['Your saved equipment list does not include everything this fielding session needs.'],
        phase: 'skill', steps: ['Confirm your fielding equipment before starting.'], drills: [], cues: [],
        stopRules: ['Do not start fielding or throwing without the listed equipment and safe space.'],
        durationMin: null, route: '#hammer-onboarding', ctaLabel: 'Confirm my equipment',
        status: 'awaiting-input', missing: ['equipment_access'],
        missingContextKeys: ['equipment_effective'], gamePlanTemplate: null,
      };
      if (!pos) {
        // Keep the confirmation visible without inventing generic throws or
        // doses outside the position-specific catalog and arm-work rules.
        return {
          modality,
          title: "Defense — general fundamentals",
          why: "Your fielding position has not been confirmed.",
          roadmapReason: "Choose your position before starting so your fielding work fits your role.",
          phase: "skill",
          steps: ["Confirm your fielding position before starting."],
          drills: [],
          cues: [],
          stopRules: ["Do not start fielding or throwing until your position is confirmed."],
          durationMin: null,
          route: "#hammer-onboarding",
          ctaLabel: "Set my position",
          status: "awaiting-input",
          missing: ["position_primary"],
          missingContextKeys: ["position_primary"],
          gamePlanTemplate: null,
        };
      }
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";

      // Elite defensive drill library — position × sport × phase, with
      // secondary-position blend, injury gating, and tournament tapering.
      const sportRaw = ctx.get<unknown>("sport_primary")?.value ?? null;
      const secondaryRaw = coercePositionTokens([
        ctx.get<unknown>("position_secondary")?.value,
        ctx.get<unknown>("positions_secondary")?.value,
      ]);
      const defenseSchedAny = proj as unknown as { schedule?: { tournamentToday?: boolean; isTournamentDay?: boolean } };
      const tournamentToday = !!(defenseSchedAny?.schedule?.tournamentToday || defenseSchedAny?.schedule?.isTournamentDay);

      const defenseSport = normalizeSport(sportRaw) === "softball" ? "softball" : "baseball";
      const defenseTier = resolveDefenseTier(liftingAge, seasonPhase as string | null);
      const prescription = selectDefenseDrills({
        position: pos,
        secondaryPositions: secondaryRaw,
        sport: defenseSport,
        seasonPhase: seasonPhase as string | null,
        injuryRegions: [...injuryRegions],
        tournamentToday,
        goal,
        tier: defenseTier,
      });

      // Fallback to a safe generic prescription if the catalog somehow returns
      // nothing (unknown position + heavy injury gating). Never fabricate —
      // just keep the modality visible with a "come back tomorrow" note.
      // Owner-approved narrow addition: swap one slot for a switched-on owner drill.
      const fieldingSource = prescription?.drills ? [...prescription.drills] : null;
      const restricted = fieldingSource ? restrictedFielding(fieldingSource, injuryRegions) : null;
      const pitcherFielding = normalizePosition(pos)==='pitcher';
      const lowTaxingFielding = pitcherFielding ? fieldingSource?.filter(d=>d.executionKind==='fielding_reads').map(d=>({...d,setup:[d.setup,'Low-taxing pitcher fielding: walk through the read, field and set your feet. No release or extra throw; all throwing belongs to the arm plan.'].filter(Boolean).join(' '),cue:'Read, field and set your feet at easy pace. Do not throw.'})) : fieldingSource;
      const drills: DrillStep[] = structureSkillSession(mergeOwnerSlotDrills(lowTaxingFielding
        ? lowTaxingFielding
        : [
            { name: "Pre-pitch + first-step reads", dosage: "20 reps", cue: "low athletic stance, weight on balls of feet" },
            { name: "Glove work — 4 corners", dosage: "15 reps", cue: "field through the ball, don't stab" },
          ], ["hammers_today:defense", "defensive_library"], { sport: defenseSport, owned: ownedDefense }), { skill: 'defense', sport: defenseSport, owned: ownedDefense, injuryRegions, recoveryDay: recoverDay || tournamentToday || !skillExecutionAllowed || pitcherFielding });
      const armProtected=injuryRegions.some(r=>['shoulder','elbow','ucl','forearm'].includes(r));
      const safeDrills = restricted ? structureSkillSession(restricted.drills,{skill:'defense',sport:defenseSport,owned:ownedDefense,injuryRegions,recoveryDay:true}) : missingGear.length || armProtected ? drills.filter(d=>d.executionKind==='fielding_reads').map(d=>({...d,name:`${d.name} — dry footwork`,executionKind:undefined,stage:'drills' as const,setup:'Walk through the existing footwork without a ball or throw. Stay within your safe space; no diving, sprinting or catching.',cue:'Read an imaginary ball, set your feet, then reset. No throws.',stopIf:'Pain or unsafe space — stop.'})) : drills;
      const cues = prescription?.cues ?? ["Field through the ball.", "Footwork before glove."];
      const stopRules = [...(prescription?.stopRules ?? ["Knee, ankle, or hip pain — stop and update Hammer."]), "Use a glove, the correct ball and safe space. If something is missing, use Swap before starting; do not perform an unsafe rep."];
      const durationMin = prescription?.durationMin ?? (inSeason ? 15 : offSeason ? 35 : 25);
      const title = prescription?.title ?? `Defense — ${pos}`;
      const why = restricted?.reason ?? prescription?.why
        ?? ((inSeason ? "Game-rep quality over volume." : offSeason ? "Footwork and range building." : "Position-specific reads, footwork, and finishes.") + (goal ? ` ${goal}` : ""));

      return {
        modality,
        title,
        why,
        roadmapReason: restricted?.reason ?? (tournamentToday
          ? "Tournament day — primer only, save the legs."
          : inSeason
            ? "In-season — game-rep quality."
            : offSeason
              ? "Off-season — load volume + range."
              : "Pre-season — sharpen reads and finishes."),
        phase: inSeason ? "sharpen" : tournamentToday ? "maintain" : "build",
        steps: drillsToSteps(safeDrills),
        drills: safeDrills,
        cues,
        stopRules,
        durationMin,
        route: "/practice?module=defense",
        ctaLabel: "Open defense",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: `Hammer defense — ${pos}`,
          activityType: "practice",
          icon: "target",
          color: "#10b981",
          durationMinutes: durationMin,
          description: `Defensive block for ${pos} (${defenseSport}).`,
          checklist: drillsToChecklist(safeDrills),
          source: "internal",
        },
      };
    }

    case "baserunning": {
      const legBlocked =
        injuryRegions.includes("hamstring") ||
        injuryRegions.includes("ankle") ||
        injuryRegions.includes("knee") ||
        injuryRegions.includes("groin");
      if (legBlocked) {
        const drills: DrillStep[] = [
          { name: "Pickoff read film", dosage: "10 min", cue: "watch the pitcher's first move" },
          { name: "Lead/secondary position reads — seated", dosage: "10 reps", cue: "Stay seated. Picture the lead and say when you would return to the base. No steps, pivots or running.", stopIf: "any pain or discomfort" },
        ];
        return {
          modality,
          title: "Baserunning — IQ only (leg-protected)",
          why: `Injury (${injuryRegions.join(", ")}) — mental reps only today.`,
          roadmapReason: "Injury supremacy — leg work suppressed.",
          phase: "recover",
          steps: drillsToSteps(drills),
          drills,
          cues: ["Decision speed beats foot speed."],
          stopRules: ["Any leg pain — stop."],
          durationMin: 10,
          route: "/practice?module=baserunning",
          ctaLabel: "Open practice log",
          status: "ready",
          missing: [],
          missingContextKeys: [],
          gamePlanTemplate: {
            title: "Hammer baserunning — IQ only",
            activityType: "short_practice",
            icon: "brain",
            color: "#6366f1",
            durationMinutes: 10,
            description: "Pickoff reads and footwork at walk pace.",
            checklist: drillsToChecklist(drills),
            source: "internal",
          },
        };
      }
      const inSeason = seasonPhase === "in";
      const runningSport = normalizeSport(ctx.get<unknown>('sport_primary')?.value ?? null) === 'softball' ? 'softball' : 'baseball';
      const ownedRunning = new Set((proj as unknown as { equipmentList?: ReadonlyArray<string> }).equipmentList ?? []);
      // Owner baserunning tags swap one non-scenario slot; count and scenario identity unchanged.
      const drills: DrillStep[] = structureSkillSession(mergeOwnerSlotDrills<DrillStep>(inSeason
        ? [
            { name: runningSport === 'softball' ? 'Pitch-release reads' : "Pickoff reads", dosage: "8 reps", cue: runningSport === 'softball' ? 'Stay on the base until the pitch is released; then read and move.' : "first move = first step" },
            { name: "First-to-third / tag-up scenarios", dosage: "5 reps", executionKind: 'baserunning_scenarios' },
          ]
        : [
            { name: runningSport === 'softball' ? 'Release + first-step footwork' : "Lead + secondary footwork", dosage: "10 reps", cue: runningSport === 'softball' ? 'Start on the base; leave only when the pitch is released.' : "balanced lead, no lean" },
            { name: runningSport === 'softball' ? 'Pitch-release reads (with partner if possible)' : "Pickoff reads (with partner if possible)", dosage: "10 reps" },
            { name: "First-to-third / tag-up scenarios", dosage: "5 reps", executionKind: 'baserunning_scenarios' },
          ], ["hammers_today:baserunning"], { sport: runningSport, owned: ownedRunning }), { skill: 'baserunning', sport: runningSport, owned: new Set((proj as unknown as { equipmentList?: ReadonlyArray<string> }).equipmentList ?? []), injuryRegions, recoveryDay: recoverDay || !skillExecutionAllowed });
      return {
        modality,
        title: inSeason ? "Baserunning — game scenarios" : "Baserunning IQ",
        why: inSeason ? "Sharpen game-decision speed." : "Decision speed beats foot speed.",
        roadmapReason: inSeason ? "In-season — decision-speed scenarios." : "Off-season — base footwork + reads.",
        phase: inSeason ? "sharpen" : "build",
        steps: drillsToSteps(drills),
        drills,
        cues: ["Read the first move; trust it."],
        stopRules: ["Any leg pain — stop and switch to film only."],
        durationMin: inSeason ? 10 : 15,
        route: "/practice?module=baserunning",
        ctaLabel: "Open baserunning",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: "Hammer baserunning",
          activityType: "short_practice",
          icon: "zap",
          color: "#14b8a6",
          durationMinutes: inSeason ? 10 : 15,
          description: "Baserunning IQ + footwork.",
          checklist: drillsToChecklist(drills),
          source: "internal",
        },
      };
    }

    case "game_iq": {
      // Role/lens hint from athlete context (pitcher vs hitter vs two-way).
      const roleStr = (ctx.get<string>("role")?.value as string | null) ?? null;
      const isPitcher = roleStr === "pitcher" || roleStr === "two_way";
      const isHitter = roleStr === "hitter" || roleStr === "position" || roleStr === "two_way" || roleStr === null;
      const lensHint = isPitcher && !isHitter
        ? "pitching"
        : isHitter && !isPitcher
          ? "offense"
          : "all";
      const inSeason = seasonPhase === "in";
      const drills: DrillStep[] = [
        {
          name: "Daily IQ micro-reps",
          dosage: inSeason ? "2 due scenarios (~2 min)" : "3–4 due scenarios (~3 min)",
          cue: "Three B's — Ball, Bag, Backup. Read the situation BEFORE the pitch.",
          stopIf: "Mental fatigue — stop after current scenario, don't grind.",
        },
        {
          name: "One bonus rep on your weakest lens",
          dosage: "1 scenario",
          cue: lensHint === "pitching"
            ? "Pitcher PFP / hold-runner reads."
            : lensHint === "offense"
              ? "Baserunning decision / first-and-third reads."
              : "Whatever the system flags as weakest.",
        },
      ];
      const route = `/iq/review?lens=${lensHint}`;
      return {
        modality,
        title: inSeason ? "Game IQ — daily micro-reps" : "Game IQ — situational reps",
        why:
          "Decision speed wins games. SM-2 spaced repetition keeps every Ball/Bag/Backup situation fresh."
          + (goal ? ` ${goal}` : ""),
        roadmapReason: inSeason
          ? "In-season — short, high-frequency reps keep the mental side sharp without adding load."
          : "Off-season — build deep situational library while physical load is high.",
        phase: "skill",
        steps: drillsToSteps(drills),
        drills,
        cues: [
          "Picture the play before the pitch.",
          "Wrong answers are gold — they expose blind spots.",
        ],
        stopRules: [
          "If you're guessing 3+ in a row, stop — review the situation page instead.",
        ],
        durationMin: inSeason ? 3 : 5,
        route,
        ctaLabel: "Start reps",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: "Hammer — Game IQ micro-reps",
          activityType: "short_practice",
          icon: "brain",
          color: "#6366f1",
          durationMinutes: inSeason ? 3 : 5,
          description: "Daily Three B's situational reps (spaced-repetition).",
          checklist: drillsToChecklist(drills),
          source: "internal",
        },
      };
    }

    case "fueling": {
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      const shortHorizon = proj.goalHorizon === "short";
      const drills: DrillStep[] = inSeason
        ? [
            { name: "Pre-game meal", dosage: "complex carb + small protein, 90–120 min before first pitch", cue: "carbs forward today" },
            { name: "Intra-game", dosage: "water + electrolytes; carb gel if game runs > 90 min" },
            { name: "Post-game", dosage: "0.4 g/kg protein + carb within 45 min" },
          ]
        : offSeason
          ? [
              { name: "Pre-session", dosage: "complex carb + protein 60–90 min before" },
              { name: "Intra-session", dosage: "water + electrolytes if > 60 min" },
              { name: "Post-session", dosage: "0.3 g/kg protein + carb within 60 min" },
              { name: "Daily protein target", dosage: "hit target for body-comp goal", cue: "log it in Nutrition Hub" },
            ]
          : [
              { name: "Pre-session", dosage: "complex carb + small protein 60–90 min before" },
              { name: "Intra-session", dosage: "water + electrolytes if > 60 min" },
              { name: "Post-session", dosage: "0.3 g/kg protein + carb within 60 min" },
            ];
      return {
        modality,
        title: inSeason ? "Fueling — game-day carb-forward" : offSeason ? "Fueling — body-comp aware" : "Fueling",
        why: (inSeason ? "Carb-forward during competition; recover hard between games." : offSeason ? "Use the runway: dial composition before volume drops." : "Carbs before output. Protein and fluids after.") + (shortHorizon ? " Short horizon — execution > optimization." : ""),
        roadmapReason: inSeason ? "Game-day fueling priority." : offSeason ? "Off-season — body-comp focus available." : "Standard fueling.",
        phase: "skill",
        steps: drillsToSteps(drills),
        drills,
        cues: ["Carbs before output. Protein after."],
        stopRules: ["Cramping or lightheadedness — stop, hydrate with electrolytes."],
        durationMin: null,
        route: "/nutrition-hub",
        ctaLabel: "Open Nutrition Hub",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: "Hammer fueling",
          activityType: "meal",
          icon: "apple",
          color: "#10b981",
          durationMinutes: null,
          description: "Today's fueling targets.",
          checklist: drillsToChecklist(drills),
          source: "internal",
        },
      };
    }

    case "recovery": {
      const elevated =
        recoverDay || workloadHigh || seasonPhase === "in" || injuryRegions.length > 0;
      const drills = recoveryDrills(elevated);
      return {
        modality,
        title: recoverDay
          ? "Recovery — priority"
          : workloadHigh
            ? "Recovery — workload-elevated"
            : injuryRegions.length > 0
              ? "Recovery — injury-aware"
              : seasonPhase === "in"
                ? "Recovery — in-season"
                : "Recovery",
        why: (() => {
          const base = recoverDay
            ? "Readiness is low. Recovery outranks training today."
            : workloadHigh
              ? "Workload is elevated — recovery is today's priority."
              : injuryRegions.length > 0
                ? `Injury-aware recovery (${injuryRegions.join(", ")}).`
                : seasonPhase === "in"
                  ? "In-season — parasympathetic downshift between games."
                  : "Lock in sleep, mobility, and parasympathetic downshift.";
          const hpi = getSeasonHPI(seasonPhase);
          return `${base} ${hpi.qiDirective} Breath primer: ${hpi.breathPrimer}`;
        })(),
        roadmapReason: `${recoverDay ? "Readiness below threshold — recovery first." : workloadHigh ? "Recent 7-day workload elevated." : "Default recovery block."} (${getSeasonHPI(seasonPhase).element} phase — ${getSeasonHPI(seasonPhase).yinYangEmphasis})`,
        phase: "recover",
        steps: drillsToSteps(drills),
        drills,
        cues: ["Recovery is a skill. Do it like a workout."],
        stopRules: ["Sharp pain during mobility — back off."],
        durationMin: elevated ? 25 : 15,
        route: "/bounce-back-bay",
        ctaLabel: "Open recovery",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: "Hammer recovery",
          activityType: "recovery",
          icon: "heart",
          color: "#f43f5e",
          durationMinutes: elevated ? 25 : 15,
          description: "Recovery block.",
          checklist: drillsToChecklist(drills),
          source: "internal",
        },
      };
    }
  }
}

import {
  NORMAL_SIGNAL,
  type ScheduleSignal,
  type SchedulePosture,
} from "@/lib/hammer/prescription/scheduleContext";

export interface HammerDailyPlanResult {
  readonly sanity?: { ok: boolean; issues: string[] };
  readonly practiceLoad?: ReadonlyArray<CategoryPracticeLoad>;
  readonly blocks: ReadonlyArray<PrescribedBlock>;
  readonly seasonPhase: string | null;
  readonly missingnessCount: number;
  readonly speedFocus: SpeedFocusDecision;
  readonly schedulePosture: SchedulePosture;
  readonly scheduleSignal: ScheduleSignal;
  readonly sideBias: SideBiasForPlan | null;
  /** Rolling 7d game-performance bias tags applied to today's ordering. */
  readonly gpBiasTags: ReadonlyArray<string>;
  /** Weekly microcycle resolved for today — powers the roadmap strip UI. */
  readonly microcycle: ResolvedMicrocycle;
  /** 7-day roadmap projection for the WeeklyRoadmapStrip. */
  readonly weeklyRoadmap: ReadonlyArray<RoadmapDay>;
  /** Selected weekly template — surfaced so the UI can label the week. */
  readonly weeklyTemplate: WeeklyTemplate;
  /**
   * Elite roadmap position — rung on the long build toward MLB/AUSL loads
   * and the current season quarter mesocycle. Interpretive-only; the plan
   * never authors organism truth from this.
   */
  readonly roadmap: {
    readonly rung: RoadmapRungDescriptor;
    readonly rungRationale: string;
    readonly quarter: QuarterDescriptor;
    readonly eliteTarget: EliteTarget;
    readonly throwingLadder: ThrowingLadderPrescription | null;
    /**
     * Skill-frequency ladder — days/week per skill modality the athlete is
     * building toward, with earned days from the last 7d. "Stack days
     * first, then intensity" — the plan progresses days before volume.
     */
    readonly skillLadder: ReadonlyArray<SkillLadderRow>;
  };
}


/**
 * RFL-034 — minor + parent-concern post-processor (unchanged).
 */
const MINOR_CONCERN_AFFECTED: Record<string, ReadonlyArray<ModalityKey>> = {
  arm_load: ["throwing"],
  speed_max: ["speed"],
  heavy_lift: ["strength"],
  jump_load: ["speed", "strength"],
  contact: ["baserunning", "defense"],
};

function applyMinorParentSupremacy(
  blocks: ReadonlyArray<PrescribedBlock>,
  proj: AthleteContextProjection,
): ReadonlyArray<PrescribedBlock> {
  if (proj.isMinor !== true || proj.parentConcerns.length === 0) return blocks;
  const affected = new Map<ModalityKey, string[]>();
  for (const concern of proj.parentConcerns) {
    for (const m of MINOR_CONCERN_AFFECTED[concern] ?? []) {
      const list = affected.get(m) ?? [];
      list.push(concern);
      affected.set(m, list);
    }
  }
  if (affected.size === 0) return blocks;
  return blocks.map((b) => {
    const concerns = affected.get(b.modality);
    if (!concerns) return b;
    const note = `Parent supremacy: deferred pending guardian review (concerns: ${concerns.join(", ")}).`;
    return {
      ...b,
      status: "awaiting-input" as BlockStatus,
      why: `${b.why} ${note}`,
      missing: [...b.missing, ...concerns.map((c) => `parent-concern:${c}`)],
    };
  });
}

/**
 * Reorder blocks so the athlete's highest-ranked skill goals lead the day,
 * while utility blocks (warmup first, fueling/recovery last) stay anchored.
 * Also annotates each skill-block's `roadmapReason` and `why` with the
 * ranked goal + chosen intent so the lineage is visible in the UI.
 *
 * Missingness-permissive: when no ranking exists, returns blocks as-is.
 */
function applyCategoryGoalOrdering(
  blocks: ReadonlyArray<PrescribedBlock>,
  proj: AthleteContextProjection,
): ReadonlyArray<PrescribedBlock> {
  const goals = proj.categoryGoals;
  if (!goals) return blocks;

  const headOrder: ReadonlyArray<ModalityKey> = ["warmup"];
  const tailOrder: ReadonlyArray<ModalityKey> = ["fueling", "recovery"];
  const isAnchored = (m: ModalityKey) => headOrder.includes(m) || tailOrder.includes(m);

  const annotated = blocks.map((b) => {
    const cat = modalityToCategory(b.modality);
    if (!cat) return b;
    const rank = rankFor(goals, cat);
    if (!rank) return b;
    const intentId = intentFor(goals, cat);
    const intentLabel = intentId
      ? CATEGORY_INTENTS[cat].find((p) => p.id === intentId)?.label ?? null
      : null;
    const tag = intentLabel
      ? `Goal #${rank} (${CATEGORY_LABELS[cat]} → ${intentLabel}).`
      : `Goal #${rank} (${CATEGORY_LABELS[cat]}).`;
    return {
      ...b,
      why: `${tag} ${b.why}`,
      roadmapReason: `${tag} ${b.roadmapReason}`,
    } as PrescribedBlock;
  });

  const middle = annotated.filter((b) => !isAnchored(b.modality));
  const head = headOrder
    .map((m) => annotated.find((b) => b.modality === m))
    .filter((b): b is PrescribedBlock => !!b);
  const tail = tailOrder
    .map((m) => annotated.find((b) => b.modality === m))
    .filter((b): b is PrescribedBlock => !!b);

  middle.sort((a, b) => {
    const ca = modalityToCategory(a.modality);
    const cb = modalityToCategory(b.modality);
    const ra = ca ? rankFor(goals, ca) ?? 99 : 99;
    const rb = cb ? rankFor(goals, cb) ?? 99 : 99;
    return ra - rb;
  });

  return [...head, ...middle, ...tail];
}

/**
 * Schedule modulator — reshape modality blocks around scheduled
 * games / tournaments / camps / travel / team practices.
 *
 * Pure: never authors organism truth; only rewrites the prescription
 * envelope (status / drills / durationMin / why / roadmapReason).
 */
const ALL_SKILL_MODALITIES: ReadonlyArray<ModalityKey> = [
  "speed",
  "strength",
  "hitting",
  "throwing",
  "defense",
  "baserunning",
];

function suppressBlock(
  b: PrescribedBlock,
  rationale: string,
  opts?: { keepActivation?: boolean },
): PrescribedBlock {
  if (b.status === 'awaiting-input') return b;
  const keep = opts?.keepActivation === true;
  return {
    ...b,
    status: "suppressed" as BlockStatus,
    drills: keep ? b.drills.slice(0, 1) : [],
    steps: keep ? b.steps.slice(0, 1) : [],
    durationMin: keep ? Math.min(b.durationMin ?? 0, 10) : 0,
    why: `${rationale} ${b.why}`,
    roadmapReason: rationale,
    gamePlanTemplate: keep ? b.gamePlanTemplate : null,
  };
}

function annotate(b: PrescribedBlock, rationale: string): PrescribedBlock {
  return {
    ...b,
    why: `${rationale} ${b.why}`,
    roadmapReason: `${rationale} ${b.roadmapReason}`,
  };
}

const PREGAME_PRIMER_FALLBACK: DrillStep[] = [
  { name: "Ready position + first-step reads", dosage: "8 reps, easy", cue: "small hop as the ball is released" },
  { name: "Short-hop glove work", dosage: "10 reps, easy", cue: "soft hands out front" },
  { name: "Glove-to-hand exchange", dosage: "10 reps", cue: "four seams, hands to the middle of your chest" },
];

/**
 * Game day defense: a short, position-specific pregame primer instead of a
 * disappearing card. Full volume stays off so the athlete saves their legs
 * for the game, and the card says exactly that.
 */
function gameDayDefensePrimer(
  b: PrescribedBlock,
  original: PrescribedBlock | undefined,
  tournament: boolean,
): PrescribedBlock {
  const src = b.drills.length > 0 ? b : original;
  const picked = (src?.drills ?? []).slice(0, tournament ? 2 : 3);
  const drills: DrillStep[] = (picked.length > 0 ? picked : PREGAME_PRIMER_FALLBACK.slice(0, tournament ? 2 : 3)).map(
    (d) => ({ ...d, dosage: `${d.dosage} — easy, pregame only` }),
  );
  const baseTitle = (original?.title ?? b.title).replace(/ — .*$/, "");
  return {
    ...b,
    title: `${baseTitle} — pregame primer`,
    why: tournament
      ? "You're playing multiple games today. This wakes up your feet and hands and stops there — the rest is saved for the games."
      : "You're playing today. This wakes up your feet, hands, and exchange, then stops — full defense work is off so you save your legs for the game.",
    roadmapReason: tournament
      ? "Tournament day — primer only, legs saved for the games."
      : "Game day — primer only, legs saved for the game.",
    assumption: undefined,
    phase: "maintain",
    steps: drillsToSteps(drills),
    drills,
    cues: original?.cues ?? b.cues,
    stopRules: original?.stopRules ?? b.stopRules,
    durationMin: tournament ? 6 : 10,
    route: original?.route ?? "/practice?module=defense",
    ctaLabel: "Open defense",
    status: "ready",
    gameDayPrimer: true,
    gamePlanTemplate: null,
  };
}

export function blockKey(b: PrescribedBlock): string {
  return `${b.modality}:${b.side ?? ""}`;
}

/** Bunting days: non-rest, non-game days with full hitting first; when games take those, light
 * hitting days fill up to the weekly bunting minimum (attempts still come out of that day's swings). */
export function buntingWeekdays(roadmap: ReadonlyArray<{dow:number;restDay:boolean;modalities:ReadonlyArray<{key:string;intensity:string}>}>, gameDows: readonly number[], wanted: number): number[] {
  const open = roadmap.filter(d => !d.restDay && !gameDows.includes(d.dow));
  const full = open.filter(d => d.modalities.some(m => m.key === 'hitting' && m.intensity !== 'activation')).map(d => d.dow);
  if (full.length >= wanted) return full;
  const light = open.filter(d => !full.includes(d.dow) && d.modalities.some(m => m.key === 'hitting')).map(d => d.dow);
  const chosen = [...full, ...light.slice(0, wanted - full.length)];
  const pregame = roadmap.filter(d => !d.restDay && gameDows.includes(d.dow) && d.modalities.some(m => m.key === 'hitting')).map(d => d.dow);
  return [...chosen, ...pregame.slice(0, Math.max(0, wanted - chosen.length))];
}

/** Game stations reduce existing safe work; they never restore injury/recovery-suppressed work. */
function gameSkillStation(b: PrescribedBlock, original: PrescribedBlock | undefined): PrescribedBlock {
  const source = b.status === 'ready' ? b : b.status === 'off-day' && original?.status === 'ready' ? original : undefined;
  if (!source?.drills.length) return b;
  const skill = source.drills.find(d => d.stage === 'drills' && /^\d+ swings/.test(d.dosage));
  if (b.modality === 'hitting' && !skill) return b;
  const drills = b.modality === 'hitting' && skill
    ? [{...skill, dosage: `${Math.min(15, Number(/^(\d+)/.exec(skill.dosage)?.[1] ?? 0))} swings`, cue: `${skill.cue} Game-speed decisions, low volume; stop before fatigue.`}]
    : source.drills.slice(0, 1).map(d => ({...d, dosage: '1 rep — easy pre-game rehearsal; no extra throws'}));
  return {...source, drills, steps: drillsToSteps(drills), status:'ready', durationMin:3, phase:'maintain', gamePlanTemplate:null,
    title:`${b.modality === 'hitting' ? 'Hitting' : 'Baserunning'} — short pre-game station`,
    why:'A short station keeps your skill work in a busy game week. Save your energy for the game.',
    roadmapReason:'Game week — short, low-volume skill station; existing safety stops still apply.'};
}

/** The game itself as a card the player logs after playing. Light pre-game work and
 * post-game recovery stay in their own cards; this adds no training dose. */
export function gameDayCard(tournament: boolean): PrescribedBlock {
  const title = tournament ? "Tournament — play your games" : "Game day — play and log your game";
  return {
    modality: "game", title,
    why: "You have a game on your schedule today. The game is your main work, so the other cards are light.",
    roadmapReason: "Game on your schedule", phase: "maintain",
    steps: ["Do the light warm-up and pre-game cards first.", "Play your game.", "After the game, log it, then do the recovery card."],
    drills: [], cues: ["Play loose — today is about competing, not training."], stopRules: ["If anything hurts, stop and tell your coach or a parent."],
    durationMin: null, route: "/games", ctaLabel: "Log this game", status: "ready",
    missing: [], missingContextKeys: [], gamePlanTemplate: null,
  } as PrescribedBlock;
}

function applyScheduleModulation(
  blocks: ReadonlyArray<PrescribedBlock>,
  signal: ScheduleSignal,
  originals?: ReadonlyMap<string, PrescribedBlock>,
  defenseFullOverride = false,
): ReadonlyArray<PrescribedBlock> {
  if (signal.postureToday === "normal") return blocks;

  const rationale = signal.rationale;

  switch (signal.postureToday) {
    case "game":
    case "tournament": {
      return blocks.map((b) => {
        switch (b.modality) {
          case "warmup":
            return annotate(b, rationale);
          case "fueling":
          case "recovery":
            return annotate(b, rationale);
          case "throwing":
            // Allow a brief activation set on game day; full tournament-day suppression.
            return signal.postureToday === "tournament"
              ? suppressBlock(b, rationale)
              : suppressBlock(b, rationale, { keepActivation: true });
          case "hitting":
            return gameSkillStation(b, originals?.get(blockKey(b)));
          case "defense": {
            if (b.status === 'awaiting-input') return b;
            const original = originals?.get(blockKey(b));
            if (defenseFullOverride) {
              return annotate(
                original && original.drills.length > 0 ? original : b,
                "You chose to run full defense anyway on a game day.",
              );
            }
            return gameDayDefensePrimer(b, original, signal.postureToday === "tournament");
          }
          case "speed":
          case "strength":
            return suppressBlock(b, rationale);
          case "baserunning":
            return gameSkillStation(b, originals?.get(blockKey(b)));
          default:
            return b;
        }
      });
    }
    case "camp": {
      return blocks.map((b) =>
        b.modality === "warmup" || b.modality === "fueling" || b.modality === "recovery"
          ? annotate(b, rationale)
          : suppressBlock(b, rationale),
      );
    }
    case "travel": {
      return blocks.map((b) => {
        if (b.modality === "warmup" || b.modality === "fueling" || b.modality === "recovery") {
          return annotate(b, rationale);
        }
        if (b.modality === "speed" || b.modality === "strength") {
          return suppressBlock(b, rationale);
        }
        return suppressBlock(b, rationale, { keepActivation: true });
      });
    }
    case "team_practice": {
      return blocks.map((b) => {
        if (b.modality === "hitting" || b.modality === "throwing" || b.modality === "defense" || b.modality === "baserunning") {
          return suppressBlock(b, rationale, { keepActivation: true });
        }
        if (b.modality === "strength") {
          return suppressBlock(b, rationale);
        }
        return annotate(b, rationale);
      });
    }
    case "taper": {
      // Game/tournament tomorrow — compress volume, keep skill activations sharp.
      return blocks.map((b) => {
        if (b.modality === "strength") {
          return suppressBlock(b, rationale, { keepActivation: true });
        }
        if (b.modality === "speed") {
          return annotate(
            { ...b, durationMin: Math.min(b.durationMin ?? 0, 15) },
            rationale,
          );
        }
        return annotate(b, rationale);
      });
    }
    default:
      return blocks;
  }
}

/**
 * Side-bias rider: when a switch/ambi athlete has a trusted L/R asymmetry
 * (computed by SideSplitsSection on the Progress dashboard and cached to
 * localStorage), append a single extra activation step to the relevant
 * skill block. Pure: caller passes the already-resolved bias result so
 * this stays free of I/O and replay-safe under test.
 */
export interface SideBiasForPlan {
  readonly hit?: { weakerSide: "L" | "R"; absPct: number; extraSetMultiplier: number; note: string } | null;
  readonly throw?: { weakerSide: "L" | "R"; absPct: number; extraSetMultiplier: number; note: string } | null;
}

function applySideBias(
  blocks: ReadonlyArray<PrescribedBlock>,
  bias: SideBiasForPlan | null,
): ReadonlyArray<PrescribedBlock> {
  if (!bias) return blocks;
  return blocks.map((b) => {
    const r = b.modality === "hitting" ? bias.hit : b.modality === "throwing" ? bias.throw : null;
    if (!r || b.status === "suppressed") return b;
    const extraStep = `Extra activation set on your ${r.weakerSide === "L" ? "Left" : "Right"} side — close the L/R asymmetry first.`;
    return {
      ...b,
      steps: [...b.steps, extraStep],
      cues: [...b.cues, r.note],
    };
  });
}

/**
 * GpSignalForPlan — minimal rolling 7d game-performance projection consumed
 * by the planner. Mirrors `GpSignal` (src/hooks/useGpSignal.ts) but kept as
 * an inline interface so dailyPlan.ts has zero React-hook coupling and stays
 * pure / replay-safe under test.
 *
 * Interpretive only — never authors organism truth, never removes blocks,
 * never overrides schedule suppression or injury ceilings.
 */
export interface GpSignalForPlan {
  readonly chasePct: number | null;       // 0–100 integer
  readonly whiffPct: number | null;       // 0–100 integer
  readonly miscueClusters: ReadonlyArray<{ position: string; errors: number }>;
  readonly atBats: number;
  readonly pitchesSeen: number;
  readonly defensivePlays: number;
}

/**
 * Bias rider: re-order ready blocks so modalities the rolling 7d signal
 * flags get nudged to the front, and append a one-line rationale cue.
 * Suppressed blocks are NEVER unsuppressed; ordering of suppressed tail
 * is preserved; no block is removed; no volume ceiling is exceeded
 * (we add cues, not extra drill sets).
 */
/**
 * Games → drill (link b). Only explicit, owner-reviewable pattern→drill pairs;
 * a pattern with no pair keeps cue + Because only (never invent a drill).
 * Chase → Two-Ball Recognition (catalog: "late decisions and chasing out of the zone").
 */
const GAME_PATTERN_DRILL = {
  chase: { name: "Two-Ball Recognition", dosage: "3 x 10", cue: "See it early, decide once", equipment: ["net"] },
} as const;

function applyGpSignalBias(
  blocks: ReadonlyArray<PrescribedBlock>,
  gp: GpSignalForPlan | null,
  ownedEquipment: ReadonlySet<string> = new Set(),
): { blocks: ReadonlyArray<PrescribedBlock>; tags: string[] } {
  if (!gp) return { blocks, tags: [] };
  // Confidence floor: skip entirely if the window is too thin to act on.
  const enoughHittingSignal = gp.atBats >= 6 || gp.pitchesSeen >= 20;
  const enoughDefenseSignal = gp.defensivePlays >= 6;
  const tags: string[] = [];
  const biased = new Set<ModalityKey>();

  const annotated = blocks.map((b) => {
    if (b.status === "suppressed") return b;
    const extraCues: string[] = [];
    const because: string[] = [];
    // Sample-size honesty: a real pattern on a small sample is labeled an early read.
    const hitRead = gp.atBats < 20 ? " (early read)" : "";
    const defRead = gp.defensivePlays < 15 ? " (early read)" : "";
    if (
      b.modality === "game_iq" &&
      enoughHittingSignal &&
      gp.chasePct !== null &&
      gp.chasePct >= 32
    ) {
      extraCues.push(`Last 7d chase ${gp.chasePct}% — bias pitch-recognition reps today.`);
      because.push(`Because in your last 7 days of games you chased ${gp.chasePct}% of pitches out of the zone over ${gp.atBats} at-bats${hitRead}.`);
      biased.add("game_iq");
      tags.push(`gp:chase:${gp.chasePct}`);
    }
    if (
      b.modality === "hitting" &&
      enoughHittingSignal &&
      gp.whiffPct !== null &&
      gp.whiffPct >= 28
    ) {
      extraCues.push(`Last 7d whiff ${gp.whiffPct}% on swings — bat-path / contact emphasis.`);
      because.push(`Because in your last 7 days of games you missed on ${gp.whiffPct}% of your swings over ${gp.atBats} at-bats${hitRead}.`);
      biased.add("hitting");
      tags.push(`gp:whiff:${gp.whiffPct}`);
    }
    if (
      b.modality === "defense" &&
      enoughDefenseSignal &&
      gp.miscueClusters.length > 0
    ) {
      const lead = gp.miscueClusters[0];
      extraCues.push(`${lead.errors} errors at ${lead.position} in last 7d — first-step / glove-side reps.`);
      because.push(`Because you made ${lead.errors} errors at ${lead.position} in your last 7 days of games (${gp.defensivePlays} plays)${defRead}.`);
      biased.add("defense");
      tags.push(`gp:def:${lead.position}`);
    }
    let drills = b.drills;
    if (
      b.modality === "hitting" && b.status === "ready" && enoughHittingSignal &&
      gp.chasePct !== null && gp.chasePct >= 32
    ) {
      const pick = GAME_PATTERN_DRILL.chase;
      const hasGear = pick.equipment.every((e) => ownedEquipment.has(e));
      const idx = drills.findIndex((d) => d.prescriptionOrigin !== "owner" && (d.stage === undefined || d.stage === "drills"));
      if (hasGear && idx >= 0 && !drills.some((d) => d.name === pick.name)) {
        drills = drills.map((d, i) => (i === idx ? { name: pick.name, dosage: pick.dosage, cue: pick.cue, equipmentNote: pick.equipment.join(", "), stage: 'drills' as const } : d));
        because.push(`Because in your last 7 days of games you chased ${gp.chasePct}% of pitches out of the zone over ${gp.atBats} at-bats${hitRead}. "${pick.name}" works on it today.`);
        biased.add("hitting");
        tags.push(`gp:chase_drill:${gp.chasePct}`);
      }
    }
    if (extraCues.length === 0 && drills === b.drills) return b;
    return { ...b, drills, cues: [...b.cues, ...extraCues], because: [...(b.because ?? []), ...because] };
  });

  if (biased.size === 0) return { blocks: annotated, tags };

  // Stable re-order: biased ready blocks first, other ready blocks next,
  // suppressed blocks last (preserving their relative order).
  const ready = annotated.filter((b) => b.status !== "suppressed");
  const suppressed = annotated.filter((b) => b.status === "suppressed");
  const biasedReady = ready.filter((b) => biased.has(b.modality));
  const otherReady = ready.filter((b) => !biased.has(b.modality));
  return { blocks: [...biasedReady, ...otherReady, ...suppressed], tags };
}
/**
 * Laterality splitter — duplicates hitting for switch hitters and throwing
 * for ambidextrous throwers into two side-tagged blocks so each side has
 * its own dosage envelope, DOM anchor, and completion checklist.
 *
 * - Switch hitter (`bats_hand === "S"`): the hitting block is emitted twice
 *   at FULL volume for each side. This is intentional — half-volume "share"
 *   splits under-trained one side and read as unclear to athletes/parents.
 * - Ambidextrous thrower (`throws_hand === "S"`): the throwing block is
 *   emitted twice. The non-dominant side keeps neural prep and light
 *   catch-play only — max-intent work (pulldowns, long-toss) stays on the
 *   dominant arm for arm-health safety.
 * - Suppressed blocks are never split. Awaiting-input hitting/throwing blocks
 *   ARE split so switch/ambi athletes can answer/log each side independently
 *   instead of seeing one misleading primary-side card.
 * - Missingness-permissive: if we can't identify bats/throws, we return
 *   blocks unchanged.
 */
function splitLateralityBlocks(
  blocks: ReadonlyArray<PrescribedBlock>,
  ctx: HammerAthleteContext,
  identityOverride?: { isSwitchHitter?: boolean; isAmbidextrousThrower?: boolean },
): ReadonlyArray<PrescribedBlock> {
  const bats = (ctx.get<string>("bats_hand")?.value as string | null) ?? null;
  const throws = (ctx.get<string>("throws_hand")?.value as string | null) ?? null;
  const isSwitchHitter = identityOverride?.isSwitchHitter ?? (bats === "S");
  const isAmbi = identityOverride?.isAmbidextrousThrower ?? (throws === "S");
  if (!isSwitchHitter && !isAmbi) return blocks;


  const NON_DOM_KEEP = /(band|prep|scap|cuff|warm|activation|neural|catch-play|light)/i;

  const cloneSide = (
    b: PrescribedBlock,
    side: "L" | "R",
    sideLabel: string,
    opts?: { drillsFilter?: (d: DrillStep) => boolean; dosageScale?: number; extraCue?: string },
  ): PrescribedBlock => {
    const filter = opts?.drillsFilter ?? (() => true);
    const scale = opts?.dosageScale ?? 1;
    const scaleDosage = (dosage: string): string => {
      if (scale === 1) return dosage;
      return dosage.replace(/\b(\d+)\b/, (_m, n) => {
        const scaled = Math.max(1, Math.round(parseInt(n, 10) * scale));
        return `${scaled}`;
      });
    };
    const drills = b.drills.filter(filter).map((d) =>
      scale === 1 ? d : { ...d, dosage: scaleDosage(d.dosage) },
    );
    return {
      ...b,
      side,
      title: `${b.title} — ${sideLabel}`,
      drills,
      steps: drillsToSteps(drills),
      cues: opts?.extraCue ? [opts.extraCue, ...b.cues] : b.cues,
      gamePlanTemplate: b.gamePlanTemplate
        ? {
            ...b.gamePlanTemplate,
            title: `${b.gamePlanTemplate.title} — ${sideLabel}`,
            checklist: drillsToChecklist(drills),
            source: `${b.gamePlanTemplate.source}.${side.toLowerCase()}`,
          }
        : null,
    };
  };

  const out: PrescribedBlock[] = [];
  for (const b of blocks) {
    if (b.status === "suppressed") {
      out.push(b);
      continue;
    }
    if (isSwitchHitter && b.modality === "hitting") {
      out.push(
        cloneSide(b, "L", "Left-handed", {
          extraCue: "Switch hitter — left-handed reps. Full volume; treat this side like your only side today.",
        }),
        cloneSide(b, "R", "Right-handed", {
          extraCue: "Switch hitter — right-handed reps. Full volume; treat this side like your only side today.",
        }),
      );
      continue;
    }
    if (isAmbi && b.modality === "throwing" && !b.drills.some(d=>d.armEvent)) {
      out.push(
        cloneSide(b, "R", "Dominant arm", {
          extraCue: "Ambidextrous thrower — dominant-arm workload. Full EASS envelope.",
        }),
        cloneSide(b, "L", "Non-dominant arm", {
          drillsFilter: (d) => NON_DOM_KEEP.test(d.name),
          dosageScale: 0.5,
          extraCue: "Ambidextrous thrower — non-dominant arm keeps neural prep + light catch only. Never chase distance or intent here.",
        }),
      );
      continue;
    }
    out.push(b);
  }
  return out;
}


/**
 * Weekly Microcycle post-processor — turns modalities that are NOT
 * scheduled today into `off-day` cards (with "Next: Thu" rationale),
 * trims volume on activation/secondary days, and appends the microcycle
 * position to every block's `roadmapReason` so the daily plan finally
 * reads like a real program instead of a menu.
 *
 * Rules:
 *   - Never promotes a block: `awaiting-input` and `suppressed` blocks
 *     pass through untouched — injury, parent supremacy, and schedule
 *     posture always outrank the microcycle.
 *   - Anchor modalities (warmup / fueling / recovery / game_iq) render
 *     every day; the microcycle only annotates them.
 *   - Off-day blocks keep the athlete-visible next-return day so the
 *     roadmap is legible in the card itself.
 */
function applyWeeklyMicrocycle(
  blocks: ReadonlyArray<PrescribedBlock>,
  resolved: ResolvedMicrocycle,
): ReadonlyArray<PrescribedBlock> {
  return blocks.map((b) => {
    const decision: ModalityDayDecision | undefined = resolved.perModality[b.modality];
    if (!decision) return b;
    if (b.status === "awaiting-input" || b.status === "suppressed") {
      // Don't fight higher-authority states — just tag the roadmapReason.
      return {
        ...b,
        roadmapReason: `${b.roadmapReason} · ${decision.microcycleLabel}`,
      };
    }

    // Off-day rewrite for schedulable modalities.
    if (!decision.scheduled && SCHEDULABLE_MODALITIES.includes(b.modality)) {
      const nextLine =
        decision.nextScheduledLabel !== null
          ? `Returns ${decision.nextScheduledLabel}.`
          : "Not scheduled again this week.";
      return {
        ...b,
        status: "off-day" as BlockStatus,
        title: `${labelForModality(b.modality)} — off today · ${nextLine}`,
        why: `${decision.reason} Today's slot is intentionally empty so the next session hits fresh.`,
        roadmapReason: decision.reason,
        phase: "recover",
        // Keep at most one low-cost primer (mobility / film / breath).
        drills: [],
        steps: [
          decision.nextScheduledLabel
            ? `Optional 5-min mobility or film study — full ${b.modality} returns ${decision.nextScheduledLabel}.`
            : "Optional 5-min mobility or film study.",
        ],
        cues: [],
        stopRules: [],
        durationMin: 0,
        gamePlanTemplate: null,
      };
    }

    // Scheduled day: annotate + optionally scale volume for activation/secondary.
    const scale =
      decision.intensity === "activation" ? 0.3 : decision.intensity === "secondary" ? 0.6 : 1;
    const scaledDrills =
      scale === 1
        ? b.drills
        : b.drills.map((d) => ({ ...d, dosage: scaleDosageLabel(d.dosage, scale) }));
    const scaledDuration =
      scale === 1 || b.durationMin === null
        ? b.durationMin
        : Math.max(10, Math.round(b.durationMin * scale));
    return {
      ...b,
      drills: scaledDrills,
      steps: scale === 1 ? b.steps : drillsToSteps(scaledDrills),
      durationMin: scaledDuration,
      roadmapReason: `${decision.microcycleLabel} · ${b.roadmapReason}`,
    };
  });
}

function labelForModality(m: ModalityKey): string {
  switch (m) {
    case "warmup": return "Warm-up";
    case "speed": return "Speed";
    case "strength": return "Strength";
    case "hitting": return "Hitting";
    case "throwing": return "Throwing";
    case "pitching": return "Pitching";
    case "defense": return "Defense";
    case "baserunning": return "Baserunning";
    case "game_iq": return "Game IQ";
    case "fueling": return "Fueling";
    case "recovery": return "Recovery";
  }
}

/**
 * ALWAYS-VISIBLE LAW (defense).
 *
 * Defense must render on every day type: training day, game day (pregame
 * primer), and off day. On an off day it says plainly that it is off and why,
 * and stays overridable so the athlete can opt into a short light block.
 */
function applyDefenseAlwaysVisible(
  blocks: ReadonlyArray<PrescribedBlock>,
  originals: ReadonlyMap<string, PrescribedBlock>,
  defenseFullOverride: boolean,
): ReadonlyArray<PrescribedBlock> {
  return blocks.map((b) => {
    if (b.modality !== "defense") return b;
    if (b.status === 'awaiting-input') return b;
    if (b.gameDayPrimer) return b;
    const original = originals.get(blockKey(b));
    const restingToday = b.status === "off-day" || b.status === "suppressed" || b.drills.length === 0;
    if (!restingToday) return b;

    if (defenseFullOverride) {
      const src = original && original.drills.length > 0 ? original : b;
      const drills = src.drills.slice(0, 3).map((d) => ({
        ...d,
        dosage: `${d.dosage} — light, your call`,
      }));
      return {
        ...b,
        status: "ready",
        title: "Defense — light block (your call)",
        why: "You asked for defense on a day it was scheduled off. This is kept short and light so it does not cost you tomorrow.",
        roadmapReason: "Athlete override — light defense on a rest day.",
        phase: "maintain",
        drills,
        steps: drillsToSteps(drills),
        durationMin: 10,
        assumption: undefined,
        route: "/practice?module=defense",
        ctaLabel: "Open defense",
        offDayOverridable: true,
        gamePlanTemplate: null,
      };
    }

    return {
      ...b,
      status: "off-day",
      title: b.title.includes("off today") ? b.title : "Defense — off today",
      why:
        b.status === "suppressed" && b.why
          ? b.why
          : "Defense is off today on purpose so your legs, hands, and arm come back fresh for the next session.",
      steps:
        b.steps.length > 0
          ? b.steps
          : ["Optional: 5 minutes of glove work or film study if you want to touch it."],
      offDayOverridable: true,
    };
  });
}

/**
 * NO-BLANK-CARD LAW. Structural backstop: every block leaves the generator
 * with something an athlete can read, whatever the day type or how sparse
 * their context is. Never promotes status, never invents prescribed work —
 * it only guarantees the card says something.
 */
function ensureRenderable(
  blocks: ReadonlyArray<PrescribedBlock>,
): ReadonlyArray<PrescribedBlock> {
  return blocks.map((b) => {
    if (b.status === 'awaiting-input') return b;
    const hasBody = b.drills.length > 0 || b.steps.length > 0;
    if (hasBody && b.title.trim() !== "" && b.why.trim() !== "") return b;
    const label = labelForModality(b.modality);
    return {
      ...b,
      title: b.title.trim() === "" ? `${label} — nothing scheduled today` : b.title,
      why:
        b.why.trim() === ""
          ? `${label} is not scheduled today. Hammer will bring it back when it fits the week.`
          : b.why,
      steps: hasBody
        ? b.steps
        : [`${label} is off today — nothing to do here. Ask Hammer if you want work anyway.`],
    };
  });
}


/**
 * Very light dosage scaler: multiplies the leading integer of "N x M …"
 * dosage strings by `scale`, floor 1.  If we can't parse the string we
 * return it untouched — never fabricate.
 */
function scaleDosageLabel(dosage: string, scale: number): string {
  const m = /^(\d+)\s*(?:x|×)\s*(\d+)/i.exec(dosage);
  if (!m) return dosage;
  // One set per zone: sets are spatial, so lighter days scale reps, never zones.
  if (/one set per zone/i.test(dosage)) {
    const reps = Math.max(1, Math.round(parseInt(m[2], 10) * scale));
    return dosage.replace(/^(\d+\s*(?:x|×)\s*)(\d+)/i, `$1${reps}`);
  }
  const sets = Math.max(1, Math.round(parseInt(m[1], 10) * scale));
  return dosage.replace(/^(\d+)/, String(sets));
}


export interface RoadmapInputs {
  readonly testPreferences?: import('@/lib/intelligence/testSettings').TestPlanPreferences;
  readonly physio?: PhysioMapping;
  readonly masteryFocus?:MasteryPlanFocus;
  /** Current server's whole-day rest verdict; never inferred from lift spacing alone. */
  readonly fullRestDay?: boolean;
  readonly practiceRecords?: ReadonlyArray<PracticeLoadRecord>;
  readonly pitcherOutings?: OutingFacts | null;
  readonly recentCompletions?: RecentCompletions;
  readonly phaseStartedAt?: string | null;
  /** Canonical phase from resolveSeasonPhase (short form: off/pre/in/post). */
  readonly resolvedSeasonPhase?: "off" | "pre" | "in" | "post" | null;
  /** Provenance of that phase; 'default' means no real season signal. */
  readonly seasonPhaseSource?: "date_window" | "stored" | "manual" | "default" | null;
  /** Position the athlete says they are actually working today. */
  readonly positionOverride?: string | null;
  /** Athlete tapped "run full defense anyway" on a game day. */
  readonly defenseFullOverride?: boolean;
  /** Current subscription modules; an explicit empty list permits no purchased skill boost. */
  readonly subscriptionModules?: readonly string[];
  readonly alwaysMissingGear?: readonly string[];
  readonly armHistory?: PlanningArmHistory;
  readonly bunting?: {gameWeekdays?:readonly number[];evidence:BuntingEvidence;catalog:readonly BuntCatalogItem[];age:number|null;userId?:string;phase:string;traits?:Pick<BuntingFacts,'speedy'|'lacksPower'|'leftPower'|'powerGoal'|'lowAverage'>};
}

/** Perceived readiness (check-in score 0–1). Missing → normal, never "low". */
export function planReadinessBand(ctx: { get<T>(k: string): { value: T } | null | undefined }): "low" | "normal" | "high" {
  const r = ctx.get<unknown>("readiness")?.value as unknown;
  const score = typeof r === "number" ? r : typeof (r as { score?: unknown } | null)?.score === "number" ? (r as { score: number }).score : null;
  if (score === null) return "normal";
  if (score < 0.4) return "low";
  if (score >= 0.75) return "high";
  return "normal";
}

export function buildHammerDailyPlan(
  ctx: HammerAthleteContext,
  scheduleSignal: ScheduleSignal = NORMAL_SIGNAL,
  sideBias: SideBiasForPlan | null = null,
  gpSignal: GpSignalForPlan | null = null,
  identityOverride?: { isSwitchHitter?: boolean; isAmbidextrousThrower?: boolean },
  today: Date = new Date(),
  roadmapInputs: RoadmapInputs = {},
): HammerDailyPlanResult {
  const physio = roadmapInputs.physio ?? mapPhysio({ injuries:ctx.get('injury_history')?.value, today:today.toLocaleDateString('en-CA') });
  if (physio.lowReadiness) {
    const original = ctx;
    ctx = { ...original, get<T>(key: string): ContextVariable<T> | undefined {
      if (key === 'readiness') return { key, label:'Readiness',domain:'physiology',value:0.2 as T,source:'active illness',confidence:'high',missing:false,lastUpdated:null,lineage:{owner:'athlete',source:'active illness',rawConfidence:'high'} };
      return original.get<T>(key);
    } };
  }
  const envelopeProjection = projectEnvelope(ctx);
  const phaseProjection = roadmapInputs.resolvedSeasonPhase
    ? { ...envelopeProjection, seasonPhase: roadmapInputs.resolvedSeasonPhase }
    : envelopeProjection;
  const assumedGear = planningGear(phaseProjection.equipmentList, roadmapInputs.alwaysMissingGear ?? []);
  const proj = { ...phaseProjection, equipmentList: assumedGear };
  const sport = normalizeSport(ctx.get('sport_primary')?.value);
  const access = roadmapInputs.subscriptionModules === undefined ? null : subscriptionSchedule(roadmapInputs.subscriptionModules, sport);
  const focusProjection = { ...proj, categoryGoals: masteryGoalWeights(proj.categoryGoals, roadmapInputs.masteryFocus) };
  const speed = selectSpeedFocus(proj);

  // Roadmap primitives — rung + season quarter + elite target + throwing ladder.
  const rung = resolveRoadmapRung(proj);
  const quarter = resolveSeasonQuarter(
    proj,
    {
      phaseStartedAt: roadmapInputs.phaseStartedAt ?? null,
      resolvedPhase: roadmapInputs.resolvedSeasonPhase ?? null,
      phaseSource: roadmapInputs.seasonPhaseSource ?? null,
    },
    today,
  );
  const sportRaw = (ctx.get<string>("sport_primary")?.value as string | null) ?? null;
  const positionRaw =
    ctx.get<unknown>("position_primary")?.value ??
    ctx.get<unknown>("position")?.value ??
    null;
  const eliteTarget = resolveEliteTarget(sportRaw);
  const throwingLadder = prescribeThrowingLadder(rung.descriptor.rung, quarter, positionRaw);

  // Skill-frequency ladder — stack days first, then intensity. Feed the
  // targets into the microcycle so priorityDayOrder is honoured, and count
  // earned days from the last 7d of max-intent completions.
  const skillTargets = SKILL_MODALITIES.reduce<Partial<Record<SkillModality, number>>>((acc, m) => {
    // Owner Oct 28: everyone is on the top (6-day) schedule — no rung ramp.
    // Age and injury clamps inside the resolver still only lower it.
    acc[m] = resolveSkillDaysTarget(
      "sustain", m, positionRaw, proj.injuryRegions, proj.lifecycleBand, proj.liftingAgeYears,
    );
    // Normal fielding keeps its injury ceiling. Only the explicitly seated/dry
    // canonical sibling can sustain the purchased defense floor without loading that injury.
    if(m==='defense' && firstPositionToken(positionRaw)) {
      const candidate=selectDefenseDrills({position:positionRaw,sport:sport==='softball'?'softball':'baseball',seasonPhase:proj.seasonPhase,injuryRegions:proj.injuryRegions});
      if(candidate && restrictedFielding(candidate.drills,proj.injuryRegions))acc[m]=Math.max(acc[m]??0,4);
    }
    const requested = roadmapInputs.testPreferences?.weekly_minimums?.[m];
    // Sustain already is the legal ceiling; scoped floors never reopen a
    // youth/injury-clamped day or reduce the canonical baseline.
    if(typeof requested==='number'&&Number.isInteger(requested)&&requested>=0&&requested<=6)acc[m]=Math.min(acc[m]??0,Math.max(acc[m]??0,requested));
    return acc;
  }, {});
  const weights=roadmapInputs.testPreferences?.prescription_weights;
  if(weights&&focusProjection.categoryGoals){
    const categoryWeight=(category:string)=>weights[category==='fielding'?'defense':category==='speed'?'baserunning':category==='throwing'?'pitching':category]??1;
    focusProjection.categoryGoals={...focusProjection.categoryGoals,goals:[...focusProjection.categoryGoals.goals].sort((a,b)=>{
      const wa=categoryWeight(a.category),wb=categoryWeight(b.category);
      return (Number.isFinite(wb)&&wb>=0.5&&wb<=2?wb:1)-(Number.isFinite(wa)&&wa>=0.5&&wa<=2?wa:1)||a.rank-b.rank;
    }).map((g,i)=>({...g,rank:i+1}))};
  }
  const earnedDaysByModality = countEarnedSkillDays(roadmapInputs.recentCompletions ?? [], today);
  const rungIdx = RUNG_ORDER.indexOf(rung.descriptor.rung);
  const nextRung = rungIdx >= 0 && rungIdx < RUNG_ORDER.length - 1 ? RUNG_ORDER[rungIdx + 1] : null;
  void nextRung;
  const skillLadder = projectSkillLadder(
    "sustain", null, proj, positionRaw, earnedDaysByModality,
  );

  // Resolve the weekly microcycle NEXT so we can thread its label into blocks.
  const positionOverrideArg = roadmapInputs.positionOverride ?? null;
  // Game IQ is unreleased: it is never saved into a player's plan until the release switch opens.
  const allowed = (m: ModalityKey) => (m !== 'game_iq' || GAME_IQ_AVAILABLE_TO_ATHLETES) && (!access || (m === 'hitting' ? access.hasHitting : m === 'baserunning' ? access.hasBaserunning : m === 'defense' ? access.hasDefense : m === 'throwing' ? access.hasThrowing || access.hasPitching : true));
  const firstPass = ALL_MODALITIES.filter(allowed).map((m) =>
    builder({ modality: m, ctx, proj, speed, positionOverride: (m === 'throwing' && access?.hasPitching || m === 'defense' && access?.pitcherOnly) ? 'P' : positionOverrideArg, pitcherOutings: roadmapInputs.pitcherOutings,
      pitchingType: access?.hasPitching ? pitchingDay(today,sport,quarter,roadmapInputs.pitcherOutings) : undefined,
      pitchingPhase:quarter.phase==='off'?`os_q${quarter.quarter}`:quarter.phase==='pre'?'preseason':quarter.phase==='in'?'in_season':'post_season',
      armRole:access?.hasPitching?(access.pitcherOnly?'pitcher':'two_way'):undefined,positionThrowing:!!access&&!access.hasPitching,armHistory:roadmapInputs.armHistory,
      planDate:`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`,skillExecutionAllowed: scheduleSignal.postureToday === 'normal' && !(m==='defense'&&access?.pitcherOnly) }),
  );
  const goalAccess = roadmapInputs.subscriptionModules === undefined ? null
    : priorityAccess(roadmapInputs.subscriptionModules, normalizeSport(sportRaw) === 'softball' ? 'softball' : 'baseball');
  const goalEligible = (modality: string) => !goalAccess ||
    (modality === 'hitting' ? goalAccess.hasHitting
      : modality === 'throwing' ? goalAccess.hasThrowing || goalAccess.hasPitching
        : modality === 'defense' || modality === 'baserunning' ? goalAccess.hasThrowing : true);
  const goalWeek = weeklyGoalBlocks(resolveWeeklyTemplate(proj), skillTargets, focusProjection, positionRaw,
    new Set(firstPass.filter(b => b.status === 'ready' && goalEligible(b.modality)).map(b => b.modality)));
  const weeklyTemplate = goalWeek.template;
  const microcycle = applyMicrocycle(weeklyTemplate, today, goalWeek.targets, planReadinessBand(ctx));
  const weeklyRoadmap = projectWeeklyRoadmap(weeklyTemplate, today, goalWeek.targets).map(day => ({...day, modalities:day.modalities.filter(m=>allowed(m.key))}));
  // Warm-up bias is derived from the slots that actually landed in today's
  // plan — a lift day gets lift prep, a speed day gets speed prep. Priority
  // mirrors CNS cost: speed > lift > throwing > hitting. When nothing
  // trainable landed the bias stays null and the resolver behaves exactly as
  // it did before (season / schedule context only).
  const activeToday = new Set(
    firstPass.filter((b) => b.status === "ready" || b.status === "awaiting-input").map((b) => b.modality),
  );
  const derivedBias: "speed" | "lift" | "throwing" | "hitting" | null =
    activeToday.has("speed") ? "speed"
    : activeToday.has("strength") ? "lift"
    : activeToday.has("throwing") ? "throwing"
    : activeToday.has("hitting") ? "hitting"
    : null;
  const rawBlocks = derivedBias === null
    ? firstPass
    : firstPass.map((b) =>
        b.modality === "warmup"
          ? builder({ modality: "warmup", ctx, proj, speed, positionOverride: positionOverrideArg, modalityBiasOverride: derivedBias })
          : b,
      );
  const lateralized = splitLateralityBlocks(rawBlocks, ctx, identityOverride);
  const guarded = applyMinorParentSupremacy(lateralized, proj);
  const ordered = applyCategoryGoalOrdering(guarded, weights && focusProjection.categoryGoals ? { ...proj, categoryGoals: focusProjection.categoryGoals } : proj);

  // Weekly microcycle turns not-scheduled-today modalities into off-day cards
  // and trims activation/secondary volume. Runs BEFORE schedule modulation so
  // that games/tournaments still override an already-off-day modality when
  // needed (schedule posture stays supreme over microcycle rest).
  const cycled = applyWeeklyMicrocycle(ordered, microcycle);

  // Timestamp-driven recovery windows (24/48/72/96h) — trims lift/speed/bat-
  // speed/throwing blocks based on when they were last completed. Never
  // promotes a block; safety-first layers ran already.
  const recovered = applyRecoveryWindows(
    cycled,
    rung.descriptor.rung,
    quarter,
    roadmapInputs.recentCompletions ?? [],
    today,
  );

  // Stamp the throwing volume ladder into the throwing block(s).
  const withThrowingLadder = recovered.map((b) => {
    if (b.modality !== "throwing") return b;
    if (b.status !== "ready") return b;
    return {
      ...b,
      steps: [throwingLadder.headline, ...b.steps],
      roadmapReason: `${throwingLadder.rationale} · ${b.roadmapReason}`,
    };
  });

  const preModulationOriginals = new Map(rawBlocks.map((b) => [blockKey(b), b]));
  const modulated = applyScheduleModulation(
    withThrowingLadder,
    scheduleSignal,
    preModulationOriginals,
    roadmapInputs.defenseFullOverride === true,
  );
  // A scheduled game is its own loggable card: the game is the day's main work.
  const withGame = scheduleSignal.postureToday === "game" || scheduleSignal.postureToday === "tournament"
    ? [gameDayCard(scheduleSignal.postureToday === "tournament"), ...modulated] : modulated;
  const sided = applySideBias(withGame, sideBias);
  const { blocks: biasedBlocks, tags: gpBiasTags } = applyGpSignalBias(
    sided, gpSignal,
    new Set((proj as unknown as { equipmentList?: ReadonlyArray<string> }).equipmentList ?? []),
  );
  // Defense renders on every day type; then the structural no-blank-card backstop.
  const practiceLoad = categoryPracticeLoads(roadmapInputs.practiceRecords ?? [], today.toLocaleDateString('en-CA'), sportRaw ?? '');
  const practiced = applyPracticePlanContext(ensureRenderable(
    applyDefenseAlwaysVisible(
      biasedBlocks,
      preModulationOriginals,
      roadmapInputs.defenseFullOverride === true,
    ),
  ), practiceLoad);
  const goalOrdered = secondGoalFirst(practiced.map(b => {
    if (!goalWeek.reason || (goalWeek.modality ? b.modality !== goalWeek.modality : modalityToCategory(b.modality) !== focusProjection.categoryGoals?.goals.find(g => g.rank === 1)?.category)) return b;
    const reason = scheduleSignal.postureToday !== 'normal' || b.status !== 'ready'
      ? `${goalWeek.reason} Today's safety and schedule rules still decide whether you train.` : goalWeek.reason;
    return { ...b, because: [...(b.because ?? []), reason] };
  }), focusProjection);
  const fullRestDay = roadmapInputs.fullRestDay === true ||
    physio.recoveryOnly ||
    today.getDay() === SIX_DAY_REST_DOW ||
    (scheduleSignal.postureToday === "normal" && weeklyRoadmap.find(day => day.isToday)?.restDay === true);
  // Last composition boundary: laterality, owner slots, overrides and warm-up anchors cannot reopen rest.
  const bunting = roadmapInputs.bunting;
  const requestedBunting = roadmapInputs.testPreferences?.weekly_minimums?.bunting;
  const baseBunting = bunting?.traits?.speedy===true||bunting?.traits?.lacksPower===true?3:2;
  const buntingMinimum = typeof requestedBunting==='number'&&Number.isInteger(requestedBunting)&&requestedBunting>=2&&requestedBunting<=6?Math.max(baseBunting,requestedBunting):baseBunting;
  const masteryOrdered=applyMasteryFocus(goalOrdered,roadmapInputs.masteryFocus);
  const bunted = bunting ? applyBuntingPlan(masteryOrdered, {
    sport:normalizeSport(sportRaw)==='softball'?'softball':'baseball',modules:roadmapInputs.subscriptionModules??[],
    bats:identityOverride?.isSwitchHitter?'S':(['R','L','S'].includes(String(ctx.get('bats_hand')?.value))?ctx.get('bats_hand')?.value as 'R'|'L'|'S':null),
    ...bunting.traits,battingGames:bunting.evidence.battingGames,battingWindow:bunting.evidence.battingWindow,outcomes:bunting.evidence.outcomes,
    legalWeekdays:buntingWeekdays(weeklyRoadmap,bunting.gameWeekdays??[],buntingMinimum),weeklyMinimum:buntingMinimum,
    restDay:fullRestDay,gameDay:scheduleSignal.postureToday!=='normal',pregameStation:scheduleSignal.postureToday==='game'||scheduleSignal.postureToday==='tournament',
  },{weekday:today.getDay(),weekIndex:Math.floor(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()-((today.getDay()+6)%7))/604800000),
    owned:proj.equipmentList,age:bunting.age,phase:bunting.phase,catalog:bunting.catalog,userId:bunting.userId}) : masteryOrdered;
  const restFiltered = fullRestDay ? bunted.map(b => {
    if (["fueling", "game_iq"].includes(b.modality)) return b;
    const drills = ["warmup", "recovery"].includes(b.modality) ? b.drills.filter(d => isSoftRecovery(d.slug)) : [];
    return { ...b, ...(b.modality==='warmup'?{title:'Gentle recovery preparation'}:{}), drills, steps: drills.length ? drillsToSteps(drills) : ["Rest today. No physical training is scheduled."],
      status: b.status === "awaiting-input" ? "awaiting-input" as const : drills.length ? "ready" as const : "off-day" as const,
      offDayOverridable: false, gamePlanTemplate: null,
      why: "Rest today — gentle recovery only. Save real training for your next training day.",
      roadmapReason: "Full rest day — soft recovery only.", durationMin: drills.length ? b.durationMin : null };
  }) : bunted;
  // Pitching takes its own canonical card identity. This moves existing work,
  // never copies it into a second arm exposure.
  const illnessFiltered = physio.illnessActive ? restFiltered.map(b => {
    if (["fueling", "game_iq"].includes(b.modality)) return b;
    const drills = ["warmup", "recovery"].includes(b.modality) ? b.drills.filter(d => isSoftRecovery(d.slug)) : [];
    return {...b, drills, steps:drills.length?drillsToSteps(drills):['Illness is still active. Recovery only until you mark yourself better.'],
      status:drills.length?'ready' as const:'off-day' as const,offDayOverridable:false,gamePlanTemplate:null,durationMin:drills.length?b.durationMin:null,
      why:'Illness is still active. Recovery only until you mark yourself better.'};
  }) : restFiltered;
  const prehabbed = illnessFiltered.map(b => {
    const notices = [...physio.cautions, ...(physio.professionalWarning ? [physio.professionalWarning] : []), ...(physio.illnessActive ? ['Illness is still active. Keep work light until you mark yourself better.'] : [])];
    const available: DrillStep[] = b.modality === 'warmup' && b.status === 'ready' && !fullRestDay && !physio.illnessActive
      ? [...new Set(physio.healedAreas.filter(a=>!physio.activeAreas.includes(a)).map(a=>PREHAB_SLUGS[a]))].flatMap(slug=>{
        if(b.drills.some(d=>d.slug===slug))return [];
        const drill=WARMUP_LIBRARY.find(d=>d.slug===slug);
        return drill ? [{slug:drill.slug,name:drill.name,dosage:drill.baseDose,setup:drill.setup,cue:drill.cue,stopIf:drill.stopIf??'Stop if this hurts.',stage:'prep' as const}] : [];
      }) : [];
    const drills=available.length?sortByWarmupStage([...b.drills,...available],d=>d.slug??''):b.drills;
    return {...b,drills,steps:available.length?drillsToSteps(drills):b.steps,because:[...(b.because??[]),...notices]};
  });
  const blocks = prehabbed.flatMap(b => {
    if(!access?.hasPitching || b.modality!=='throwing')return [b];
    const type=pitchingDay(today,sport,quarter,roadmapInputs.pitcherOutings);
    const pitchingDrills=b.drills.filter(d=>d.armCard!=='throwing');
    const throwingDrills=b.drills.filter(d=>d.armCard==='throwing');
    const pitching={...b,drills:pitchingDrills,steps:drillsToSteps(pitchingDrills),modality:'pitching' as const,title:`Pitching — ${sport==='softball'?'windmill':'baseball'} · ${type.replace(/_/g,' ')}`,route:'/practice?module=pitching',ctaLabel:'Open pitching',gamePlanTemplate:null,because:[...(b.because??[]),"Pitching and all other throws share your existing arm limits. No extra pitches are added for this card."]};
    return [pitching,...(throwingDrills.length?[{...b,drills:throwingDrills,steps:drillsToSteps(throwingDrills),title:'Throwing — position work within your shared arm budget',gamePlanTemplate:null}]:[])];
  });
  const savedRoadmap = access?.hasPitching ? weeklyRoadmap.map(day=>({...day,modalities:day.modalities.map(m=>m.key==='throwing'?{...m,key:'pitching' as const}:m)})) : weeklyRoadmap;

  if (proj.categoryGoals && typeof console !== "undefined" && import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[dailyPlan] ordered by ranked goals →", summarizeGoals(proj.categoryGoals));
  }
  if (scheduleSignal.postureToday !== "normal" && typeof console !== "undefined" && import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug(
      `[dailyPlan] schedule posture=${scheduleSignal.postureToday} — ${scheduleSignal.rationale}`,
    );
  }
  if (typeof console !== "undefined" && import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug(
      `[dailyPlan] microcycle=${weeklyTemplate.id} · rung=${rung.descriptor.rung} · ${quarter.label}`,
    );
  }
  if (gpBiasTags.length > 0 && typeof console !== "undefined" && import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[dailyPlan] gp-signal bias →", gpBiasTags);
  }
  return {
    blocks: enforceSkillStageOrder(blocks),
    sanity: validatePlanSanity({ restDay: fullRestDay, work: blocks.filter(b => b.status === 'ready').flatMap(b => b.drills.map(d => ({ category: b.modality, slug: d.slug }))) }),
    practiceLoad,
    seasonPhase: proj.seasonPhase,
    missingnessCount: blocks.filter((b) => b.status === "awaiting-input").length,
    speedFocus: speed,
    schedulePosture: scheduleSignal.postureToday,
    scheduleSignal,
    sideBias,
    gpBiasTags,
    microcycle,
    weeklyRoadmap: savedRoadmap,
    weeklyTemplate,
    roadmap: {
      rung: rung.descriptor,
      rungRationale: rung.rationale,
      quarter,
      eliteTarget,
      throwingLadder,
      skillLadder,
    },
  };
}

/**
 * Count *distinct calendar days* in the last 7 days that produced a
 * max-intent completion for each skill modality. Max-intent bat-speed
 * completions credit `hitting`; max-intent throwing completions credit
 * `throwing`. Defense and baserunning have no dedicated completion signal
 * today, so they always report 0 earned days — this is safe: the ladder
 * simply reads "aim for X/wk — you've hit 0/7", nudging the athlete to
 * stack days first before intensity ramps.
 */
function countEarnedSkillDays(
  recent: RecentCompletions,
  today: Date,
): Partial<Record<SkillModality, number>> {
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const buckets: Record<SkillModality, Set<string>> = {
    hitting: new Set(),
    throwing: new Set(),
    defense: new Set(),
    baserunning: new Set(),
  };
  for (const c of recent) {
    if (c.at < sevenDaysAgo || c.at > today) continue;
    const dayKey = c.at.toISOString().slice(0, 10);
    if (c.modality === "bat_speed_max") buckets.hitting.add(dayKey);
    else if (c.modality === "throwing_max") buckets.throwing.add(dayKey);
  }
  return {
    hitting: buckets.hitting.size,
    throwing: buckets.throwing.size,
    defense: 0,
    baserunning: 0,
  };
}



