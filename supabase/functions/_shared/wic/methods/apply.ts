// Elite Training Methods Engine v1 — bounded dose transform + plan payload.
//
// The method may ONLY:
//   - move sets by at most ±1, and never outside the quarter envelope;
//   - impose rest law between stations and rounds;
//   - attach structure, cues and a rationale to the anchor row.
//
// The method may NEVER:
//   - change which movements were selected;
//   - move reps outside the envelope;
//   - raise the block's CNS cost above the day's remaining share;
//   - ship without a complete rationale.

import { METHODS_VERSION, type MethodDef, type MethodStation } from "./catalog.ts";
import type { ResolvedStation } from "./stations.ts";
import {
  DOSE_MATRIX,
  doseGroupFor,
  normalizeDoctrinePhase,
  type DoctrinePhase,
} from "../dosage/doctrine.ts";

export interface MethodApplyInput {
  method: MethodDef;
  phase: string | null | undefined;
  /** Sequence role of the anchor row (compound, accessory, ...). */
  role: string | null | undefined;
  category?: string | null;
  /** The dose the doctrine already resolved. */
  sets: number;
  reps: number;
  /** CNS cost the block would carry without the method. */
  cnsCost: number;
  /** CNS units still available on the day. */
  cnsHeadroom: number;
  /** Stations already resolved to real, legality-gated movements. */
  resolvedStations?: readonly ResolvedStation[];
}

export interface MethodStationPlan extends MethodStation {
  /** Resolved rest label for the card. */
  restLabel: string;
  /** Movement powering this station, when the method resolved one. */
  slug?: string;
  name?: string;
}

export interface AppliedMethod {
  method_id: string;
  method_family: string;
  method_display_name: string;
  method_shape: string;
  method_structure: string;
  methods_version: string;
  /** Rounds (station methods) or sets (everything else). */
  rounds: number;
  stations: MethodStationPlan[];
  rest_between_rounds_seconds: number;
  /** Final dose after the bounded transform. */
  sets: number;
  reps: number;
  cns_cost: number;
  why_method: string;
  method_cue: string;
  method_bailout: string;
  /** Every clamp that fired, for replay + audit. */
  clamps: string[];
}

export interface MethodApplyResult {
  applied: AppliedMethod | null;
  /** Non-fatal codes explaining a drop. */
  dropCode: string | null;
}

function restLabel(seconds: number): string {
  if (seconds <= 0) return "straight into the next station";
  if (seconds < 60) return `${seconds}s rest`;
  const m = Math.round(seconds / 60);
  return `${m} min rest`;
}

/**
 * Apply the method inside its constitutional clamps. Returns `applied: null`
 * with a drop code whenever the transform cannot be made legal — the caller
 * then ships the plain, already-certified block.
 */
