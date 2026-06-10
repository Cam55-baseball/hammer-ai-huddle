import type { ReportCardSpec, ReportCardTileSpec, TileState, AnalysisLike } from "../types";

/** Numeric helper: read a structured metric if present, else null. */
function num(analysis: AnalysisLike, key: string): number | null {
  const m = analysis.metrics?.[key];
  return typeof m === "number" && Number.isFinite(m) ? m : null;
}
function bool(analysis: AnalysisLike, key: string): boolean | null {
  const m = analysis.metrics?.[key];
  return typeof m === "boolean" ? m : null;
}

const missing = (): TileState => ({ status: "missing" });

const tiles: ReportCardTileSpec[] = [
  {
    key: "energy_angle",
    name: "Energy Angle",
    mode: "raw_passed",
    standard: "18° OR MORE",
    explainer: {
      whatWhy:
        "The angle from the center mass of your plant foot to your front hip at peak leg lift. Elite target is 25°. Leading with your glute toward home plate marks an appropriate coil that kicks off a powerful, fast, efficient delivery.",
      howToImprove:
        "Pause at peak leg lift in a mirror. Feel the glute load. Hip-hinge mobility, lateral leg lifts against a wall, and tempo-controlled wind-up drills build the awareness.",
      encouragement: "The game is hard. Stack small wins — your delivery is a habit, not a moment.",
    },
    compute: (a) => {
      const v = num(a, "energy_angle_deg");
      if (v == null) return missing();
      return { status: v >= 18 ? "pass" : "fail", value: `${Math.round(v)}°`, passedOf: undefined };
    },
  },
  {
    key: "hip_shoulder_separation",
    name: "Hip / Shoulder Separation",
    mode: "raw_pass_fail",
    standard: "No shoulder rotation before landing",
    nonNegotiable: true,
    explainer: {
      whatWhy:
        "Your hips fire while your shoulders stay closed. Opening the shoulders before front foot strike leaks power and stresses the elbow. This is the single biggest velocity multiplier in pitching.",
      howToImprove:
        "Towel drills with a closed front shoulder. Med-ball rotational throws emphasizing 'hips first'. Slow-motion video review of your own delivery vs. an elite reference.",
      encouragement: "Separation is earned through patient reps. Keep the front shoulder closed and the velo finds you.",
    },
    compute: (a) => {
      const deg = num(a, "premature_shoulder_open_deg");
      if (deg == null) return missing();
      return { status: deg <= 0 ? "pass" : "fail", value: `${Math.round(deg)}°` };
    },
  },
  {
    key: "tempo",
    name: "Tempo",
    mode: "raw_passed",
    standard: "1.05s OR LESS",
    explainer: {
      whatWhy:
        "Time from peak leg lift to front foot strike. Mass × acceleration. Slow tempo loses perceived velocity even with a strong arm.",
      howToImprove:
        "Metronome-paced bullpens. Down-mound work with explicit count cues. 'Fast hips, late hands' verbal cue between pitches.",
      encouragement: "Tempo is a decision. Decide to go.",
    },
    compute: (a) => {
      const v = num(a, "tempo_sec");
      if (v == null) return missing();
      return { status: v <= 1.05 ? "pass" : "fail", value: v.toFixed(2) };
    },
  },
  {
    key: "stride_length",
    name: "Stride Length",
    mode: "raw_passed",
    standard: "90% OR MORE of height",
    explainer: {
      whatWhy:
        "Back-ankle-at-foot-raise to front-ankle-at-landing as a percentage of your height. Every foot of release extension plays ~3 mph faster in perceived velocity.",
      howToImprove:
        "Lateral lunge ladders, hip mobility flows, towel-drag stride drills. Mark your landing spot every pitch and aim for consistency before length.",
      encouragement: "Stretch the distance — your arm gets a free upgrade.",
    },
    compute: (a) => {
      const v = num(a, "stride_pct_of_height");
      if (v == null) return missing();
      return { status: v >= 90 ? "pass" : "fail", value: `${Math.round(v)}%` };
    },
  },
  {
    key: "head_stability",
    name: "Head Stability",
    mode: "raw_passed",
    standard: "2% OR LESS vertical movement",
    nonNegotiable: true,
    explainer: {
      whatWhy:
        "Head on a stable line through delivery. Vertical bounce wrecks command — your release point chases your head, not the catcher's mitt.",
      howToImprove:
        "Wall-sit posture holds. Slow tempo dry-throws filmed from the side. Verbal cue 'eyes ride the rail'.",
      encouragement: "Quiet head, loud strikes. Hold the line.",
    },
    compute: (a) => {
      const v = num(a, "head_vertical_movement_pct");
      if (v == null) return missing();
      return { status: v <= 2 ? "pass" : "fail", value: `${v.toFixed(1)}%` };
    },
  },
  {
    key: "glove_control",
    name: "Glove / Front Side",
    mode: "raw_pass_fail",
    standard: "Stays inside shoulder frame",
    explainer: {
      whatWhy:
        "Throwing is a fascial activity. The glove works back toward your body in a straight line from open-to-target to pinky-side-to-body. Swinging the glove outside the shoulder frame causes command issues.",
      howToImprove:
        "Glove-tuck drills with a partner holding your glove side. Mirror work focused on the glove path. 'Stick the glove' verbal cue.",
      encouragement: "Boring glove = elite command. Keep it inside the shoulders.",
    },
    compute: (a) => {
      const drift = num(a, "glove_drift_outside_frame_in");
      if (drift == null) return missing();
      return { status: drift <= 0 ? "pass" : "fail", value: drift > 0 ? `+${drift.toFixed(1)}"` : "in frame" };
    },
  },
  {
    key: "head_at_release",
    name: "Head at Release",
    mode: "raw_pass_fail",
    standard: "15° OR LESS from target line",
    explainer: {
      whatWhy:
        "Your head should be in line with the target at release — under 15° left or right of your belly button. Every degree past 15 doubles head weight and shortens your extension by about 2 inches.",
      howToImprove:
        "Eye-on-target tee work. Long-toss with a visible target line. Dry deliveries filmed from behind to spot the cock-off.",
      encouragement: "Eyes on the mitt, ball to the mitt. Simple. Hard. Worth it.",
    },
    compute: (a) => {
      const v = num(a, "head_at_release_deg");
      if (v == null) return missing();
      return { status: Math.abs(v) <= 15 ? "pass" : "fail", value: `${Math.abs(Math.round(v))}°` };
    },
  },
  {
    key: "shoulder_tilt_release",
    name: "Shoulder Tilt at Release",
    mode: "raw_pass_fail",
    standard: "10° OR LESS",
    explainer: {
      whatWhy:
        "Shoulders should be near horizontal at release with eyes level. Excess tilt drifts your arm slot and bleeds command.",
      howToImprove:
        "Wall-shadow checks. Posture-locked dry-throws. Camera behind the mound to monitor tilt every bullpen.",
      encouragement: "Level eyes, level shoulders, level command.",
    },
    compute: (a) => {
      const v = num(a, "shoulder_tilt_deg");
      if (v == null) return missing();
      return { status: Math.abs(v) <= 10 ? "pass" : "fail", value: `${Math.abs(Math.round(v))}°` };
    },
  },
  {
    key: "lift_thrust",
    name: "Lift & Thrust",
    mode: "raw_pass_fail",
    standard: "18° OR MORE",
    explainer: {
      whatWhy:
        "The combined lift-and-thrust angle off the rubber. 18° or more means you are using the ground to drive forward, not just lifting and falling.",
      howToImprove:
        "Med-ball drive drills. Single-leg RDLs. Slide-board push-offs to feel the back-leg load.",
      encouragement: "Push the earth backward. The ball will go forward.",
    },
    compute: (a) => {
      const v = num(a, "lift_thrust_deg");
      if (v == null) return missing();
      return { status: v >= 18 ? "pass" : "fail", value: `${Math.round(v)}°` };
    },
  },
];

export const bpReportCard: ReportCardSpec = {
  disciplineLabel: "Baseball Pitching",
  groupByPhase: false,
  tiles,
};
