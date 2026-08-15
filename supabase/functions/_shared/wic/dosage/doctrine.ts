// Zero-Drift Dosage Doctrine — the ONLY authority allowed to produce a set or
// rep number anywhere in the Workout Intelligence Constitution runtime.
//
// Before this module existed, dosage came from four competing sources:
//   1. wk_periodization_blocks (read by exactly one movement)
//   2. hardcoded literals scattered through wk-generate-daily
//   3. wk_movement_catalog default_sets / default_reps (placeholder-polluted)
//   4. LIFT_TEMPLATES compound envelopes (dead code, imported nowhere)
//
// Everything now resolves through `resolveDose`. It is pure, deterministic and
// version-stamped so a replay reproduces the exact same numbers.

export const DOSAGE_DOCTRINE_VERSION = "dosage-doctrine-v1";

export type DoseRange = readonly [number, number];

export interface DoseEnvelope {
  readonly sets: DoseRange;
  readonly reps: DoseRange;
  readonly intent: string;
}

/** Canonical dose groups. Every sequence_role maps to exactly one. */
export type DoseGroup =
  | "main_compound"
  | "unilateral"
  | "upper"
  | "trunk"
  | "carry"
  | "arm_care"
  | "accessory";

export type DoctrinePhase =
  | "os_q1"
  | "os_q2"
  | "os_q3"
  | "os_q4"
  | "in_season"
  | "post_season";

const PHASE_ALIASES: Record<string, DoctrinePhase> = {
  os_q1: "os_q1",
  os_q2: "os_q2",
  os_q3: "os_q3",
  os_q4: "os_q4",
  off_season: "os_q1",
  offseason: "os_q1",
  preseason: "os_q4",
  pre_season: "os_q4",
  in_season: "in_season",
  inseason: "in_season",
  post_season: "post_season",
  postseason: "post_season",
  rtp: "post_season",
};

export function normalizeDoctrinePhase(phase: string | null | undefined): DoctrinePhase {
  const p = (phase ?? "").toLowerCase().trim();
  return PHASE_ALIASES[p] ?? (p.startsWith("in_season") ? "in_season" : "os_q1");
}

/**
 * Canonical dose matrix. Quarters are intentionally non-overlapping in intent:
 * volume falls and intensity rises as the athlete walks Q1 → Q4 → in-season.
 */
export const DOSE_MATRIX: Record<DoctrinePhase, Record<DoseGroup, DoseEnvelope>> = {
  os_q1: {
    main_compound: { sets: [4, 5], reps: [4, 6], intent: "accumulate" },
    unilateral: { sets: [3, 4], reps: [6, 8], intent: "accumulate" },
    upper: { sets: [3, 4], reps: [6, 8], intent: "accumulate" },
    trunk: { sets: [2, 3], reps: [8, 12], intent: "accumulate" },
    carry: { sets: [2, 3], reps: [8, 10], intent: "accumulate" },
    arm_care: { sets: [2, 3], reps: [10, 15], intent: "capacity" },
    accessory: { sets: [2, 3], reps: [8, 12], intent: "accumulate" },
  },
  os_q2: {
    main_compound: { sets: [4, 6], reps: [2, 3], intent: "intensify" },
    unilateral: { sets: [3, 4], reps: [4, 6], intent: "intensify" },
    upper: { sets: [3, 5], reps: [3, 5], intent: "intensify" },
    trunk: { sets: [2, 3], reps: [8, 10], intent: "intensify" },
    carry: { sets: [2, 3], reps: [8, 10], intent: "intensify" },
    arm_care: { sets: [2, 3], reps: [10, 15], intent: "capacity" },
    accessory: { sets: [2, 3], reps: [6, 8], intent: "intensify" },
  },
  os_q3: {
    main_compound: { sets: [3, 5], reps: [2, 3], intent: "express" },
    unilateral: { sets: [3, 3], reps: [4, 5], intent: "express" },
    upper: { sets: [3, 4], reps: [3, 5], intent: "express" },
    trunk: { sets: [2, 3], reps: [6, 10], intent: "express" },
    carry: { sets: [2, 3], reps: [6, 8], intent: "express" },
    arm_care: { sets: [2, 3], reps: [10, 12], intent: "capacity" },
    accessory: { sets: [2, 3], reps: [6, 8], intent: "express" },
  },
  os_q4: {
    main_compound: { sets: [3, 4], reps: [1, 3], intent: "peak" },
    unilateral: { sets: [2, 3], reps: [3, 5], intent: "peak" },
    upper: { sets: [3, 3], reps: [3, 4], intent: "peak" },
    trunk: { sets: [2, 2], reps: [6, 8], intent: "peak" },
    carry: { sets: [2, 2], reps: [6, 8], intent: "peak" },
    arm_care: { sets: [2, 3], reps: [10, 12], intent: "capacity" },
    accessory: { sets: [2, 2], reps: [6, 8], intent: "peak" },
  },
  in_season: {
    main_compound: { sets: [2, 3], reps: [2, 3], intent: "maintain" },
    unilateral: { sets: [1, 2], reps: [3, 6], intent: "maintain" },
    upper: { sets: [2, 2], reps: [3, 5], intent: "maintain" },
    trunk: { sets: [1, 2], reps: [6, 8], intent: "maintain" },
    carry: { sets: [1, 2], reps: [6, 8], intent: "maintain" },
    arm_care: { sets: [2, 2], reps: [8, 12], intent: "durability" },
    accessory: { sets: [1, 2], reps: [6, 8], intent: "maintain" },
  },
  post_season: {
    main_compound: { sets: [2, 3], reps: [5, 8], intent: "decompress" },
    unilateral: { sets: [2, 2], reps: [6, 8], intent: "decompress" },
    upper: { sets: [2, 3], reps: [6, 8], intent: "decompress" },
    trunk: { sets: [1, 2], reps: [8, 10], intent: "decompress" },
    carry: { sets: [1, 2], reps: [8, 10], intent: "decompress" },
    arm_care: { sets: [2, 2], reps: [10, 12], intent: "durability" },
    accessory: { sets: [2, 2], reps: [8, 10], intent: "decompress" },
  },
};

