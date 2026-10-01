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
  no_pitching_finish_detector_yet: "We can't judge this finish from the footage yet.",
  throwing_delivery_not_confirmed: "We couldn't confirm a throw in this clip.",
  only_measured_on_a_sideways_shuffle_throw: "This check needs a sideways shuffle throw.",
};

export function athleteMissingness(reason?: string): string | undefined {
  if (!reason) return undefined;
  return MISSING[reason] ?? (reason.includes("camera_view_mismatch")
    ? "This camera angle doesn't show what this check needs."
    : reason.startsWith("pitcher_not_in_frame")
      ? "We couldn't see the pitcher clearly enough to check this timing."
    : reason.startsWith("no_windmill_delivery")
      ? "We couldn't see the windmill stride and landing clearly enough to confirm a pitch."
    : reason.startsWith("routed_to_delaycam")
      ? "This timing needs a faster recording to tell which move came first."
    : reason.startsWith("unproven") || reason.startsWith("proof_incomplete")
      ? "We couldn't see enough of the stride and turn to prove this move."
    : reason.includes("within_still_noise")
      ? "This move was too small to separate from normal camera movement."
    : reason.includes("hands_or_front_ankle_unobserved")
      ? "We couldn't follow your hands and front foot through the stride."
    : reason.includes("swing_peak_not_after_p4_start")
      ? "We couldn't clearly place the start and peak of your swing."
    : reason.includes("lead_arm_pointing_at_camera")
      ? "Your lead arm pointed toward the camera, so we couldn't judge its bend."
    : reason.includes("no_return_to_stillness")
      ? "The clip ended before we could see you settle after the swing."
    : "We couldn't get a trustworthy read from this clip.");
}

/** Last-line safety: athlete copy never exposes degrees or percentages. */
export function withoutMeasurementNotation(text: string): string {
  const lines = text.split(/(?<=[.!?])\s+|\n+/).filter((part) => !/[<>≤≥≈~±]?\s*[-+]?\d+(?:\.\d+)?\s*(?:[°%]|ms\b|milliseconds?\b|fps\b|mph\b)/i.test(part));
  const safe = lines.join(" ")
    .replace(/\b(?:frames?)\s*#?\d+\b/gi, "that moment")
    .replace(/\bP1\b/gi, "the load")
    .replace(/\bP2\b/gi, "the hand load")
    .replace(/\bP3\b/gi, "the stride")
    .replace(/\bP4\b/gi, "the turn")
    .replace(/\b\d+(?:\.\d+)?\s*(?:seconds?|secs?|inches|feet|ft)\b/gi, "")
    .replace(/\b\d+(?:\.\d+)?\b/g, "")
    .replace(/\s{2,}/g, " ").trim();
  return safe || "We couldn't make a trustworthy coaching call on this from the clip.";
}

export function athleteResult(status: string): string {
  if (status === "elite") return "Excellent move";
  if (status === "pass") return "You held it";
  if (status === "warn") return "Almost there";
  return "Needs work";
}