/**
 * Roadmap Ladder — where the athlete sits on the long build toward the
 * elite target (MLB / AUSL 6-high-level-game weeks).
 *
 * Five rungs, resolved from training age + season phase + weekly
 * availability. Missingness-permissive: an athlete whose training age is
 * unknown lands on "Build" (the safe middle) rather than skipping to the
 * top or being pinned to the bottom.
 *
 * Pure, replay-safe. Never authors organism truth — the rung is an
 * interpretive projection only.
 */
import type { AthleteContextProjection } from "@/lib/hammer/context/decisionFilters";

export type RoadmapRung =
  | "foundation"
  | "build"
  | "bridge"
  | "peak"
  | "sustain";

export interface RoadmapRungDescriptor {
  readonly rung: RoadmapRung;
  readonly index: number;              // 1..5
  readonly label: string;
  readonly headline: string;
  readonly description: string;
  readonly volumeCeilings: {
    readonly liftSessionsPerWeek: number;
    readonly speedSessionsPerWeek: number;
    readonly batSpeedSessionsPerWeek: number;
    readonly throwsPerWeekCeiling: number;
  };
  readonly nextRung: RoadmapRung | null;
  readonly promotionCriteria: ReadonlyArray<string>;
}

export const RUNG_ORDER: ReadonlyArray<RoadmapRung> = [
  "foundation", "build", "bridge", "peak", "sustain",
];

const DESCRIPTORS: Record<RoadmapRung, RoadmapRungDescriptor> = {
  foundation: {
    rung: "foundation", index: 1,
    label: "Foundation",
    headline: "Learn the movements, earn the volume.",
    description:
      "Slow-walk build. Focus is movement quality, safe tissue exposure, and low-fatigue skill volume. The recovery clock is long on purpose — your body is still writing the movement patterns.",
    volumeCeilings: {
      liftSessionsPerWeek: 2, speedSessionsPerWeek: 1,
      batSpeedSessionsPerWeek: 2, throwsPerWeekCeiling: 90,
    },
    nextRung: "build",
    promotionCriteria: [
      "Log 4 complete lift weeks in a row",
      "Movement checkpoints hit with no injury flag for 3 weeks",
      "Training age ≥ 1 year",
    ],
  },
  build: {
    rung: "build", index: 2,
    label: "Build",
    headline: "Build capacity — you can handle real work now.",
    description:
      "Primary CNS work 2×/week, skill volume climbs, throwing ladder starts stretching. This is where general athletic capacity is added.",
    volumeCeilings: {
      liftSessionsPerWeek: 3, speedSessionsPerWeek: 2,
      batSpeedSessionsPerWeek: 3, throwsPerWeekCeiling: 140,
    },
    nextRung: "bridge",
    promotionCriteria: [
      "6 consecutive weeks at Build volume with no readiness deload",
      "Training age ≥ 2 years",
      "Consistent side-symmetry within ±10%",
    ],
  },
  bridge: {
    rung: "bridge", index: 3,
    label: "Bridge",
    headline: "Bridge to elite — full off-season program.",
    description:
      "Matches the elite 5-day off-season template. Heavy lower / upper split, max-velocity sprints, structured throwing ladder, side-independent bat-speed density.",
    volumeCeilings: {
      liftSessionsPerWeek: 4, speedSessionsPerWeek: 2,
      batSpeedSessionsPerWeek: 4, throwsPerWeekCeiling: 190,
    },
    nextRung: "peak",
    promotionCriteria: [
      "Complete a full off-season quarter at Bridge intensity",
      "Training age ≥ 3 years",
      "Sustained readiness scores ≥ 0.7 over 4 weeks",
    ],
  },
  peak: {
    rung: "peak", index: 4,
    label: "Peak",
    headline: "Elite build — near-target volumes.",
    description:
      "6-day elite template. Loads and intents approach the pro reference. Recovery clocks are tight because your tissue and CNS can handle turnaround.",
    volumeCeilings: {
      liftSessionsPerWeek: 4, speedSessionsPerWeek: 2,
      batSpeedSessionsPerWeek: 5, throwsPerWeekCeiling: 240,
    },
    nextRung: "sustain",
    promotionCriteria: [
      "In-season roster status confirmed",
      "Signed pro / collegiate elite competitive level",
      "Ability to hold Peak volumes across a full mesocycle",
    ],
  },
  sustain: {
    rung: "sustain", index: 5,
    label: "Sustain",
    headline: "Preserve & compete — pro maintenance.",
    description:
      "In-season / pro preservation. Skills sharpen daily but never at the cost of Saturday's game. Lifts and speed hold their floor at the smallest effective dose.",
    volumeCeilings: {
      liftSessionsPerWeek: 3, speedSessionsPerWeek: 1,
      batSpeedSessionsPerWeek: 6, throwsPerWeekCeiling: 260,
    },
    nextRung: null,
    promotionCriteria: [
      "Endpoint — the goal is not to leave Sustain, it is to stay healthy inside it.",
    ],
  },
};

export interface ResolvedRoadmapRung {
  readonly descriptor: RoadmapRungDescriptor;
  readonly rationale: string;
}

/**
 * Resolve which rung this athlete sits on today.
 *
 * Rules (in order):
 *   1. professional / signed → sustain
 *   2. lifting age < 1yr, U14 or younger → foundation
 *   3. in-season adult with training age ≥ 3 → sustain
 *   4. training age ≥ 5 or elite level → peak
 *   5. training age ≥ 3 → bridge
 *   6. training age ≥ 1 → build
 *   7. everything else → foundation (safe default)
 */
export function resolveRoadmapRung(proj: AthleteContextProjection): ResolvedRoadmapRung {
  const age = typeof proj.liftingAgeYears === "number" ? proj.liftingAgeYears : null;
  const band = proj.lifecycleBand ?? "";
  const phase = proj.seasonPhase ?? "";
  const isYouth = band === "u10" || band === "u12" || band === "u14";

  // Youth or brand-new lifter → foundation, no matter phase.
  if (isYouth || (age !== null && age < 1)) {
    return {
      descriptor: DESCRIPTORS.foundation,
      rationale: isYouth
        ? `Youth band (${band}) — protecting tissue and teaching movement first.`
        : `Under 1 year of lifting age — slow-walk build to keep every attempt legal.`,
    };
  }

  // In-season adults with real training age → sustain.
  if (phase === "in" && age !== null && age >= 3) {
    return {
      descriptor: DESCRIPTORS.sustain,
      rationale: "In-season with ≥3y training age — preserve capacity, prioritise game readiness.",
    };
  }

  if (age !== null && age >= 5) {
    return {
      descriptor: DESCRIPTORS.peak,
      rationale: `${age}y training age — near-elite loads unlocked, recovery clock is tight.`,
    };
  }
  if (age !== null && age >= 3) {
    return {
      descriptor: DESCRIPTORS.bridge,
      rationale: `${age}y training age — full off-season template available.`,
    };
  }
  if (age !== null && age >= 1) {
    return {
      descriptor: DESCRIPTORS.build,
      rationale: `${age}y training age — building general capacity with 2× CNS work weekly.`,
    };
  }
  return {
    descriptor: DESCRIPTORS.build,
    rationale: "Training age unknown — starting from Build (safe middle) until we learn more.",
  };
}

export function rungByKey(rung: RoadmapRung): RoadmapRungDescriptor {
  return DESCRIPTORS[rung];
}
