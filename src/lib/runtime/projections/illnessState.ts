import { memoize } from "./types";

export type IllnessSeverity = "none" | "mild" | "moderate" | "severe";

export interface IllnessState {
  active: boolean;
  severity: IllnessSeverity;
  reportedSource: string | null;
  resolvedSource: string | null;
}

const PREFIXES = ["illness."];

export const buildIllnessState = memoize<IllnessState>((rows) => {
  let active = false;
  let severity: IllnessSeverity = "none";
  let reportedSource: string | null = null;
  let resolvedSource: string | null = null;
  for (const r of rows) {
    const p = r.payload as { severity?: IllnessSeverity } | undefined;
    if (r.topic_id === "illness.reported") {
      active = true;
      if (p?.severity) severity = p.severity;
      reportedSource = r.event_id;
    }
    if (r.topic_id === "illness.resolved") {
      active = false;
      severity = "none";
      resolvedSource = r.event_id;
    }
  }
  return { active, severity, reportedSource, resolvedSource };
});

export function illnessState(rows: Parameters<typeof buildIllnessState>[0], scope: Parameters<typeof buildIllnessState>[1]) {
  return buildIllnessState(rows, scope, PREFIXES);
}
