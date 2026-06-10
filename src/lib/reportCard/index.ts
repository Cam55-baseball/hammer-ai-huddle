import type { ReportCardSpec } from "./types";
import { bpReportCard } from "./disciplines/bp";
import { bhReportCard } from "./disciplines/bh";
import { throwingReportCard } from "./disciplines/throwing";

/**
 * Resolve the report card spec for a given sport + module.
 * Softball pitching/hitting/throwing derive from baseball equivalents until
 * sport-specific deltas (windmill etc.) are ratified.
 */
export function getReportCardSpec(
  sport: string | undefined,
  module: string | undefined,
): ReportCardSpec | null {
  const s = (sport ?? "baseball").toLowerCase();
  const m = (module ?? "").toLowerCase();

  if (m === "pitching") {
    return s === "softball"
      ? { ...bpReportCard, disciplineLabel: "Softball Pitching" }
      : bpReportCard;
  }
  if (m === "hitting") {
    return s === "softball"
      ? { ...bhReportCard, disciplineLabel: "Softball Hitting" }
      : bhReportCard;
  }
  if (m === "throwing") {
    return {
      ...throwingReportCard,
      disciplineLabel: s === "softball" ? "Softball Throwing" : "Baseball Throwing",
    };
  }
  return null;
}

export type { ReportCardSpec, ReportCardTileSpec, TileState, AnalysisLike } from "./types";
