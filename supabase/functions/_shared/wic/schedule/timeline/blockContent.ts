// What each offseason block programs — training-intelligence-v1 §7.2/§7.3/§7.4.
// Pure: no clock, no I/O, no database.

import type { ArcBlockKey } from "./offseasonArc.ts";
import type { MethodKey } from "../../dosage/methods.ts";

export const BLOCK_CONTENT_VERSION = "offseason-block-content-v1";

export type JumpTier = 1 | 2 | 3;
export type SledTool = "heavy_push" | "backward_drag" | "resisted_acceleration";
export type MedBallMode = "extensive" | "extensive_rotational" | "light" | "intensive";

export interface BlockContent {
  readonly key: ArcBlockKey;
  /** Main compound method for heavy-eligible athletes. Foundation gets null. */
  readonly heavyMethod: MethodKey | null;
  /** Second method on alternating days (B4 Lift A / Lift B). */
  readonly heavyMethodAlt: MethodKey | null;
  /** Foundation tempo note, doses unchanged (§7.2 row 2). */
  readonly foundationTempo: string | null;
  /** Jump tiers this block may program, best first. */
  readonly jumpTiers: readonly JumpTier[];
  readonly sledTools: readonly SledTool[];
  readonly medBall: MedBallMode;
  readonly sprint: string;
  readonly surfaceHint: string;
  /** Intensity classes / features this block must never program (§7.2 "Out"). */
  readonly out: readonly string[];
  readonly contrastPairs: readonly (readonly [string, string])[];
  /** High-rep tissue work volume for the block. */
  readonly tissue: "high" | "moderate" | "low";
}

const B4_CONTRAST_PAIRS = Object.freeze([
  Object.freeze(["squat", "jump"] as const),
  Object.freeze(["trap_bar", "broad_jump"] as const),
  Object.freeze(["split_squat", "split_jump"] as const),
  Object.freeze(["landmine_press", "med_ball_chest_pass"] as const),
] as const);

export const BLOCK_CONTENT: Readonly<Record<ArcBlockKey, BlockContent>> = Object.freeze({
  B1: Object.freeze({
    key: "B1",
    heavyMethod: "heavy_triples",
    heavyMethodAlt: null,
    foundationTempo: null,
    jumpTiers: Object.freeze([1] as const),
    sledTools: Object.freeze(["backward_drag"] as const),
    medBall: "extensive",
    sprint: "acceleration technique, short runs",
    surfaceHint: "sand or grass",
    out: Object.freeze([
      "tier2_jumps",
      "tier3_jumps",
      "altitude_landings",
      "max_intent_jumps",
      "double_eccentric",
    ] as const),
    contrastPairs: Object.freeze([] as const),
    tissue: "high",
  }),
  B2: Object.freeze({
    key: "B2",
    heavyMethod: "double_eccentric",
    heavyMethodAlt: null,
    foundationTempo: "3-1-1-0",
    jumpTiers: Object.freeze([1, 2] as const),
    sledTools: Object.freeze(["heavy_push", "resisted_acceleration", "backward_drag"] as const),
    medBall: "extensive_rotational",
    sprint: "acceleration plus light resisted runs",
    surfaceHint: "grass, dirt or turf",
    out: Object.freeze(["tier3_jumps", "banded_velocity"] as const),
    contrastPairs: Object.freeze([] as const),
    tissue: "high",
  }),
  B3: Object.freeze({
    key: "B3",
    heavyMethod: null,
    heavyMethodAlt: null,
    foundationTempo: null,
    jumpTiers: Object.freeze([1] as const),
    sledTools: Object.freeze(["backward_drag"] as const),
    medBall: "light",
    sprint: "ramp alongside sport volume",
    surfaceHint: "any",
    out: Object.freeze(["double_eccentric", "tier3_jumps"] as const),
    contrastPairs: Object.freeze([] as const),
    tissue: "low",
  }),
  B4: Object.freeze({
    key: "B4",
    heavyMethod: "heavy_triples",
    heavyMethodAlt: "banded_velocity",
    foundationTempo: null,
    jumpTiers: Object.freeze([3, 2, 1] as const),
    sledTools: Object.freeze(["resisted_acceleration", "heavy_push"] as const),
    medBall: "intensive",
    sprint: "max velocity plus acceleration",
    surfaceHint: "firm ground for reactive jumps; sprints on grass or dirt",
    out: Object.freeze([
      "double_eccentric",
      "eccentric_overload",
      "new_heavy_max_work",
    ] as const),
    contrastPairs: B4_CONTRAST_PAIRS,
    tissue: "low",
  }),
  B5: Object.freeze({
    key: "B5",
    heavyMethod: "overcoming_isometric",
    heavyMethodAlt: "heavy_triples",
    foundationTempo: null,
    jumpTiers: Object.freeze([1, 3] as const),
    sledTools: Object.freeze(["heavy_push"] as const),
    medBall: "intensive",
    sprint: "short and sharp with full rest; baserunning",
    surfaceHint: "game surface",
    out: Object.freeze(["novelty", "eccentric_overload", "volume_builds"] as const),
    contrastPairs: Object.freeze([] as const),
    tissue: "low",
  }),
} as const);

