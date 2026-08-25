import type { ReportCardSpec, ReportCardTileSpec } from "../types";
import { missingState, readBool, readNumber } from "../metricReaders";
import { isRelease1Visible } from "../release1";

const STRIDE_REVIEW_TOLERANCE_POINTS = 10;

const STRIDE_BANDS = [
  { label: "Youth", top: 98, sfc: 89, release: 68 },
  { label: "Collegiate", top: 93, sfc: 89, release: 73 },
] as const;

function formatAbsDeg(value: number): string {
  return `${Math.round(Math.abs(value))}°`;
}

function closestStrideBand(top: number, sfc: number, release: number) {
  const distances = STRIDE_BANDS.map((band) => ({
    band,
    distance:
      Math.abs(top - band.top) +
      Math.abs(sfc - band.sfc) +
      Math.abs(release - band.release),
  }));
  return distances.sort((a, b) => a.distance - b.distance)[0].band;
}

/**
 * Softball Pitching — 13 windmill-specific report-card tiles.
 *
 * The order follows the delivery: end of wind-up (A–D), stride (E),
 * stride-foot contact (F–J), acceleration (K), follow-through (L), then the
 * three-moment stride profile. Sourced and proposed standards are labeled
 * separately so a starting tolerance is never presented as published evidence.
 */
