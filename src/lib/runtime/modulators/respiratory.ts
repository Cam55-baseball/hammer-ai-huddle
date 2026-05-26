/**
 * Respiratory modulator — visibility only, never a composite score.
 */
import { type Modulator, PASS_THROUGH, pickLatest } from "./types";

interface RespiratoryPayload {
  load?: "low" | "moderate" | "high";
}

export const respiratoryModulator: Modulator = (ctx) => {
  const row = pickLatest(ctx.rows, "respiratory.load_logged");
  if (!row) return { ...PASS_THROUGH, domain: "respiratory" };
  const load = (row.payload as RespiratoryPayload | undefined)?.load;
  if (load === "high") {
    return {
      domain: "respiratory",
      ceilingKind: "hybrid",
      notes: ["Respiratory: high load logged — hybrid ceiling."],
      sources: [row.event_id],
      confidenceCeiling: null,
    };
  }
  return {
    domain: "respiratory",
    ceilingKind: null,
    notes: load ? [`Respiratory: ${load} load.`] : [],
    sources: [row.event_id],
    confidenceCeiling: null,
  };
};
