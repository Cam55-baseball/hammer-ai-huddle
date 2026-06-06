/**
 * Hammer Daily Plan — 9-modality orchestrator.
 *
 * P0-3 completion: deepens consumption of the canonical context envelope so
 * that 7 distinct personas produce 7 distinct fingerprints. No new schema, no
 * new variables — only deeper branching against fields already projected by
 * `decisionFilters.projectEnvelope` + `decisionFilters.selectSpeedFocus`.
 *
 * Every block remains pure (no I/O), preserves missingness (`awaiting-input`
 * status when antecedents are absent), and never fabricates certainty.
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

export interface PrescribedBlock {
  readonly modality: ModalityKey;
  readonly title: string;
  readonly why: string;
  readonly steps: ReadonlyArray<string>;
  readonly durationMin: number | null;
  readonly route: string;
  readonly ctaLabel: string;
  readonly status: BlockStatus;
  readonly missing: ReadonlyArray<string>;
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
    case "warmup":
      return {
        modality,
        title:
          seasonPhase === "in"
            ? "Dynamic warm-up — game-ready"
            : seasonPhase === "off"
              ? "Dynamic warm-up — extended"
              : "Dynamic warm-up",
        why:
          seasonPhase === "in"
            ? "Prime CNS without spending — short and sharp."
            : "Prime nervous system, joints, and breathing pattern.",
        steps:
          seasonPhase === "in"
            ? [
                "3 min light cardio",
                "Hip openers · ankle mobility · t-spine rotations",
                "Band activation × 1 set",
              ]
            : seasonPhase === "off"
              ? [
                  "8 min light cardio (jog, jump rope, or bike)",
                  "Full mobility flow — hips · ankles · t-spine · shoulders",
                  "Med-ball or band activation × 3 sets",
                ]
              : [
                  "5 min light cardio (jog, jump rope, or bike)",
                  "Hip openers · ankle mobility · t-spine rotations",
                  "Med-ball or band activation × 2 sets",
                ],
        durationMin: seasonPhase === "in" ? 8 : seasonPhase === "off" ? 18 : 12,
        route: "/tex-vision",
        ctaLabel: "Start warm-up",
        status: "ready",
        missing: [],
      };

    case "speed": {
      // Drive speed block entirely from selectSpeedFocus → 7 distinct foci possible.
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
      const stepMap: Record<typeof focus, string[]> = {
        deload: ["Light tempo runs only — no max effort", "Mobility finisher"],
        tempo_recovery: [
          "A-skips · build-ups (sub-max)",
          `${speed.recommendedReps} × tempo runs @ 70%`,
          "Recovery walk between reps",
        ],
        unilateral_symmetry: [
          "Single-leg pogo × 3 × 6 per side",
          `${speed.recommendedReps} × unilateral bounds`,
          "Split-stance starts × 4 per side",
        ],
        offseason_volume: [
          "A-skips · build-ups",
          `${speed.recommendedReps} × 40m sprints @ 90%`,
          "Resisted starts × 3",
          "Long-acceleration runs × 2",
        ],
        inseason_freshness: [
          "A-skips · 2 build-ups",
          `${speed.recommendedReps} × 20m sprints @ 95% (full recovery)`,
          "Stop early if anything tightens",
        ],
        max_velocity: [
          "A-skips · 3 build-ups",
          `${speed.recommendedReps} × flying 20m @ 100%`,
          "Full recovery between reps",
        ],
        acceleration_base: [
          "A-skips · build-ups",
          `${speed.recommendedReps} × 10-yard starts @ 100%`,
          "Optional resisted starts × 3",
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
      const suppressed = focus === "deload" || focus === "tempo_recovery";
      return {
        modality,
        title: recoverDay ? "Speed — skipped (recovery)" : titleMap[focus],
        why: recoverDay
          ? "Readiness is low; protecting tomorrow's session."
          : speed.rationale + (goal ? ` ${goal}` : ""),
        steps: recoverDay ? ["Light tempo runs only — no max effort."] : stepMap[focus],
        durationMin: recoverDay ? 0 : durationMap[focus],
        route: recoverDay || suppressed ? "/bounce-back-bay" : "/speed-lab",
        ctaLabel: recoverDay ? "Recover instead" : "Start speed work",
        status: recoverDay ? "suppressed" : "ready",
        missing: [],
      };
    }

    case "strength": {
      if (liftingAge === null) {
        return {
          modality,
          title: "Strength — waiting on lifting age",
          why: "Hammer prescribes intensity from your training history.",
          steps: ["Tell me how many years you've been lifting."],
          durationMin: null,
          route: "/command",
          ctaLabel: "Answer Hammer",
          status: "awaiting-input",
          missing: ["lifting_age_years"],
        };
      }

      // Season-phase template (RR-derived, additive).
      const phaseTemplate =
        seasonPhase === "off"
          ? { name: "off-season volume", sets: "4×6", durationBase: 55 }
          : seasonPhase === "pre"
            ? { name: "pre-season strength", sets: "4×4", durationBase: 50 }
            : seasonPhase === "in"
              ? { name: "in-season potentiation", sets: "3×3", durationBase: 35 }
              : seasonPhase === "post"
                ? { name: "post-season recovery", sets: "2×8", durationBase: 30 }
                : { name: "standard", sets: "3×5", durationBase: 50 };

      // Injury-suppressed patterns: pick a safe pull/push if regions block max lifts.
      const heavyLiftBlocked =
        injuryRegions.includes("back") ||
        injuryRegions.includes("lumbar") ||
        injuryRegions.includes("knee") ||
        injuryRegions.includes("hamstring");

      // Equipment-restricted template.
      const baseSteps = bodyweightOnly
        ? [
            "Bodyweight squat / lunge — 3×8 quality reps",
            "Push-up progression — 3×8",
            "Band row variation — 3×10",
            "Core + posture finisher — 2×30s",
          ]
        : youthScale
          ? [
              "Bodyweight squat / lunge — 2×8 quality reps",
              "Push-up progression — 2×6",
              "Row variation — 2×8",
              "Core + posture finisher — 2×30s",
            ]
          : heavyLiftBlocked
            ? [
                "Main: goblet squat or hip-hinge (sub-max) — 3×8",
                "Push: bench or DB press — 3×6",
                "Pull: row or chin-up — 3×8",
                "Posterior chain accessory (controlled) — 2×10",
              ]
            : [
                `Main: trap-bar deadlift or squat — ${phaseTemplate.sets}`,
                `Push: bench or DB press — ${phaseTemplate.sets}`,
                "Pull: row or chin-up — 3×8",
                "Posterior chain accessory — 2×10",
              ];

      // Development-priority accessory swap.
      const finisher: string | null = devPriorities.includes("power")
        ? "Accessory finisher: jump or med-ball throw — 4×3 (priority: power)"
        : devPriorities.includes("mobility")
          ? "Accessory finisher: mobility flow — 8 min (priority: mobility)"
          : devPriorities.includes("speed")
            ? "Accessory finisher: short-contact pogos — 3×8 (priority: speed)"
            : devPriorities.includes("recovery")
              ? "Accessory finisher: down-regulation breathing — 5 min (priority: recovery)"
              : null;

      const steps = finisher ? [...baseSteps, finisher] : baseSteps;

      const title = youthScale
        ? "Strength — youth template"
        : bodyweightOnly
          ? `Strength — bodyweight (${equipment})`
          : heavyLiftBlocked
            ? "Strength — injury-modified"
            : workloadHigh
              ? `Strength — auto-deload (${phaseTemplate.name})`
              : `Strength — ${phaseTemplate.name}`;

      const why = recoverDay
        ? "Deload day — preserve quality, drop volume."
        : workloadHigh
          ? "Workload is high — protecting recovery; volume reduced."
          : heavyLiftBlocked
            ? `Injury-aware template (${injuryRegions.join(", ")}) — sub-max patterning only.`
            : youthScale
              ? "Movement-quality bias for developing athletes; no max-effort loading."
              : devPriorities.includes("strength")
                ? `Development priority — drive force production (${phaseTemplate.name}).`
                : `Force production (${phaseTemplate.name}).` + (goal ? ` ${goal}` : "");

      const duration = recoverDay
        ? 30
        : workloadHigh
          ? Math.max(25, phaseTemplate.durationBase - 15)
          : youthScale
            ? 25
            : bodyweightOnly
              ? lowAvail
                ? 25
                : 30
              : lowAvail
                ? Math.max(35, phaseTemplate.durationBase - 10)
                : phaseTemplate.durationBase;

      return {
        modality,
        title,
        why,
        steps,
        durationMin: duration,
        route: "/training-block",
        ctaLabel: "Open lift",
        status: "ready",
        missing: [],
      };
    }

    case "hitting": {
      if (!equipment) {
        return {
          modality,
          title: "Hitting — waiting on equipment",
          why: "I prescribe drills from what you can actually use.",
          steps: ["Tell me what hitting equipment you have access to."],
          durationMin: null,
          route: "/command",
          ctaLabel: "Answer Hammer",
          status: "awaiting-input",
          missing: ["equipment_access"],
        };
      }
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      const title = inSeason
        ? "Hitting — in-season quality"
        : offSeason
          ? "Hitting — off-season build"
          : "Hitting";
      const steps = inSeason
        ? [
            "Tee work — barrel path × 10",
            "Front toss — pitch recognition × 10",
            "Live BP × 10 (quality > volume)",
          ]
        : offSeason
          ? [
              "Tee work — barrel path × 30",
              "Front toss — sequence drill × 25",
              "Live BP or machine if available × 40",
              "Track + tag swings in PIE",
            ]
          : [
              "Tee work — barrel path × 20",
              "Front toss — sequence drill × 15",
              "Live BP or machine if available × 25",
              "Track + tag swings in PIE",
            ];
      return {
        modality,
        title,
        why:
          (inSeason
            ? "Sharpen timing without spending."
            : offSeason
              ? "Volume + mechanical rebuild."
              : "Quality reps targeting your weakness pattern.") +
          (goal ? ` ${goal}` : ""),
        steps,
        durationMin: inSeason ? 20 : offSeason ? 45 : 35,
        route: "/practice?module=hitting",
        ctaLabel: "Start hitting",
        status: "ready",
        missing: [],
      };
    }

    case "throwing": {
      if (pos === "DH" || pos === "designated_hitter") {
        return {
          modality,
          title: "Throwing — not in your role",
          why: "Position does not require a throwing block today.",
          steps: [],
          durationMin: 0,
          route: "/practice",
          ctaLabel: "Skip",
          status: "suppressed",
          missing: [],
        };
      }
      const armBlocked =
        injuryRegions.includes("shoulder") ||
        injuryRegions.includes("ucl") ||
        injuryRegions.includes("elbow");
      if (armBlocked) {
        return {
          modality,
          title: "Throwing — arm-protected",
          why: `Injury (${injuryRegions.join(", ")}) — no max throws today; arm-care only.`,
          steps: [
            "Band series — 3 rounds",
            "Sub-max catch play to comfortable distance",
            "Arm-care cooldown",
          ],
          durationMin: 15,
          route: "/practice?module=throwing",
          ctaLabel: "Open arm-care",
          status: "ready",
          missing: [],
        };
      }
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      return {
        modality,
        title: inSeason
          ? "Throwing — in-season maintain"
          : offSeason
            ? "Throwing — off-season build"
            : "Throwing",
        why:
          (inSeason
            ? "Preserve arm freshness for competition."
            : offSeason
              ? "Build long-toss base and intent."
              : "Arm care + position-specific intent.") +
          (goal ? ` ${goal}` : ""),
        steps: inSeason
          ? [
              "Band series — 1 round",
              "Short catch play to game distance",
              "Position-specific throws × 8",
              "Arm-care cooldown",
            ]
          : offSeason
            ? [
                "Band series — 2 rounds",
                "Long-toss progression to max comfortable distance",
                "Pull-down phase × 8 (if cleared)",
                "Position-specific throws × 20",
                "Arm-care cooldown",
              ]
            : [
                "Band series — 2 rounds",
                "Long-toss progression to comfortable distance",
                "Position-specific throws × 15",
                "Arm-care cooldown",
              ],
        durationMin: inSeason ? 15 : offSeason ? 40 : 25,
        route: "/practice?module=throwing",
        ctaLabel: "Start throwing",
        status: "ready",
        missing: [],
      };
    }

    case "defense": {
      if (!pos) {
        return {
          modality,
          title: "Defense — waiting on position",
          why: "Defensive drills depend on your position.",
          steps: ["Tell me your primary position."],
          durationMin: null,
          route: "/command",
          ctaLabel: "Answer Hammer",
          status: "awaiting-input",
          missing: ["position"],
        };
      }
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      return {
        modality,
        title: `Defense — ${pos}${inSeason ? " (game-rep)" : offSeason ? " (volume)" : ""}`,
        why:
          (inSeason
            ? "Game-rep quality over volume."
            : offSeason
              ? "Footwork & range building."
              : "Position-specific reads, footwork, and finishes.") +
          (goal ? ` ${goal}` : ""),
        steps: inSeason
          ? [
              "Pre-pitch + first-step reads × 10",
              "Position-specific glove work × 8",
              "Live game-rep × 10",
            ]
          : offSeason
            ? [
                "Footwork ladder × 8 min",
                "Pre-pitch + first-step reads × 30",
                "Position-specific glove work × 25",
                "Live or simulated game-rep × 15",
              ]
            : [
                "Footwork ladder × 5 min",
                "Pre-pitch + first-step reads × 20",
                "Position-specific glove work × 15",
                "Live or simulated game-rep × 10",
              ],
        durationMin: inSeason ? 15 : offSeason ? 35 : 25,
        route: "/practice?module=defense",
        ctaLabel: "Start defense",
        status: "ready",
        missing: [],
      };
    }

    case "baserunning": {
      const legBlocked =
        injuryRegions.includes("hamstring") ||
        injuryRegions.includes("ankle") ||
        injuryRegions.includes("knee") ||
        injuryRegions.includes("groin");
      if (legBlocked) {
        return {
          modality,
          title: "Baserunning — IQ only (leg-protected)",
          why: `Injury (${injuryRegions.join(", ")}) — no sprint reps; mental reps only.`,
          steps: [
            "Pickoff read film × 10 min",
            "Lead/secondary footwork (walk pace) × 10",
          ],
          durationMin: 10,
          route: "/baserunning-iq",
          ctaLabel: "Open baserunning",
          status: "ready",
          missing: [],
        };
      }
      const inSeason = seasonPhase === "in";
      return {
        modality,
        title: inSeason ? "Baserunning — game scenarios" : "Baserunning IQ",
        why: inSeason
          ? "Sharpen game-decision speed."
          : "Decision speed beats foot speed.",
        steps: inSeason
          ? [
              "Pickoff reads × 8",
              "First-to-third / tag-up scenarios × 5",
            ]
          : [
              "Lead + secondary footwork × 10",
              "Pickoff reads × 10 (with partner if possible)",
              "First-to-third / tag-up scenarios × 5",
            ],
        durationMin: inSeason ? 10 : 15,
        route: "/baserunning-iq",
        ctaLabel: "Open baserunning",
        status: "ready",
        missing: [],
      };
    }

    case "fueling": {
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      const shortHorizon = proj.goalHorizon === "short";
      const title = inSeason
        ? "Fueling — game-day carb-forward"
        : offSeason
          ? "Fueling — body-composition aware"
          : "Fueling";
      const steps = inSeason
        ? [
            "Pre-game: complex carb + small protein (90–120 min before)",
            "Intra: water + electrolytes; carb gel if > 90 min",
            "Post-game: 0.4 g/kg protein + carb within 45 min",
          ]
        : offSeason
          ? [
              "Pre-session: complex carb + protein (60–90 min before)",
              "Intra-session: water + electrolytes if > 60 min",
              "Post-session: 0.3 g/kg protein + carb within 60 min",
              "Daily: track protein target for body-comp goal",
            ]
          : [
              "Pre-session: complex carb + small protein (60–90 min before)",
              "Intra-session: water + electrolytes if > 60 min",
              "Post-session: 0.3 g/kg protein + carb within 60 min",
            ];
      return {
        modality,
        title,
        why:
          (inSeason
            ? "Carb-forward during competition; recover hard between games."
            : offSeason
              ? "Use the runway: dial composition before volume drops."
              : "Carbs before output. Protein and fluids after.") +
          (shortHorizon ? " Short horizon — execution > optimization." : ""),
        steps,
        durationMin: null,
        route: "/nutrition-hub",
        ctaLabel: "Plan meals",
        status: "ready",
        missing: [],
      };
    }

    case "recovery": {
      const elevated =
        recoverDay || workloadHigh || seasonPhase === "in" || injuryRegions.length > 0;
      const title = recoverDay
        ? "Recovery — priority"
        : workloadHigh
          ? "Recovery — workload-elevated"
          : injuryRegions.length > 0
            ? "Recovery — injury-aware"
            : seasonPhase === "in"
              ? "Recovery — in-season"
              : "Recovery";
      const why = recoverDay
        ? "Readiness is low. Recovery work outranks training today."
        : workloadHigh
          ? "Workload is elevated — recovery is today's priority."
          : injuryRegions.length > 0
            ? `Injury-aware recovery (${injuryRegions.join(", ")}).`
            : seasonPhase === "in"
              ? "In-season — lock parasympathetic downshift between games."
              : "Lock in sleep, mobility, and parasympathetic downshift.";
      const steps = [
        elevated ? "15 min mobility / foam roll" : "10 min mobility / foam roll",
        elevated ? "10 min breathing or guided downshift" : "5 min breathing or guided downshift",
        "Hydrate + plan tomorrow's wake time",
        injury ? `Mind your injury notes: ${injury}` : "Note any new soreness in Vault",
      ];
      return {
        modality,
        title,
        why,
        steps,
        durationMin: elevated ? 30 : 20,
        route: "/bounce-back-bay",
        ctaLabel: "Open recovery",
        status: "ready",
        missing: [],
      };
    }
  }
}

export interface HammerDailyPlanResult {
  readonly blocks: ReadonlyArray<PrescribedBlock>;
  readonly seasonPhase: string | null;
  readonly missingnessCount: number;
  readonly speedFocus: SpeedFocusDecision;
}

export function buildHammerDailyPlan(ctx: HammerAthleteContext): HammerDailyPlanResult {
  const proj = projectEnvelope(ctx);
  const speed = selectSpeedFocus(proj);
  const blocks = ALL_MODALITIES.map((m) => builder({ modality: m, ctx, proj, speed }));
  return {
    blocks,
    seasonPhase: proj.seasonPhase,
    missingnessCount: blocks.filter((b) => b.status === "awaiting-input").length,
    speedFocus: speed,
  };
}
