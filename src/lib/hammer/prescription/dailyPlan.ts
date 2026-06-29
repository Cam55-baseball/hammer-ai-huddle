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

export type BlockStatus = "ready" | "awaiting-input" | "suppressed";
export type BlockPhase = "build" | "sharpen" | "maintain" | "deload" | "recover" | "skill";

export interface DrillStep {
  readonly name: string;
  readonly setup?: string;
  readonly dosage: string;
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
  readonly checklist: ReadonlyArray<string>;
  readonly source: string;
}

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

function builder({ modality, ctx, proj, speed }: BuilderArgs): PrescribedBlock {
  const pos =
    (ctx.get<string>("position_primary")?.value as string | null) ??
    (ctx.get<string>("position")?.value as string | null) ??
    null;
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
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      const drills: DrillStep[] = inSeason
        ? [
            { name: "Light cardio (jog/jump rope)", dosage: "3 min easy", cue: "nose breathing only" },
            { name: "World's greatest stretch", dosage: "5 per side", cue: "elbow to inside of front foot, then rotate up" },
            { name: "Hip airplanes", dosage: "5 per side", cue: "control the lower-down, no wobble" },
            { name: "Mini-band lateral walks", setup: "light mini-band above knees", dosage: "2 sets x 8 steps each way", cue: "knees track over toes, hips stay level", stopIf: "knee or hip pain" },
            { name: "Pogo hops", dosage: "2 sets x 10 quick contacts", cue: "stiff ankles, ground feels hot" },
          ]
        : offSeason
          ? [
              { name: "Light cardio (jog/bike/rope)", dosage: "8 min easy", cue: "build heart rate slowly" },
              { name: "World's greatest stretch", dosage: "5 per side" },
              { name: "90/90 hip switches", dosage: "8 per side", cue: "slow, no momentum" },
              { name: "T-spine open books", dosage: "8 per side", cue: "reach long, exhale at end range" },
              { name: "Mini-band lateral walks", setup: "light mini-band above knees", dosage: "3 sets x 10 steps each way", cue: "knees out, ribs down", stopIf: "knee or hip pain" },
              { name: "Mini-band monster walks", setup: "band above knees", dosage: "3 sets x 8 forward + 8 back" },
              { name: "Pogo hops", dosage: "3 sets x 12 contacts", cue: "stiff ankles, fast off ground" },
              { name: "Med-ball slams", setup: "6 lb ball", dosage: "2 sets x 6", cue: "full exhale on slam" },
            ]
          : [
              { name: "Light cardio (jog/jump rope)", dosage: "5 min easy" },
              { name: "World's greatest stretch", dosage: "5 per side" },
              { name: "Hip openers (90/90)", dosage: "6 per side" },
              { name: "T-spine rotations", dosage: "6 per side" },
              { name: "Mini-band lateral walks", setup: "light mini-band above knees", dosage: "2 sets x 10 steps each way", cue: "knees track toes" },
              { name: "Pogo hops", dosage: "2 sets x 12 contacts" },
            ];
      const dur = inSeason ? 8 : offSeason ? 18 : 12;
      return {
        modality,
        title: inSeason ? "Warm-up — game-ready" : offSeason ? "Warm-up — extended" : "Warm-up — dynamic",
        why: inSeason
          ? "Prime your CNS without spending. Short and sharp before you compete."
          : "Open the joints, switch the nervous system on, get the body honest before output.",
        roadmapReason: inSeason
          ? "In-season — minimum effective dose so you save legs for the game."
          : offSeason
            ? "Off-season — extended prep so you can handle today's higher volume work."
            : "Default warm-up sequence calibrated to today's session length.",
        phase: inSeason ? "maintain" : "build",
        steps: drillsToSteps(drills),
        drills,
        cues: ["Move slow first, fast last.", "If something feels tight, one more set, then move on."],
        stopRules: [
          "Sharp pain (not muscle soreness) — stop and tell Hammer where.",
          "Dizziness or shortness of breath — pause, hydrate, restart slower.",
        ],
        durationMin: dur,
        route: "hammer:open-warmup-generator",
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
      if (liftingAge === null) {
        return {
          modality,
          title: "Strength — waiting on lifting history",
          why: "I prescribe intensity from your training history. I won't guess.",
          roadmapReason: "Missing input — strength block deferred until you tell me your lifting history.",
          phase: "build",
          steps: ["Tell me how many years you've been lifting consistently."],
          drills: [],
          cues: [],
          stopRules: [],
          durationMin: null,
          route: "#hammer-onboarding",
          ctaLabel: "Answer Hammer",
          status: "awaiting-input",
          missing: ["lifting_history"],
          missingContextKeys: ["lifting_history"],
          gamePlanTemplate: null,
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
      if (!equipment) {
        return {
          modality,
          title: "Hitting — waiting on equipment",
          why: "I prescribe drills from what you can actually use.",
          roadmapReason: "Missing input — tell me your hitting equipment and I'll prescribe today.",
          phase: "skill",
          steps: ["Tell me what hitting equipment you have today (tee, net, machine, BP, cage)."],
          drills: [],
          cues: [],
          stopRules: [],
          durationMin: null,
          route: "#hammer-onboarding",
          ctaLabel: "Answer Hammer",
          status: "awaiting-input",
          missing: ["equipment_access"],
          missingContextKeys: ["equipment_effective"],
          gamePlanTemplate: null,
        };
      }
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      const drills: DrillStep[] = inSeason
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
        title: inSeason ? "Hitting — in-season quality" : offSeason ? "Hitting — off-season build" : "Hitting",
        why: (inSeason ? "Sharpen timing without spending." : offSeason ? "Volume + mechanical rebuild." : "Quality reps targeting your weakness pattern.") + (goal ? ` ${goal}` : ""),
        roadmapReason: inSeason
          ? "In-season — focus on timing and feel, not volume."
          : offSeason
            ? "Off-season — high volume + mechanical work while there is no game pressure."
            : "Default hitting block calibrated to season phase.",
        phase: inSeason ? "sharpen" : offSeason ? "build" : "skill",
        steps: drillsToSteps(drills),
        drills,
        cues: ["Track every pitch, even no-swings.", "Quality first — bail on a round if you start grooving bad habits."],
        stopRules: ["Hand or wrist pain — stop and switch to dry swings only.", "If timing breaks down badly, end the round, reset, restart."],
        durationMin: inSeason ? 20 : offSeason ? 45 : 35,
        route: "/practice?module=hitting",
        ctaLabel: "Open hitting",
        status: "ready",
        missing: [],
        missingContextKeys: [],
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
      const armBlocked =
        injuryRegions.includes("shoulder") ||
        injuryRegions.includes("ucl") ||
        injuryRegions.includes("elbow");
      if (armBlocked) {
        const drills: DrillStep[] = [
          { name: "Cuff/scap activation (J-band series)", setup: "light J-band or therapy band, anchored at shoulder height", dosage: "Internal rotation 2x10, external rotation 2x10, scap pulls 2x10, full sequence 1x", cue: "slow, controlled, no force — wake the cuff, do not work it" },
          { name: "Wrist + forearm prep", dosage: "wrist circles 30s each way, forearm pronation/supination 2x10", cue: "promotes blood flow without loading" },
          { name: "Sub-max catch play", dosage: "10 min, never past comfortable distance, never past 70% intent", cue: "every throw is a check-in — does it feel the same as the last one?", stopIf: "any sharp pain, twinge, pinch, or velo cliff — stop now and message Hammer" },
          { name: "Arm-care cooldown", dosage: "sleeper stretch 2x30s, cross-body 2x30s, light forearm massage 2 min", cue: "long exhales, no straining the joint" },
        ];
        return {
          modality,
          title: "Throwing — arm-protected",
          why: `Injury (${injuryRegions.join(", ")}) — no max throws today. Arm care only.`,
          roadmapReason: "Injury supremacy — your reported pain overrides any inferred readiness.",
          phase: "recover",
          steps: drillsToSteps(drills),
          drills,
          cues: ["Athlete-reported pain always outranks anything I infer.", "Today is for the joint, not for the gun."],
          stopRules: [
            "Any sharp pain — stop immediately.",
            "Pinch, grab, or sudden weakness — stop, ice, message Hammer.",
            "Velo or command falls off a cliff — that's the body talking; listen.",
          ],
          durationMin: 18,
          route: "/practice?module=throwing",
          ctaLabel: "Open arm-care",
          status: "ready",
          missing: [],
          missingContextKeys: [],
          gamePlanTemplate: {
            title: "Hammer throwing — arm-protected",
            activityType: "recovery",
            icon: "heart",
            color: "#f43f5e",
            durationMinutes: 18,
            description: "Arm-care only. No max throws.",
            checklist: drillsToChecklist(drills),
            source: "hammer.daily.throwing.armcare",
          },
        };
      }

      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      const preSeason = seasonPhase === "pre";
      const postSeason = seasonPhase === "post";

      // Position branch — pitcher vs catcher vs IF vs OF vs UTIL.
      const isPitcher = pos === "P";
      const isCatcher = pos === "C";
      const isInfield = pos === "1B" || pos === "2B" || pos === "3B" || pos === "SS";
      const isOutfield = pos === "LF" || pos === "CF" || pos === "RF";
      const posLabel =
        isPitcher ? "pitcher"
        : isCatcher ? "catcher"
        : isInfield ? "infielder"
        : isOutfield ? "outfielder"
        : "position player";

      // Universal opener — cuff/scap + wrist/forearm prep (no fluffy "band series").
      const prep: DrillStep[] = [
        { name: "Cuff/scap activation (J-band series)", setup: "light band, anchored at shoulder height", dosage: offSeason ? "ER 2x12, IR 2x12, scap pulls 2x12, scap retractions 2x10" : "ER 1x10, IR 1x10, scap pulls 1x10", cue: "slow tempo — this is preparation, not training" },
        { name: "Wrist + forearm prep", dosage: "wrist circles 30s each way, pronation/supination 2x10, finger flicks 30s", cue: "warm the forearm before you load it" },
      ];

      // Catch-play ramp.
      const catchPlay: DrillStep[] = inSeason
        ? [
            { name: "Short catch play (warm-up toss)", dosage: "60ft x 12 throws at 60%", cue: "tall posture, finish out front, build distance" },
            { name: "Game-distance throws", dosage: `${isCatcher ? "to 90ft" : isOutfield ? "to 180ft" : "to 120ft"} x 8 throws at 80%`, cue: "intent rises only after the body says yes", stopIf: "elbow grab, shoulder pinch, or forearm tightness — stop and message Hammer" },
          ]
        : offSeason
          ? [
              { name: "Warm-up toss", dosage: "60ft x 15 throws at 60%", cue: "build slow, do not rush distance" },
              { name: "Long-toss extension", dosage: `build to comfortable max (typically ${isOutfield ? "300ft+" : "240ft+"} if cleared)`, cue: "tall arm slot, finish out front, every throw is the same effort then the same effort plus one", stopIf: "any elbow or shoulder twinge, command loss, or velo drop — stop and pull back" },
              { name: "Pull-down phase (if cleared by your throwing program)", dosage: "8 throws walking the distance in", cue: "do not exceed 90% perceived intent, do not chase a number" },
            ]
          : preSeason
            ? [
                { name: "Warm-up toss", dosage: "60ft x 12 throws at 60%", cue: "tall posture, smooth finish" },
                { name: "Extension toss", dosage: `build to ${isOutfield ? "200ft" : "150ft"} x 6 throws at 80%`, cue: "intent rising week over week, not day over day", stopIf: "any twinge — back off, do not push through" },
              ]
            : [
                { name: "Warm-up toss", dosage: "60ft x 12 throws at 60%", cue: "tall posture, smooth finish" },
                { name: "Game-distance throws", dosage: `${isCatcher ? "to 90ft" : isOutfield ? "to 180ft" : "to 120ft"} x 8 throws at 75%`, cue: "footwork before arm" },
              ];

      // Position-specific intent throws.
      const positionWork: DrillStep[] = isPitcher
        ? [
            inSeason
              ? { name: "Flat-ground command set", dosage: "20 throws to a target at 70-80%", cue: "miss small, finish the pitch out front", stopIf: "command falls off or velo drops noticeably — stop" }
              : offSeason
                ? { name: "Bullpen / flat-ground build", dosage: "30 throws, focus pitch + secondary, 75-85%", cue: "shape pitches, do not just throw them", stopIf: "any forearm tightness — shut it down" }
                : { name: "Flat-ground / light bullpen", dosage: "25 throws at 70-80%", cue: "command first, velo second" },
          ]
        : isCatcher
          ? [
              { name: "Pop-time footwork (no throw)", dosage: "8 reps", cue: "transfer first, throw second" },
              { name: "Block-to-throw rep", dosage: inSeason ? "6 game-rep throws" : "12 throws", cue: "low and balanced before you release", stopIf: "knee, hip, or shoulder pain — stop" },
            ]
          : isInfield
            ? [
                { name: "Routine ground-ball throw", dosage: inSeason ? "10 throws at 80%" : "20 throws", cue: "footwork before arm, throw on plane" },
                { name: "Double-play / quick-release rep", dosage: inSeason ? "6 reps" : "12 reps", cue: "feet square the target, the arm follows" },
              ]
            : isOutfield
              ? [
                  { name: "Crow-hop throw to a base", dosage: inSeason ? "8 throws at 85%" : "15 throws", cue: "throw through the cutoff line, do not loop it", stopIf: "any shoulder or elbow grab — stop" },
                  { name: "One-hop accuracy throw", dosage: "8 throws to a target", cue: "one-hop the cutoff, not the catcher" },
                ]
              : [
                  { name: "Mixed-position throws", dosage: inSeason ? "10 throws" : "20 throws", cue: "match footwork to the position you're throwing from" },
                ];

      // Cooldown.
      const cooldown: DrillStep[] = [
        { name: "Arm-care cooldown", dosage: "sleeper stretch 2x30s per side, cross-body 2x30s, light forearm massage 2 min", cue: "long exhales, no joint straining" },
      ];

      const drills: DrillStep[] = [...prep, ...catchPlay, ...positionWork, ...cooldown];

      // Anthropometric throwing cues + supplemental drills (additive overlay).
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
      const baseCues = [
        "Footwork before arm — every throw.",
        "Build distance and intent, never start there.",
        "If a throw feels different, the next one does not happen until you check in.",
      ];
      const anthroCues = thrOut.cues.map((c) => c.cue);

      const durationMin = inSeason ? 18 : offSeason ? 45 : preSeason ? 32 : postSeason ? 20 : 28;

      return {
        modality,
        title: inSeason
          ? `Throwing — in-season ${posLabel} maintain`
          : offSeason
            ? `Throwing — off-season ${posLabel} build`
            : preSeason
              ? `Throwing — pre-season ${posLabel} ramp`
              : `Throwing — ${posLabel}`,
        why: (inSeason
          ? `Preserve arm freshness for competition. ${posLabel}-specific reps only.`
          : offSeason
            ? `Build long-toss base and ${posLabel}-specific intent.`
            : preSeason
              ? `${posLabel.charAt(0).toUpperCase() + posLabel.slice(1)} ramp — rising effort week over week.`
              : `Arm care plus ${posLabel}-specific intent.`)
          + (goal ? ` ${goal}` : ""),
        roadmapReason: (inSeason
          ? "In-season — keep the arm fresh, save real throws for games."
          : offSeason
            ? "Off-season — build the base now so you can spend it in season."
            : preSeason
              ? "Pre-season — rising intent without overspend."
              : "Post-season — protect the joint while you stay connected.")
          + (thrOut.rationale ? ` ${thrOut.rationale}` : ""),
        phase: inSeason ? "maintain" : offSeason ? "build" : preSeason ? "build" : postSeason ? "recover" : "skill",
        steps: drillsToSteps(drills),
        drills,
        cues: [...baseCues, ...anthroCues],
        stopRules: [
          "Sharp pain anywhere in the arm — stop, ice, message Hammer.",
          "Elbow grab, shoulder pinch, or forearm tightness — stop the session.",
          "Sudden velo drop or command loss — stop, that's the body talking.",
        ],
        durationMin,
        route: "/practice?module=throwing",
        ctaLabel: "Open throwing",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: `Hammer throwing — ${posLabel} (${inSeason ? "in-season" : offSeason ? "off-season" : preSeason ? "pre-season" : postSeason ? "post-season" : "standard"})`,
          activityType: "practice",
          icon: "target",
          color: "#0ea5e9",
          durationMinutes: durationMin,
          description: `${posLabel.charAt(0).toUpperCase() + posLabel.slice(1)} throwing block: cuff/scap prep, ramped catch play, position-specific intent, cooldown.`,
          checklist: drillsToChecklist(drills),
          source: "hammer.daily.throwing",
        },
      };
    }

    case "defense": {
      if (!pos) {
        return {
          modality,
          title: "Defense — waiting on position",
          why: "Defensive drills depend on your position.",
          roadmapReason: "Missing input — tell me your primary position and I'll prescribe.",
          phase: "skill",
          steps: ["Tell me your primary position."],
          drills: [],
          cues: [],
          stopRules: [],
          durationMin: null,
          route: "#hammer-onboarding",
          ctaLabel: "Answer Hammer",
          status: "awaiting-input",
          missing: ["position_primary"],
          missingContextKeys: ["position_primary"],
          gamePlanTemplate: null,
        };
      }
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      const drills: DrillStep[] = inSeason
        ? [
            { name: "Pre-pitch + first-step reads", dosage: "10 reps", cue: "low athletic stance, weight on balls of feet" },
            { name: "Position-specific glove work", dosage: "8 reps", cue: "field through the ball, do not stab" },
            { name: "Live game-rep", dosage: "10 reps" },
          ]
        : offSeason
          ? [
              { name: "Footwork ladder", dosage: "8 min variations", cue: "quick feet, head still" },
              { name: "Pre-pitch + first-step reads", dosage: "30 reps" },
              { name: "Position-specific glove work", dosage: "25 reps" },
              { name: "Live or simulated game-rep", dosage: "15 reps" },
            ]
          : [
              { name: "Footwork ladder", dosage: "5 min" },
              { name: "Pre-pitch + first-step reads", dosage: "20 reps" },
              { name: "Position-specific glove work", dosage: "15 reps" },
              { name: "Live or simulated game-rep", dosage: "10 reps" },
            ];
      return {
        modality,
        title: `Defense — ${pos}${inSeason ? " (game-rep)" : offSeason ? " (volume)" : ""}`,
        why: (inSeason ? "Game-rep quality over volume." : offSeason ? "Footwork and range building." : "Position-specific reads, footwork, and finishes.") + (goal ? ` ${goal}` : ""),
        roadmapReason: inSeason ? "In-season — game-rep quality." : offSeason ? "Off-season — load volume + range." : "Default defense block.",
        phase: inSeason ? "sharpen" : "build",
        steps: drillsToSteps(drills),
        drills,
        cues: ["Field through the ball.", "Footwork before glove."],
        stopRules: ["Knee, ankle, or hip pain — stop and tell Hammer."],
        durationMin: inSeason ? 15 : offSeason ? 35 : 25,
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
          durationMinutes: inSeason ? 15 : offSeason ? 35 : 25,
          description: `Defensive block for ${pos}.`,
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
        { name: "Breathing / down-regulation", dosage: elevated ? "10 min" : "5 min", cue: "long exhales, longer than inhales" },
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
        why: recoverDay
          ? "Readiness is low. Recovery outranks training today."
          : workloadHigh
            ? "Workload is elevated — recovery is today's priority."
            : injuryRegions.length > 0
              ? `Injury-aware recovery (${injuryRegions.join(", ")}).`
              : seasonPhase === "in"
                ? "In-season — parasympathetic downshift between games."
                : "Lock in sleep, mobility, and parasympathetic downshift.",
        roadmapReason: recoverDay ? "Readiness below threshold — recovery first." : workloadHigh ? "Recent 7-day workload elevated." : "Default recovery block.",
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

function applyScheduleModulation(
  blocks: ReadonlyArray<PrescribedBlock>,
  signal: ScheduleSignal,
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
          case "speed":
          case "strength":
          case "defense":
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

export function buildHammerDailyPlan(
  ctx: HammerAthleteContext,
  scheduleSignal: ScheduleSignal = NORMAL_SIGNAL,
  sideBias: SideBiasForPlan | null = null,
): HammerDailyPlanResult {
  const proj = projectEnvelope(ctx);
  const speed = selectSpeedFocus(proj);
  const rawBlocks = ALL_MODALITIES.map((m) => builder({ modality: m, ctx, proj, speed }));
  const guarded = applyMinorParentSupremacy(rawBlocks, proj);
  const ordered = applyCategoryGoalOrdering(guarded, proj);
  // Schedule modulation runs AFTER goal ordering so the calendar can
  // visibly bend today's plan around games/tournaments/camps/travel.
  // It still runs BEFORE injury / parent-supremacy ceilings have any
  // further effect — those were already applied above and remain
  // dominant because suppressed blocks stay suppressed.
  const modulated = applyScheduleModulation(ordered, scheduleSignal);
  // Side-bias rider runs LAST so suppressed blocks remain suppressed
  // (no extra reps stacked on a game/tournament/injury suppression).
  const blocks = applySideBias(modulated, sideBias);
  // Lineage breadcrumb (dev-only, harmless in prod): summarises which ranking drove ordering.
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
  return {
    blocks,
    seasonPhase: proj.seasonPhase,
    missingnessCount: blocks.filter((b) => b.status === "awaiting-input").length,
    speedFocus: speed,
    schedulePosture: scheduleSignal.postureToday,
    scheduleSignal,
    sideBias,
  };
}

