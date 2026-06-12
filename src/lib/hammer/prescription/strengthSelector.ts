/**
 * Anthropometric-aware strength selection helpers.
 *
 * Pure functions that bias strength-block exercise choice based on the
 * athlete's lever archetype. Outputs short "swap" suggestions and a
 * human-readable rationale appended to the daily plan card.
 *
 * Interpretive only — never authors organism truth. If anthropometrics are
 * missing, returns an empty `swaps` array and a null rationale (missingness
 * preserved). Replay-safe.
 */
import type { AnthroProfile } from "@/lib/hammer/anthro/profile";

export interface StrengthSwap {
  readonly pattern: "squat" | "hinge" | "press" | "pull";
  readonly preferred: string;
  readonly demote?: string;
  readonly cue: string;
  readonly reason: string;
  readonly citation: string; // e.g. "anthro.lowerLegFlag=long_femur"
}

export interface StrengthSelectorOutput {
  readonly swaps: ReadonlyArray<StrengthSwap>;
  readonly rationale: string | null;
}

export function selectStrengthSwaps(profile: AnthroProfile): StrengthSelectorOutput {
  const swaps: StrengthSwap[] = [];

  // Squat pattern adaptations
  if (profile.lowerLegFlag === "long_femur" || profile.lowerLegFlag === "long_tibia") {
    swaps.push({
      pattern: "squat",
      preferred:
        profile.lowerLegFlag === "long_femur"
          ? "Heavy DB reverse lunge, split squat, or B-stance RDL"
          : "Front squat to box or safety-bar box squat",
      demote: "Conventional high-bar back squat (max load)",
      cue:
        profile.lowerLegFlag === "long_femur"
          ? "Vertical shin, sit between hips — split stance loads the hip without folding the torso."
          : "Heels stay down, torso stays tall — box gives you a depth anchor.",
      reason:
        profile.lowerLegFlag === "long_femur"
          ? "Long femurs collapse the torso forward under bilateral squats — split stance lets you load the hip without the dump."
          : "Long tibias make bilateral squats feel quad-dominant — a front/box squat keeps you vertical and patterning hips first.",
      citation: `anthro.lowerLegFlag=${profile.lowerLegFlag}`,
    });
  }

  // Hinge pattern adaptations
  if (profile.torsoFlag === "long_torso") {
    swaps.push({
      pattern: "hinge",
      preferred: "Trap-bar deadlift + 45° back extension",
      demote: "Conventional barbell deadlift (max load)",
      cue: "Hips behind the bar, ribs stacked over pelvis.",
      reason: "Long torso increases moment arm on a conventional pull — trap-bar centers the load and protects the low back.",
      citation: "anthro.torsoFlag=long_torso",
    });
  }

  // Press pattern adaptations
  if (profile.forearmFlag === "long_forearm") {
    swaps.push({
      pattern: "press",
      preferred: "DB bench, Swiss-bar bench, or floor press",
      demote: "Straight-bar bench (max load)",
      cue: "Wrist stacked over elbow, elbows track ~45° — long forearms hate the locked wrist of a straight bar.",
      reason: "Long forearms put extra leverage demand on the wrist and shoulder during a fixed-grip bench. Neutral or DB pressing keeps the joint stack honest.",
      citation: "anthro.forearmFlag=long_forearm",
    });
  } else if (profile.forearmFlag === "short_forearm") {
    swaps.push({
      pattern: "press",
      preferred: "Straight-bar bench or Larsen press",
      cue: "Shorter forearm leverage favors fixed-grip pressing — use it.",
      reason: "Short forearms keep the bench bar path tight and stable — leverage favors straight-bar work.",
      citation: "anthro.forearmFlag=short_forearm",
    });
  }

  // Pull pattern adaptations
  if (profile.apeIndex != null && profile.apeIndex >= 1.05) {
    swaps.push({
      pattern: "pull",
      preferred: "Chest-supported row, Meadows row, or ring row",
      demote: "Bent-over barbell row (max load)",
      cue: "Set the scap first, pull the elbow to the hip — long arms recruit the lower back fast if unsupported.",
      reason: "Long arm levers (ape index ≥ 1.05) overload the spinal erectors on free-standing rows. Chest-supported isolates the lats.",
      citation: `anthro.apeIndex=${profile.apeIndex.toFixed(2)}`,
    });
  }

  if (swaps.length === 0) return { swaps: [], rationale: null };

  const rationale =
    swaps.length === 1
      ? `Anthro-tuned: ${swaps[0].reason}`
      : `Anthro-tuned for your lever profile (${profile.archetype}): ${swaps
          .map((s) => s.preferred.split(",")[0])
          .join(" · ")}.`;

  return { swaps, rationale };
}
