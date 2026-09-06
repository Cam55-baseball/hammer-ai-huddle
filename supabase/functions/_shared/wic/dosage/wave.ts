/**
 * Wave rebuild — Stage 6 (spec §4), FLAG-GATED AND NOT WIRED.
 *
 * The dosage doctrine (`dosage/doctrine.ts`) remains the single, untouched
 * dosage authority. This module does not modify it and is imported by nothing
 * in the generator: it exists so the owner can read the exact dose diff the
 * wave rebuild would produce before anyone turns it on.
 *
 * What it changes when enabled:
 *   `setPosition` behaves exactly as today. `repPosition = 1 − setPosition`
 *   for `main_compound`, `unilateral` and `upper` — reps descend toward the
 *   envelope floor as sets hold or climb, which is how a real strength block
 *   behaves. Volume groups (`trunk`, `carry`, `arm_care`, `accessory`) keep
 *   today's behaviour exactly.
 *
 * Because the pick always lands inside `[lo, hi]`, every result stays inside
 * the published envelope — no new fatal path is created.
 *
 * Pure, deterministic, no I/O.
 */
import {
  DOSE_MATRIX,
  doseGroupFor,
  normalizeDoctrinePhase,
  resolveDose,
  type DoseGroup,
  type ResolveDoseInput,
  type ResolvedDose,
} from "./doctrine.ts";

export const WAVE_VERSION = "wave_v2";

/** Groups whose reps ride the inverse of the set position. */
const INVERSE_REP_GROUPS: readonly DoseGroup[] = ["main_compound", "unilateral", "upper"];

const BAND_POSITION: Record<string, number> = {
  beginner: 0,
  developing: 0.25,
  intermediate: 0.5,
  advanced: 0.75,
  elite: 1,
};

const WEEK_POSITION_DELTA: Record<number, number> = { 1: -0.15, 2: 0, 3: 0.15, 4: -1 };

function pick(range: readonly [number, number], t: number): number {
  const [lo, hi] = range;
  const c = Math.min(1, Math.max(0, t));
  return Math.round(lo + (hi - lo) * c);
}

/**
 * The dose the wave rebuild WOULD produce. When `enabled` is false this simply
 * returns `resolveDose()` — byte-for-byte today's behaviour.
 */
export function resolveWaveDose(input: ResolveDoseInput, enabled: boolean): ResolvedDose {
  const base = resolveDose(input);
  if (!enabled) return base;
  if (!INVERSE_REP_GROUPS.includes(base.group)) return base;

  const phase = normalizeDoctrinePhase(input.phase);
  const group = doseGroupFor(input.role, input.category);
  const envelope = DOSE_MATRIX[phase][group];

  const week = Math.min(4, Math.max(1, Number(input.weekInBlock ?? 2)));
  const deload = input.isDeloadWeek === true || week === 4;
  const setPosition = deload
    ? 0
    : (BAND_POSITION[base.band] ?? 0) + (WEEK_POSITION_DELTA[week] ?? 0);
  const repPosition = 1 - Math.min(1, Math.max(0, setPosition));

  let reps = pick(envelope.reps as unknown as [number, number], repPosition);
  if (typeof input.capReps === "number") reps = Math.min(reps, input.capReps);
  reps = Math.max(1, reps);

  return {
    ...base,
    reps,
    notes: [...base.notes, `${WAVE_VERSION}: reps ride the inverse of the set position`],
  };
}
