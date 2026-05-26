/**
 * Cycle projection — pure, athlete-private by default.
 * Folds `cycle.*` events into the latest known phase + symptom severity.
 */
import { memoize } from "./types";

export type CyclePhase =
  | "menstrual" | "follicular" | "ovulatory" | "luteal" | "unknown";
export type CycleSeverity = "none" | "mild" | "moderate" | "severe";

export interface CycleState {
  phase: CyclePhase;
  severity: CycleSeverity;
  phaseSource: string | null;
  symptomSource: string | null;
  confidence: number | null;
}

const PREFIXES = ["cycle."];

export const buildCycleState = memoize<CycleState>((rows) => {
  let phase: CyclePhase = "unknown";
  let severity: CycleSeverity = "none";
  let phaseSource: string | null = null;
  let symptomSource: string | null = null;
  let confidence: number | null = null;
  for (const r of rows) {
    const p = r.payload as
      | { phase?: CyclePhase; symptom_severity?: CycleSeverity; confidence?: number }
      | undefined;
    if (r.topic_id === "cycle.phase_logged" && p?.phase) {
      phase = p.phase;
      phaseSource = r.event_id;
      if (typeof p.confidence === "number") confidence = p.confidence;
    }
    if (r.topic_id === "cycle.symptom_logged" && p?.symptom_severity) {
      severity = p.symptom_severity;
      symptomSource = r.event_id;
    }
  }
  return { phase, severity, phaseSource, symptomSource, confidence };
});

export function cycleState(rows: Parameters<typeof buildCycleState>[0], scope: Parameters<typeof buildCycleState>[1]) {
  return buildCycleState(rows, scope, PREFIXES);
}