const ROLE_GROUP: Record<string, DoseGroup> = {
  compound_lower: "main_compound",
  compound_upper: "main_compound",
  posterior_chain: "main_compound",
  unilateral_lower: "unilateral",
  unilateral_push: "unilateral",
  unilateral_pull: "unilateral",
  single_leg: "unilateral",
  upper_push: "upper",
  upper_pull: "upper",
  trunk_primer: "trunk",
  trunk_finisher: "trunk",
  core: "trunk",
  rotation: "trunk",
  anti_rotation: "trunk",
  carry_antirotation: "carry",
  carry: "carry",
  arm_care: "arm_care",
};

export function doseGroupFor(role: string | null | undefined, category?: string | null): DoseGroup {
  const r = (role ?? "").toLowerCase();
  if (ROLE_GROUP[r]) return ROLE_GROUP[r];
  const c = (category ?? "").toLowerCase();
  if (c.includes("arm_care")) return "arm_care";
  if (c.includes("carry")) return "carry";
  if (c.includes("trunk") || c.includes("core")) return "trunk";
  if (c.includes("unilateral")) return "unilateral";
  if (c === "compound") return "main_compound";
  return "accessory";
}

/** Units that are NOT dosed with sets × reps. */
export function isRepDosed(unit: string | null | undefined): boolean {
  const u = (unit ?? "reps").toLowerCase();
  return u === "reps" || u === "rep";
}

export type TrainingAgeBand = "beginner" | "developing" | "intermediate" | "advanced" | "elite";

export function trainingAgeBand(years: number | null | undefined): TrainingAgeBand {
  const y = Math.max(0, Number(years ?? 0));
  if (y < 1) return "beginner";
  if (y < 3) return "developing";
  if (y < 6) return "intermediate";
  if (y < 10) return "advanced";
  return "elite";
}

/** Position inside the envelope, 0 = floor, 1 = ceiling. */
const BAND_POSITION: Record<TrainingAgeBand, number> = {
  beginner: 0,
  developing: 0.25,
  intermediate: 0.5,
  advanced: 0.75,
  elite: 1,
};

/** Week-in-block wave applied on top of the training-age position. */
const WEEK_POSITION_DELTA: Record<number, number> = { 1: -0.15, 2: 0, 3: 0.15, 4: -1 };

