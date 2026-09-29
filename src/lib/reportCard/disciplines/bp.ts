import type { ReportCardSpec, ReportCardTileSpec, TileState, AnalysisLike } from "../types";
import { readNumber, missingState } from "../metricReaders";
import { isRelease1Hidden, isRelease1ShowcaseFuture } from "../release1";
import { computeTempoSec } from "../../biomech/metrics/tempoSec";

/**
 * Read a plain numeric anchor off the analysis payload. Anchors are frame
 * indices / fps emitted by the deterministic pose pass — not AI-vision
 * metrics — so they are read leniently but never fabricated.
 */
function readAnchor(a: AnalysisLike, key: string): number | null {
  const direct = (a as unknown as Record<string, unknown>)[key];
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  const viaMetrics = readNumber(a, key);
  return viaMetrics ? viaMetrics.value : null;
}

/**
 * Tempo tile — deterministic path only (`src/lib/biomech/metrics/tempoSec.ts`).
 * Returns canonical missingness whenever the frame anchors or true fps are
 * unavailable. The AI-vision `tempo_sec` value is deliberately never consulted.
 *
 * Two deterministic sources, in precedence order:
 *  1. `tempo_sec_deterministic` — the persisted output of the tempo pipeline
 *     (`runTempoPipeline`), read back from the session ledger. Same math,
 *     already evidence-hashed.
 *  2. Live frame anchors on the analysis payload.
 */
function computeDeterministicTempoTile(a: AnalysisLike): TileState {
  const persisted = (a as unknown as Record<string, unknown>)["tempo_sec_deterministic"] as
    | { value: number | null; missing_reason?: string | null }
    | undefined;
  if (persisted && typeof persisted.value === "number" && Number.isFinite(persisted.value)) {
    return {
      status: persisted.value <= 1.05 ? "pass" : "fail",
      value: `${persisted.value.toFixed(2)}s`,
    };
  }

  const fps = readAnchor(a, "fps_true");
  const result = computeTempoSec({
    peak_leg_lift_frame_index: readAnchor(a, "peak_leg_lift_frame_index"),
    front_foot_strike_frame_index: readAnchor(a, "front_foot_strike_frame_index"),
    fps_true: fps ?? 0,
  });
  if (result.value == null && persisted?.missing_reason) {
    return { status: "missing", missing_reason: persisted.missing_reason };
  }

  if (result.value == null) {
    return {
      status: "missing",
      missing_reason:
        result.missingness?.missing_reason ?? "tempo_anchors_unavailable",
    };
  }
  return {
    status: result.value <= 1.05 ? "pass" : "fail",
    value: `${result.value.toFixed(2)}s`,
  };
}


/**
 * Rebuilt pitching tiles (src/lib/biomech/metrics/pitchingTiles.ts) — the ONLY
 * source for energy angle, shoulder opening, head stability and lift & thrust.
 * The stored AI-vision numbers for these keys were proven fabricated and are
 * never read. Absent the deterministic result → missing, honest reason.
 */
type DetTile = { value: number | null; verdict: "pass" | "fail" | null; uncertainty: number | null; missingness: { missing_reason: string } | null };
function detPitchingTile(a: AnalysisLike, key: string, fmt: (v: number, u: number | null) => string): TileState {
  const all = (a as unknown as Record<string, unknown>)["pitching_tiles_deterministic"] as Record<string, DetTile> | undefined;
  const t = all?.[key];
  if (!t) return { status: "missing", missing_reason: "deterministic_pitching_tiles_not_run" };
  if (t.value == null || t.verdict == null) return { status: "missing", missing_reason: t.missingness?.missing_reason ?? "anchor_not_detected" };
  return { status: t.verdict, value: fmt(t.value, t.uncertainty) };
}

/** Server-computed pitching card (pitchingCardTiles.ts, any arm slot). Present → it is the source; status only, no numbers. */
type CardStored = { verdict: "pass" | "fail" | null; value: number | null; missingness: { missing_reason: string } | null };
function cardTile(a: AnalysisLike, key: string): TileState | null {
  const card = (a as unknown as Record<string, { tiles?: Record<string, CardStored> } | undefined>)["pitching_card_tiles_deterministic"];
  const t = card?.tiles?.[key];
  if (!t) return null;
  if (t.verdict == null) return { status: "missing", missing_reason: t.missingness?.missing_reason ?? "anchor_not_detected" };
  return { status: t.verdict };
}
const cardOnly = (key: string) => (a: AnalysisLike): TileState => cardTile(a, key) ?? { status: "missing", missing_reason: "deterministic_pitching_tiles_not_run" };

const pm = (u: number | null, d: number, unit: string) => (u == null ? "" : ` ±${u.toFixed(d)}${unit}`);


