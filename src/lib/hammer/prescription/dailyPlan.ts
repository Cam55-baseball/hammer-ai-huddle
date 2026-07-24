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
import {
  buildEassPrescription,
  normalizePosition,
  normalizeSport,
  type EassContext,
} from "./eassLibrary";


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
      const built = buildWarmup({ context, lifecycle, gameDay: isGameDay, daySeed });
      const drills: DrillStep[] = built.drills.map((d) => ({
        name: d.name,
        setup: d.setup,
        dosage: d.dosage,
        cue: d.cue,
        stopIf: d.stopIf,
      }));
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
      return {
        modality,
        title: titleByContext[contextKey] ?? titleByContext.default,
        why: whyByContext[contextKey] ?? whyByContext.default,
        roadmapReason: roadmapByContext[contextKey] ?? roadmapByContext.default,
        phase: isGameDay || isRecoveryDay ? "maintain" : "build",
        steps: drillsToSteps(drills),
        drills,
        cues: [
          "Move slow first, fast last — tissue before intent.",
          "Every rep is honest — no drift, no going through the motions.",
          "Fascial and fast-twitch drills earn everything downstream.",
        ],
        stopRules: [
          "Sharp pain (not muscle soreness) — stop and tell Hammer where.",
          "Any pull or tightness on a fast-twitch drill — end the fast-twitch portion.",
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

      // EASS — Elastic Arm Speed & Underload Throwing System.
      // Whole-body, fast-object-first, position + sport aware, safety supreme.
      const sportRaw = (ctx.get<string>("sport_primary")?.value as string | null) ?? null;
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

      // Map EASS drills → DrillStep shape used by the UI.
      const drills: DrillStep[] = eass.drills.map((d) => ({
        name: d.name,
        setup: d.setup,
        dosage: d.dosage,
        cue: d.cue,
        stopIf: d.stopIf,
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
  readonly sideBias: SideBiasForPlan | null;
  /** Rolling 7d game-performance bias tags applied to today's ordering. */
  readonly gpBiasTags: ReadonlyArray<string>;
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

export function buildHammerDailyPlan(
  ctx: HammerAthleteContext,
  scheduleSignal: ScheduleSignal = NORMAL_SIGNAL,
  sideBias: SideBiasForPlan | null = null,
  gpSignal: GpSignalForPlan | null = null,
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
  // Side-bias rider runs after schedule so suppressed blocks remain suppressed
  // (no extra reps stacked on a game/tournament/injury suppression).
  const sided = applySideBias(modulated, sideBias);
  // GP-signal bias runs LAST so it never overrides schedule suppression,
  // injury ceilings, parent-supremacy, goal ordering, or side bias; it only
  // promotes a few modalities to the front of the ready set + adds cues.
  const { blocks, tags: gpBiasTags } = applyGpSignalBias(sided, gpSignal);
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
  };
}


