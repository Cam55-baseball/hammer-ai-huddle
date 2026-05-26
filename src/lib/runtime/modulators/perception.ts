/**
 * Perception / cognitive-load modulator.
 *
 * Recommendation-support only. No neuroscience claims. Visual fatigue caps
 * to hybrid; reaction degradation surfaces as a note.
 */
import { type Modulator, PASS_THROUGH, pickLatest } from "./types";

interface PerceptionPayload {
  fatigue?: "low" | "moderate" | "high";
  reaction_delta?: number; // ms vs baseline; informational only
}

export const perceptionModulator: Modulator = (ctx) => {
  const fatigueRow = pickLatest(ctx.rows, "perception.fatigue_logged");
  const reactionRow = pickLatest(ctx.rows, "perception.reaction_logged");
  if (!fatigueRow && !reactionRow) {
    return { ...PASS_THROUGH, domain: "perception" };
  }
  const notes: string[] = [];
  const sources: string[] = [];
  const fatigue = (fatigueRow?.payload as PerceptionPayload | undefined)
    ?.fatigue;
  if (fatigueRow) sources.push(fatigueRow.event_id);
  if (reactionRow) sources.push(reactionRow.event_id);

  const reactionDelta = (reactionRow?.payload as PerceptionPayload | undefined)
    ?.reaction_delta;
  if (typeof reactionDelta === "number" && reactionDelta > 0) {
    notes.push(`Perception: reaction +${reactionDelta}ms vs baseline.`);
  }

  if (fatigue === "high") {
    notes.push("Perception: high visual fatigue — hybrid ceiling.");
    return {
      domain: "perception",
      ceilingKind: "hybrid",
      notes,
      sources,
      confidenceCeiling: null,
    };
  }
  if (fatigue) notes.push(`Perception: ${fatigue} fatigue.`);
  return {
    domain: "perception",
    ceilingKind: null,
    notes,
    sources,
    confidenceCeiling: null,
  };
};
