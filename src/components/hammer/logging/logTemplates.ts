/**
 * Per-exercise log templates. One card + dosage_unit → the field set
 * shown in the round grid and the shared meta fields. Keeps the tracker
 * pop-up unique to each movement while sharing a single Sheet component.
 */
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

export type RoundField = {
  key: string;
  label: string;
  unit?: string;
  kind: "number" | "time";
  step?: number;
  min?: number;
  max?: number;
  optional?: boolean;
  /** Read from rx to prefill target value */
  prefillFromRx?: (rx: WkRx) => number | null | undefined;
};

export type LogTemplate = {
  id: string;
  /** Header sub-line above the round grid */
  intro?: string;
  /** Columns rendered per round */
  fields: RoundField[];
  /** Shared meta (RPE, feel chips, etc.) */
  meta: {
    rpe?: boolean;
    barFeel?: boolean;
    armFeel?: boolean;
    surface?: boolean;
    intent?: boolean;
  };
  /** Default number of rounds if rx has no `sets` */
  defaultRounds: number;
};

const LIFT: LogTemplate = {
  id: "lift",
  intro: "Log each set — tap a cell to override the target.",
  fields: [
    { key: "weight", label: "Weight", unit: "lb", kind: "number", step: 5, min: 0 },
    { key: "reps", label: "Reps", kind: "number", step: 1, min: 0, prefillFromRx: (r) => r.reps ?? undefined },
  ],
  meta: { rpe: true, barFeel: true },
  defaultRounds: 3,
};

const BAT_SPEED: LogTemplate = {
  id: "bat_speed",
  intro: "Log rounds of quality contacts.",
  fields: [
    { key: "contacts", label: "Contacts", kind: "number", step: 1, min: 0, prefillFromRx: (r) => r.reps ?? undefined },
    { key: "exit_velo", label: "Exit velo", unit: "mph", kind: "number", step: 1, optional: true },
    { key: "bat_speed", label: "Bat speed", unit: "mph", kind: "number", step: 1, optional: true },
  ],
  meta: { intent: true },
  defaultRounds: 3,
};

const SPEED_TIMED: LogTemplate = {
  id: "speed_timed",
  intro: "Log each sprint.",
  fields: [
    { key: "distance", label: "Distance", unit: "ft", kind: "number", step: 5, prefillFromRx: (r) => r.distance_feet ?? undefined },
    { key: "time", label: "Time", unit: "s", kind: "number", step: 0.01 },
  ],
  meta: { rpe: true, surface: true },
  defaultRounds: 4,
};

const THROWING: LogTemplate = {
  id: "throwing",
  intro: "Log each throwing set — velo is optional.",
  fields: [
    { key: "throws", label: "Throws", kind: "number", step: 1, min: 0, prefillFromRx: (r) => r.reps ?? undefined },
    { key: "peak_velo", label: "Peak velo", unit: "mph", kind: "number", step: 1, optional: true },
    { key: "avg_velo", label: "Avg velo", unit: "mph", kind: "number", step: 1, optional: true },
    { key: "distance", label: "Distance", unit: "ft", kind: "number", step: 5, optional: true },
  ],
  meta: { armFeel: true },
  defaultRounds: 1,
};

const CONDITIONING: LogTemplate = {
  id: "conditioning",
  intro: "Log rounds.",
  fields: [
    { key: "duration", label: "Duration", unit: "s", kind: "number", step: 5, prefillFromRx: (r) => r.duration_seconds ?? undefined },
    { key: "avg_hr", label: "Avg HR", unit: "bpm", kind: "number", step: 1, optional: true },
  ],
  meta: { rpe: true },
  defaultRounds: 1,
};

const MOBILITY: LogTemplate = {
  id: "mobility",
  intro: "Quick log — how did it feel?",
  fields: [
    { key: "depth", label: "Depth / range", kind: "number", step: 1, min: 1, max: 5, optional: true },
  ],
  meta: {},
  defaultRounds: 1,
};

export function pickTemplate(rx: WkRx): LogTemplate {
  const unit = (rx.dosage_unit ?? "").toLowerCase();
  const slot = rx.slot;
  const role = rx.sequence_role ?? "";

  if (slot === "bat_speed") return BAT_SPEED;
  if (slot === "speed") return SPEED_TIMED;
  if (slot === "conditioning") return CONDITIONING;
  if (unit === "throws" || role.includes("arm_care") && unit === "throws") return THROWING;
  if (slot === "lift" || slot === "supplemental") {
    // Mobility / trunk primers with time-only dosage → mobility mini-form
    if (unit === "seconds" && (!rx.reps || rx.reps <= 1)) return MOBILITY;
    return LIFT;
  }
  if (slot === "cross_sport") return MOBILITY;
  return LIFT;
}
