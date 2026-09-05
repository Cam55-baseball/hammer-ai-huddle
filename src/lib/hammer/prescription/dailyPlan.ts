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
import type { HammerAthleteContext } from "@/lib/hammer/context/athleteContext";
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
import {
  resolveWeeklyTemplate,
  applyMicrocycle,
  projectWeeklyRoadmap,
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
  | "defense"
  | "baserunning"
  | "game_iq"
  | "fueling"
  | "recovery";

export type BlockStatus = "ready" | "awaiting-input" | "suppressed" | "off-day";
export type BlockPhase = "build" | "sharpen" | "maintain" | "deload" | "recover" | "skill";

export interface DrillStep {
  readonly name: string;
  readonly slug?: string;
  readonly setup?: string;
  readonly dosage: string;
  readonly cue?: string;
  readonly stopIf?: string;
  /** Athlete-facing "You need:" line when the drill requires equipment. */
  readonly equipmentNote?: string;
  readonly guide?: import("./movementGuide").MovementGuide;
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
  readonly modality: ModalityKey;
  readonly ctx: HammerAthleteContext;
  readonly proj: AthleteContextProjection;
  readonly speed: SpeedFocusDecision;
  /** Athlete-chosen position for today (defense swap control). */
  readonly positionOverride?: string | null;
}

const BODYWEIGHT_EQUIPMENT = new Set(["bodyweight", "bands", "hotel"]);

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

function builder({ modality, ctx, proj, speed, positionOverride }: BuilderArgs): PrescribedBlock {
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

  const recoverDay =
    typeof (readiness as { score?: number })?.score === "number" &&
    (readiness as { score: number }).score < 0.4;
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
      const context = resolveWarmupContext({
        seasonPhase: seasonPhase as "off" | "pre" | "in" | "post" | null,
        isGameDay,
        isPracticeDay,
        isTravelDay,
        isRecoveryDay,
        modalityBias: null,
      });
      // Arm care is ALWAYS owned by the throwing block (EASS band prep / cooldown / arm-protected mode).
      // Strip arm_care from the warmup so arm care is never duplicated.
      // Equipment is honest: only drills the athlete can actually run ship,
      // and the twitch layer is vetoed outright on low-readiness/travel days.
      const projAny = proj as unknown as {
        equipmentList?: ReadonlyArray<string>;
        equipmentVenue?: string | null;
      };
      const built = buildWarmup({
        context,
        lifecycle,
        gameDay: isGameDay,
        daySeed,
        suppressArmCare: true,
        equipment: projAny.equipmentList ?? (equipment ? [equipment] : []),
        venue: projAny.equipmentVenue ?? equipment ?? null,
        injuryRegions: injuryRegions ?? [],
        suppressTwitch: isRecoveryDay || recoverDay || isTravelDay,
      });
      const drills: DrillStep[] = built.drills.map((d) => ({
        name: d.name,
        slug: d.slug,
        setup: d.setup,
        dosage: d.dosage,
        cue: d.cue,
        stopIf: d.stopIf,
        equipmentNote: d.equipmentNote,
        guide: d.guide,
      }));

      // Su Wen / Neijing micro-dose: on low-readiness / recovery days, lead the
      // warm-up with a 60-second season-aware breath primer so we downshift
      // sympathetic tone before any movement load. Additive only — never
      // replaces a drill, only prepends a primer step.
      if (isRecoveryDay || recoverDay) {
        const primer = getSeasonHPI(seasonPhase);
        drills.unshift({
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
        speed_day: "Fast-twitch prep is the whole point — CARs open the joints, ankle bounces and pogos wake stiffness, altitude drops sharpen ground contact.",
        lift_day: "Joint CARs and stability activation earn your right to load — Pallof and Copenhagen bulletproof the trunk before the barbell.",
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
          "Sharp pain (not muscle soreness) — stop and tell Hammer where.",
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
        route: recoverDay || suppressed ? "/bounce-back-bay" : "/speed-lab",
        ctaLabel: recoverDay ? "Recover instead" : "Open Speed Lab",
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
            "Assuming you're new to structured lifting. Tell Hammer how long you've been lifting and I'll load this properly.",
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
            source: "hammer.daily.strength.conservative",
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
          name: `Anthro pick · ${sw.pattern}: ${sw.preferred}`,
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
          source: "hammer.daily.strength",
        },
      };
    }

    case "hitting": {
      // INPUT-INTEGRITY LAW: never withhold the hitting prescription waiting
      // on equipment. With nothing on file we assume the most common minimum
      // (a bat and somewhere to swing), say so, and let them correct it.
      const equipmentUnknown = !equipment;
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      // NOTE: switch-hitter split is handled downstream by splitLateralityBlocks,
      // which duplicates this block into two full-volume side-tagged blocks
      // (Left and Right). Do NOT halve volume or interleave sides here.
      const drills: DrillStep[] = equipmentUnknown
        ? [
            { name: "Dry swings — barrel path", dosage: "3 rounds of 10", cue: "shoulder-to-shoulder hold, no hand push" },
            { name: "Tee work (or a towel drill if you have no tee)", dosage: "20 swings", cue: "hit the back of the ball, finish balanced" },
            { name: "Self-toss or front toss if someone can throw", dosage: "15 swings", cue: "see it deep, hands stay back" },
            { name: "Film 5 swings on your phone and tag them", dosage: "best 5 swings" },
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
            ];
      return {
        modality,
        title: equipmentUnknown
          ? "Hitting — bat-and-space session"
          : inSeason ? "Hitting — in-season quality" : offSeason ? "Hitting — off-season build" : "Hitting",
        assumption: equipmentUnknown
          ? "Assuming you have a bat and somewhere safe to swing. Tell Hammer what you actually have and I'll upgrade this."
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
          source: "hammer.daily.hitting",
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
      const readinessScore =
        typeof (readiness as { score?: number })?.score === "number"
          ? (readiness as { score: number }).score
          : null;

      const eassCtx: EassContext = {
        sport: normalizeSport(sportRaw),
        position: normalizePosition(pos),
        seasonPhase: seasonPhase as EassContext["seasonPhase"],
        ageYears,
        trainingAgeYears: liftingAge ?? null,
        injuryRegions: [...injuryRegions],
        armSore,
        isGameDay: !!sched.isGameDay,
        // If schedule doesn't declare throwing day explicitly, treat non-game days as throwing days
        // when the athlete's development priorities include throwing/velocity, otherwise alternate.
        isThrowingDay: sched.isThrowingDay ?? !sched.isGameDay,
        isRecoveryDay: !!sched.isRecoveryDay || recoverDay,
        readinessScore,
      };

      const eass = buildEassPrescription(eassCtx);

      // Ambidextrous throwers get TWO independent throwing cards downstream
      // via splitLateralityBlocks (dominant + non-dominant), each with its own
      // dosage envelope and completion checklist. Do not push mirror drills here.

      // Map EASS drills → DrillStep shape used by the UI.
      const drills: DrillStep[] = eass.drills.map((d) => ({
        name: d.name,
        slug: (d as { slug?: string }).slug,
        setup: d.setup,
        dosage: d.dosage,
        cue: d.cue,
        stopIf: d.stopIf,
        guide: _guideForMovement((d as { slug?: string }).slug) ?? _guideForMovement(d.name) ?? undefined,
      }));

      // Anthropometric throwing cues + supplemental drills (additive overlay, non-authoritative).
      const thrOut = anthroSignal ? selectThrowingAdaptations(anthro) : {
        cues: [] as ReturnType<typeof selectThrowingAdaptations>["cues"],
        supplemental: [] as ReturnType<typeof selectThrowingAdaptations>["supplemental"],
        rationale: null,
      };
      for (const s of thrOut.supplemental) {
        drills.push({
          name: `Anthro supplemental · ${s.name}`,
          dosage: s.dosage,
          cue: s.cue,
        });
      }
      const anthroCues = thrOut.cues.map((c) => c.cue);

      return {
        modality,
        title: eass.title,
        why: eass.why + (goal ? ` ${goal}` : ""),
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
      if (!pos) {
        // Fallback plan — never a blank card. Every position needs first-step
        // reads, glove work, a clean exchange, and an accurate throw, so we
        // prescribe those and invite the athlete to make it specific.
        const generalDrills: DrillStep[] = [
          { name: "Ready position + first-step reads", dosage: "3 x 8 reps", cue: "weight on the balls of your feet, small hop as the ball is released" },
          { name: "Short-hop glove work", dosage: "3 x 10 reps", cue: "field through the ball, soft hands out front" },
          { name: "Glove-to-hand exchange", dosage: "3 x 10 reps", cue: "four seams, hands to the center of your chest" },
          { name: "Accuracy throws to a target", dosage: "2 x 10 throws", cue: "throw through the target, not at it" },
        ];
        return {
          modality,
          title: "Defense — general fundamentals",
          why: "Footwork, hands, exchange, and throw accuracy carry over to every position.",
          roadmapReason:
            "Fallback plan — I don't know which position you play yet, so this is the defensive work every position needs. Tell me your position and I'll make it specific.",
          phase: "skill",
          steps: drillsToSteps(generalDrills),
          drills: generalDrills,
          cues: ["Field through the ball.", "Footwork before glove."],
          stopRules: ["Knee, ankle, hip, or shoulder pain — stop and tell Hammer."],
          durationMin: 20,
          route: "#hammer-onboarding",
          ctaLabel: "Set my position",
          status: "ready",
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
      const drills: DrillStep[] = prescription?.drills
        ? [...prescription.drills]
        : [
            { name: "Pre-pitch + first-step reads", dosage: "20 reps", cue: "low athletic stance, weight on balls of feet" },
            { name: "Glove work — 4 corners", dosage: "15 reps", cue: "field through the ball, don't stab" },
          ];
      const cues = prescription?.cues ?? ["Field through the ball.", "Footwork before glove."];
      const stopRules = prescription?.stopRules ?? ["Knee, ankle, or hip pain — stop and tell Hammer."];
      const durationMin = prescription?.durationMin ?? (inSeason ? 15 : offSeason ? 35 : 25);
      const title = prescription?.title ?? `Defense — ${pos}`;
      const why = prescription?.why
        ?? ((inSeason ? "Game-rep quality over volume." : offSeason ? "Footwork and range building." : "Position-specific reads, footwork, and finishes.") + (goal ? ` ${goal}` : ""));

      return {
        modality,
        title,
        why,
        roadmapReason: tournamentToday
          ? "Tournament day — primer only, save the legs."
          : inSeason
            ? "In-season — game-rep quality."
            : offSeason
              ? "Off-season — load volume + range."
              : "Pre-season — sharpen reads and finishes.",
        phase: inSeason ? "sharpen" : tournamentToday ? "maintain" : "build",
        steps: drillsToSteps(drills),
        drills,
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
          checklist: drillsToChecklist(drills),
          source: "hammer.daily.defense",
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
          { name: "Lead/secondary footwork (walk pace)", dosage: "10 reps", cue: "feet only, no max-effort sprint", stopIf: "any leg pain" },
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
          route: "/baserunning-iq",
          ctaLabel: "Open baserunning IQ",
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
            source: "hammer.daily.baserunning.iq",
          },
        };
      }
      const inSeason = seasonPhase === "in";
      const drills: DrillStep[] = inSeason
        ? [
            { name: "Pickoff reads", dosage: "8 reps", cue: "first move = first step" },
            { name: "First-to-third / tag-up scenarios", dosage: "5 reps" },
          ]
        : [
            { name: "Lead + secondary footwork", dosage: "10 reps", cue: "balanced lead, no lean" },
            { name: "Pickoff reads (with partner if possible)", dosage: "10 reps" },
            { name: "First-to-third / tag-up scenarios", dosage: "5 reps" },
          ];
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
          source: "hammer.daily.baserunning",
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
          source: "hammer.daily.game_iq",
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
          source: "hammer.daily.fueling",
        },
      };
    }

    case "recovery": {
      const elevated =
        recoverDay || workloadHigh || seasonPhase === "in" || injuryRegions.length > 0;
      const drills: DrillStep[] = [
        { name: elevated ? "Mobility + foam roll" : "Mobility + foam roll", dosage: elevated ? "15 min full body" : "10 min focus areas", cue: "slow pressure, breathe" },
        { name: "Evening down-regulation breath (post-session)", dosage: elevated ? "10 min" : "5 min", cue: "long exhales, longer than inhales — this is the closing breath of the day, distinct from the morning HPI primer" },
        { name: "Hydrate + plan tomorrow's wake time", dosage: "now" },
        ...(injury
          ? [{ name: "Mind your injury note", dosage: injury } as DrillStep]
          : [{ name: "Note any new soreness in Vault", dosage: "1 entry" } as DrillStep]),
      ];
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
        durationMin: elevated ? 30 : 20,
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
          durationMinutes: elevated ? 30 : 20,
          description: "Recovery block.",
          checklist: drillsToChecklist(drills),
          source: "hammer.daily.recovery",
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
          case "hitting":
            // Allow a brief activation set on game day; full tournament-day suppression.
            return signal.postureToday === "tournament"
              ? suppressBlock(b, rationale)
              : suppressBlock(b, rationale, { keepActivation: true });
          case "defense": {
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
          case "baserunning":
            return suppressBlock(b, rationale);
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
function applyGpSignalBias(
  blocks: ReadonlyArray<PrescribedBlock>,
  gp: GpSignalForPlan | null,
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
    if (
      b.modality === "game_iq" &&
      enoughHittingSignal &&
      gp.chasePct !== null &&
      gp.chasePct >= 32
    ) {
      extraCues.push(`Last 7d chase ${gp.chasePct}% — bias pitch-recognition reps today.`);
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
      biased.add("defense");
      tags.push(`gp:def:${lead.position}`);
    }
    if (extraCues.length === 0) return b;
    return { ...b, cues: [...b.cues, ...extraCues] };
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
    if (isAmbi && b.modality === "throwing") {
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
    case "defense": return "Defense";
    case "baserunning": return "Baserunning";
    case "game_iq": return "Game IQ";
    case "fueling": return "Fueling";
    case "recovery": return "Recovery";
  }
}

/**
 * Very light dosage scaler: multiplies the leading integer of "N x M …"
 * dosage strings by `scale`, floor 1.  If we can't parse the string we
 * return it untouched — never fabricate.
 */
function scaleDosageLabel(dosage: string, scale: number): string {
  const m = /^(\d+)\s*(?:x|×)\s*(\d+)/i.exec(dosage);
  if (!m) return dosage;
  const sets = Math.max(1, Math.round(parseInt(m[1], 10) * scale));
  return dosage.replace(/^(\d+)/, String(sets));
}


export interface RoadmapInputs {
  readonly recentCompletions?: RecentCompletions;
  readonly phaseStartedAt?: string | null;
  /** Canonical phase from resolveSeasonPhase (short form: off/pre/in/post). */
  readonly resolvedSeasonPhase?: "off" | "pre" | "in" | "post" | null;
  /** Provenance of that phase; 'default' means no real season signal. */
  readonly seasonPhaseSource?: "date_window" | "stored" | "default" | null;
  /** Position the athlete says they are actually working today. */
  readonly positionOverride?: string | null;
  /** Athlete tapped "run full defense anyway" on a game day. */
  readonly defenseFullOverride?: boolean;
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
  const proj = projectEnvelope(ctx);
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
    acc[m] = resolveSkillDaysTarget(
      rung.descriptor.rung, m, positionRaw, proj.injuryRegions, proj.lifecycleBand, proj.liftingAgeYears,
    );
    return acc;
  }, {});
  const earnedDaysByModality = countEarnedSkillDays(roadmapInputs.recentCompletions ?? [], today);
  const rungIdx = RUNG_ORDER.indexOf(rung.descriptor.rung);
  const nextRung = rungIdx >= 0 && rungIdx < RUNG_ORDER.length - 1 ? RUNG_ORDER[rungIdx + 1] : null;
  const skillLadder = projectSkillLadder(
    rung.descriptor.rung, nextRung, proj, positionRaw, earnedDaysByModality,
  );

  // Resolve the weekly microcycle NEXT so we can thread its label into blocks.
  const weeklyTemplate = resolveWeeklyTemplate(proj);
  const microcycle = applyMicrocycle(weeklyTemplate, today, skillTargets);
  const weeklyRoadmap = projectWeeklyRoadmap(weeklyTemplate, today, skillTargets);

  const rawBlocks = ALL_MODALITIES.map((m) =>
    builder({ modality: m, ctx, proj, speed, positionOverride: roadmapInputs.positionOverride ?? null }),
  );
  const lateralized = splitLateralityBlocks(rawBlocks, ctx, identityOverride);
  const guarded = applyMinorParentSupremacy(lateralized, proj);
  const ordered = applyCategoryGoalOrdering(guarded, proj);

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
  const sided = applySideBias(modulated, sideBias);
  const { blocks, tags: gpBiasTags } = applyGpSignalBias(sided, gpSignal);

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
    blocks,
    seasonPhase: proj.seasonPhase,
    missingnessCount: blocks.filter((b) => b.status === "awaiting-input").length,
    speedFocus: speed,
    schedulePosture: scheduleSignal.postureToday,
    scheduleSignal,
    sideBias,
    gpBiasTags,
    microcycle,
    weeklyRoadmap,
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



