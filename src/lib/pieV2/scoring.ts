/**
 * PIE V2 — pure deterministic per-signal scorers.
 *
 * Replay-safe. No side effects. Version-pinned. All scoring is reproducible
 * byte-for-byte at PIE_V2_ENGINE_VERSION across identical inputs.
 *
 * Missingness produces { score: null, tier: null }. Confidence is never fabricated.
 */
import {
  PIE_V2_ENGINE_VERSION,
  type PieV2Confidence,
  type PieV2MissingnessRecord,
  type PieV2Provenance,
  type PieV2RepInput,
  type PieV2RepScore,
  type PieV2SignalId,
} from "./types";
import { tierForScore } from "@/data/baseball/pieV2Signals";

const clamp = (n: number, lo = 0, hi = 100) =>
  Math.max(lo, Math.min(hi, n));

function confidenceFor(
  provenance: PieV2Provenance,
  measured: boolean,
): PieV2Confidence {
  if (!measured) {
    return { score: 0, basis: provenance === "manual" ? "manual_single_rep" : "video_frame_range" };
  }
  switch (provenance) {
    case "manual":
      return { score: 60, basis: "manual_single_rep" };
    case "video_derived":
      return { score: 80, basis: "video_frame_range" };
    case "sensor_derived":
      return { score: 92, basis: "sensor_calibrated" };
  }
}

function missing(rep: PieV2RepInput, field: string): PieV2MissingnessRecord {
  const existing = rep.missingness?.find((m) => m.field === field);
  if (existing) return existing;
  return {
    field,
    reason: rep.provenance === "video_derived" ? "not_visible_in_video" : "not_captured",
  };
}

function makeScore(
  signal_id: PieV2SignalId,
  rep: PieV2RepInput,
  rawScore: number | null,
  missingFields: string[],
  tracked_only = false,
): PieV2RepScore {
  const score = rawScore === null ? null : clamp(rawScore);
  const tier = tracked_only ? null : tierForScore(score);
  const missingness = missingFields.map((f) => missing(rep, f));
  return {
    signal_id,
    score,
    tier,
    confidence: confidenceFor(rep.provenance, score !== null),
    missingness,
    provenance: rep.provenance,
    engine_version: PIE_V2_ENGINE_VERSION,
    tracked_only,
  };
}

// ---------- Scorers ----------

export function scoreEnergyAngle(rep: PieV2RepInput): PieV2RepScore {
  const v = rep.energy_angle_deg;
  if (v === undefined) return makeScore("energy_angle", rep, null, ["energy_angle_deg"]);
  // 25° = 100; ≥18° clean band; degrades below
  if (v >= 25) return makeScore("energy_angle", rep, 100, []);
  if (v >= 18) return makeScore("energy_angle", rep, 70 + ((v - 18) / 7) * 30, []);
  if (v >= 10) return makeScore("energy_angle", rep, 40 + ((v - 10) / 8) * 30, []);
  return makeScore("energy_angle", rep, Math.max(0, (v / 10) * 40), []);
}

export function scoreVisualStability(rep: PieV2RepInput): PieV2RepScore {
  const v = rep.eyes_on_target;
  if (v === undefined) return makeScore("visual_stability", rep, null, ["eyes_on_target"]);
  return makeScore("visual_stability", rep, v ? 95 : 45, []);
}

export function scoreSeparation(rep: PieV2RepInput): PieV2RepScore {
  const v = rep.shoulders_closed_to_footstrike;
  if (v === undefined) return makeScore("separation", rep, null, ["shoulders_closed_to_footstrike"]);
  return makeScore("separation", rep, v ? 92 : 40, []);
}

export function scoreTempo(rep: PieV2RepInput): PieV2RepScore {
  const v = rep.leg_lift_to_footstrike_sec;
  if (v === undefined) return makeScore("tempo", rep, null, ["leg_lift_to_footstrike_sec"]);
  if (v <= 1.05) return makeScore("tempo", rep, 100, []);
  if (v <= 1.2) return makeScore("tempo", rep, 70 + ((1.2 - v) / 0.15) * 30, []);
  if (v <= 1.4) return makeScore("tempo", rep, 50 + ((1.4 - v) / 0.2) * 20, []);
  return makeScore("tempo", rep, Math.max(0, 50 - (v - 1.4) * 50), []);
}

export function scoreStride(rep: PieV2RepInput): PieV2RepScore {
  const v = rep.stride_pct_body_height;
  if (v === undefined) return makeScore("stride", rep, null, ["stride_pct_body_height"]);
  if (v >= 100) return makeScore("stride", rep, 100, []);
  if (v >= 90) return makeScore("stride", rep, 70 + ((v - 90) / 10) * 30, []);
  if (v >= 75) return makeScore("stride", rep, 50 + ((v - 75) / 15) * 20, []);
  return makeScore("stride", rep, Math.max(0, (v / 75) * 50), []);
}

