import type { ReportCardSpec, ReportCardTileSpec, TileState, AnalysisLike } from "../types";

/**
 * Throwing card — injury prevention first (owner 2026-09-29, docs/THROWING-DOCTRINE.md).
 * Arm-care FLAGS are shown in their own group and carry NO grading weight;
 * the mechanics checks follow. Never a diagnosis or a prediction; coach language, no numbers.
 */
export const THROWING_CARD_FRAMING =
  "The main job of this card is arm care. The first group points out throwing mechanics that published research links to more stress on the shoulder or elbow. Those are flags, not grades, and they cannot tell you whether your arm is hurt. If your arm is sore or painful, stop throwing and see a qualified professional.";

export const ARM_CARE_GROUP = "Arm-care flags (not graded)";
export const MECHANICS_GROUP = "Throwing mechanics";

type Stored = { value: number | null; verdict: "pass" | "fail" | null; flag?: "raised" | "clear" | null; missing_reason: string | null };
type Store = { throwing_tiles_deterministic?: Record<string, Stored> & { injury?: Record<string, Stored> } };

const readMechanics = (a: AnalysisLike, key: string): TileState => {
  const stored = (a as AnalysisLike & Store).throwing_tiles_deterministic?.[key];
  if (!stored || (stored.value == null && stored.verdict == null)) return { status: "missing", missing_reason: stored?.missing_reason ?? "anchor_not_detected" };
  return { status: stored.verdict ?? "warn" }; // ungraded observation → neutral; exact value stays in diagnostics
};
/** A flag never grades: raised → caution, clear → "nothing flagged", inside the noise floor → no call. */
const readFlag = (a: AnalysisLike, key: string): TileState => {
  const stored = (a as AnalysisLike & Store).throwing_tiles_deterministic?.injury?.[key];
  if (!stored || stored.flag == null) return { status: "missing", missing_reason: stored?.missing_reason ?? "anchor_not_detected" };
  return stored.flag === "raised" ? { status: "warn" } : { status: "pass", note: "Nothing flagged. This is not a grade." };
};

const explainer = { whatWhy: "We look at your movement from preparation through the throw.", howToImprove: "Keep the move balanced through your front-foot landing.", encouragement: "Keep working on the same movement each time." };
const flag = (key: string, name: string): ReportCardTileSpec => ({
  key, name, mode: "pass_fail", phase: ARM_CARE_GROUP, standard: "Arm-care flag — not graded.", explainer, compute: (a) => readFlag(a, key),
});
const check = (key: string, name: string): ReportCardTileSpec => ({
  key, name, mode: "pass_fail", phase: MECHANICS_GROUP, standard: "Measured from a confirmed throw, any arm slot.", explainer, compute: (a) => readMechanics(a, key),
});

/** Lift & Thrust is deliberately absent: the owner has not specified a crow-hop version. */
export const throwingReportCard: ReportCardSpec = {
  disciplineLabel: "Throwing — Arm Care",
  groupByPhase: true,
  tiles: [
    flag("trunk_rotation_before_foot_contact", "Shoulders Wait for Landing"),
    flag("horizontal_abduction_at_foot_contact", "Arm Stays in Its Lane"),
    flag("stride_foot_direction", "Front Foot Lands in Line"),
    check("tempo", "Throwing Tempo"),
    check("stride_length", "Stride From the Final Step"),
    check("energy_angle", "Shuffle Energy Angle"),
    check("head_stability", "Head Through the Throw"),
  ],
};
