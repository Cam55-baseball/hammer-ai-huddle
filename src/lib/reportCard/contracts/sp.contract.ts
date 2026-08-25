import type { DisciplineContract } from "./shared";

/**
 * Softball Pitching — windmill-specific metric contract.
 *
 * 13 report-card tiles backed by 15 persisted metric keys (the three-moment
 * stride profile stores one value per moment). Checkpoints A–L trace to a
 * 2025 peer-reviewed clinical review of windmill-pitching biomechanics.
 * The review supplies the checkpoints, the SFC foot-angle band, and the
 * stride bands; every other numeric threshold is a Hammer-proposed starting
 * tolerance and must not be presented as source-derived.
 */
export const spContract: DisciplineContract = {
  id: "sp",
  label: "Softball Pitching",
  metrics: [
    {
      key: "windup_trunk_tibia_deg",
      tileKey: "windup_trunk_tibia",
      label: "A. Wind-up trunk line vs drive-leg tibia line",
      kind: "number",
      unit: "degrees",
      range: [0, 60],
      prompt:
        "At the END OF WIND-UP, measure the absolute angle between the trunk line and the drive-leg tibia line. 0° means the lines are parallel. The checkpoint itself is source-derived; ≤10° is a Hammer-proposed starting tolerance, not a published source value. If the trunk and drive-leg tibia are not both visible at end of wind-up, set missing=true with the specific hidden landmark.",
    },
    {
      key: "windup_hip_square_deg",
      tileKey: "windup_hip_square",
      label: "B. Wind-up hips vs home-plate line",
      kind: "number",
      unit: "degrees",
      range: [0, 60],
      prompt:
        "At the END OF WIND-UP, measure the absolute angle between the hip line and the home-plate line. 0° means the hips are square to home plate. The checkpoint is source-derived; ≤10° is a Hammer-proposed starting tolerance, not a published source value. If both hips or the home-plate reference line are not visible, set missing=true with the specific missing landmark.",
    },
    {
      key: "windup_knee_over_foot_deg",
      tileKey: "windup_knee_over_foot",
      label: "C. Wind-up knee-center line over mid-foot",
      kind: "number",
      unit: "degrees",
      range: [0, 45],
      prompt:
        "At the END OF WIND-UP, measure the absolute angle between the line from drive-knee center to heel and the drive-foot mid-foot reference. 0° means the knee is stacked over the foot. The checkpoint is source-derived; ≤10° is a Hammer-proposed starting tolerance, not a published source value. If knee center, heel, or mid-foot is not visible, set missing=true with the specific hidden landmark.",
    },
    {
      key: "windup_foot_power_line_deg",
      tileKey: "windup_foot_power_line",
      label: "D. Wind-up drive foot vs rubber-to-plate power line",
      kind: "number",
      unit: "degrees",
      range: [0, 60],
      prompt:
        "At the END OF WIND-UP, measure the absolute angle between the drive foot and the rubber-to-home-plate power line. 0° means the foot is aligned with the power line. The checkpoint is source-derived; ≤10° is a Hammer-proposed starting tolerance, not a published source value. If the drive foot, rubber, or plate line is not visible, set missing=true with the specific missing landmark.",
    },
    {
      key: "stride_triple_extension_pass",
      tileKey: "stride_triple_extension",
      label: "E. Drive-leg triple extension with trunk still facing home",
      kind: "boolean",
      prompt:
        "At the START OF STRIDE / drive-leg toe-off, set TRUE only if BOTH are observed: (1) drive-leg triple extension — hip extension, knee extension, and ankle plantarflexion — and (2) shoulders/trunk still face home plate. Set FALSE when any component is clearly absent. If any required joint or the trunk orientation is not visible, set missing=true with the specific hidden landmark.",
    },
    {
      key: "sfc_foot_angle_deg",
      tileKey: "sfc_foot_angle",
      label: "F. Stride-foot angle at stride foot contact",
      kind: "number",
      unit: "degrees",
      range: [-45, 90],
      prompt:
        "At STRIDE FOOT CONTACT (SFC), measure the signed stride-foot angle relative to the home-plate line. 0° = foot points at home plate; positive = open toward the pitching-arm side; negative = closed toward the glove side. SOURCED pass band: 0° to 45° toward the pitching-arm side. If the stride foot or home-plate line is not visible at SFC, set missing=true with the specific missing landmark.",
    },
    {
      key: "sfc_arm_path_deg",
      tileKey: "sfc_arm_path",
      label: "G. Pitching-arm path vs power line at SFC",
      kind: "number",
      unit: "degrees",
      range: [0, 60],
      prompt:
        "At STRIDE FOOT CONTACT (SFC), measure the absolute degrees the pitching-arm path deviates from its near-perpendicular-to-ground position close to the power line. 0° is the intended alignment. The checkpoint is source-derived; ≤15° is a Hammer-proposed starting tolerance, not a published source value. If the pitching arm is occluded or the power line cannot be established, set missing=true with the specific missing landmark.",
    },
    {
      key: "sfc_trunk_alignment_pass",
      tileKey: "sfc_trunk_alignment",
      label: "H. Head-to-ground line passes through belly button at SFC",
      kind: "boolean",
      prompt:
        "At STRIDE FOOT CONTACT (SFC), set TRUE if a vertical head-to-ground line passes through the belly button. Set FALSE if the line clearly falls in front of or behind the belly button. If the head, ground contact point, or belly button is not visible, set missing=true with the specific hidden landmark.",
    },
    {
      key: "sfc_knee_ankle_deg",
      tileKey: "sfc_knee_ankle",
      label: "I. Stride-knee line vs ankle center at SFC",
      kind: "number",
      unit: "degrees",
      range: [0, 45],
      prompt:
        "At STRIDE FOOT CONTACT (SFC), measure the absolute angle between the stride-knee-center-to-ground line and the ankle-center reference. 0° means the knee is stacked over the ankle. The checkpoint is source-derived; ≤10° is a Hammer-proposed starting tolerance, not a published source value. If the stride knee or ankle center is not visible, set missing=true with the specific hidden landmark.",
    },
    {
      key: "sfc_hip_shoulder_rotation_deg",
      tileKey: "sfc_hip_shoulder_rotation",
      label: "J. Pelvis/trunk rotation toward pitching-arm side at SFC",
      kind: "number",
      unit: "degrees",
      range: [-30, 90],
      prompt:
        "At STRIDE FOOT CONTACT (SFC), measure degrees of pelvis/trunk rotation toward the pitching-arm side relative to square-to-home-plate. Positive = toward the pitching-arm side. The source establishes this checkpoint but does NOT publish a softball minimum; ≥20° is a Hammer-proposed starting tolerance and is NOT the baseball ≥50° value. If pelvis/trunk orientation cannot be measured, set missing=true with the specific missing landmark.",
    },
    {
      key: "accel_arm_path_pass",
      tileKey: "accel_arm_path",
      label: "K. Acceleration arm path and back-leg power line",
      kind: "boolean",
      prompt:
        "During ACCELERATION from SFC to release, set TRUE only if BOTH are observed: the pitching arm stays close to the body and the back/drive leg stays near the rubber-to-plate power line. Set FALSE if the arm swings wide away from the body or the back leg clearly leaves the power-line corridor. If either path cannot be tracked, set missing=true with the specific missing landmark.",
    },
    {
      key: "ft_knee_ankle_deg",
      tileKey: "ft_knee_ankle",
      label: "L. Follow-through knee-center line vs ankle center",
      kind: "number",
      unit: "degrees",
      range: [0, 45],
      prompt:
        "At FOLLOW-THROUGH, measure the absolute angle between the stride-knee-center-to-ground line and the ankle-center reference while the athlete stabilizes on the stride leg. 0° means the knee is stacked over the ankle. The checkpoint is source-derived; ≤10° is a Hammer-proposed starting tolerance, not a published source value. If the athlete does not reach a visible single-leg follow-through or either landmark is hidden, set missing=true with the specific reason.",
    },
    {
      key: "stride_pct_top",
      tileKey: "stride_profile",
      label: "Three-moment stride profile — top of arm circle",
      kind: "number",
      unit: "percent",
      range: [30, 130],
      prompt:
        "At the instant the pitching arm reaches the TOP of the arm circle, measure the distance between the drive-foot ankle and stride-foot ankle along the power line as a percentage of the athlete's standing height. SOURCED reference bands: Youth ≈98%, Collegiate ≈93%. If full standing height or either ankle cannot be calibrated, set missing=true with the specific calibration gap. Never guess.",
    },
    {
      key: "stride_pct_sfc",
      tileKey: "stride_profile",
      label: "Three-moment stride profile — stride foot contact",
      kind: "number",
      unit: "percent",
      range: [30, 130],
      prompt:
        "At STRIDE FOOT CONTACT, measure the distance between the drive-foot ankle and stride-foot ankle along the power line as a percentage of the athlete's standing height. SOURCED reference bands: Youth ≈89%, Collegiate ≈89%. If full standing height or either ankle cannot be calibrated, set missing=true with the specific calibration gap. Never guess.",
    },
    {
      key: "stride_pct_release",
      tileKey: "stride_profile",
      label: "Three-moment stride profile — ball release",
      kind: "number",
      unit: "percent",
      range: [30, 130],
      prompt:
        "At BALL RELEASE, measure the distance between the drive-foot ankle and stride-foot ankle along the power line as a percentage of the athlete's standing height. SOURCED reference bands: Youth ≈68%, Collegiate ≈73%. If full standing height, release frame, or either ankle cannot be calibrated, set missing=true with the specific calibration gap. Never guess.",
    },
  ],
};
