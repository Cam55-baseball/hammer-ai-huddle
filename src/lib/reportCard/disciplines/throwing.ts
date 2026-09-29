import type { ReportCardSpec, ReportCardTileSpec, TileState, AnalysisLike } from "../types";

/**
 * Throwing card — injury prevention first (owner 2026-09-29). Arm-care
 * markers from published throwing research come first; the four movement
 * checks follow. Never a diagnosis or a prediction; coach language, no numbers.
 */
export const THROWING_CARD_FRAMING =
  "This card looks for throwing mechanics that published research links to more stress on the arm. It is not a medical check and cannot tell you whether your arm is hurt. If your arm is sore or painful, stop throwing and see a qualified professional.";

type Stored = { value: number | null; verdict: "pass" | "fail" | null; missing_reason: string | null };
type Store = { throwing_tiles_deterministic?: Record<string, Stored> & { injury?: Record<string, Stored> } };
const read = (a: AnalysisLike, key: string, injury: boolean): TileState => {
  const t = (a as AnalysisLike & Store).throwing_tiles_deterministic;
  const stored = injury ? t?.injury?.[key] : t?.[key];
  if (!stored || (stored.value == null && stored.verdict == null)) return { status: "missing", missing_reason: stored?.missing_reason ?? "anchor_not_detected" };
  return { status: stored.verdict ?? "warn" }; // ungraded observation → neutral; exact value stays in diagnostics
};

const tile = (key: string, name: string, injury = false): ReportCardTileSpec => ({
  key, name, mode: "pass_fail", standard: "Measured from a confirmed overhand throw.",
  explainer: { whatWhy: "We look at your movement from preparation through the throw.", howToImprove: "Keep the move balanced through your front-foot landing.", encouragement: "Keep working on the same movement each time." },
  compute: (a) => read(a, key, injury),
});

export const throwingReportCard: ReportCardSpec = {
  disciplineLabel: "Throwing — Arm Care",
  groupByPhase: false,
  tiles: [
    tile("arm_late_at_foot_strike", "Arm Up at Landing", true),
    tile("shoulder_opening", "Shoulders Wait for Landing"),
    tile("trunk_lateral_tilt_at_release", "Upper Body Stays Tall", true),
    tile("across_body_stride", "Stride Toward the Target", true),
    tile("elbow_height_at_foot_strike", "Elbow Height at Landing", true),
    tile("elbow_height_at_release", "Elbow Height at Release", true),
    tile("front_knee_after_landing", "Front Leg Firms Up", true),
    tile("arm_outside_body_frame", "Arm Stays in Its Lane", true),
    tile("deceleration_follow_through", "Full Follow-Through", true),
    tile("tempo", "Throwing Tempo"),
    tile("energy_angle", "Shuffle Energy Angle"),
    tile("head_stability", "Head Through the Throw"),
  ],
};
