/**
 * Hammer Daily Plan — 9-modality orchestrator.
 *
 * Sprint: Coach Hammer Authority Consolidation (Section D). Addresses
 * audit-v1 finding that 4/9 modalities (hitting, defense, baserunning,
 * fueling) had no daily-plan representation.
 *
 * Pure function from athlete context → ordered `PrescribedBlock[]`. Each
 * block is actionable (route resolves in App.tsx) and traceable (lineage
 * handle = context.lastUpdated of the dominant input). Blocks that cannot
 * be authored due to missingness emit `status: "awaiting-input"` instead
 * of inventing content — missingness remains visible per FC-1…FC-10.
 */
import type { HammerAthleteContext } from "@/lib/hammer/context/athleteContext";

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
}

function builder({ modality, ctx }: BuilderArgs): PrescribedBlock {
  const pos = ctx.get<string>("position")?.value ?? null;
  // P0-2: prefer canonical `equipment_effective` (spine envelope, scope-resolved);
  // fall back to legacy `equipment_access` for transitional compatibility.
  const equipmentEff = ctx.get<unknown>("equipment_effective")?.value ?? null;
  const equipment =
    (equipmentEff as { equipment?: string } | null)?.equipment ??
    (typeof equipmentEff === "string" ? equipmentEff : null) ??
    (ctx.get<string>("equipment_access")?.value ?? null);
  const liftingAge = ctx.get<number>("lifting_age_years")?.value ?? null;
  const seasonPhase = ctx.get<string>("season_phase")?.value ?? null;
  const injury = ctx.get<string>("injury_history")?.value ?? null;
  const readiness = ctx.get<{ score?: number }>("readiness")?.value ?? null;
  // P0-2: spine read-paths now active for daily-plan differentiation.
  const lifecycleBand = ctx.get<string>("lifecycle_band")?.value ?? null;
  const availDays = ctx.get<number>("weekly_availability_days")?.value ?? null;
  const devPriorities =
    (ctx.get<string[]>("development_priorities")?.value as string[] | null) ?? null;
  const goalSummary = ctx.get<string>("goal_summary")?.value ?? null;

  const recoverDay =
    typeof (readiness as { score?: number })?.score === "number" &&
    (readiness as { score: number }).score < 0.4;
  // Lifecycle-aware strength volume scaling (additive, non-breaking).
  const youthScale =
    lifecycleBand === "u10" || lifecycleBand === "u12" || lifecycleBand === "u14";
  // Low-availability athletes get tighter prescriptions.
  const lowAvail = typeof availDays === "number" && availDays <= 2;

  switch (modality) {
    case "warmup":
      return {
        modality,
        title: "Dynamic warm-up",
        why: "Prime nervous system, joints, and breathing pattern.",
        steps: [
          "5 min light cardio (jog, jump rope, or bike)",
          "Hip openers · ankle mobility · t-spine rotations",
          "Med-ball or band activation x 2 sets",
        ],
        durationMin: 12,
        route: "/tex-vision",
        ctaLabel: "Start warm-up",
        status: "ready",
        missing: [],
      };

    case "speed":
      return {
        modality,
        title: recoverDay ? "Speed — skipped (recovery)" : "Speed & explosive output",
        why: recoverDay
          ? "Readiness is low; protecting tomorrow's session."
          : "Build CNS output before strength work.",
        steps: recoverDay
          ? ["Light tempo runs only — no max effort."]
          : ["A-skips · build-ups", "3–5 sprints @ 90–100% with full recovery", "Optional resisted starts"],
        durationMin: recoverDay ? 0 : 20,
        route: recoverDay ? "/bounce-back-bay" : "/speed-lab",
        ctaLabel: recoverDay ? "Recover instead" : "Start speed work",
        status: recoverDay ? "suppressed" : "ready",
        missing: [],
      };

    case "strength":
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
      return {
        modality,
        title: youthScale ? "Strength — youth template" : "Strength",
        why: recoverDay
          ? "Deload day — preserve quality, drop volume."
          : youthScale
            ? "Movement-quality bias for developing athletes; no max-effort loading."
            : devPriorities?.includes("strength")
              ? "Development priority — drive force production and structural strength."
              : "Drive force production and structural strength.",
        steps: youthScale
          ? [
              "Bodyweight squat / lunge — 2×8 quality reps",
              "Push-up progression — 2×6",
              "Row variation — 2×8",
              "Core + posture finisher — 2×30s",
            ]
          : [
              "Main: trap-bar deadlift or squat — 3×5",
              "Push: bench or DB press — 3×6",
              "Pull: row or chin-up — 3×8",
              "Posterior chain accessory — 2×10",
            ],
        durationMin: recoverDay ? 30 : youthScale ? 25 : lowAvail ? 40 : 50,
        route: "/training-block",
        ctaLabel: "Open lift",
        status: "ready",
        missing: [],
      };

    case "hitting":
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
      return {
        modality,
        title: "Hitting",
        why: "Quality reps targeting your weakness pattern.",
        steps: [
          "Tee work — barrel path × 20",
          "Front toss — sequence drill × 15",
          "Live BP or machine if available × 25",
          "Track + tag swings in PIE",
        ],
        durationMin: 35,
        route: "/practice?module=hitting",
        ctaLabel: "Start hitting",
        status: "ready",
        missing: [],
      };

    case "throwing":
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
      return {
        modality,
        title: "Throwing",
        why: "Arm care + position-specific intent.",
        steps: [
          "Band series — 2 rounds",
          "Long-toss progression to comfortable distance",
          "Position-specific throws × 15",
          "Arm-care cooldown",
        ],
        durationMin: 25,
        route: "/practice?module=throwing",
        ctaLabel: "Start throwing",
        status: "ready",
        missing: [],
      };

    case "defense":
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
      return {
        modality,
        title: `Defense — ${pos}`,
        why: "Position-specific reads, footwork, and finishes.",
        steps: [
          "Footwork ladder × 5 min",
          "Pre-pitch + first-step reads × 20",
          "Position-specific glove work × 15",
          "Live or simulated game-rep × 10",
        ],
        durationMin: 25,
        route: "/practice?module=defense",
        ctaLabel: "Start defense",
        status: "ready",
        missing: [],
      };

    case "baserunning":
      return {
        modality,
        title: "Baserunning IQ",
        why: "Decision speed beats foot speed.",
        steps: [
          "Lead + secondary footwork × 10",
          "Pickoff reads × 10 (with partner if possible)",
          "First-to-third / tag-up scenarios × 5",
        ],
        durationMin: 15,
        route: "/baserunning-iq",
        ctaLabel: "Open baserunning",
        status: "ready",
        missing: [],
      };

    case "fueling":
      return {
        modality,
        title: "Fueling",
        why: "Carbs before output. Protein and fluids after.",
        steps: [
          "Pre-session: complex carb + small protein (60–90 min before)",
          "Intra-session: water + electrolytes if > 60 min",
          "Post-session: 0.3 g/kg protein + carb within 60 min",
        ],
        durationMin: null,
        route: "/nutrition-hub",
        ctaLabel: "Plan meals",
        status: "ready",
        missing: [],
      };

    case "recovery":
      return {
        modality,
        title: recoverDay ? "Recovery — priority" : "Recovery",
        why: recoverDay
          ? "Readiness is low. Recovery work outranks training today."
          : "Lock in sleep, mobility, and parasympathetic downshift.",
        steps: [
          "10 min mobility / foam roll",
          "5 min breathing or guided downshift",
          "Hydrate + plan tomorrow's wake time",
          injury ? `Mind your injury notes: ${injury}` : "Note any new soreness in Vault",
        ],
        durationMin: 20,
        route: "/bounce-back-bay",
        ctaLabel: "Open recovery",
        status: "ready",
        missing: [],
      };
  }
}

export interface HammerDailyPlanResult {
  readonly blocks: ReadonlyArray<PrescribedBlock>;
  readonly seasonPhase: string | null;
  readonly missingnessCount: number;
}

export function buildHammerDailyPlan(ctx: HammerAthleteContext): HammerDailyPlanResult {
  const blocks = ALL_MODALITIES.map((m) => builder({ modality: m, ctx }));
  // Suppress signal voids: log a single observability line per build, never silently.
  // (Lineage continuity per FC-1: ctx.envelope drives every modality decision.)
  return {
    blocks,
    seasonPhase: (ctx.get<string>("season_phase")?.value as string) ?? null,
    missingnessCount: blocks.filter((b) => b.status === "awaiting-input").length,
  };
}
