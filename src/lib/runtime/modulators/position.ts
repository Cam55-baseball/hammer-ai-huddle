/**
 * Position / specialization modulator.
 *
 * - Surfaces specialization drift as visibility only.
 * - Adds an anti-early-specialization advisory for youth athletes.
 * - Never forces a position. Never restricts based on assignment alone.
 */
import { type Modulator, PASS_THROUGH, pickLatest, pickAll } from "./types";

interface AssignmentPayload {
  position?: string;
}
interface DriftPayload {
  drift_score?: number; // 0..1 derived externally; we only surface it
}

export const positionModulator: Modulator = (ctx) => {
  const assignmentRow = pickLatest(ctx.rows, "position.assigned");
  const workloadRows = pickAll(ctx.rows, "position.workload_logged");
  const driftRow = pickLatest(ctx.rows, "position.specialization_drift");

  if (!assignmentRow && workloadRows.length === 0 && !driftRow) {
    return { ...PASS_THROUGH, domain: "position" };
  }

  const notes: string[] = [];
  const sources: string[] = [];
  const position = (assignmentRow?.payload as AssignmentPayload | undefined)
    ?.position;
  if (position) {
    notes.push(`Position: ${position}.`);
    sources.push(assignmentRow!.event_id);
  }
  const drift = (driftRow?.payload as DriftPayload | undefined)?.drift_score;
  if (typeof drift === "number") {
    notes.push(`Specialization drift visible (${drift.toFixed(2)}).`);
    sources.push(driftRow!.event_id);
  }
  if (ctx.ageBand === "youth" && position) {
    notes.push(
      "Youth athlete: preserving multi-position optionality is recommended.",
    );
  }
  return {
    domain: "position",
    ceilingKind: null, // never gates session kind
    notes,
    sources,
    confidenceCeiling: null,
  };
};
