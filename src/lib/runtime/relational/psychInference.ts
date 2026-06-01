/**
 * Phase 153 — psychological-state bounded inference rules.
 *
 * Pure functions. Replay-stable. No I/O, no Date.now / Math.random.
 *
 * Constitutional invariants:
 *   • Self-report supersedes inferred on the same (axis, window).
 *   • Inferred confidence is HARD-CLAMPED to 0.7 (human supremacy).
 *   • Composite inferred uses min-aggregation, never product inflation.
 *   • Band thresholds are frozen — see schemas.bandOfValue.
 *   • Band-crossing into crisis/strained sets requires_human_ack = true.
 *   • Inferred decays toward null on a frozen half-life; self-report does not.
 */
import {
  PSYCH_INFERRED_CONFIDENCE_CEILING,
  bandOfValue,
  type PsychBand,
} from "./schemas";

/** Frozen half-life (in arbitrary deterministic ticks) for inferred decay. */
export const INFERRED_HALF_LIFE_TICKS = 8 as const;

export function clampInferredConfidence(c: number): number {
  if (!Number.isFinite(c)) return 0;
  if (c < 0) return 0;
  if (c > PSYCH_INFERRED_CONFIDENCE_CEILING) {
    return PSYCH_INFERRED_CONFIDENCE_CEILING;
  }
  return c;
}

/** Min-aggregation: composite never exceeds weakest evidence confidence. */
export function aggregateInferredConfidence(confidences: number[]): number {
  if (confidences.length === 0) return 0;
  let m = Number.POSITIVE_INFINITY;
  for (const c of confidences) {
    const cc = clampInferredConfidence(c);
    if (cc < m) m = cc;
  }
  return m === Number.POSITIVE_INFINITY ? 0 : m;
}

/** Deterministic decay: half value every INFERRED_HALF_LIFE_TICKS. */
export function decayInferredValue(value: number, ticksElapsed: number): number {
  if (ticksElapsed <= 0) return value;
  const halfLives = ticksElapsed / INFERRED_HALF_LIFE_TICKS;
  return value * Math.pow(0.5, halfLives);
}

const REQUIRES_ACK_BANDS: ReadonlyArray<PsychBand> = ["crisis", "strained"];

export function requiresHumanAck(_from: PsychBand, to: PsychBand): boolean {
  return REQUIRES_ACK_BANDS.includes(to);
}

export interface EffectiveBandInput {
  selfReportValue: number | null;
  inferredValue: number | null;
  inferredConfidence: number | null;
}

export interface EffectiveBandResult {
  effectiveValue: number | null;
  effectiveBand: PsychBand | null;
  confidence: number | null;
  source: "self" | "inferred" | "none";
}

/**
 * Self supremacy: if a self-report exists, the inferred value MUST NOT
 * contribute to the effective band. Replay-stable, pure.
 */
export function resolveEffectiveBand(
  input: EffectiveBandInput,
): EffectiveBandResult {
  if (input.selfReportValue !== null) {
    return {
      effectiveValue: input.selfReportValue,
      effectiveBand: bandOfValue(input.selfReportValue),
      confidence: 1.0,
      source: "self",
    };
  }
  if (input.inferredValue !== null) {
    return {
      effectiveValue: input.inferredValue,
      effectiveBand: bandOfValue(input.inferredValue),
      confidence:
        input.inferredConfidence === null
          ? null
          : clampInferredConfidence(input.inferredConfidence),
      source: "inferred",
    };
  }
  return {
    effectiveValue: null,
    effectiveBand: null,
    confidence: null,
    source: "none",
  };
}
