/** Athlete-facing report language. Exact measurements remain in stored metrics. */
const MISSING: Record<string, string> = {
  pose_not_detected: "We couldn't follow your body clearly enough in this clip.",
  hands_not_detected: "We couldn't see your hands clearly enough to judge this one.",
  bat_not_detected: "We couldn't follow the bat clearly enough in this clip.",
  ball_not_detected: "We couldn't follow the ball clearly enough in this clip.",
  contact_frame_missing: "We couldn't see the moment the ball met the bat clearly enough.",
  front_foot_first_contact_missing: "We couldn't see when your front foot first touched down.",
  front_foot_full_plant_missing: "We couldn't see your front heel settle clearly enough.",
  pitcher_release_frame_missing: "We couldn't see the pitcher's release clearly enough.",
  peak_leg_lift_missing: "We couldn't see the top of the leg lift clearly enough.",
  insufficient_temporal_resolution: "This clip was filmed too slowly for us to measure this one.",
  pose_model_is_stub: "This measurement is not ready yet.",
  landmark_occluded: "Part of your body was hidden or pointed at the camera, so we couldn't judge this one.",
  anchor_not_detected: "We couldn't find the movement moment this check needs.",
  out_of_frame: "Part of your body left the picture, so we couldn't judge this one.",
  calibration_unavailable: "This camera angle doesn't show what this check needs.",
  deterministic_pitching_tiles_not_run: "This body-mechanics check was not available for this clip.",
  tempo_anchors_unavailable: "We couldn't see both the leg lift and front-foot landing clearly enough.",
};

export function athleteMissingness(reason?: string): string | undefined {
  if (!reason) return undefined;
  return MISSING[reason] ?? (reason.includes("camera_view_mismatch")
    ? "This camera angle doesn't show what this check needs."
    : "We couldn't get a trustworthy read from this clip.");
}

/** Last-line safety: athlete copy never exposes degrees or percentages. */
export function withoutMeasurementNotation(text: string): string {
  return text
    .replace(/[<>≤≥≈~±]?\s*\d+(?:\.\d+)?\s*°/g, "the coaching standard")
    .replace(/[<>≤≥≈~±]?\s*\d+(?:\.\d+)?\s*%/g, "the coaching standard")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function athleteResult(status: string): string {
  if (status === "elite") return "Excellent move";
  if (status === "pass") return "You held it";
  if (status === "warn") return "Almost there";
  return "Needs work";
}