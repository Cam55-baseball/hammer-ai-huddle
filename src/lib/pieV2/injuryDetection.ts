/**
 * PIE V2 — bounded injury-caution advisory.
 *
 * RR-6 supremacy. Combines arm-slot drift trend, extension regression,
 * within-session tempo decay, and athlete-reported pain (when present).
 * NEVER diagnoses. NEVER prescribes. Routes through safeguarding
 * orchestration: signal → classify → contain → notify_safeguarding_role
 * → arbitrate (Phase 31).
 */
import type { PieV2SessionAggregate } from "./types";

export type PieV2CautionLevel = "none" | "watch" | "elevated";

export interface PieV2InjuryCaution {
  level: PieV2CautionLevel;
  contributing_factors: string[];
  athlete_reported_pain: boolean;
  recommended_action: string;
}

export function deriveInjuryCaution(
  current: PieV2SessionAggregate,
  recent: PieV2SessionAggregate[],
): PieV2InjuryCaution {
  const factors: string[] = [];
  const armSlot = current.signals.find((s) => s.signal_id === "arm_slot_consistency");
  const extension = current.signals.find((s) => s.signal_id === "extension_consistency");
  const tempo = current.signals.find((s) => s.signal_id === "tempo");

  if ((armSlot?.variance ?? 0) > 10) factors.push("arm_slot_variance_elevated");
  if ((extension?.variance ?? 0) > 0.25) factors.push("extension_variance_elevated");
  if (tempo?.fatigue_slope !== null && tempo?.fatigue_slope !== undefined && tempo.fatigue_slope < -1) {
    factors.push("within_session_tempo_decay");
  }
  if (recent.length >= 3) {
    const recentArmSlotAvgs = recent
      .map((a) => a.signals.find((s) => s.signal_id === "arm_slot_consistency")?.average)
      .filter((v): v is number => v != null);
    if (recentArmSlotAvgs.length >= 3) {
      const drift = Math.abs(recentArmSlotAvgs[recentArmSlotAvgs.length - 1] - recentArmSlotAvgs[0]);
      if (drift > 8) factors.push("arm_slot_drift_across_sessions");
    }
  }

  const pain = current.athlete_reported_pain_in_session;
  let level: PieV2CautionLevel = "none";
  if (pain && factors.length > 0) level = "elevated";
  else if (pain) level = "watch"; // pain alone — RR-6: outranks inferred readiness
  else if (factors.length >= 2) level = "watch";
  else if (factors.length >= 3) level = "elevated";

  return {
    level,
    contributing_factors: factors,
    athlete_reported_pain: pain,
    recommended_action:
      level === "elevated"
        ? "Route through safeguarding role for human review. Suspend velocity-tier work until cleared."
        : level === "watch"
          ? "Surface as caution. Reduce intent. Monitor next session."
          : "No advisory action.",
  };
}
