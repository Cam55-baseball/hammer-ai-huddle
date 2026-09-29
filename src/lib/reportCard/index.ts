import type { ReportCardSpec } from "./types";
import { bpReportCard } from "./disciplines/bp";
import { bhReportCard } from "./disciplines/bh";
import { spReportCard } from "./disciplines/sp";
import { throwingReportCard } from "./disciplines/throwing";
import { coachFacingTile } from "./coachCopy";
import { throwingFacingTile } from "./throwingCopy";

/**
 * Resolve the report card spec for a given sport + module.
 * Softball pitching uses its windmill-specific SP discipline; softball
 * hitting derives from BH until its sport-specific deltas are ratified.
 */
export function getReportCardSpec(
  sport: string | undefined,
  module: string | undefined,
): ReportCardSpec | null {
  const s = (sport ?? "baseball").toLowerCase();
  const m = (module ?? "").toLowerCase();

  if (m === "pitching") {
    return s === "softball" ? spReportCard : bpReportCard;
  }
  if (m === "hitting") {
    return {
      ...bhReportCard,
      disciplineLabel: s === "softball" ? "Softball Hitting" : "Baseball Hitting",
      tiles: bhReportCard.tiles.map((tile) => coachFacingTile(tile, s)),
    };
  }
  if (m === "throwing") {
    return {
      ...throwingReportCard,
      disciplineLabel: s === "softball" ? "Softball Throwing" : "Baseball Throwing",
      tiles: throwingReportCard.tiles.map((tile) => throwingFacingTile(tile, s)),
    };
  }
  return null;
}

export type { ReportCardSpec, ReportCardTileSpec, TileState, AnalysisLike } from "./types";