export const spTiles: ReportCardTileSpec[] = [
  {
    key: "windup_trunk_tibia",
    name: "Wind-up Trunk / Tibia",
    mode: "raw_pass_fail",
    standard: "Proposed ≤10° from parallel",
    thresholdChip: "Proposed ≤10°",
    explainer: {
      whatWhy:
        "At the end of your wind-up, the trunk line and drive-leg tibia line should be close to parallel. The clinical review establishes this checkpoint; the ≤10° window is Hammer's proposed starting tolerance, not a published number from the paper. A stacked trunk-over-shin position keeps the drive organized before you push toward home plate.",
      howToImprove:
        "Film from the open side and pause at the end of the wind-up. Practice slow wind-up-to-balance holds, drive-leg hinges, and wall-supported knee-over-foot reps so the trunk and shin find the same line without collapsing.",
      encouragement: "Stack first. A quiet wind-up gives the rest of the delivery a clean runway.",
    },
    compute: (a) => {
      const m = readNumber(a, "windup_trunk_tibia_deg");
      if (!m) return missingState(a, "windup_trunk_tibia_deg");
      const deviation = Math.abs(m.value);
      return { status: deviation <= 10 ? "pass" : "fail", value: formatAbsDeg(m.value), confidence: m.confidence };
    },
  },
  {
    key: "windup_hip_square",
    name: "Wind-up Hip Square",
    mode: "raw_pass_fail",
    standard: "Proposed ≤10° from home-plate line",
    thresholdChip: "Proposed ≤10°",
    explainer: {
      whatWhy:
        "At the end of the wind-up, your hips should stay close to square with home plate. The checkpoint comes from the clinical review; the ≤10° window is a proposed Hammer tolerance, not a sourced cutoff. Staying square preserves a direct forward drive before the body naturally rotates during the stride.",
      howToImprove:
        "Use a plate-line target on the ground. Freeze at the end of the wind-up, check hip direction, then stride slowly while keeping the first move straight toward the catcher.",
      encouragement: "Square hips keep your power pointed at the target.",
    },
    compute: (a) => {
      const m = readNumber(a, "windup_hip_square_deg");
      if (!m) return missingState(a, "windup_hip_square_deg");
      const deviation = Math.abs(m.value);
      return { status: deviation <= 10 ? "pass" : "fail", value: formatAbsDeg(m.value), confidence: m.confidence };
    },
  },
  {
    key: "windup_knee_over_foot",
    name: "Wind-up Knee Over Foot",
    mode: "raw_pass_fail",
    standard: "Proposed ≤10° from mid-foot",
    thresholdChip: "Proposed ≤10°",
    explainer: {
      whatWhy:
        "The drive knee should stay stacked over the foot at the end of the wind-up. The review identifies the knee-to-heel versus mid-foot checkpoint; ≤10° is Hammer's proposed starting tolerance, not a published source threshold. A stacked knee protects the drive leg and keeps force moving toward home plate instead of leaking inward.",
      howToImprove:
        "Build the position with split-stance holds, slow drive-knee lifts, and side-view mirror checks. Strengthen single-leg control before adding full windmill speed.",
      encouragement: "Knee over foot is a strong base. Strong bases make explosive strides.",
    },
    compute: (a) => {
      const m = readNumber(a, "windup_knee_over_foot_deg");
      if (!m) return missingState(a, "windup_knee_over_foot_deg");
      const deviation = Math.abs(m.value);
      return { status: deviation <= 10 ? "pass" : "fail", value: formatAbsDeg(m.value), confidence: m.confidence };
    },
  },
  {
    key: "windup_foot_power_line",
    name: "Drive Foot on Power Line",
    mode: "raw_pass_fail",
    standard: "Proposed ≤10° from rubber-to-plate line",
    thresholdChip: "Proposed ≤10°",
    explainer: {
      whatWhy:
        "Your drive foot should stay close to the rubber-to-home-plate power line at the end of the wind-up. The review establishes the power-line checkpoint; the ≤10° window is a proposed Hammer tolerance, not a sourced number. A foot aligned with the line helps the push travel directly toward the catcher.",
      howToImprove:
        "Lay a tape line from the rubber toward home plate. Take slow-motion wind-ups, pause before the stride, and check whether the drive foot points along the line before pushing.",
      encouragement: "Point the foundation where the pitch needs to go.",
    },
    compute: (a) => {
      const m = readNumber(a, "windup_foot_power_line_deg");
      if (!m) return missingState(a, "windup_foot_power_line_deg");
      const deviation = Math.abs(m.value);
      return { status: deviation <= 10 ? "pass" : "fail", value: formatAbsDeg(m.value), confidence: m.confidence };
    },
  },
  {
    key: "stride_triple_extension",
    name: "Stride Triple Extension",
    mode: "pass_fail",
    standard: "Drive leg extends; trunk still faces home",
    explainer: {
      whatWhy:
        "At the start of the stride, the drive leg should extend through the hip, knee, and ankle while the shoulders and trunk still face home plate. This is a source-established qualitative checkpoint. Triple extension creates the forward push; staying square keeps that push from turning into early rotation.",
      howToImprove:
        "Use low-intensity drive-off drills, line hops, and pause-at-toe-off reps. Feel the hip, knee, and ankle finish the push without the chest spinning early.",
      encouragement: "Push hard, stay square, then let the stride rotate naturally.",
    },
    compute: (a) => {
      const m = readBool(a, "stride_triple_extension_pass");
      if (!m) return missingState(a, "stride_triple_extension_pass");
      return { status: m.value ? "pass" : "fail", confidence: m.confidence };
    },
  },
  {
    key: "sfc_foot_angle",
    name: "SFC Foot Angle",
    mode: "raw_pass_fail",
    standard: "Sourced: 0–45° toward pitching-arm side",
    thresholdChip: "Sourced 0–45°",
    explainer: {
      whatWhy:
        "At stride-foot contact, the clinical review reports a 0–45° foot-angle window toward the pitching-arm side. This is a sourced band, not a proposed Hammer number. The foot needs enough angle to let the hips rotate without opening so far that the body leaks early.",
      howToImprove:
        "Mark the plate line and stride-foot direction on video. Rehearse landing on the power line with the foot slightly angled toward your throwing-arm side, then repeat until the landing becomes automatic.",
      encouragement: "Your landing foot sets the doorway for the whole delivery.",
    },
    compute: (a) => {
      const m = readNumber(a, "sfc_foot_angle_deg");
      if (!m) return missingState(a, "sfc_foot_angle_deg");
      const status = m.value >= 0 && m.value <= 45 ? "pass" : "fail";
      const abs = Math.round(Math.abs(m.value));
      const value = m.value === 0 ? "0° square" : `${abs}° ${m.value > 0 ? "arm side" : "glove side"}`;
      return { status, value, confidence: m.confidence };
    },
  },
  {
    key: "sfc_arm_path",
    name: "SFC Arm Path",
    mode: "raw_pass_fail",
    standard: "Proposed ≤15° from near-vertical path",
    thresholdChip: "Proposed ≤15°",
    explainer: {
      whatWhy:
        "At stride-foot contact, the pitching arm should be near its perpendicular-to-ground path and close to the power line. The checkpoint is source-derived; the ≤15° window is Hammer's proposed starting tolerance, not a published cutoff. A close, organized arm path reduces shoulder stress and keeps the circle on time.",
      howToImprove:
        "Use slow arm-circle rehearsals in front of a mirror, then half-speed pitches with a visual power-line reference. Keep the circle close to the body instead of swinging wide.",
      encouragement: "A close arm path is an efficient arm path.",
    },
    compute: (a) => {
      const m = readNumber(a, "sfc_arm_path_deg");
      if (!m) return missingState(a, "sfc_arm_path_deg");
      const deviation = Math.abs(m.value);
      return { status: deviation <= 15 ? "pass" : "fail", value: formatAbsDeg(m.value), confidence: m.confidence };
    },
  },
  {
    key: "sfc_trunk_alignment",
    name: "SFC Trunk Alignment",
    mode: "pass_fail",
    standard: "Head-to-ground line through belly button",
    explainer: {
      whatWhy:
        "At stride-foot contact, a vertical line from the head to the ground should pass through the belly button. This source-established checkpoint shows whether your center of mass is stacked over the landing instead of falling forward or drifting off line.",
      howToImprove:
        "Freeze at landing during dry reps. Use a side-view camera or mirror and check head, belly button, and landing foot before allowing the arm to accelerate.",
      encouragement: "Stacked at landing means the arm can fire without the body rescuing it.",
    },
    compute: (a) => {
      const m = readBool(a, "sfc_trunk_alignment_pass");
      if (!m) return missingState(a, "sfc_trunk_alignment_pass");
      return { status: m.value ? "pass" : "fail", confidence: m.confidence };
    },
  },
  {
    key: "sfc_knee_ankle",
    name: "SFC Knee Over Ankle",
    mode: "raw_pass_fail",
    standard: "Proposed ≤10° from ankle center",
    thresholdChip: "Proposed ≤10°",
    explainer: {
      whatWhy:
        "At stride-foot contact, the stride knee should stay stacked over the ankle center. The review establishes this alignment checkpoint; ≤10° is Hammer's proposed starting tolerance, not a sourced number. Stacking the knee helps the front leg accept force without collapsing inward.",
      howToImprove:
        "Train landing-stick reps, lateral lunge holds, and slow-motion stride freezes. Watch from the front for knee collapse and from the side for the knee driving too far ahead without control.",
      encouragement: "Strong landing legs turn ground force into pitch speed.",
    },
    compute: (a) => {
      const m = readNumber(a, "sfc_knee_ankle_deg");
      if (!m) return missingState(a, "sfc_knee_ankle_deg");
      const deviation = Math.abs(m.value);
      return { status: deviation <= 10 ? "pass" : "fail", value: formatAbsDeg(m.value), confidence: m.confidence };
    },
  },
  {
    key: "sfc_hip_shoulder_rotation",
    name: "SFC Hip / Shoulder Rotation",
    mode: "raw_pass_fail",
    standard: "Proposed ≥20° toward pitching-arm side",
    thresholdChip: "Proposed ≥20°",
    explainer: {
      whatWhy:
        "At stride-foot contact, the pelvis and trunk should have rotated toward the pitching-arm side from the squared wind-up. The source establishes this rotation checkpoint but does not publish a softball minimum. The ≥20° pass line is Hammer's proposed starting tolerance. Baseball's ≥50° reference comes from the same clinical review context, but it is not directly transferable to windmill pitching.",
      howToImprove:
        "Start square, then rehearse the stride as a forward move with gradual rotation into landing. Film from behind or above and pause at SFC to check whether the pelvis and trunk have begun closing without the chest rushing open.",
      encouragement: "Let the stride create the turn. Do not force it early.",
    },
    compute: (a) => {
      const m = readNumber(a, "sfc_hip_shoulder_rotation_deg");
      if (!m) return missingState(a, "sfc_hip_shoulder_rotation_deg");
      return { status: m.value >= 20 ? "pass" : "fail", value: `${Math.round(m.value)}°`, confidence: m.confidence };
    },
  },
  {
    key: "accel_arm_path",
    name: "Acceleration Path",
    mode: "pass_fail",
    standard: "Arm close; back leg near power line",
    explainer: {
      whatWhy:
        "From stride-foot contact to release, the arm should stay close to the body while the back leg drags near the power line. This source-established qualitative checkpoint keeps the delivery connected: the body drives forward, the trunk rotates, and the arm stays on a tight path instead of swinging wide.",
      howToImprove:
        "Use slow-motion acceleration reps with a wall or band reference near the arm path. Add power-line drag drills so the back leg stays connected instead of flying offline.",
      encouragement: "Stay connected through acceleration — tight path, strong finish.",
    },
    compute: (a) => {
      const m = readBool(a, "accel_arm_path_pass");
      if (!m) return missingState(a, "accel_arm_path_pass");
      return { status: m.value ? "pass" : "fail", confidence: m.confidence };
    },
  },
  {
    key: "ft_knee_ankle",
    name: "Follow-Through Stability",
    mode: "raw_pass_fail",
    standard: "Proposed ≤10° knee-to-ankle deviation",
    thresholdChip: "Proposed ≤10°",
    explainer: {
      whatWhy:
        "At follow-through, you should stabilize on the stride leg with the knee stacked over the ankle. The review establishes the single-leg stability checkpoint; ≤10° is Hammer's proposed starting tolerance, not a sourced cutoff. A stable finish protects the knee and gets you ready to field the ball.",
      howToImprove:
        "Finish every bullpen pitch in a controlled fielding position. Add single-leg balance reaches, landing sticks, and slow follow-through freezes before chasing speed.",
      encouragement: "The pitch is not finished until you are balanced and ready to field.",
    },
    compute: (a) => {
      const m = readNumber(a, "ft_knee_ankle_deg");
      if (!m) return missingState(a, "ft_knee_ankle_deg");
      const deviation = Math.abs(m.value);
      return { status: deviation <= 10 ? "pass" : "fail", value: formatAbsDeg(m.value), confidence: m.confidence };
    },
  },
  {
    key: "stride_profile",
    name: "Three-Moment Stride Profile",
    mode: "raw_passed",
    standard: "Sourced bands: Youth ≈98/89/68 · Collegiate ≈93/89/73",
    thresholdChip: "Sourced bands · proposed ±10-pt window",
    explainer: {
      whatWhy:
        "Windmill stride length changes through the delivery, so this tile measures it at three moments: top of the arm circle, stride-foot contact, and release. The review reports Youth ≈98/89/68% and Collegiate ≈93/89/73% of height. Hammer grades against the closer age-profile band; the ±10-percentage-point pass window is a proposed review tolerance, not a number published by the source.",
      howToImprove:
        "Film full-body pitches from a fixed side angle and use a known height or field reference for calibration. Mark top of circle, landing, and release separately instead of judging stride from one frame. Build consistency at all three checkpoints before trying to add length.",
      encouragement: "One stride, three checkpoints. Own the shape and the pitch gets easier to repeat.",
    },
    compute: (a) => {
      const top = readNumber(a, "stride_pct_top");
      const sfc = readNumber(a, "stride_pct_sfc");
      const release = readNumber(a, "stride_pct_release");
      if (!top) return missingState(a, "stride_pct_top");
      if (!sfc) return missingState(a, "stride_pct_sfc");
      if (!release) return missingState(a, "stride_pct_release");

      const band = closestStrideBand(top.value, sfc.value, release.value);
      const pass =
        Math.abs(top.value - band.top) <= STRIDE_REVIEW_TOLERANCE_POINTS &&
        Math.abs(sfc.value - band.sfc) <= STRIDE_REVIEW_TOLERANCE_POINTS &&
        Math.abs(release.value - band.release) <= STRIDE_REVIEW_TOLERANCE_POINTS;

      return {
        status: pass ? "pass" : "fail",
        value: `${Math.round(top.value)} / ${Math.round(sfc.value)} / ${Math.round(release.value)}%`,
        confidence: Math.min(top.confidence, sfc.confidence, release.confidence),
        note: pass ? undefined : `Closer band: ${band.label} (${band.top}/${band.sfc}/${band.release}%)`,
      };
    },
  },
];