export function applyMethod(input: MethodApplyInput): MethodApplyResult {
  const m = input.method;
  const phase: DoctrinePhase = normalizeDoctrinePhase(input.phase);
  const rule = m.phases[phase];
  if (!rule?.legal) return { applied: null, dropCode: "method_phase_illegal" };

  const group = doseGroupFor(input.role, input.category);
  const envelope = DOSE_MATRIX[phase][group];
  const clamps: string[] = [];

  // ---- bounded set transform ------------------------------------------------
  const delta = Math.max(-1, Math.min(1, m.setsDelta));
  let sets = input.sets + delta;
  if (sets > envelope.sets[1]) {
    sets = envelope.sets[1];
    clamps.push("sets_clamped_to_envelope_ceiling");
  }
  if (sets < envelope.sets[0]) {
    sets = Math.max(envelope.sets[0], 1);
    clamps.push("sets_clamped_to_envelope_floor");
  }
  sets = Math.max(1, sets);

  // Reps are NEVER touched by a method.
  const reps = input.reps;

  // ---- rounds cap ------------------------------------------------------------
  let rounds = sets;
  if (m.stations.length > 0 && typeof rule.maxRounds === "number") {
    if (rounds > rule.maxRounds) {
      rounds = rule.maxRounds;
      clamps.push("rounds_capped_by_quarter");
    }
  }
  if (rounds < 1) return { applied: null, dropCode: "method_rounds_underflow" };

  // ---- CNS legality ----------------------------------------------------------
  const cns = Math.round(input.cnsCost * m.cnsMultiplier);
  if (cns > input.cnsCost && cns - input.cnsCost > Math.max(0, input.cnsHeadroom)) {
    return { applied: null, dropCode: "method_cns_headroom_exceeded" };
  }

  const source: readonly MethodStation[] = (input.resolvedStations && input.resolvedStations.length > 0)
    ? input.resolvedStations
    : m.stations;
  const stations: MethodStationPlan[] = source.map((s) => ({
    ...s,
    restLabel: restLabel(s.restSeconds),
  }));
  if (m.stations.length > 0 && stations.length !== m.stations.length) {
    return { applied: null, dropCode: "method_station_incomplete" };
  }

  const whyMethod = m.stations.length > 0
    ? `${m.why} Today that means ${rounds} round${rounds === 1 ? "" : "s"} of ${m.stations.length} stations, with ${restLabel(m.restBetweenRoundsSeconds)} between rounds.`
    : `${m.why} Today that means ${sets} set${sets === 1 ? "" : "s"} run as ${m.displayName.toLowerCase()}.`;

  return {
    applied: {
      method_id: m.id,
      method_family: m.family,
      method_display_name: m.displayName,
      method_shape: m.shape,
      method_structure: m.structure,
      methods_version: METHODS_VERSION,
      rounds,
      stations,
      rest_between_rounds_seconds: m.restBetweenRoundsSeconds,
      sets,
      reps,
      cns_cost: cns,
      why_method: whyMethod,
      method_cue: m.cue,
      method_bailout: m.bailout,
      clamps,
    },
    dropCode: null,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type MethodValidationSeverity = "fatal" | "warn";

export interface MethodValidationIssue {
  code: string;
  severity: MethodValidationSeverity;
  detail: string;
}

/**
 * Certifies an applied method. A fatal issue means the method must be dropped
 * before publication — the plain block is always the safe fallback.
 */
export function validateAppliedMethod(
  applied: AppliedMethod | null,
  ctx: { phase: string | null | undefined; role: string | null | undefined; category?: string | null },
): MethodValidationIssue[] {
  if (!applied) return [];
  const issues: MethodValidationIssue[] = [];
  const phase = normalizeDoctrinePhase(ctx.phase);
  const envelope = DOSE_MATRIX[phase][doseGroupFor(ctx.role, ctx.category)];

  if (applied.sets > envelope.sets[1] || applied.reps > envelope.reps[1]) {
    issues.push({
      code: "method_dose_outside_envelope",
      severity: "fatal",
      detail: `${applied.sets}×${applied.reps} exceeds the ${phase} envelope.`,
    });
  }
  if (applied.rounds < 1) {
    issues.push({
      code: "method_rounds_underflow",
      severity: "fatal",
      detail: "A method must ship at least one round.",
    });
  }
  if (applied.method_structure === "stations" && applied.stations.length < 2) {
    issues.push({
      code: "method_station_incomplete",
      severity: "fatal",
      detail: "A station method needs at least two stations.",
    });
  }
  const orders = applied.stations.map((s) => s.order);
  if (orders.some((o, i) => o !== i + 1)) {
    issues.push({
      code: "method_station_order_broken",
      severity: "fatal",
      detail: "Station order must be contiguous starting at 1.",
    });
  }
  if (!applied.why_method || !applied.method_cue || !applied.method_bailout) {
    issues.push({
      code: "method_rationale_incomplete",
      severity: "fatal",
      detail: "Every method must answer why, how, and what to do if it feels wrong.",
    });
  }
  if (applied.clamps.includes("rounds_capped_by_quarter")) {
    issues.push({
      code: "method_rounds_capped",
      severity: "warn",
      detail: "Rounds were capped by the quarter ceiling.",
    });
  }
  return issues;
}

export const METHOD_FATAL_CODES = [
  "method_dose_outside_envelope",
  "method_rounds_underflow",
  "method_station_incomplete",
  "method_station_order_broken",
  "method_rationale_incomplete",
] as const;

export const METHOD_WARN_CODES = [
  "method_rounds_capped",
  "method_cns_headroom_exceeded",
  "method_phase_illegal",
] as const;
