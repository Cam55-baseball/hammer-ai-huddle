/**
 * Release 0 (owner Nov 8): the ONE metric dictionary. Every measurement key the app records,
 * and every older name for it, maps to exactly one canonical key here. The seed SQL that
 * fills `measurement_definitions` + `metric_aliases` is generated from this file
 * (scripts/gen-metric-dictionary-sql.ts); tests fail if they drift.
 *
 * Rules (project knowledge, owner Nov 8):
 *  - Definitions follow the industry definition. Every threshold names its published source
 *    or is labeled "proposed".
 *  - physMin/physMax are the physics gate (G3): what a human body can physically produce.
 *    They are deliberately wider than the app's input ranges.
 *  - gtTolerance (gate G4) is the allowed |app − ground-truth device| (in the metric's unit);
 *    "proposed" until the owner confirms.
 *  - requiredFps (gate G1) only applies to camera-measured metrics.
 *  - Hook-free: imported by edge functions, the browser and tests.
 */

export type Sport = "both" | "baseball" | "softball";
export type Privacy = "training" | "health";
export type NamingSystem = "six_week" | "combine" | "baserunning" | "self_test" | "ledger" | "game_log" | "checkin" | "healthkit" | "body" | "cv" | "practice";

export interface MetricDef {
  key: string;
  label: string;
  unit: string;
  category: string;
  definition: string;
  /** Published source for the definition/threshold, or null when "proposed". */
  source: string | null;
  sport: Sport;
  higherIsBetter: boolean | null;
  physMin: number | null;
  physMax: number | null;
  gtTolerance: number | null;
  gtDevice: string | null;
  requiredFps: number | null;
  privacy: Privacy;
  /** Measured only by the iPhone app's camera/sensors (never a web feature). */
  inAppOnly: boolean;
}

export interface MetricAlias {
  alias: string;
  key: string;
  system: NamingSystem;
  /** Unit the old name is stored in (converted to the canonical unit on save). */
  unit: string;
  note?: string;
}

const P = null; // "proposed" — no published source yet
const def = (d: Partial<MetricDef> & Pick<MetricDef, "key" | "label" | "unit" | "category" | "definition">): MetricDef => ({
  source: P, sport: "both", higherIsBetter: null, physMin: null, physMax: null, gtTolerance: null, gtDevice: null,
  requiredFps: null, privacy: "training", inAppOnly: false, ...d,
});

const sprint = (key: string, label: string, yards: number, min: number, max: number, sport: Sport = "both") => def({
  key, label, unit: "s", category: "speed", sport, higherIsBetter: false, physMin: min, physMax: max,
  definition: `Time from first movement (standing start) to ${yards} yards.`,
  gtTolerance: 0.03, gtDevice: "Timing gates (Brower/Freelap) or Jawku", requiredFps: 120,
});

