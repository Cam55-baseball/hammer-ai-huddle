/**
 * Illness / immune modulator.
 *
 * Bounded ordinal severity drives a survivability ceiling. Never a diagnosis.
 * Reintegration requires an explicit `illness.resolved` event — no auto-clear.
 */
import { type Modulator, PASS_THROUGH, pickLatest } from "./types";

type Severity = "mild" | "moderate" | "severe";
interface IllnessPayload {
  severity?: Severity;
  systemic?: boolean;
}

export const illnessModulator: Modulator = (ctx) => {
  const logged = pickLatest(ctx.rows, "illness.logged");
  const resolved = pickLatest(ctx.rows, "illness.resolved");
  if (!logged) return { ...PASS_THROUGH, domain: "illness" };
  if (resolved && resolved.occurred_at >= logged.occurred_at) {
    return { ...PASS_THROUGH, domain: "illness" };
  }
  const p = logged.payload as IllnessPayload | undefined;
  const severity = p?.severity ?? "mild";
  const sources = [logged.event_id];

  if (severity === "severe" || p?.systemic) {
    return {
      domain: "illness",
      ceilingKind: "rest",
      notes: ["Illness: active — rest ceiling until resolved event logged."],
      sources,
      confidenceCeiling: null,
    };
  }
  if (severity === "moderate") {
    return {
      domain: "illness",
      ceilingKind: "recovery",
      notes: ["Illness: moderate — recovery ceiling."],
      sources,
      confidenceCeiling: null,
    };
  }
  return {
    domain: "illness",
    ceilingKind: "hybrid",
    notes: ["Illness: mild active — hybrid ceiling."],
    sources,
    confidenceCeiling: null,
  };
};
