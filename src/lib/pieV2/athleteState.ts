/**
 * PIE V2 — athlete state contribution.
 *
 * Bounded, additive priors only. Never overwrites engine state.
 * Surfaces `arm_health_caution` as an advisory channel that routes through
 * safeguarding orchestration (RR-6 supremacy).
 */
import type { PieV2SessionAggregate } from "./types";

export interface PieV2AthleteStateDelta {
  delta_freshness_6h: number; // ∈ [-15, 0]
  delta_volatility: number; // ∈ [0, 0.2]
  arm_health_caution: "none" | "watch" | "elevated";
  rationale: string[];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function derivePieV2StateDelta(agg: PieV2SessionAggregate): PieV2AthleteStateDelta {
  const rationale: string[] = [];
  let dFresh = 0;
  let dVol = 0;
  let caution: PieV2AthleteStateDelta["arm_health_caution"] = "none";

  const tempo = agg.signals.find((s) => s.signal_id === "tempo");
  const headStab = agg.signals.find((s) => s.signal_id === "head_stability");
  const armSlot = agg.signals.find((s) => s.signal_id === "arm_slot_consistency");
  const extension = agg.signals.find((s) => s.signal_id === "extension_consistency");

  // Within-session degradation lowers freshness (fatigue prior).
  if (tempo?.fatigue_slope !== null && tempo?.fatigue_slope !== undefined && tempo.fatigue_slope < -1) {
    dFresh -= 6;
    rationale.push("tempo degraded within session");
  }
  if (headStab?.fatigue_slope !== null && headStab?.fatigue_slope !== undefined && headStab.fatigue_slope < -1) {
    dFresh -= 5;
    rationale.push("head stability degraded within session");
  }

  // Arm-slot drift + extension regression → caution. RR-6 advisory only.
  const armSlotVar = armSlot?.variance ?? 0;
  const extVar = extension?.variance ?? 0;
  if (armSlotVar > 10 || extVar > 0.25) {
    caution = "watch";
    dVol += 0.1;
    rationale.push("mechanical variance elevated");
  }
  if (agg.athlete_reported_pain_in_session && (armSlotVar > 10 || extVar > 0.25)) {
    caution = "elevated";
    dVol += 0.1;
    rationale.push("athlete-reported pain co-occurred with mechanical variance");
  } else if (agg.athlete_reported_pain_in_session) {
    // Pain alone always at least 'watch' per RR-6 (pain outranks inferred readiness).
    if (caution === "none") caution = "watch";
    rationale.push("athlete reported pain — RR-6 advisory");
  }

  return {
    delta_freshness_6h: clamp(dFresh, -15, 0),
    delta_volatility: clamp(dVol, 0, 0.2),
    arm_health_caution: caution,
    rationale,
  };
}