export const METRICS: MetricDef[] = [
  // ── Speed ─────────────────────────────────────────────────────────────
  sprint("sprint_7yd_s", "7-yard sprint", 7, 0.8, 4, "softball"),
  sprint("sprint_10yd_s", "10-yard sprint", 10, 1.0, 5, "baseball"),
  sprint("sprint_20yd_s", "20-yard sprint", 20, 2.0, 7),
  sprint("sprint_30yd_s", "30-yard sprint", 30, 2.8, 9),
  sprint("sprint_40yd_s", "40-yard sprint", 40, 3.8, 11),
  sprint("sprint_60yd_s", "60-yard sprint", 60, 5.5, 14),
  def({ key: "flying_20yd_s", label: "Flying 20 yards", unit: "s", category: "speed", higherIsBetter: false, physMin: 1.4, physMax: 6,
    definition: "Time across 20 yards entered at speed after a running start.", gtTolerance: 0.03, gtDevice: "Timing gates", requiredFps: 120 }),
  def({ key: "split_10_30_s", label: "10–30 yard split", unit: "s", category: "speed", higherIsBetter: false, physMin: 1.5, physMax: 6,
    definition: "Time between the 10- and 30-yard marks of one sprint.", gtTolerance: 0.03, gtDevice: "Timing gates", requiredFps: 120 }),
  def({ key: "split_30_60_s", label: "30–60 yard split", unit: "s", category: "speed", higherIsBetter: false, physMin: 2, physMax: 7,
    definition: "Time between the 30- and 60-yard marks of one sprint.", gtTolerance: 0.03, gtDevice: "Timing gates", requiredFps: 120 }),
  def({ key: "pro_agility_5_10_5_s", label: "5-10-5 pro agility", unit: "s", category: "quickness", higherIsBetter: false, physMin: 3.5, physMax: 9,
    definition: "NFL/MLB combine pro-agility shuttle: 5 yards, 10 yards back, 5 yards, touching each line.",
    source: "NFL Scouting Combine protocol", gtTolerance: 0.03, gtDevice: "Timing gates", requiredFps: 120 }),
  def({ key: "lateral_shuffle_10yd_s", label: "Lateral shuffle (10 yd)", unit: "s", category: "quickness", higherIsBetter: false, physMin: 1.5, physMax: 8,
    definition: "Time to shuffle 10 yards sideways without crossing feet." }),
  def({ key: "first_step_5yd_s", label: "First step (5 yd)", unit: "s", category: "quickness", higherIsBetter: false, physMin: 0.5, physMax: 3,
    definition: "Time from first movement to 5 yards.", gtTolerance: 0.03, gtDevice: "Timing gates", requiredFps: 120 }),
  def({ key: "first_step_ms", label: "First-step time", unit: "ms", category: "quickness", higherIsBetter: false, physMin: 100, physMax: 1500, inAppOnly: true,
    definition: "Time from the start signal to the first foot leaving the ground.", gtTolerance: 15, gtDevice: "Contact mat or timing gate with start light", requiredFps: 240 }),
  def({ key: "reaction_time_ms", label: "Reaction time", unit: "ms", category: "quickness", higherIsBetter: false, physMin: 100, physMax: 1500, inAppOnly: true,
    definition: "Time from the visual cue (pitcher's first move) to the athlete's first visible movement. Under 100 ms is a false start.",
    source: "Pain & Hibbs 2007 (sprint start reaction); 100 ms false-start floor per World Athletics rule 16.6", gtTolerance: 15, gtDevice: "Reaction light + contact mat", requiredFps: 240 }),
  def({ key: "stride_length_m", label: "Stride length", unit: "m", category: "speed", higherIsBetter: null, physMin: 0.5, physMax: 3.0, inAppOnly: true,
    definition: "Distance between consecutive contacts of opposite feet at top speed.", gtTolerance: 0.05, gtDevice: "Optojump or measured video with cones", requiredFps: 120 }),
  def({ key: "stride_frequency_hz", label: "Stride frequency", unit: "hz", category: "speed", higherIsBetter: null, physMin: 2, physMax: 6, inAppOnly: true,
    definition: "Steps per second at top speed.", gtTolerance: 0.1, gtDevice: "Optojump", requiredFps: 120 }),
  def({ key: "sixty_yd_shuttle_s", label: "60-yard shuttle", unit: "s", category: "fielding", higherIsBetter: false, physMin: 9, physMax: 25,
    definition: "5-10-15 yard shuttle (60 yards total)." }),
  def({ key: "three_hundred_yd_shuttle_s", label: "300-yard shuttle", unit: "s", category: "energy_system", higherIsBetter: false, physMin: 40, physMax: 120,
    definition: "Six 50-yard lengths there and back (300 yards)." }),
  def({ key: "sprint_repeat_avg_30yd_s", label: "Sprint repeatability (6×30 yd avg)", unit: "s", category: "energy_system", higherIsBetter: false, physMin: 2.8, physMax: 9,
    definition: "Average of six 30-yard sprints." }),
  def({ key: "deceleration_10yd_s", label: "Deceleration (10 yd stop)", unit: "s", category: "body_control", higherIsBetter: false, physMin: 0.8, physMax: 6,
    definition: "Sprint 10 yards and stop inside the zone." }),
  def({ key: "home_to_first_s", label: "Home to first", unit: "s", category: "baserunning", higherIsBetter: false, physMin: 3.3, physMax: 8,
    definition: "Contact (bat on ball) to the foot touching first base.", gtTolerance: 0.05, gtDevice: "Stopwatch by trained timer or timing gates", requiredFps: 120 }),
  def({ key: "lead_distance_primary_ft", label: "Primary lead", unit: "ft", category: "baserunning", higherIsBetter: null, physMin: 0, physMax: 25,
    definition: "Distance from the base to the back foot at the pitcher's set." }),
  def({ key: "lead_distance_secondary_ft", label: "Secondary lead", unit: "ft", category: "baserunning", higherIsBetter: null, physMin: 0, physMax: 35,
    definition: "Distance from the base at the moment the pitch crosses the plate." }),
  def({ key: "reactive_agility_s", label: "Reactive agility", unit: "s", category: "quickness", higherIsBetter: false, physMin: 1, physMax: 10,
    definition: "Agility run where the direction is given by a live cue." }),

  // ── Jumps / elastic ───────────────────────────────────────────────────
  def({ key: "cmj_height_cm", label: "Countermovement jump height", unit: "cm", category: "power_lower", higherIsBetter: true, physMin: 5, physMax: 110, inAppOnly: true,
    definition: "Hands-on-hips countermovement jump height from flight time (g·t²/8).",
    source: "Bosco et al. 1983; Linthorne 2001 (flight-time method)", gtTolerance: 2, gtDevice: "Force plate (Hawkin/VALD) or contact mat", requiredFps: 240 }),
  def({ key: "vertical_jump_cm", label: "Vertical jump (arm swing)", unit: "cm", category: "power_lower", higherIsBetter: true, physMin: 10, physMax: 130,
    definition: "Standing vertical jump with arm swing, jump reach minus standing reach (Vertec style). Not the same test as the hands-on-hips CMJ.",
    source: "NSCA Essentials of Strength Training (vertical jump test)", gtTolerance: 2.5, gtDevice: "Vertec or force plate" }),
  def({ key: "broad_jump_cm", label: "Standing broad jump", unit: "cm", category: "power_lower", higherIsBetter: true, physMin: 50, physMax: 400,
    definition: "Two-foot standing jump forward; take-off line to the back of the nearest heel.",
    source: "NFL Scouting Combine protocol", gtTolerance: 3, gtDevice: "Tape measure (sticks the landing)", requiredFps: 60 }),
  def({ key: "sl_broad_jump_cm", label: "Single-leg broad jump", unit: "cm", category: "power_lower", higherIsBetter: true, physMin: 30, physMax: 330,
    definition: "Single-leg hop for distance forward, landing on the same leg. Side stored with each value.", gtTolerance: 3, gtDevice: "Tape measure" }),
  def({ key: "sl_lateral_broad_jump_cm", label: "Single-leg lateral broad jump", unit: "cm", category: "power_lower", higherIsBetter: true, physMin: 25, physMax: 300,
    definition: "Single-leg hop sideways for distance. Side stored with each value.", gtTolerance: 3, gtDevice: "Tape measure" }),
  def({ key: "sl_vert_jump_cm", label: "Single-leg vertical jump", unit: "cm", category: "power_lower", higherIsBetter: true, physMin: 5, physMax: 90,
    definition: "Single-leg vertical jump height. Side stored with each value.", gtTolerance: 2, gtDevice: "Force plate or contact mat" }),
  def({ key: "sl_3x_bound_cm", label: "Single-leg triple bound", unit: "cm", category: "power_lower", higherIsBetter: true, physMin: 150, physMax: 1100,
    definition: "Three consecutive single-leg hops for total distance." }),
  def({ key: "lsi_pct", label: "Limb Symmetry Index", unit: "pct", category: "power_lower", higherIsBetter: null, physMin: 0, physMax: 200,
    definition: "Involved (or non-dominant) limb ÷ uninvolved (or dominant) limb × 100 for the same test. Derived, never typed.",
    source: "Grindem et al. 2016 (≥90% LSI return-to-sport criterion)", gtTolerance: 5, gtDevice: "Force plate bilateral or tape-measured hops" }),
  def({ key: "rsi", label: "Reactive Strength Index", unit: "ratio", category: "elastic", higherIsBetter: true, physMin: 0.2, physMax: 4.5, inAppOnly: true,
    definition: "Jump height (m) ÷ ground-contact time (s) on a rebound/pogo jump.", source: "Flanagan & Comyns 2008",
    gtTolerance: 0.15, gtDevice: "Contact mat or force plate", requiredFps: 240 }),
  def({ key: "rsi_mod", label: "Modified Reactive Strength Index", unit: "ratio", category: "elastic", higherIsBetter: true, physMin: 0.1, physMax: 1.5, inAppOnly: true,
    definition: "CMJ jump height (m) ÷ time to take-off (s).", source: "Ebben & Petushek 2010",
    gtTolerance: 0.05, gtDevice: "Force plate", requiredFps: 240 }),
  def({ key: "gct_ms", label: "Ground contact time", unit: "ms", category: "elastic", higherIsBetter: false, physMin: 80, physMax: 600, inAppOnly: true,
    definition: "Time from foot touch-down to toe-off on a single contact.", source: "Flanagan & Comyns 2008 (<250 ms fast SSC)",
    gtTolerance: 10, gtDevice: "Contact mat or force plate", requiredFps: 240 }),
  def({ key: "flight_time_ms", label: "Flight time", unit: "ms", category: "elastic", higherIsBetter: true, physMin: 100, physMax: 1100, inAppOnly: true,
    definition: "Time from toe-off to the next touch-down.", gtTolerance: 10, gtDevice: "Contact mat or force plate", requiredFps: 240 }),
  def({ key: "epi", label: "Elastic Performance Index (EPI)", unit: "index", category: "elastic", higherIsBetter: true, physMin: 0.2, physMax: 4.5, inAppOnly: true,
    definition: "Hammers pogo metric: RSI across the set, stopped when ground-contact time drifts 15–20 ms above the set's best contacts; reported with the contact-time vs height split.",
    gtTolerance: 0.15, gtDevice: "Contact mat or force plate", requiredFps: 240 }),
  def({ key: "gct_drift_ms", label: "Ground-contact drift", unit: "ms", category: "elastic", higherIsBetter: false, physMin: -200, physMax: 400, inAppOnly: true,
    definition: "Rise in ground-contact time versus the set's best contacts (owner stop rule 15–20 ms, proposed).", gtTolerance: 10, gtDevice: "Contact mat", requiredFps: 240 }),

  // ── Upper / rotational power ──────────────────────────────────────────
  def({ key: "mb_situp_throw_ft", label: "Med-ball sit-up throw (5 lb)", unit: "ft", category: "power_upper", higherIsBetter: true, physMin: 2, physMax: 90, definition: "Seated sit-up chest throw with a 5 lb ball, distance." }),
  def({ key: "seated_chest_pass_ft", label: "Seated chest pass (5 lb)", unit: "ft", category: "power_upper", higherIsBetter: true, physMin: 2, physMax: 70, definition: "Seated two-hand chest pass with a 5 lb ball, distance." }),
  def({ key: "mb_rotational_throw_ft", label: "Med-ball rotational throw (5 lb)", unit: "ft", category: "power_upper", higherIsBetter: true, physMin: 3, physMax: 90, definition: "Side-on rotational scoop throw with a 5 lb ball, distance." }),
  def({ key: "mb_overhead_throw_ft", label: "Med-ball overhead throw (5 lb)", unit: "ft", category: "power_upper", higherIsBetter: true, physMin: 3, physMax: 100, definition: "Two-hand overhead throw with a 5 lb ball, distance." }),

  // ── Hitting / throwing tools ──────────────────────────────────────────
  def({ key: "exit_velo_mph", label: "Exit velocity", unit: "mph", category: "exit_velocity", higherIsBetter: true, physMin: 10, physMax: 125,
    definition: "Ball speed off the bat immediately after contact.", source: "Statcast definition (MLB)", gtTolerance: 1.5, gtDevice: "Radar (Pocket Radar/Stalker) or HitTrax/Rapsodo" }),
  def({ key: "avg_exit_velo_bp_mph", label: "Average exit velocity (BP, 10 swings)", unit: "mph", category: "exit_velocity", higherIsBetter: true, physMin: 10, physMax: 120,
    definition: "Mean exit velocity of 10 batting-practice swings.", gtTolerance: 1.5, gtDevice: "Radar or HitTrax" }),
  def({ key: "max_tee_distance_ft", label: "Max tee distance", unit: "ft", category: "exit_velocity", higherIsBetter: true, physMin: 20, physMax: 550, definition: "Longest carry distance off a tee." }),
  def({ key: "bat_speed_mph", label: "Bat speed", unit: "mph", category: "exit_velocity", higherIsBetter: true, physMin: 20, physMax: 100,
    definition: "Speed of the sweet spot at impact.", source: "Blast Motion / Statcast bat-tracking definition", gtTolerance: 2, gtDevice: "Blast Motion sensor" }),
  def({ key: "launch_angle_deg", label: "Launch angle", unit: "deg", category: "exit_velocity", higherIsBetter: null, physMin: -90, physMax: 90,
    definition: "Vertical angle of the ball leaving the bat.", source: "Statcast definition (MLB)", gtTolerance: 3, gtDevice: "HitTrax/Rapsodo" }),
  def({ key: "pitch_velo_mph", label: "Pitch velocity", unit: "mph", category: "throwing_velocity", higherIsBetter: true, physMin: 20, physMax: 106,
    definition: "Release (peak) speed of the athlete's own pitch.", source: "Statcast release-speed definition", gtTolerance: 1.5, gtDevice: "Radar (Stalker/Pocket Radar) or Rapsodo", requiredFps: 240 }),
  def({ key: "position_throw_velo_mph", label: "Position throw velocity", unit: "mph", category: "throwing_velocity", higherIsBetter: true, physMin: 20, physMax: 110,
    definition: "Peak speed of a position-player throw (crow hop or from position).", gtTolerance: 1.5, gtDevice: "Radar" }),
  def({ key: "pulldown_velo_mph", label: "Pulldown velocity", unit: "mph", category: "throwing_velocity", higherIsBetter: true, physMin: 30, physMax: 120,
    definition: "Running-start max-intent throw velocity.", gtTolerance: 1.5, gtDevice: "Radar" }),
  def({ key: "long_toss_distance_ft", label: "Long toss distance", unit: "ft", category: "throwing_velocity", higherIsBetter: true, physMin: 30, physMax: 500, definition: "Longest throw on a line or arc, landing distance." }),
  def({ key: "fielding_exchange_s", label: "Fielding exchange time", unit: "s", category: "fielding", higherIsBetter: false, physMin: 0.3, physMax: 4, definition: "Glove contact to ball release." }),
  def({ key: "pop_time_s", label: "Pop time", unit: "s", category: "fielding", higherIsBetter: false, physMin: 1.5, physMax: 3.5,
    definition: "Catcher: pitch hitting the mitt to the throw reaching the base fielder's glove.", source: "Statcast pop-time definition", gtTolerance: 0.05, gtDevice: "Stopwatch by trained timer or video at 120 fps", requiredFps: 120 }),
  def({ key: "throw_carry_ft", label: "Throw carry", unit: "ft", category: "throwing_velocity", higherIsBetter: true, physMin: 5, physMax: 500, definition: "Carry distance of a logged throw rep." }),
  def({ key: "throw_release_time_s", label: "Throw release time", unit: "s", category: "fielding", higherIsBetter: false, physMin: 0.2, physMax: 4, definition: "Logged time from glove to release on a throw rep." }),
  def({ key: "throw_accuracy", label: "Throw accuracy", unit: "score", category: "fielding", higherIsBetter: true, physMin: 0, physMax: 100, definition: "Game-log throw accuracy as entered." }),
  def({ key: "hang_time_s", label: "Hang time", unit: "s", category: "fielding", higherIsBetter: null, physMin: 0, physMax: 10, definition: "Batted-ball hang time as logged." }),
  def({ key: "play_time_s", label: "Total play time", unit: "s", category: "fielding", higherIsBetter: null, physMin: 0, physMax: 20, definition: "Defensive play total time as logged." }),

  // ── Body control / mobility (ROM keys for Release 4) ─────────────────
  def({ key: "sl_balance_eyes_closed_s", label: "Single-leg balance (eyes closed)", unit: "s", category: "body_control", higherIsBetter: true, physMin: 0, physMax: 600, definition: "Time held on one leg, eyes closed." }),
  def({ key: "checkin_balance_s", label: "Check-in balance hold", unit: "s", category: "body_control", higherIsBetter: true, physMin: 0, physMax: 600, privacy: "health", definition: "Balance hold timed inside the daily check-in." }),
  def({ key: "y_balance_reach_cm", label: "Y-Balance reach", unit: "cm", category: "body_control", higherIsBetter: true, physMin: 0, physMax: 200, definition: "Y-Balance Test reach distance.", source: "Plisky et al. 2009" }),
  ...([
    ["shoulder_ir_deg", "Shoulder internal rotation", 0, 120],
    ["shoulder_er_deg", "Shoulder external rotation", 0, 180],
    ["shoulder_total_arc_deg", "Shoulder total rotation arc", 0, 270],
    ["shoulder_flexion_deg", "Shoulder flexion", 0, 200],
    ["hip_ir_deg", "Hip internal rotation", 0, 80],
    ["hip_er_deg", "Hip external rotation", 0, 90],
    ["thoracic_rotation_deg", "Thoracic rotation", 0, 100],
    ["elbow_extension_deg", "Elbow extension", -30, 30],
    ["ankle_df_deg", "Ankle dorsiflexion (weight-bearing lunge angle)", 0, 70],
  ] as const).map(([key, label, min, max]) => def({ key, label, unit: "deg", category: "mobility", higherIsBetter: null, physMin: min, physMax: max, inAppOnly: false,
    definition: `${label}, active range of motion, measured per side (standard goniometric landmarks).`,
    source: "Norkin & White, Measurement of Joint Motion (landmarks); Gajdosik & Bohannon 1987 (±5° goniometer reliability)",
    gtTolerance: 5, gtDevice: "Goniometer or inclinometer", requiredFps: 30 })),
  def({ key: "ankle_df_knee_to_wall_cm", label: "Ankle dorsiflexion (knee to wall)", unit: "cm", category: "mobility", higherIsBetter: true, physMin: 0, physMax: 25,
    definition: "Knee-to-wall lunge distance, toe to wall.", source: "Bennell et al. 1998", gtTolerance: 1, gtDevice: "Tape measure" }),
  def({ key: "combine_rom_shoulder_deg", label: "Combine shoulder ROM (motion not recorded)", unit: "deg", category: "mobility", physMin: 0, physMax: 270, definition: "Combine shoulder ROM entry; which motion was measured is not stored." }),
  def({ key: "combine_rom_elbow_deg", label: "Combine elbow ROM (motion not recorded)", unit: "deg", category: "mobility", physMin: -30, physMax: 180, definition: "Combine elbow ROM entry; motion not stored." }),
  def({ key: "combine_rom_hip_deg", label: "Combine hip ROM (motion not recorded)", unit: "deg", category: "mobility", physMin: 0, physMax: 180, definition: "Combine hip ROM entry; motion not stored." }),
  def({ key: "squat_form_score", label: "Squat form score", unit: "score", category: "mobility", higherIsBetter: true, physMin: 0, physMax: 100, definition: "Combine squat form score as entered." }),

  // ── Readiness inputs (health class: check-in answers reach coaches only with health consent) ──
  def({ key: "stress", label: "Stress (1–5)", unit: "score_1_5", category: "readiness", higherIsBetter: false, physMin: 1, physMax: 5, privacy: "health", definition: "Answer to \"How stressed do you feel today?\" in the morning check-in." }),
  def({ key: "sleep_hours", label: "Hours slept (reported)", unit: "hours", category: "readiness", higherIsBetter: null, physMin: 0, physMax: 24, privacy: "health", definition: "Hours slept as answered in the check-in." }),
  def({ key: "sleep_quality", label: "Sleep quality (1–5)", unit: "score_1_5", category: "readiness", higherIsBetter: true, physMin: 1, physMax: 5, privacy: "health", definition: "Check-in sleep quality answer." }),
  // Release 0b parity fix: the check-in asks this on a 1–10 scale (VaultFocusQuizDialog TenPointScale), not 1–5.
  def({ key: "perceived_recovery", label: "Perceived recovery (1–10)", unit: "score_1_10", category: "readiness", higherIsBetter: true, physMin: 1, physMax: 10, privacy: "health", definition: "Check-in perceived recovery answer (1–10)." }),
  def({ key: "physical_readiness", label: "Physical readiness (1–5)", unit: "score_1_5", category: "readiness", higherIsBetter: true, physMin: 1, physMax: 5, privacy: "health", definition: "Check-in physical readiness answer." }),
  def({ key: "mental_readiness", label: "Mental readiness (1–5)", unit: "score_1_5", category: "readiness", higherIsBetter: true, physMin: 1, physMax: 5, privacy: "health", definition: "Check-in mental readiness answer." }),
  def({ key: "mood", label: "Mood (1–5)", unit: "score_1_5", category: "readiness", higherIsBetter: true, physMin: 1, physMax: 5, privacy: "health", definition: "Check-in mood answer." }),
  def({ key: "mental_energy", label: "Mental energy (1–5)", unit: "score_1_5", category: "readiness", higherIsBetter: true, physMin: 1, physMax: 5, privacy: "health", definition: "Check-in mental energy answer." }),
  def({ key: "pain_scale", label: "Pain (0–10)", unit: "score_0_10", category: "readiness", higherIsBetter: false, physMin: 0, physMax: 10, privacy: "health", definition: "Check-in pain answer (0–10 numeric rating scale).", source: "Numeric Pain Rating Scale (McCaffery & Beebe 1989)" }),
  def({ key: "reaction_tap_ms", label: "Check-in reaction tap", unit: "ms", category: "readiness", higherIsBetter: false, physMin: 100, physMax: 2000, privacy: "health", definition: "Reaction tap test inside the check-in (screen tap, not a sprint start)." }),
  def({ key: "hrv_sdnn_ms", label: "HRV (SDNN)", unit: "ms", category: "readiness", higherIsBetter: true, physMin: 5, physMax: 300, privacy: "health",
    definition: "Standard deviation of normal-to-normal heartbeat intervals, as recorded by Apple Health.", source: "Task Force of the ESC/NASPE 1996" }),
  def({ key: "resting_hr_bpm", label: "Resting heart rate", unit: "bpm", category: "readiness", higherIsBetter: false, physMin: 25, physMax: 140, privacy: "health",
    definition: "Resting heart rate (Apple Health daily value, or the check-in answer).", source: "Apple HealthKit HKQuantityTypeIdentifierRestingHeartRate" }),
  def({ key: "heart_rate_bpm", label: "Heart rate", unit: "bpm", category: "readiness", higherIsBetter: null, physMin: 25, physMax: 230, privacy: "health", definition: "Heart-rate sample from Apple Health." }),
  def({ key: "sleep_asleep_min", label: "Time asleep", unit: "min", category: "readiness", higherIsBetter: null, physMin: 0, physMax: 1440, privacy: "health",
    definition: "Minutes asleep in one night (Apple Health sleep analysis).", source: "Apple HealthKit HKCategoryTypeIdentifierSleepAnalysis" }),
  def({ key: "sleep_in_bed_min", label: "Time in bed", unit: "min", category: "readiness", higherIsBetter: null, physMin: 0, physMax: 1440, privacy: "health", definition: "Minutes in bed in one night (Apple Health)." }),
  def({ key: "readiness_score", label: "Readiness score", unit: "score", category: "derived", higherIsBetter: true, physMin: 0, physMax: 100, definition: "App-computed readiness score (derived)." }),
  def({ key: "training_readiness_score", label: "Training readiness score", unit: "score", category: "derived", higherIsBetter: true, physMin: 0, physMax: 100, definition: "App-computed training readiness score (derived)." }),
  def({ key: "cns_load_total", label: "CNS load (planned total)", unit: "load", category: "workload", physMin: 0, physMax: 100000, definition: "App-computed CNS load total for a day (derived)." }),
  def({ key: "cns_load_actual", label: "CNS load (actual)", unit: "load", category: "workload", physMin: 0, physMax: 100000, definition: "App-computed CNS load actually done (derived)." }),
  def({ key: "volume_load", label: "Volume load", unit: "load", category: "workload", physMin: 0, physMax: 10000000, definition: "Sets × reps × load (derived)." }),
  def({ key: "intensity_avg", label: "Average intensity", unit: "intensity", category: "workload", physMin: 0, physMax: 100, definition: "Average session intensity (derived)." }),
  def({ key: "recovery_debt", label: "Recovery debt", unit: "load", category: "workload", physMin: -100000, physMax: 100000, definition: "App-computed recovery debt (derived)." }),
  def({ key: "session_rpe", label: "Session RPE", unit: "rpe", category: "workload", higherIsBetter: null, physMin: 0, physMax: 10, definition: "Session rating of perceived exertion (CR-10).", source: "Foster et al. 2001" }),

  // ── Velocity-based training (Release 11) ─────────────────────────────
  def({ key: "bar_velocity_mean_ms", label: "Mean bar velocity", unit: "m/s", category: "vbt", higherIsBetter: true, physMin: 0.05, physMax: 4, inAppOnly: true,
    definition: "Mean concentric velocity of the bar for one rep.", source: "González-Badillo & Sánchez-Medina 2010", gtTolerance: 0.05, gtDevice: "Linear position transducer (GymAware)", requiredFps: 60 }),
  def({ key: "bar_velocity_peak_ms", label: "Peak bar velocity", unit: "m/s", category: "vbt", higherIsBetter: true, physMin: 0.05, physMax: 6, inAppOnly: true,
    definition: "Peak concentric velocity of the bar for one rep.", gtTolerance: 0.08, gtDevice: "Linear position transducer (GymAware)", requiredFps: 60 }),
  def({ key: "velocity_loss_pct", label: "Velocity loss in the set", unit: "pct", category: "vbt", higherIsBetter: false, physMin: 0, physMax: 100, inAppOnly: true,
    definition: "Drop from the set's fastest rep (cutoff 20% elastic, 30% strength; owner-proposed).", source: "Pareja-Blanco et al. 2017 (velocity-loss thresholds)", gtTolerance: 3, gtDevice: "Linear position transducer", requiredFps: 60 }),

  // ── Body ──────────────────────────────────────────────────────────────
  def({ key: "height_cm", label: "Height", unit: "cm", category: "body", higherIsBetter: null, physMin: 90, physMax: 230, definition: "Standing height without shoes." }),
  def({ key: "body_weight_lb", label: "Body weight", unit: "lb", category: "body", higherIsBetter: null, physMin: 40, physMax: 450, privacy: "health", definition: "Body weight." }),
  def({ key: "body_fat_pct", label: "Body fat", unit: "pct", category: "body", higherIsBetter: null, physMin: 2, physMax: 60, privacy: "health", definition: "Body-fat percentage as entered." }),
];