export interface JumpTierInput {
  readonly block: ArcBlockKey | null;
  /** "os_q1".."os_q4" | "in_season" | "post_season" */
  readonly phase: string;
  readonly ageYears: number | null | undefined;
  readonly trainingAgeYears: number | null | undefined;
  readonly growthMode?: boolean | null;
  /** Completed T1 sessions in the last 8 weeks. */
  readonly t1SessionsLast8Weeks: number;
  /** Completed T2 sessions in the last 10 weeks. */
  readonly t2SessionsLast10Weeks: number;
  /** Any pain flag in the last 14 days. */
  readonly painFlagLast14Days: boolean;
}

export interface JumpTierResult {
  readonly maxTier: JumpTier;
  readonly reasons: readonly string[];
}

/**
 * §7.3 — the highest jump tier this athlete may receive today.
 * Tiers are earned, never given: T2 needs 6 T1 sessions in 8 weeks, T3 needs
 * 6 T2 sessions in 10 weeks and a clean 14 days.
 */
export function maxJumpTier(input: JumpTierInput): JumpTierResult {
  const reasons: string[] = [];
  const phase = (input.phase ?? "").toLowerCase();
  if (phase === "in_season" || phase === "post_season") {
    return { maxTier: 1, reasons: ["In season — low, rhythmic jumps only."] };
  }
  if (input.growthMode === true) {
    return { maxTier: 1, reasons: ["Growth Mode — low, rhythmic jumps only."] };
  }

  const age = Number(input.ageYears ?? 0);
  const trainingAge = Number(input.trainingAgeYears ?? 0);
  const blockTiers = input.block ? BLOCK_CONTENT[input.block].jumpTiers : ([1] as const);
  const blockMax = Math.max(...blockTiers) as JumpTier;

  let tier: JumpTier = 1;

  const t2Ready = age >= 14 && trainingAge >= 3 && input.t1SessionsLast8Weeks >= 6;
  if (t2Ready) tier = 2;
  else if (input.t1SessionsLast8Weeks < 6) reasons.push("Absorption jumps unlock after 6 low-jump sessions in 8 weeks.");
  else if (age < 14) reasons.push("Absorption jumps start at 14.");

  const t3Ready =
    tier === 2 &&
    age >= 16 &&
    trainingAge >= 6 &&
    input.t2SessionsLast10Weeks >= 6 &&
    !input.painFlagLast14Days;
  if (t3Ready) tier = 3;
  else if (tier === 2) {
    if (age < 16) reasons.push("Reactive jumps start at 16.");
    else if (input.painFlagLast14Days) reasons.push("Something hurt in the last two weeks — no reactive jumps.");
    else if (input.t2SessionsLast10Weeks < 6) reasons.push("Reactive jumps unlock after 6 absorption sessions in 10 weeks.");
  }

  if (tier > blockMax) {
    tier = blockMax;
    reasons.push(`This block trains up to tier ${blockMax}.`);
  }

  return { maxTier: tier, reasons };
}

/** §7.4 — the cue every T2, T3 and max-sprint row carries. */
export const QUALITY_GATE_CUE =
  "Stop the set if landings get loud, contacts get slow, or form breaks.";

export function needsQualityGate(opts: {
  jumpTier?: number | null;
  maxSprint?: boolean | null;
}): boolean {
  const tier = Number(opts.jumpTier ?? 0);
  return tier >= 2 || opts.maxSprint === true;
}