function pick(range: DoseRange, t: number): number {
  const [lo, hi] = range;
  const clampedT = Math.min(1, Math.max(0, t));
  return Math.round(lo + (hi - lo) * clampedT);
}

export interface ResolveDoseInput {
  phase: string | null | undefined;
  role: string | null | undefined;
  category?: string | null;
  dosageUnit?: string | null;
  trainingAgeYears?: number | null;
  /** 1..4 within the current block. Week 4 is the deload. */
  weekInBlock?: number | null;
  isDeloadWeek?: boolean;
  /** CNS budget exceeded — shed one set, never below the envelope floor. */
  cnsClamped?: boolean;
  /** Hard safety ceiling (e.g. ATG in-season durability dose). Applied last. */
  capSets?: number | null;
  capReps?: number | null;
}

export interface ResolvedDose {
  sets: number;
  reps: number;
  group: DoseGroup;
  phase: DoctrinePhase;
  envelope: DoseEnvelope;
  band: TrainingAgeBand;
  notes: string[];
  doctrine_version: string;
}

/**
 * The single dosage authority. Deterministic: identical inputs → identical dose.
 */
export function resolveDose(input: ResolveDoseInput): ResolvedDose {
  const phase = normalizeDoctrinePhase(input.phase);
  const group = doseGroupFor(input.role, input.category);
  const envelope = DOSE_MATRIX[phase][group];
  const band = trainingAgeBand(input.trainingAgeYears);
  const notes: string[] = [];

  // 1) training-age position inside the envelope
  let t = BAND_POSITION[band];
  notes.push(`${band} training age → ${Math.round(t * 100)}% of the ${phase} ${group} envelope`);

  // 2) week-in-block wave
  const week = Math.min(4, Math.max(1, Number(input.weekInBlock ?? 2)));
  const deload = input.isDeloadWeek === true || week === 4;
  if (deload) {
    t = 0;
    notes.push("week 4 deload → envelope floor, quality held");
  } else {
    t = t + (WEEK_POSITION_DELTA[week] ?? 0);
    if (week !== 2) notes.push(`week ${week} of the block`);
  }

  let sets = pick(envelope.sets, t);
  let reps = pick(envelope.reps, t);

  // 3) readiness / CNS pressure
  if (input.cnsClamped) {
    const before = sets;
    sets = Math.max(envelope.sets[0], sets - 1);
    if (sets !== before) notes.push("CNS cap reached → one set removed");
  }

  // 4) hard safety clamp (season / injury doctrine) — always last
  if (typeof input.capSets === "number") {
    if (sets > input.capSets) notes.push(`safety cap → ${input.capSets} sets`);
    sets = Math.min(sets, input.capSets);
  }
  if (typeof input.capReps === "number") {
    if (reps > input.capReps) notes.push(`safety cap → ${input.capReps} reps`);
    reps = Math.min(reps, input.capReps);
  }

  // Minimum effective dose — no card ever ships a 1×1 phantom row.
  sets = Math.max(1, sets);
  reps = Math.max(1, reps);

  return {
    sets,
    reps,
    group,
    phase,
    envelope,
    band,
    notes,
    doctrine_version: DOSAGE_DOCTRINE_VERSION,
  };
}

/** Envelope legality check used by the validator and the CI audit. */
export function isWithinEnvelope(
  phase: string | null | undefined,
  role: string | null | undefined,
  category: string | null | undefined,
  sets: number | null | undefined,
  reps: number | null | undefined,
): boolean {
  if (sets == null || reps == null) return true; // total-dose row
  const p = normalizeDoctrinePhase(phase);
  const g = doseGroupFor(role, category);
  const env = DOSE_MATRIX[p][g];
  // Deload and safety clamps may only pull BELOW the floor, never above the ceiling.
  return sets <= env.sets[1] && reps <= env.reps[1] && sets >= 1 && reps >= 1;
}

/** Human-readable dose string used in the "why volume" line. */
export function describeDose(d: ResolvedDose): string {
  return `${d.sets}×${d.reps} — ${d.envelope.intent} envelope for ${d.phase.replace("_", " ")} (${d.envelope.sets[0]}-${d.envelope.sets[1]} sets × ${d.envelope.reps[0]}-${d.envelope.reps[1]} reps), ${d.band} training age.`;
}
