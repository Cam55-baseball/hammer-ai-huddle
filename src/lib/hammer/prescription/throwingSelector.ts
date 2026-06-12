/**
 * Anthropometric-aware throwing/arm-care selection helpers.
 *
 * Pure functions; missingness preserved; replay-safe; never authors organism
 * truth. The throwing block in dailyPlan.ts uses these to add cues and
 * supplemental drills based on lever archetype.
 */
import type { AnthroProfile } from "@/lib/hammer/anthro/profile";

export interface ThrowingCue {
  readonly cue: string;
  readonly reason: string;
  readonly citation: string;
}

export interface ThrowingSupplementalDrill {
  readonly name: string;
  readonly dosage: string;
  readonly cue: string;
  readonly reason: string;
  readonly citation: string;
}

export interface ThrowingSelectorOutput {
  readonly cues: ReadonlyArray<ThrowingCue>;
  readonly supplemental: ReadonlyArray<ThrowingSupplementalDrill>;
  readonly rationale: string | null;
}

export function selectThrowingAdaptations(profile: AnthroProfile): ThrowingSelectorOutput {
  const cues: ThrowingCue[] = [];
  const supplemental: ThrowingSupplementalDrill[] = [];

  if (profile.apeIndex != null && profile.apeIndex >= 1.05) {
    cues.push({
      cue: "Long arm action — let the lever play; do not shorten the back-side of the arc.",
      reason: "Ape index ≥ 1.05 → longer external moment arm; cutting the back-swing costs whip.",
      citation: `anthro.apeIndex=${profile.apeIndex.toFixed(2)}`,
    });
    supplemental.push({
      name: "Bowler / towel arm-action drill",
      dosage: "2 rounds x 8 dry reps each arm slot",
      cue: "Feel the late launch — long levers reward patience.",
      reason: "Reinforces full arm-path mechanics for long-armed throwers.",
      citation: `anthro.apeIndex=${profile.apeIndex.toFixed(2)}`,
    });
  } else if (profile.apeIndex != null && profile.apeIndex <= 0.98) {
    cues.push({
      cue: "Compact arm — speed up the tempo, snap the wrist, do not chase length.",
      reason: "Shorter levers reward tempo and wrist whip, not arm-action length.",
      citation: `anthro.apeIndex=${profile.apeIndex.toFixed(2)}`,
    });
  }

  if (profile.forearmFlag === "long_forearm") {
    supplemental.push({
      name: "Wrist-weight pronation series",
      dosage: "3 x 10 each side",
      cue: "Finish out front, pronate fully — long forearms control spin if you train them.",
      reason: "Long forearms give a longer wrist lever — pronation control raises spin efficiency.",
      citation: "anthro.forearmFlag=long_forearm",
    });
  }

  if (profile.forearmFlag === "short_forearm") {
    supplemental.push({
      name: "Quick-tempo plyo throws (rocker / pivot pickoff)",
      dosage: "2 x 8 at 70%",
      cue: "Fast hands, fast feet — compact arms thrive on tempo.",
      reason: "Short-forearm leverage favors quick-tempo plyo work before max-intent throwing.",
      citation: "anthro.forearmFlag=short_forearm",
    });
  }

  if (cues.length === 0 && supplemental.length === 0) {
    return { cues: [], supplemental: [], rationale: null };
  }

  const rationale = `Throwing tuned to your lever profile (${profile.archetype})${
    profile.apeIndex != null ? ` — ape index ${profile.apeIndex.toFixed(2)}` : ""
  }.`;

  return { cues, supplemental, rationale };
}
