/** Presentation adapter: read only the deterministic, clip-local tile namespaces.
 * No category totals, AI metrics, or default measurements enter this card.
 */
import { categorySpecFor } from "./categories/specs";
import { otherClipCopy } from "./measuredClipOtherCopy";
import { at, scoreCard, type TileReading } from "./categories/scoring";
import { HITTING_CLIP_COPY } from "./measuredClipCopy";
import type { ReportCardSpec, ReportCardTileSpec, TileState } from "./types";

// Raw degrees, percentages, elapsed time and positional fractions belong in stored diagnostics,
// not in athlete copy. A dimensionless record can still show its actual reading.
const valueText = (n: number, unit?: string): string | undefined =>
  unit && /degree|percent|pct|ms|sec|fraction|angle|fps|inch|foot|feet|boolean/i.test(unit)
    ? undefined : `${Math.round(n * 100) / 100}${unit && unit !== "value" ? ` ${unit.replace(/_/g, " ")}` : ""}`;

const asState = (reading: TileReading, raw?: unknown, path?: string, proof?: { outcome: { status: string; disprovenBy?: string } }): TileState => {
  const source = path ? at(raw, path) as { value?: unknown; unit?: string; confidence?: { status?: string; value?: number | null }; lineage?: Record<string, unknown> } | undefined : undefined;
  const confidence = source?.confidence?.status === "calibrated" && typeof source.confidence.value === "number" ? source.confidence.value : undefined;
  const value = typeof source?.value === "number" && Number.isFinite(source.value) ? valueText(source.value, source.unit) : undefined;
  const note = reading.kind === "verdict" && !reading.pass && reading.finding === "not_held" ? "Phase 1 — Create Balance: the load was not held through the stride."
    : reading.kind === "verdict" && !reading.pass && reading.finding === "not_used" ? "Phase 1 — Create Balance: the load was held but not used in the turn."
    : proof?.outcome?.disprovenBy ? "Phase 1 — Create Balance: the later stride disproved this load position." : undefined;
  if (reading.kind === "verdict") return { status: proof?.outcome?.disprovenBy ? "fail" : reading.elite ? "elite" : reading.pass ? "pass" : "fail", value, confidence, note };
  if (reading.kind === "score" && Number.isFinite(reading.frac) && reading.frac >= 0 && reading.frac <= 1) return { status: "record", value, confidence };
  if (reading.kind === "record" && Number.isFinite(reading.value)) return { status: "record", value, confidence };
  if (reading.kind === "ungraded" && typeof reading.value === "number" && Number.isFinite(reading.value)) return { status: "record", value, confidence };
  return { status: "missing", missing_reason: reading.kind === "missing" || reading.kind === "not_applicable" ? reading.reason : "no_owner_standard_yet" };
};

export type MeasuredClipTiles = { card: string; readings: unknown };

function readClip(analysis: Record<string, unknown>, card: string): unknown {
  const source = analysis.deterministic_clip_tiles as MeasuredClipTiles | null | undefined;
  return source?.card === card ? source.readings : null;
}

/** The same category outcome that powers the header also resolves downstream attribution on each tile. */
export function measuredClipScore(analysis: Record<string, unknown>, sport: string | undefined, module: string | undefined) {
  const spec = categorySpecFor(sport, module);
  return spec ? scoreCard(spec, readClip(analysis, spec.card), { audience: "athlete" }) : null;
}

