/**
 * Hammer Daily Plan — 9-modality orchestrator.
 *
 * Elite-execution overhaul: every block now carries an explicit `drills` array
 * (name, setup, dosage, cue, stopIf), a `roadmapReason` explaining today's
 * phase (build / sharpen / maintain / deload / recover), a `gamePlanTemplate`
 * the UI can hand to `createTemplate(...)` to spawn a real loggable Game Plan
 * card, and a `missingContextKeys` list pointing at the canonical knowledge
 * gaps so the UI can ask the right onboarding question inline instead of
 * dead-end navigating to /command.
 *
 * Routing fix: warm-up no longer silently navigates to /tex-vision. Tex Vision
 * is now a separate optional add-on the warmup card surfaces explicitly when
 * appropriate.
 *
 * Every block remains pure (no I/O), preserves missingness, and never
 * fabricates certainty.
 */
import type { HammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import {
  projectEnvelope,
  selectSpeedFocus,
  type AthleteContextProjection,
  type SpeedFocusDecision,
} from "@/lib/hammer/context/decisionFilters";

export type ModalityKey =
  | "warmup"
  | "speed"
  | "strength"
  | "hitting"
  | "throwing"
  | "defense"
  | "baserunning"
  | "fueling"
  | "recovery";

export type BlockStatus = "ready" | "awaiting-input" | "suppressed";
export type BlockPhase = "build" | "sharpen" | "maintain" | "deload" | "recover" | "skill";

export interface DrillStep {
  readonly name: string;
  readonly setup?: string;
  readonly dosage: string; // sets x reps / distance / time
  readonly cue?: string;
  readonly stopIf?: string;
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
  /** Each drill becomes a checkable custom_field row in the activity log. */
  readonly checklist: ReadonlyArray<string>;
  readonly source: string;
}

export interface PrescribedBlock {
  readonly modality: ModalityKey;
  readonly title: string;
  readonly why: string;
  readonly roadmapReason: string;
  readonly phase: BlockPhase;
  readonly steps: ReadonlyArray<string>; // legacy short bullets (kept for compatibility)
  readonly drills: ReadonlyArray<DrillStep>;
  readonly cues: ReadonlyArray<string>;
  readonly stopRules: ReadonlyArray<string>;
  readonly durationMin: number | null;
  readonly route: string;
  readonly ctaLabel: string;
  readonly status: BlockStatus;
  readonly missing: ReadonlyArray<string>;
  /** Canonical knowledge-gap ids the UI can ask inline (Answer Hammer). */
  readonly missingContextKeys: ReadonlyArray<string>;
  /** Optional pre-shaped Game Plan template seed (for the Add-to-Game-Plan button). */
  readonly gamePlanTemplate: GamePlanTemplateSeed | null;
}

const ALL_MODALITIES: ModalityKey[] = [
  "warmup",
  "speed",
  "strength",
  "hitting",
  "throwing",
  "defense",
  "baserunning",
  "fueling",
  "recovery",
];

interface BuilderArgs {
  readonly modality: ModalityKey;
  readonly ctx: HammerAthleteContext;
  readonly proj: AthleteContextProjection;
  readonly speed: SpeedFocusDecision;
}

const BODYWEIGHT_EQUIPMENT = new Set(["bodyweight", "bands", "hotel"]);

function goalLine(proj: AthleteContextProjection): string | null {
  if (!proj.goalSummary) return null;
  return proj.goalHorizon
    ? `Goal: ${proj.goalSummary} (${proj.goalHorizon}-horizon).`
    : `Goal: ${proj.goalSummary}.`;
}

/** Convert a list of drills into legacy `steps` bullets (display fallback). */
function drillsToSteps(drills: ReadonlyArray<DrillStep>): string[] {
  return drills.map((d) =>
    d.setup ? `${d.name} — ${d.dosage} (${d.setup})` : `${d.name} — ${d.dosage}`,
  );
}

/** Build a checklist usable as `custom_fields` in a custom_activity_template. */
function drillsToChecklist(drills: ReadonlyArray<DrillStep>): string[] {
  return drills.map((d) => `${d.name} — ${d.dosage}`);
}

function builder({ modality, ctx, proj, speed }: BuilderArgs): PrescribedBlock {
  const pos = ctx.get<string>("position")?.value ?? null;
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
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      const drills: DrillStep[] = inSeason
        ? [
            { name: "Light cardio (jog/jump rope)", dosage: "3 min easy", cue: "nose breathing only" },
            { name: "World's greatest stretch", dosage: "5 per side", cue: "elbow to inside of front foot, then rotate up" },
            { name: "Hip airplanes", dosage: "5 per side", cue: "control the lower-down, no wobble" },
            { name: "Mini-band lateral walks", setup: "light band above knees", dosage: "2 × 8 each way", cue: "knees track toes, hips stay level", stopIf: "knee or hip pain" },
            { name: "Pogo hops", dosage: "2 × 10 quick contacts", cue: "stiff ankles, ground feels hot" },
          ]
        : offSeason
          ? [
              { name: "Light cardio (jog/bike/rope)", dosage: "8 min easy", cue: "build heart rate slowly" },
              { name: "World's greatest stretch", dosage: "5 per side" },
              { name: "90/90 hip switches", dosage: "8 per side", cue: "slow control, no momentum" },
              { name: "T-spine open books", dosage: "8 per side", cue: "reach long, exhale at end range" },
              { name: "Mini-band lateral walks", setup: "light band above knees", dosage: "3 × 10 each way", cue: "knees out, ribs down", stopIf: "knee or hip pain" },
              { name: "Mini-band monster walks", setup: "band above knees", dosage: "3 × 8 forward + 8 back" },
              { name: "Pogo hops", dosage: "3 × 12 contacts", cue: "stiff ankles, fast off ground" },
              { name: "Med-ball slams", setup: "6 lb ball", dosage: "2 × 6", cue: "full exhale on slam" },
            ]
          : [
              { name: "Light cardio (jog/jump rope)", dosage: "5 min easy" },
              { name: "World's greatest stretch", dosage: "5 per side" },
              { name: "Hip openers (90/90)", dosage: "6 per side" },
              { name: "T-spine rotations", dosage: "6 per side" },
              { name: "Mini-band lateral walks", setup: "light band above knees", dosage: "2 × 10 each way", cue: "knees track toes" },
              { name: "Pogo hops", dosage: "2 × 12 contacts" },
            ];
      const dur = inSeason ? 8 : offSeason ? 18 : 12;
      const phase: BlockPhase = inSeason ? "maintain" : offSeason ? "build" : "build";
      return {
        modality,
        title: inSeason ? "Warm-up — game-ready" : offSeason ? "Warm-up — extended" : "Warm-up — dynamic",
        why: inSeason
          ? "Prime your CNS without spending. Short and sharp before you compete."
          : "Open the joints, switch the nervous system on, get the body honest before output.",
        roadmapReason: inSeason
          ? "In-season — minimum effective dose so you save legs for the game."
          : offSeason
            ? "Off-season — extended prep so your body is ready for higher volume work."
            : "Default warm-up sequence calibrated to today's session length.",
        phase,
        steps: drillsToSteps(drills),
        drills,
        cues: [
          "Move slow first, fast last.",
          "If something feels tight, give it one more set, then move on.",
        ],
        stopRules: [
          "Sharp pain (not muscle soreness) — stop and tell Hammer where.",
          "Dizziness or shortness of breath — pause, hydrate, restart slower.",
        ],
        durationMin: dur,
        // FIX: warm-up no longer auto-routes to /tex-vision. It belongs on the
        // Game Plan. Tex Vision is surfaced as an explicit optional add-on
        // inside the card body via a separate link.
        route: "/practice?module=warmup",
        ctaLabel: "Open warm-up",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: inSeason ? "Hammer warm-up (game day)" : offSeason ? "Hammer warm-up (extended)" : "Hammer warm-up",
          activityType: "warmup",
          icon: "flame",
          color: "#f97316",
          durationMinutes: dur,
          description: "Daily dynamic warm-up prescribed by Hammer.",
          checklist: drillsToChecklist(drills),
          source: "hammer.daily.warmup",
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
          { name: "Easy tempo runs", dosage: "4 × 60 y