const PITCHING_CARD_EXTRA: ReportCardTileSpec[] = ([
  ["drag_line", "Drag Line", "Short back-foot drag, straight to the plate", "The back foot's drag after landing shows how you finished your push. Direction needs a camera behind you."],
  ["stack_and_track", "Stack and Track", "Shoulders and eyes level at release", "Level shoulders and eyes let your whole body throw on one line. Needs a camera behind or in front of you."],
  ["balance_at_landing", "Balance at Landing", "Head over your base at landing", "Landing with your head over your legs keeps the delivery under control."],
  ["eyes_on_target_at_peak_lift", "Eyes on Target", "Head faces the target at the top of the lift", "The camera cannot see your eyes. It reads which way your head faces at the top of your leg lift."],
  ["glove_swivel", "Glove Swivel", "Glove turns over and tucks in", "The tracker cannot see your fingers inside the glove, so this check does not run yet."],
  ["release_extension", "Release Extension", "Ball out in front of your front foot", "Only a release clearly outside the owner's range gets a call; close ones get no call."],
] as const).map(([key, name, standard, whatWhy]) => ({
  key, name, mode: "pass_fail" as const, standard,
  explainer: { whatWhy, howToImprove: standard + ".", encouragement: "Stack small wins." },
  compute: cardOnly(key),
}));

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
      return detPitchingTile(a, "energy_angle_deg", (v) => `${Math.round(v)}°`);
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
      return detPitchingTile(a, "premature_shoulder_open_deg", (v, u) => `${Math.round(v)}°${pm(u, 0, "°")}`);
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
    // Deterministic only. The AI-vision `tempo_sec` value is NOT read here:
    // the variability audit found every returned value fell outside the
    // contract's plausible range (0.4–2.0s). Tempo is computed from the
    // frame-index anchors by `src/lib/biomech/metrics/tempoSec.ts`; when
    // those anchors are absent the tile reports canonical missingness
    // instead of a guess.
    compute: (a) => cardTile(a, "tempo_sec") ?? computeDeterministicTempoTile(a),
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
      const c = cardTile(a, "stride_pct_of_height"); if (c) return c;
      const m = readNumber(a, "stride_pct_of_height");
      if (!m) return missingState(a, "stride_pct_of_height");
      return { status: m.value >= 90 ? "pass" : "fail", value: `${Math.round(m.value)}%`, confidence: m.confidence };
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
      return detPitchingTile(a, "head_vertical_movement_pct", (v, u) => `${v.toFixed(1)}%${pm(u, 1, "%")}`);
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
      const c = cardTile(a, "glove_drift_outside_frame_in"); if (c) return c;
      const m = readNumber(a, "glove_drift_outside_frame_in");
      if (!m) return missingState(a, "glove_drift_outside_frame_in");
      const status = m.value <= 0 ? "pass" : "fail";
      return { status, value: m.value > 0 ? `+${m.value.toFixed(1)}"` : "in frame", confidence: m.confidence };
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
      const c = cardTile(a, "head_at_release_deg"); if (c) return c;
      const m = readNumber(a, "head_at_release_deg");
      if (!m) return missingState(a, "head_at_release_deg");
      const abs = Math.abs(m.value);
      return { status: abs <= 15 ? "pass" : "fail", value: `${Math.round(abs)}°`, confidence: m.confidence };
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
      const c = cardTile(a, "shoulder_tilt_deg"); if (c) return c;
      const m = readNumber(a, "shoulder_tilt_deg");
      if (!m) return missingState(a, "shoulder_tilt_deg");
      const abs = Math.abs(m.value);
      return { status: abs <= 10 ? "pass" : "fail", value: `${Math.round(abs)}°`, confidence: m.confidence };
    },
  },
  {
    key: "lift_thrust",
    name: "Lift & Thrust",
    mode: "raw_pass_fail",
    standard: "Hips drive forward the moment the knee lifts — no pause",
    explainer: {
      whatWhy:
        "Lift the front knee toward the back armpit while driving your rear end toward home plate at the same moment. Thrust that starts after the lift is a pause and leaks momentum.",
      howToImprove:
        "Med-ball drive drills. Single-leg RDLs. Slide-board push-offs to feel the back-leg load.",
      encouragement: "Push the earth backward. The ball will go forward.",
    },
    compute: (a) => {
      return detPitchingTile(a, "lift_thrust", (v, u) => `${v > 0 ? "+" : ""}${v.toFixed(2)}s${pm(u, 2, "s")}`);
    },
  },
];

/**
 * Phase 45 — Release-1 Trust Lock.
 *
 * Tiles whose underlying metric is HIDDEN (LLM-derived, must not appear)
 * or SHOWCASE_FUTURE (blocked on calibration / object tracking / release
 * anchor) are removed from the Release-1 surface. Their backing metric
 * key is the same key passed to `readNumber` inside `compute`, so we
 * filter by literal tile-key → metric-key mapping below. The complete
 * Release-1 BP visible set per Phase 44 §10 is:
 *   tempo_sec, energy_angle_deg, lift_thrust_deg,
 *   premature_shoulder_open_deg, shoulder_tilt_deg, head_vertical_movement_pct
 */
const BP_TILE_TO_METRIC: Record<string, string> = {
  energy_angle: "energy_angle_deg",
  hip_shoulder_separation: "premature_shoulder_open_deg",
  tempo: "tempo_sec",
  stride_length: "stride_pct_of_height",
  head_stability: "head_vertical_movement_pct",
  glove_control: "glove_drift_outside_frame_in",
  head_at_release: "head_at_release_deg",
  shoulder_tilt_release: "shoulder_tilt_deg",
  lift_thrust: "lift_thrust_deg",
};

const release1Tiles = tiles.filter((t) => {
  const metric = BP_TILE_TO_METRIC[t.key];
  if (!metric) return true;
  if (isRelease1Hidden(metric)) return false;
  if (isRelease1ShowcaseFuture(metric)) return false;
  return true;
});

export const bpReportCard: ReportCardSpec = {
  disciplineLabel: "Baseball Pitching",
  groupByPhase: false,
  tiles: [...release1Tiles, ...PITCHING_CARD_EXTRA],
};