const HITTING_PATHS: Record<string, string> = {
  "p1.hip_load": "pose.hip_load", "p2.hand_load": "pose.hand_load", "p2.hand_load_depth": "pose.hand_load", "p2.p2_timing": "pose.p2_timing",
  "p3.back_hip_socket_hold": "owner.tile20", "p3.head_path_through_stride": "owner.tile19", "p3.active_stride": "rhythm.active",
  "p3.stride_foot_vs_body": "coil.foot_vs_body", "p3.stride_hands_opposite": "coil.hands_opposite", "p3.stride_side_bend": "coil.side_bend", "p3.stride_sink": "coil.sink",
  "p3.head_discipline": "pose.head_discipline", "p3.back_heel_early_rise": "card.back_heel_early_rise", "p3.stride_direction": "pose.stride_direction", "p3.p3_timing": "pose.p3_timing", "p3.back_knee_flex_maintained": "card.back_knee_flex_maintained", "p3.heel_plant": "card.heel_plant", "p3.hands_outside_shoulders_at_landing": "pose.hands_outside_shoulders_at_landing", "p3.hands_stay_up_at_plant": "card.hands_stay_up_at_plant",
  "p4.sequencing": "card.sequencing", "p4.separation_magnitude": "card.separation_magnitude", "p4.shoulder_to_shoulder_hold": "card.shoulder_to_shoulder_hold", "p4.back_elbow_connection": "card.back_elbow_connection", "p4.shoulder_plane_steadiness": "card.shoulder_plane_steadiness", "p4.lead_elbow_bend_increasing": "card.lead_elbow_bend_increasing", "p4.head_vertical_movement_post_landing": "card.head_vertical_movement_post_landing", "p4.post_landing_hip_drift": "card.post_landing_hip_drift", "finish.pelvis_rotation_efficiency": "card.pelvis_rotation_efficiency", "finish.finish_balance": "card.finish_balance", "front_leg_gather.front_leg_gather": "gather",
};

export function measuredClipSpec(sport: string | undefined, module: string | undefined): ReportCardSpec | null {
  const spec = categorySpecFor(sport, module);
  if (!spec) return null;
  const label = `${sport === "softball" ? "Softball" : "Baseball"} ${module === "pitching" ? "Pitching" : module === "throwing" ? "Throwing" : "Hitting"}`;
  const tiles: ReportCardTileSpec[] = [...spec.sections.flatMap((section) => section.tiles.map((tile) => ({
    key: `${section.key}.${tile.key}`,
    name: tile.name,
    phase: section.title,
    mode: "pass_fail" as const,
    standard: otherClipCopy(spec.card, sport, tile.key).standard,
    explainer: (({ standard: _s, ...rest }) => rest)(otherClipCopy(spec.card, sport, tile.key)),
    compute: (analysis) => asState(tile.read(readClip(analysis as Record<string, unknown>, spec.card))),
  }))), ...spec.categories.flatMap((group) => group.tiles
    .map((tile) => ({
      key: `${group.key}.${tile.key}`,
       name: tile.name.replace(/\bP([1-4])\b/g, "Phase $1"),
      phase: group.title,
      mode: "pass_fail" as const,
       nonNegotiable: spec.card === "hitting" && group.key === "p4" ? true : tile.nonNegotiable,
       standard: spec.card === "hitting" ? HITTING_CLIP_COPY[`${group.key}.${tile.key}`]?.[0] ?? "" : otherClipCopy(spec.card, sport, tile.key).standard,
       explainer: spec.card === "hitting" && HITTING_CLIP_COPY[`${group.key}.${tile.key}`]
         ? { whatWhy: HITTING_CLIP_COPY[`${group.key}.${tile.key}`][1], howToImprove: HITTING_CLIP_COPY[`${group.key}.${tile.key}`][2], encouragement: HITTING_CLIP_COPY[`${group.key}.${tile.key}`][3] }
         : (({ standard: _s, ...rest }) => rest)(otherClipCopy(spec.card, sport, tile.key)),
       compute: (analysis) => {
         const raw = readClip(analysis as Record<string, unknown>, spec.card);
         const outcome = measuredClipScore(analysis as Record<string, unknown>, sport, module)?.categories.find((c) => c.key === group.key)?.tiles.find((t) => t.key === tile.key);
          return asState(tile.read(raw), raw, spec.card === "hitting" ? HITTING_PATHS[`${group.key}.${tile.key}`] : undefined,
            outcome?.outcome.status === "scored" ? { outcome: outcome.outcome } : undefined);
       },
    })))];
  return { disciplineLabel: label, groupByPhase: true, tiles };
}