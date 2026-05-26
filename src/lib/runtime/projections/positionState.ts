import { memoize } from "./types";

export interface PositionState {
  primary: string | null;
  assignments: Array<{ position: string; eventId: string; occurredAt: string }>;
  source: string | null;
}

const PREFIXES = ["position."];

export const buildPositionState = memoize<PositionState>((rows) => {
  let primary: string | null = null;
  let source: string | null = null;
  const assignments: PositionState["assignments"] = [];
  for (const r of rows) {
    const p = r.payload as { position?: string; primary?: boolean } | undefined;
    if (!p?.position) continue;
    assignments.push({ position: p.position, eventId: r.event_id, occurredAt: r.occurred_at });
    if (p.primary || r.topic_id === "position.primary_set") {
      primary = p.position;
      source = r.event_id;
    }
  }
  return { primary, assignments, source };
});

export function positionState(rows: Parameters<typeof buildPositionState>[0], scope: Parameters<typeof buildPositionState>[1]) {
  return buildPositionState(rows, scope, PREFIXES);
}
