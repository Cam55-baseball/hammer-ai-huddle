/** Presentation adapter: read only the deterministic, clip-local tile namespaces.
 * No category totals, AI metrics, or default measurements enter this card.
 */
import { categorySpecFor } from "./categories/specs";
import type { TileReading } from "./categories/scoring";
import type { ReportCardSpec, ReportCardTileSpec, TileState } from "./types";

const asState = (reading: TileReading): TileState => {
  if (reading.kind === "verdict") return { status: reading.elite ? "elite" : reading.pass ? "pass" : "fail" };
  if (reading.kind === "score" && Number.isFinite(reading.frac) && reading.frac >= 0 && reading.frac <= 1) return { status: "record", score100: reading.frac * 100 };
  if (reading.kind === "record" && Number.isFinite(reading.value)) return { status: "record" };
  if (reading.kind === "ungraded" && typeof reading.value === "number" && Number.isFinite(reading.value)) return { status: "record" };
  return { status: "missing", missing_reason: reading.kind === "missing" || reading.kind === "not_applicable" ? reading.reason : "no_owner_standard_yet" };
};

export type MeasuredClipTiles = { card: string; readings: unknown };

function readClip(analysis: Record<string, unknown>, card: string): unknown {
  const source = analysis.deterministic_clip_tiles as MeasuredClipTiles | null | undefined;
  return source?.card === card ? source.readings : null;
}

export function measuredClipSpec(sport: string | undefined, module: string | undefined): ReportCardSpec | null {
  const spec = categorySpecFor(sport, module);
  if (!spec) return null;
  const label = `${sport === "softball" ? "Softball" : "Baseball"} ${module === "pitching" ? "Pitching" : module === "throwing" ? "Throwing" : "Hitting"}`;
  const tiles: ReportCardTileSpec[] = [...spec.sections.flatMap((section) => section.tiles.map((tile) => ({
    key: `${section.key}.${tile.key}`,
    name: tile.name,
    phase: section.title,
    mode: "pass_fail" as const,
    standard: "Flag · not graded",
    explainer: { whatWhy: tile.name, howToImprove: "", encouragement: "" },
    compute: (analysis) => asState(tile.read(readClip(analysis as Record<string, unknown>, spec.card))),
  }))), ...spec.categories.flatMap((group) => group.tiles
    .map((tile) => ({
      key: `${group.key}.${tile.key}`,
      name: tile.name,
      phase: group.title,
      mode: tile.key === "shoulder_plane_steadiness" ? "score_meter" as const : "pass_fail" as const,
      standard: "",
      explainer: { whatWhy: tile.name, howToImprove: "", encouragement: "" },
      compute: (analysis) => asState(tile.read(readClip(analysis as Record<string, unknown>, spec.card))),
    })))];
  return { disciplineLabel: label, groupByPhase: true, tiles };
}