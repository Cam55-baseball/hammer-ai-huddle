import type { DisciplineContract } from "./shared";

/**
 * Baseball Pitching — 10 tile metric contract.
 * Keys MUST stay stable; they're persisted on `ai_analysis.metrics`.
 */
export const bpContract: DisciplineContract = {
  id: "bp",
  label: "Baseball Pitching",
  metrics: [
    {
      key: "energy_angle_deg",
      tileKey: "energy_angle",
      label: "Energy Angle",
      kind: "number",
      unit: "degrees",
      range: [0, 60],
      prompt:
        "Angle from the center mass of the plant foot to the front hip at PEAK LEG LIFT. " +
        "Measure in degrees. 18° passes; 25° is elite. If you cannot see the plant foot and front hip simultaneously, mark missing.",
    },
    {
      key: "premature_shoulder_open_deg",
      tileKey: "hip_shoulder_separation",
      label: "Premature shoulder opening (negative degrees = still closed at landing)",
      kind: "number",
      unit: "degrees",
      range: [-30, 60],
      prompt:
        "Degrees the throwing-side shoulder has already rotated toward the target BEFORE the front foot lands. " +
        "0 or negative = shoulders still closed at landing (PASS). Positive = early opening (FAIL).",
    },
    {
      key: "tempo_sec",
      tileKey: "tempo",
      label: "Tempo (peak leg lift → front foot strike)",
      kind: "number",
      unit: "seconds",
      range: [0.4, 2.0],
      prompt:
        "Time in seconds from peak leg lift to front foot strike. <=1.05s passes.",
    },
    {
      key: "stride_pct_of_height",
      tileKey: "stride_length",
      label: "Stride length as % of athlete height",
      kind: "number",
      unit: "percent",
      range: [40, 130],
      prompt:
        "Stride length (back ankle at lift → front ankle at landing) as a PERCENTAGE of the athlete's standing height. " +
        ">=90% passes. If athlete height cannot be approximated from the frames, mark missing.",
    },
    {
      key: "head_vertical_movement_pct",
      tileKey: "head_stability",
      label: "Vertical head movement as % of athlete height",
      kind: "number",
      unit: "percent",
      range: [0, 15],
      prompt:
        "Vertical bounce of the head from setup to release as a percentage of athlete height. <=2% passes.",
    },
    {
      key: "glove_drift_outside_frame_in",
      tileKey: "glove_control",
      label: "Glove drift outside shoulder frame (inches)",
      kind: "number",
      unit: "inches",
      range: [-12, 24],
      prompt:
        "Inches the glove drifts OUTSIDE the shoulder frame during delivery. 0 or negative (stays inside) passes. " +
        "If the glove leaves the visible frame, mark missing.",
    },
    {
      key: "head_at_release_deg",
      tileKey: "head_at_release",
      label: "Head deviation from target line at release",
      kind: "number",
      unit: "degrees",
      range: [-45, 45],
      prompt:
        "Absolute degrees the head is offset from the target line at ball release. <=15° passes.",
    },
    {
      key: "shoulder_tilt_deg",
      tileKey: "shoulder_tilt_release",
      label: "Shoulder tilt from horizontal at release",
      kind: "number",
      unit: "degrees",
      range: [-45, 45],
      prompt:
        "Absolute degrees of shoulder tilt from horizontal at ball release. <=10° passes.",
    },
    {
      key: "lift_thrust_deg",
      tileKey: "lift_thrust",
      label: "Combined lift-and-thrust angle off the rubber",
      kind: "number",
      unit: "degrees",
      range: [0, 60],
      prompt:
        "Combined lift-and-thrust drive angle off the rubber. >=18° passes.",
    },
  ],
};