export function scoreHeadStability(rep: PieV2RepInput): PieV2RepScore {
  const v = rep.head_vertical_drop_pct;
  if (v === undefined) return makeScore("head_stability", rep, null, ["head_vertical_drop_pct"]);
  if (v <= 2) return makeScore("head_stability", rep, 100, []);
  if (v <= 4) return makeScore("head_stability", rep, 70 + ((4 - v) / 2) * 30, []);
  if (v <= 7) return makeScore("head_stability", rep, 50 + ((7 - v) / 3) * 20, []);
  return makeScore("head_stability", rep, Math.max(0, 50 - (v - 7) * 8), []);
}

export function scoreHipAlignment(rep: PieV2RepInput): PieV2RepScore {
  const v = rep.hips_fired_toward_target;
  if (v === undefined) return makeScore("hip_alignment", rep, null, ["hips_fired_toward_target"]);
  return makeScore("hip_alignment", rep, v ? 92 : 50, []);
}

export function scoreFrontSide(rep: PieV2RepInput): PieV2RepScore {
  const v = rep.glove_inside_frame;
  if (v === undefined) return makeScore("front_side", rep, null, ["glove_inside_frame"]);
  return makeScore("front_side", rep, v ? 90 : 45, []);
}

export function scoreHeadAlignment(rep: PieV2RepInput): PieV2RepScore {
  const v = rep.head_offset_from_belly_line_deg;
  if (v === undefined) return makeScore("head_alignment", rep, null, ["head_offset_from_belly_line_deg"]);
  const off = Math.abs(v);
  if (off <= 15) return makeScore("head_alignment", rep, 100 - (off / 15) * 15, []);
  // Every degree beyond 15° compounds.
  const beyond = off - 15;
  return makeScore("head_alignment", rep, Math.max(0, 85 - beyond * beyond * 0.5 - beyond * 2), []);
}

export function scoreShoulderLevel(rep: PieV2RepInput): PieV2RepScore {
  const v = rep.shoulder_horizontal_offset_deg;
  if (v === undefined) return makeScore("shoulder_level", rep, null, ["shoulder_horizontal_offset_deg"]);
  const off = Math.abs(v);
  if (off <= 10) return makeScore("shoulder_level", rep, 100 - (off / 10) * 10, []);
  if (off <= 15) return makeScore("shoulder_level", rep, 70 + ((15 - off) / 5) * 20, []);
  return makeScore("shoulder_level", rep, Math.max(0, 70 - (off - 15) * 6), []);
}

export function scoreRearFootDrag(rep: PieV2RepInput): PieV2RepScore {
  const len = rep.rear_foot_drag_foot_lengths;
  const clean = rep.rear_foot_drag_direction_clean;
  const missing: string[] = [];
  if (len === undefined) missing.push("rear_foot_drag_foot_lengths");
  if (clean === undefined) missing.push("rear_foot_drag_direction_clean");
  if (missing.length > 0) return makeScore("rear_foot_drag", rep, null, missing);
  let lengthScore = 50;
  if (len! >= 1.5 && len! <= 2.5) lengthScore = 90 - Math.abs(2 - len!) * 20;
  else if (len! < 1.5) lengthScore = Math.max(30, len! * 50);
  else lengthScore = Math.max(30, 90 - (len! - 2.5) * 20);
  const directionMultiplier = clean ? 1.0 : 0.55;
  return makeScore("rear_foot_drag", rep, lengthScore * directionMultiplier, []);
}

// Tracked-only signals — produce a score for trend math but tier=null (never pass/fail).
export function scoreExtensionConsistency(rep: PieV2RepInput): PieV2RepScore {
  const v = rep.release_extension_ft;
  if (v === undefined) return makeScore("extension_consistency", rep, null, ["release_extension_ft"], true);
  // Map to 0..100 range purely for aggregate math; not a pass/fail score.
  return makeScore("extension_consistency", rep, clamp((v / 7.5) * 100), [], true);
}

export function scoreArmSlotConsistency(rep: PieV2RepInput): PieV2RepScore {
  const v = rep.arm_slot_deg;
  if (v === undefined) return makeScore("arm_slot_consistency", rep, null, ["arm_slot_deg"], true);
  // Encode raw degrees as a 0..100 value for variance math only.
  return makeScore("arm_slot_consistency", rep, clamp(v), [], true);
}

const SCORERS: Record<PieV2SignalId, (rep: PieV2RepInput) => PieV2RepScore> = {
  energy_angle: scoreEnergyAngle,
  visual_stability: scoreVisualStability,
  separation: scoreSeparation,
  tempo: scoreTempo,
  stride: scoreStride,
  head_stability: scoreHeadStability,
  hip_alignment: scoreHipAlignment,
  front_side: scoreFrontSide,
  head_alignment: scoreHeadAlignment,
  shoulder_level: scoreShoulderLevel,
  rear_foot_drag: scoreRearFootDrag,
  extension_consistency: scoreExtensionConsistency,
  arm_slot_consistency: scoreArmSlotConsistency,
};

export function scoreAllSignals(rep: PieV2RepInput): PieV2RepScore[] {
  return (Object.keys(SCORERS) as PieV2SignalId[]).map((id) => SCORERS[id](rep));
}

export function scoreSignal(id: PieV2SignalId, rep: PieV2RepInput): PieV2RepScore {
  return SCORERS[id](rep);
}