/** Old names → canonical key. Every name each naming system writes appears exactly once. */
export const ALIASES: MetricAlias[] = [
  // 6-week test registry (src/data/performanceTestRegistry.ts) — written as six_week.<key>
  ...([
    ["ten_yard_dash", "sprint_10yd_s", "s"], ["seven_yard_dash", "sprint_7yd_s", "s"], ["thirty_yard_dash", "sprint_30yd_s", "s"],
    ["forty_yard_dash", "sprint_40yd_s", "s"], ["sixty_yard_dash", "sprint_60yd_s", "s"], ["ten_thirty_split", "split_10_30_s", "s"],
    ["thirty_sixty_split", "split_30_60_s", "s"], ["pro_agility", "pro_agility_5_10_5_s", "s"], ["lateral_shuffle", "lateral_shuffle_10yd_s", "s"],
    ["first_step_5yd", "first_step_5yd_s", "s"], ["sl_broad_jump", "sl_broad_jump_cm", "in"], ["sl_lateral_broad_jump", "sl_lateral_broad_jump_cm", "in"],
    ["sl_vert_jump", "sl_vert_jump_cm", "in"], ["vertical_jump", "vertical_jump_cm", "in"], ["standing_broad_jump", "broad_jump_cm", "in"],
    ["mb_situp_throw", "mb_situp_throw_ft", "ft"], ["seated_chest_pass", "seated_chest_pass_ft", "ft"], ["mb_rotational_throw", "mb_rotational_throw_ft", "ft"],
    ["mb_overhead_throw", "mb_overhead_throw_ft", "ft"], ["tee_exit_velocity", "exit_velo_mph", "mph"], ["max_tee_distance", "max_tee_distance_ft", "ft"],
    ["bat_speed", "bat_speed_mph", "mph"], ["avg_exit_velo_bp", "avg_exit_velo_bp_mph", "mph"], ["long_toss_distance", "long_toss_distance_ft", "ft"],
    ["pitching_velocity", "pitch_velo_mph", "mph"], ["position_throw_velo", "position_throw_velo_mph", "mph"], ["pulldown_velocity", "pulldown_velo_mph", "mph"],
    ["fielding_exchange_time", "fielding_exchange_s", "s"], ["pop_time", "pop_time_s", "s"], ["sixty_yard_shuttle", "sixty_yd_shuttle_s", "s"],
    ["sl_balance_eyes_closed", "sl_balance_eyes_closed_s", "s"], ["deceleration_10yd", "deceleration_10yd_s", "s"],
    ["three_hundred_yd_shuttle", "three_hundred_yd_shuttle_s", "s"], ["sprint_repeat_avg", "sprint_repeat_avg_30yd_s", "s"],
    ["sl_3x_bound", "sl_3x_bound_cm", "ft"], ["shoulder_rom_internal", "shoulder_ir_deg", "deg"], ["shoulder_rom_external", "shoulder_er_deg", "deg"],
    ["hip_internal_rotation", "hip_ir_deg", "deg"], ["ankle_dorsiflexion", "ankle_df_knee_to_wall_cm", "in"],
    // Older 6-week rows (before the registry): exit_velocity is the same tool as tee_exit_velocity.
    ["exit_velocity", "exit_velo_mph", "mph"],
  ] as const).map(([a, key, unit]) => ({ alias: `six_week.${a}`, key, unit, system: "six_week" as const })),

  // Combine events (src/lib/combine/events.ts) — written as combine.<event>; unit comes from the row.
  ...([
    ["thirty_yard_dash", "sprint_30yd_s", "s"], ["ten_yard_split", "sprint_10yd_s", "s"], ["ten_yard_dash", "sprint_10yd_s", "s"],
    ["twenty_yard_dash", "sprint_20yd_s", "s"], ["forty_yard_dash", "sprint_40yd_s", "s"], ["flying_twenty", "flying_20yd_s", "s"],
    ["broad_jump", "broad_jump_cm", "in"], ["vertical_jump_height", "vertical_jump_cm", "in"], ["y_balance_reach", "y_balance_reach_cm", "cm"],
    ["five_ten_five_shuttle", "pro_agility_5_10_5_s", "s"], ["reactive_agility", "reactive_agility_s", "s"],
    ["active_rom_shoulder", "combine_rom_shoulder_deg", "deg"], ["active_rom_elbow", "combine_rom_elbow_deg", "deg"], ["active_rom_hip", "combine_rom_hip_deg", "deg"],
    ["squat_form_score", "squat_form_score", "score"], ["bullpen_velocity", "pitch_velo_mph", "mph"], ["exit_velocity", "exit_velo_mph", "mph"],
    ["throw_velocity", "position_throw_velo_mph", "mph"], ["pop_time", "pop_time_s", "s"],
  ] as const).map(([a, key, unit]) => ({ alias: `combine.${a}`, key, unit, system: "combine" as const })),
  // The one live misnamed key (spaces, TEST row). Mapped so its history keeps its meaning.
  { alias: "combine.TEST 60-yard dash", key: "sprint_60yd_s", unit: "s", system: "combine", note: "Misnamed TEST row (spaces); new writes use sixty_yard_dash." },

  // Base-running splits (src/lib/baserunning/splits.ts) — written as baserunning.<event>
  ...([
    ["home_to_first", "home_to_first_s", "s"], ["ten_yard_split", "sprint_10yd_s", "s"], ["thirty_yard_dash", "sprint_30yd_s", "s"],
    ["sixty_yard_dash", "sprint_60yd_s", "s"], ["lead_distance_primary", "lead_distance_primary_ft", "ft"], ["lead_distance_secondary", "lead_distance_secondary_ft", "ft"],
  ] as const).map(([a, key, unit]) => ({ alias: `baserunning.${a}`, key, unit, system: "baserunning" as const })),

  // Self-logged tests (record_my_test)
  ...([
    ["test.broad_jump_in", "broad_jump_cm", "in"], ["test.vertical_jump_in", "vertical_jump_cm", "in"], ["test.sl_broad_jump_in", "sl_broad_jump_cm", "in"],
    ["test.sprint_10yd_s", "sprint_10yd_s", "s"], ["test.sprint_30yd_s", "sprint_30yd_s", "s"], ["test.sprint_60yd_s", "sprint_60yd_s", "s"],
    ["test.rot_mb_throw_ft", "mb_rotational_throw_ft", "ft"], ["test.throw_velo_mph", "position_throw_velo_mph", "mph"],
    ["test.bat_speed_mph", "bat_speed_mph", "mph"], ["test.exit_velo_mph", "exit_velo_mph", "mph"],
  ] as const).map(([alias, key, unit]) => ({ alias, key, unit, system: "self_test" as const })),

  // Existing ledger writers (derived/readiness/workload/lifting)
  ...([
    ["readiness.readiness_score", "readiness_score", "score"], ["readiness.training_readiness_score", "training_readiness_score", "score"],
    ["workload.cns_load_total", "cns_load_total", "load"], ["workload.cns_load_actual", "cns_load_actual", "load"], ["workload.volume_load", "volume_load", "load"],
    ["workload.intensity_avg", "intensity_avg", "intensity"], ["workload.recovery_debt", "recovery_debt", "load"], ["lifting.session_rpe", "session_rpe", "rpe"],
  ] as const).map(([alias, key, unit]) => ({ alias, key, unit, system: "ledger" as const })),

  // Morning check-in (vault_focus_quizzes) — written as checkin.<column>
  ...([
    ["stress_level", "stress", "score_1_5"], ["hours_slept", "sleep_hours", "hours"], ["sleep_quality", "sleep_quality", "score_1_5"],
    ["perceived_recovery", "perceived_recovery", "score_1_10"], ["physical_readiness", "physical_readiness", "score_1_5"],
    ["mental_readiness", "mental_readiness", "score_1_5"], ["mood_level", "mood", "score_1_5"], ["mental_energy", "mental_energy", "score_1_5"],
    ["pain_scale", "pain_scale", "score_0_10"], ["resting_hr", "resting_hr_bpm", "bpm"], ["reaction_time_ms", "reaction_tap_ms", "ms"],
    ["balance_left_seconds", "checkin_balance_s", "s"], ["balance_right_seconds", "checkin_balance_s", "s"], ["weight_lbs", "body_weight_lb", "lb"],
  ] as const).map(([c, key, unit]) => ({ alias: `checkin.${c}`, key, unit, system: "checkin" as const })),

  // Apple Health (wearable_metrics.metric)
  ...([
    ["hrv_sdnn", "hrv_sdnn_ms", "ms"], ["resting_hr", "resting_hr_bpm", "bpm"], ["heart_rate", "heart_rate_bpm", "bpm"],
    ["sleep_asleep", "sleep_asleep_min", "min"], ["sleep_in_bed", "sleep_in_bed_min", "min"],
  ] as const).map(([m, key, unit]) => ({ alias: `healthkit.${m}`, key, unit, system: "healthkit" as const })),

  // Game and practice logs (athlete's OWN measurements only; opponent pitch speeds are never the athlete's)
  ...([
    ["game.exit_velo", "exit_velo_mph", "mph"], ["game.launch_angle", "launch_angle_deg", "deg"], ["game.home_to_first", "home_to_first_s", "s"],
    ["game.pitch_velo", "pitch_velo_mph", "mph"], ["game.throw_velo", "position_throw_velo_mph", "mph"], ["game.throw_accuracy", "throw_accuracy", "score"],
    ["game.hang_time", "hang_time_s", "s"], ["game.play_time", "play_time_s", "s"],
  ] as const).map(([alias, key, unit]) => ({ alias, key, unit, system: "game_log" as const })),

  // Throwing / catching reps (src/lib/throwing/reps.ts, src/lib/catching/*)
  { alias: "throwing.throw_velo_mph", key: "position_throw_velo_mph", unit: "mph", system: "game_log" },
  { alias: "throwing.carry_ft", key: "throw_carry_ft", unit: "ft", system: "game_log" },
  { alias: "throwing.accuracy_score", key: "throw_accuracy", unit: "score", system: "game_log" },
  { alias: "throwing.release_time_sec", key: "throw_release_time_s", unit: "s", system: "game_log" },
  { alias: "catching.catcher_pop_time", key: "pop_time_s", unit: "s", system: "game_log" },
  { alias: "catching.exchange_time_sec", key: "fielding_exchange_s", unit: "s", system: "game_log" },

  // Body
  { alias: "body.height_in", key: "height_cm", unit: "in", system: "body" },
  { alias: "body.weight_lbs", key: "body_weight_lb", unit: "lb", system: "body" },
  { alias: "body.body_fat_percent", key: "body_fat_pct", unit: "pct", system: "body" },

  // Camera velocity (cv_velocity_measurements)
  { alias: "cv.pitch_velocity_mph", key: "pitch_velo_mph", unit: "mph", system: "cv" },

  // Practice logs (Release 0b): partner/self-timed sprints (speed_partner_timings.distance "10y"…) and the
  // "how hard was it" answer on a logged activity (custom_activity_logs.performance_data.rpe).
  ...([
    ["practice.sprint_7y", "sprint_7yd_s"], ["practice.sprint_10y", "sprint_10yd_s"], ["practice.sprint_20y", "sprint_20yd_s"],
    ["practice.sprint_30y", "sprint_30yd_s"], ["practice.sprint_40y", "sprint_40yd_s"], ["practice.sprint_60y", "sprint_60yd_s"],
  ] as const).map(([alias, key]) => ({ alias, key, unit: "s", system: "practice" as const })),
  { alias: "practice.session_rpe", key: "session_rpe", unit: "rpe", system: "practice" },
];