/** Tile key → every persisted metric key required to render that tile. */
const SP_TILE_TO_METRICS: Record<string, string[]> = {
  windup_trunk_tibia: ["windup_trunk_tibia_deg"],
  windup_hip_square: ["windup_hip_square_deg"],
  windup_knee_over_foot: ["windup_knee_over_foot_deg"],
  windup_foot_power_line: ["windup_foot_power_line_deg"],
  stride_triple_extension: ["stride_triple_extension_pass"],
  sfc_foot_angle: ["sfc_foot_angle_deg"],
  sfc_arm_path: ["sfc_arm_path_deg"],
  sfc_trunk_alignment: ["sfc_trunk_alignment_pass"],
  sfc_knee_ankle: ["sfc_knee_ankle_deg"],
  sfc_hip_shoulder_rotation: ["sfc_hip_shoulder_rotation_deg"],
  accel_arm_path: ["accel_arm_path_pass"],
  ft_knee_ankle: ["ft_knee_ankle_deg"],
  stride_profile: ["stride_pct_top", "stride_pct_sfc", "stride_pct_release"],
};

/**
 * Phase 45 — Release-1 Trust Lock.
 *
 * Every SP backing metric is SHOWCASE_FUTURE until the windmill output has
 * been reviewed on real video. A tile renders only after ALL of its backing
 * metrics are explicitly promoted to VISIBLE; unknown or partially promoted
 * metrics stay suppressed.
 */
const release1Tiles = spTiles.filter((tile) => {
  const metricKeys = SP_TILE_TO_METRICS[tile.key];
  return !!metricKeys?.length && metricKeys.every((metricKey) => isRelease1Visible(metricKey));
});

export const spReportCard: ReportCardSpec = {
  disciplineLabel: "Softball Pitching",
  groupByPhase: false,
  tiles: release1Tiles,
};
