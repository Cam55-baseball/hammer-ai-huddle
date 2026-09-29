import type { ReportCardSpec, ReportCardTileSpec, TileState, AnalysisLike } from "../types";

/**
 * A throwing report cannot read mound-only or AI-guessed pitching metrics.
 * Both sports share these four pose-only measurements; copy is sport-specific.
 */
type Stored = { value: number | null; verdict: "pass" | "fail" | null; missing_reason: string | null };
const read = (a: AnalysisLike, key: string): TileState => {
  const stored = (a as AnalysisLike & { throwing_tiles_deterministic?: Record<string, Stored> }).throwing_tiles_deterministic?.[key];
  if (!stored || stored.value == null) return { status: "missing", missing_reason: stored?.missing_reason ?? "anchor_not_detected" };
  return { status: stored.verdict ?? "warn" }; // no numeric athlete-facing copy; exact value remains in stored diagnostics
};
const tile = (key: string, name: string): ReportCardTileSpec => ({
  key, name, mode: "pass_fail", standard: "Measured from a confirmed overhand throw.",
  explainer: { whatWhy: "We look at your movement from preparation through the throw.", howToImprove: "Keep the move balanced through your front-foot landing.", encouragement: "Keep working on the same movement each time." },
  compute: (a) => read(a, key),
});

export const throwingReportCard: ReportCardSpec = {
  disciplineLabel: "Throwing",
  groupByPhase: false,
  tiles: [tile("tempo", "Throwing Tempo"), tile("energy_angle", "Shuffle Energy Angle"), tile("shoulder_opening", "Shoulders at Landing"), tile("head_stability", "Head Through the Throw")],
};
