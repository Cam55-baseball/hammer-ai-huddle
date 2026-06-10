import type { ReportCardSpec } from "../types";
import { bpReportCard } from "./bp";

/**
 * Throwing (BB + SB) reuses the BP spec minus the from-windup-only tiles
 * (Energy Angle, Tempo, Lift & Thrust).
 */
const throwingKeys = new Set([
  "hip_shoulder_separation",
  "stride_length",
  "head_stability",
  "glove_control",
  "head_at_release",
  "shoulder_tilt_release",
]);

export const throwingReportCard: ReportCardSpec = {
  disciplineLabel: "Throwing",
  groupByPhase: false,
  tiles: bpReportCard.tiles.filter((t) => throwingKeys.has(t.key)),
};