/** Unit conversions to each canonical unit. Unknown pairs return null (missing, never guessed). */
const TO: Record<string, Record<string, number>> = {
  cm: { cm: 1, in: 2.54, inches: 2.54, ft: 30.48, feet: 30.48, m: 100, mm: 0.1 },
  ft: { ft: 1, feet: 1, in: 1 / 12, inches: 1 / 12, yd: 3, m: 3.280839895, cm: 0.03280839895 },
  m: { m: 1, cm: 0.01, ft: 0.3048, yd: 0.9144, in: 0.0254 },
  s: { s: 1, sec: 1, seconds: 1, ms: 0.001 },
  ms: { ms: 1, s: 1000, sec: 1000, seconds: 1000 },
  mph: { mph: 1, "km/h": 0.621371192, kph: 0.621371192, "m/s": 2.236936292 },
  "m/s": { "m/s": 1, mph: 0.44704 },
  deg: { deg: 1, degrees: 1 },
  min: { min: 1, hours: 60, h: 60, s: 1 / 60 },
  hours: { hours: 1, h: 1, hrs: 1, min: 1 / 60 },
  lb: { lb: 1, lbs: 1, kg: 2.2046226218 },
};

export function convertUnit(value: number, from: string | null | undefined, to: string): number | null {
  if (!Number.isFinite(value)) return null;
  const f = (from ?? "").trim().toLowerCase();
  if (!f || f === to.toLowerCase()) return value;
  const factor = TO[to]?.[f];
  return factor == null ? null : value * factor;
}

/** SQL mirror of convertUnit (same table), used by ledger_save. */
export function conversionRows(): Array<[to: string, from: string, factor: number]> {
  const out: Array<[string, string, number]> = [];
  for (const [to, froms] of Object.entries(TO)) for (const [from, f] of Object.entries(froms)) out.push([to, from, f]);
  return out;
}

const byKey = new Map(METRICS.map((m) => [m.key, m]));
const byAlias = new Map(ALIASES.map((a) => [a.alias, a]));

export function metricDef(key: string): MetricDef | null { return byKey.get(key) ?? null; }

/** Canonical key + value for any name a writer uses (canonical names map to themselves). */
export function canonicalize(metricKey: string, value: number, unit?: string | null): { key: string; value: number | null; unit: string } | null {
  const direct = byKey.get(metricKey);
  if (direct) return { key: direct.key, value: convertUnit(value, unit ?? direct.unit, direct.unit), unit: direct.unit };
  const a = byAlias.get(metricKey);
  if (!a) return null;
  const d = byKey.get(a.key)!;
  return { key: d.key, value: convertUnit(value, unit || a.unit, d.unit), unit: d.unit };
}

/** Inverse for display parity: canonical value back into an old name's unit. */
export function fromCanonical(alias: string, canonicalValue: number): number | null {
  const a = byAlias.get(alias);
  if (!a) return null;
  const d = byKey.get(a.key)!;
  const unitFactor = convertUnit(1, a.unit, d.unit);
  return unitFactor ? canonicalValue / unitFactor : null;
}

/** G3 physics gate. Unknown bounds = cannot pass (missing beats fabricated). */
export function physicallyPossible(key: string, canonicalValue: number | null): boolean | null {
  const d = byKey.get(key);
  if (!d || canonicalValue == null || d.physMin == null || d.physMax == null) return null;
  return canonicalValue >= d.physMin && canonicalValue <= d.physMax;
}
