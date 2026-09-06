/**
 * Stage 2 — Appendix A movement dataset.
 *
 * Every row here is inserted `is_active = false`. Governing law (spec §0):
 * default `in_season = false`. The only categories permitted to ship
 * `in_season = true` are mobility, arm_care, bodyweight core and bodyweight
 * foot_ankle. Any row flagged deep_flexion or eccentric_overload is
 * in_season = false regardless of category.
 */

export type TrainingAgeLegality = { beginner: boolean; intermediate: boolean; advanced: boolean };

export interface MovementRow {
  name: string;
  slug: string;
  category: string;
  movement_category: string;
  dosage_unit: string;
  substitution_family: string;
  equipment_requirements: string[];
  equipment: string[];
  cns_cost: number;
  min_age_years: number;
  min_training_age_years: number;
  training_age_legality: TrainingAgeLegality;
  season_legality: Record<string, boolean>;
  recovery_window_hours: number;
  deep_flexion: boolean;
  eccentric_overload: boolean;
  game_day_legal: boolean;
  practice_day_legal: boolean;
  sport_scope: string;
  position_scope: string[] | null;
  governance_version: string;
  cue: string;
  why_prescribed: string;
  intensity_mode?: string;
}

const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "pre_season", "in_season", "post_season"] as const;

function legality(inSeason: boolean): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const p of PHASES) out[p] = true;
  out.in_season = inSeason;
  out.pre_season = inSeason;
  out.post_season = inSeason;
  return out;
}

const AGE_ALL: TrainingAgeLegality = { beginner: true, intermediate: true, advanced: true };
const AGE_INT: TrainingAgeLegality = { beginner: false, intermediate: true, advanced: true };
const AGE_ADV: TrainingAgeLegality = { beginner: false, intermediate: false, advanced: true };

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

interface GroupDefaults {
  category: string;
  movement_category: string;
  dosage_unit: string;
  equipment_requirements: string[];
  cns_cost: number;
  min_age_years: number;
  min_training_age_years: number;
  training_age_legality: TrainingAgeLegality;
  in_season: boolean;
  recovery_window_hours: number;
  cue: string;
  why: string;
  game_day_legal?: boolean;
}

type Spec = string | (Partial<GroupDefaults> & {
  name: string;
  deep_flexion?: boolean;
  eccentric_overload?: boolean;
  substitution_family?: string;
  intensity_mode?: string;
});

function build(family: string, defaults: GroupDefaults, specs: Spec[]): MovementRow[] {
  return specs.map((s) => {
    const o = typeof s === "string" ? { name: s } : s;
    const deep = !!(o as { deep_flexion?: boolean }).deep_flexion;
    const ecc = !!(o as { eccentric_overload?: boolean }).eccentric_overload;
    const d = { ...defaults, ...o };
    const inSeason = deep || ecc ? false : d.in_season;
    return {
      name: o.name,
      slug: slugify(o.name),
      category: d.category,
      movement_category: d.movement_category,
      dosage_unit: d.dosage_unit,
      substitution_family: (o as { substitution_family?: string }).substitution_family ?? family,
      equipment_requirements: d.equipment_requirements,
      equipment: d.equipment_requirements,
      cns_cost: d.cns_cost,
      min_age_years: d.min_age_years,
      min_training_age_years: d.min_training_age_years,
      training_age_legality: d.training_age_legality,
      season_legality: legality(inSeason),
      recovery_window_hours: d.recovery_window_hours,
      deep_flexion: deep,
      eccentric_overload: ecc,
      game_day_legal: d.game_day_legal ?? false,
      practice_day_legal: true,
      sport_scope: "both",
      position_scope: null,
      governance_version: "gov_v1",
      cue: d.cue,
      why_prescribed: d.why,
      intensity_mode: (o as { intensity_mode?: string }).intensity_mode,
    };
  });
}

// ── compound_lower — bilateral strength ──────────────────────────────────────
const COMPOUND_LOWER = build(
  "bilateral_squat_hinge",
  {
    category: "strength",
    movement_category: "compound_lower",
    dosage_unit: "reps",
    equipment_requirements: ["barbell", "rack"],
    cns_cost: 4,
    min_age_years: 16,
    min_training_age_years: 3,
    training_age_legality: AGE_ADV,
    in_season: false,
    recovery_window_hours: 48,
    cue: "Brace the trunk, drive the floor away, own every inch of the range.",
    why: "Bilateral lower-body strength is the base that speed and power are built on.",
  },
  [
    { name: "Belt Squat", equipment_requirements: ["belt_squat_machine"] },
    "Back Squat",
    "Front Squat",
    "Heel Elevated Front Squat",
    "Paused Deep Squat",
    { name: "Hack Squat", equipment_requirements: ["hack_squat_machine"] },
    { name: "Hex Bar Deadlift", equipment_requirements: ["trap_bar"] },
    "Conventional Deadlift",
    "Barbell Good Morning",
  ],
);

// ── compound_lower — starting strength, 72h window ───────────────────────────
const STARTING_STRENGTH = build(
  "starting_strength_barbell",
  {
    category: "strength",
    movement_category: "compound_lower",
    dosage_unit: "reps",
    equipment_requirements: ["barbell", "rack"],
    cns_cost: 5,
    min_age_years: 16,
    min_training_age_years: 3,
    training_age_legality: AGE_ADV,
    in_season: false,
    recovery_window_hours: 72,
    cue: "Start from a dead stop and be violent out of the bottom.",
    why: "Starting strength trains force production from zero velocity — the first step and the block.",
  },
  [
    "Box Squat",
    "Pin Squat Concentric Only",
    { name: "Dead Stop Trap Bar Deadlift", equipment_requirements: ["trap_bar"] },
    { name: "Block Pull Deadlift", equipment_requirements: ["barbell", "blocks"] },
    "Hang Power Clean",
    { name: "Block Power Clean", equipment_requirements: ["barbell", "blocks"] },
    { name: "Block Power Snatch", equipment_requirements: ["barbell", "blocks"] },
    { name: "Clean Pull From Blocks", equipment_requirements: ["barbell", "blocks"] },
    "Mid Thigh Pull",
  ],
);

// ── single_leg ───────────────────────────────────────────────────────────────
const SINGLE_LEG = build(
  "single_leg_squat",
  {
    category: "strength",
    movement_category: "single_leg",
    dosage_unit: "reps",
    equipment_requirements: ["dumbbells"],
    cns_cost: 3,
    min_age_years: 14,
    min_training_age_years: 1,
    training_age_legality: AGE_INT,
    in_season: false,
    recovery_window_hours: 48,
    cue: "Stack the knee over the mid-foot and control the descent on one leg.",
    why: "Single-leg strength closes side-to-side gaps and protects the knee and hip in sport.",
  },
  [
    { name: "Bulgarian Split Squat", equipment_requirements: ["dumbbells", "bench"] },
    { name: "Front Foot Elevated Reverse Lunge", equipment_requirements: ["dumbbells", "plate"] },
    "Walking Lunge",
    "Dumbbell Lateral Lunge",
    { name: "Barbell Lateral Lunge", equipment_requirements: ["barbell"] },
    { name: "Cossack Squat", equipment_requirements: [] },
    { name: "Slider Reverse Lunge", equipment_requirements: ["sliders"] },
    { name: "Step Up", equipment_requirements: ["box", "dumbbells"] },
    { name: "Backward Step Down Heel Elevated", equipment_requirements: ["box"], cns_cost: 2 },
    { name: "Petersen Step Up", equipment_requirements: ["box"], cns_cost: 2 },
    { name: "Short Range Knee Step Down", equipment_requirements: ["box"], cns_cost: 2 },
    { name: "Contralateral Step Up", equipment_requirements: ["box", "dumbbells"] },
    { name: "Single Leg Wall Sit", equipment_requirements: [], dosage_unit: "seconds", cns_cost: 2 },
    { name: "Wall Sit", equipment_requirements: [], dosage_unit: "seconds", cns_cost: 1 },
    { name: "Deep Range Split Squat", equipment_requirements: [], deep_flexion: true },
  ],
);

// ── posterior_chain ──────────────────────────────────────────────────────────
const POSTERIOR = build(
  "posterior_chain",
  {
    category: "strength",
    movement_category: "posterior_chain",
    dosage_unit: "reps",
    equipment_requirements: [],
    cns_cost: 3,
    min_age_years: 14,
    min_training_age_years: 1,
    training_age_legality: AGE_INT,
    in_season: false,
    recovery_window_hours: 48,
    cue: "Hips lead, spine long, hamstrings take the load.",
    why: "The posterior chain brakes the body and drives the hips — it is the engine behind top speed.",
  },
  [
    { name: "Reverse Nordic Curl", eccentric_overload: true },
    { name: "Physioball Leg Curl", equipment_requirements: ["physioball"] },
    { name: "Slideboard Leg Curl", equipment_requirements: ["slideboard"] },
    { name: "Glute Ham Raise", equipment_requirements: ["ghd"] },
    { name: "Single Leg Back Extension", equipment_requirements: ["back_extension"] },
    { name: "Forty Five Degree Back Extension", equipment_requirements: ["back_extension"] },
    { name: "Seated Good Morning", equipment_requirements: ["barbell", "bench"] },
    {
      name: "Slant Board Jefferson Curl",
      equipment_requirements: ["slant_board", "dumbbells"],
      min_age_years: 16,
      training_age_legality: AGE_ADV,
      deep_flexion: true,
    },
    { name: "Dumbbell Split Stance RDL", equipment_requirements: ["dumbbells"] },
    { name: "Dumbbell RDL To Row", equipment_requirements: ["dumbbells"] },
    { name: "Band Pull Through", equipment_requirements: ["bands"] },
    { name: "Barbell Hip Thrust", equipment_requirements: ["barbell", "bench"] },
  ],
);

// ── foot_ankle — bodyweight, legal every phase ───────────────────────────────
const FOOT_ANKLE = build(
  "foot_ankle",
  {
    category: "joint_armor",
    movement_category: "foot_ankle",
    dosage_unit: "reps",
    equipment_requirements: [],
    cns_cost: 0,
    min_age_years: 12,
    min_training_age_years: 0,
    training_age_legality: AGE_ALL,
    in_season: true,
    recovery_window_hours: 24,
    cue: "Slow through the full range, pause at the end, no bouncing.",
    why: "Foot and ankle capacity is the first link in every sprint, cut and landing.",
    game_day_legal: true,
  },
  [
    "Tibialis Raise",
    "Seated Tibialis Raise",
    "FHL Calf Raise",
    "Knee Forward Calf Raise",
    "Straight Leg Calf Raise",
    { name: "Seated Calf Raise", equipment_requirements: ["bench"] },
    { name: "Single Leg Calf Raise Off Block", equipment_requirements: ["block"] },
    { name: "Slant Board Calf Raise", equipment_requirements: ["slant_board"] },
    "Kneeling Ankle Rocks",
    "Toe Walk",
    "Heel Walk",
  ],
);

// ── compound_upper_push ──────────────────────────────────────────────────────
const UPPER_PUSH = build(
  "horizontal_press",
  {
    category: "strength",
    movement_category: "compound_upper_push",
    dosage_unit: "reps",
    equipment_requirements: ["dumbbells"],
    cns_cost: 3,
    min_age_years: 14,
    min_training_age_years: 1,
    training_age_legality: AGE_INT,
    in_season: false,
    recovery_window_hours: 48,
    cue: "Ribs down, shoulder blades set, press without losing the trunk.",
    why: "Upper-body pressing strength supports the trunk and shoulder through throwing and swinging.",
  },
  [
    { name: "Dumbbell Bench Press", equipment_requirements: ["dumbbells", "bench"] },
    { name: "Single Arm Dumbbell Bench Press", equipment_requirements: ["dumbbells", "bench"] },
    { name: "Alternating Dumbbell Bench Press", equipment_requirements: ["dumbbells", "bench"] },
    { name: "Incline Dumbbell Press", equipment_requirements: ["dumbbells", "bench"] },
    { name: "Incline Barbell Bench Press", equipment_requirements: ["barbell", "bench"], min_age_years: 16 },
    { name: "Landmine Press", equipment_requirements: ["landmine"], substitution_family: "vertical_press" },
    { name: "Landmine Push Press", equipment_requirements: ["landmine"], substitution_family: "vertical_press" },
    { name: "Split Stance Landmine Push Press", equipment_requirements: ["landmine"], substitution_family: "vertical_press" },
    { name: "Half Kneeling Landmine Press", equipment_requirements: ["landmine"], substitution_family: "vertical_press" },
    { name: "Dumbbell Push Press", equipment_requirements: ["dumbbells"], substitution_family: "vertical_press" },
    { name: "Full Range Dumbbell Shoulder Press", equipment_requirements: ["dumbbells"], substitution_family: "vertical_press" },
    { name: "Seated Alternating Shoulder Press", equipment_requirements: ["dumbbells", "bench"], substitution_family: "vertical_press" },
    { name: "Dumbbell Squat To Press", equipment_requirements: ["dumbbells"], substitution_family: "vertical_press" },
    { name: "Deficit Push Up", equipment_requirements: [], cns_cost: 2 },
    { name: "Ring Push Up", equipment_requirements: ["rings"], cns_cost: 2 },
    { name: "Banded Push Up", equipment_requirements: ["bands"], cns_cost: 2 },
    { name: "Yoga Push Up", equipment_requirements: [], cns_cost: 2 },
    { name: "Full Range Dip", equipment_requirements: ["dip_bars"] },
    { name: "Ring Dip", equipment_requirements: ["rings"] },
    { name: "Plate Press", equipment_requirements: ["plate"], cns_cost: 2 },
  ],
);

// ── compound_upper_pull ──────────────────────────────────────────────────────
const UPPER_PULL = build(
  "vertical_pull",
  {
    category: "strength",
    movement_category: "compound_upper_pull",
    dosage_unit: "reps",
    equipment_requirements: ["pull_up_bar"],
    cns_cost: 3,
    min_age_years: 14,
    min_training_age_years: 1,
    training_age_legality: AGE_INT,
    in_season: false,
    recovery_window_hours: 48,
    cue: "Lead with the shoulder blades, finish with the arms, no swinging.",
    why: "Pulling volume balances the pressing and throwing load a baseball shoulder already carries.",
  },
  [
    "Pull Up",
    "Chin Up",
    "Wide Grip Pull Up",
    { name: "Weighted Pull Up", equipment_requirements: ["pull_up_bar", "weight_belt"] },
    { name: "Isometric Hold Pull Up", dosage_unit: "seconds" },
    { name: "Feet Elevated Inverted Row", equipment_requirements: ["barbell", "box"], substitution_family: "horizontal_pull" },
    { name: "Ring Row", equipment_requirements: ["rings"], substitution_family: "horizontal_pull" },
    { name: "Bent Over Barbell Row", equipment_requirements: ["barbell"], substitution_family: "horizontal_pull", min_age_years: 16 },
    { name: "Chest Supported Row", equipment_requirements: ["dumbbells", "bench"], substitution_family: "horizontal_pull" },
    { name: "Seated Cable Row", equipment_requirements: ["cable"], substitution_family: "horizontal_pull" },
    { name: "Single Arm Cable Row", equipment_requirements: ["cable"], substitution_family: "horizontal_pull" },
    { name: "Half Kneeling Cable High Row", equipment_requirements: ["cable"], substitution_family: "horizontal_pull" },
    { name: "Half Kneeling Lat Pulldown", equipment_requirements: ["cable"] },
    { name: "One Arm Cable Pulldown", equipment_requirements: ["cable"] },
    { name: "Bird Dog Row", equipment_requirements: ["dumbbells", "bench"], substitution_family: "horizontal_pull" },
    { name: "Hang High Pull", equipment_requirements: ["barbell"], min_age_years: 16, training_age_legality: AGE_ADV, recovery_window_hours: 72 },
    { name: "Power High Pull", equipment_requirements: ["barbell"], min_age_years: 16, training_age_legality: AGE_ADV, recovery_window_hours: 72 },
    { name: "Hang Jump Shrug", equipment_requirements: ["barbell"], min_age_years: 16, training_age_legality: AGE_ADV, recovery_window_hours: 72 },
    { name: "Straight Arm Dumbbell Pullover", equipment_requirements: ["dumbbells", "bench"] },
    { name: "Dumbbell Pullover Hold", equipment_requirements: ["dumbbells", "bench"], dosage_unit: "seconds" },
    { name: "Band Pull Apart", equipment_requirements: ["bands"], cns_cost: 1 },
    { name: "Trap Three Raise", equipment_requirements: ["dumbbells"], cns_cost: 1 },
    { name: "Prone Y T W Raise", equipment_requirements: ["bench"], cns_cost: 1 },
    { name: "Prone Weighted Reverse Fly", equipment_requirements: ["dumbbells", "bench"], cns_cost: 1 },
  ],
);

// ── arm_care — legal every phase ─────────────────────────────────────────────
const ARM_CARE = build(
  "arm_care",
  {
    category: "arm_care",
    movement_category: "arm_care",
    dosage_unit: "reps",
    equipment_requirements: ["bands"],
    cns_cost: 1,
    min_age_years: 12,
    min_training_age_years: 0,
    training_age_legality: AGE_ALL,
    in_season: true,
    recovery_window_hours: 24,
    cue: "Small, slow and controlled — quality beats load here.",
    why: "Shoulder, elbow and wrist capacity keeps the throwing arm available all season.",
    game_day_legal: true,
  },
  [
    { name: "Side Lying External Rotation", equipment_requirements: ["dumbbells"] },
    "Half Kneeling Band External Rotation",
    { name: "Dowel Assisted Ninety Ninety Stretch", equipment_requirements: ["dowel"], cns_cost: 0 },
    { name: "Prone Horizontal Abduction", equipment_requirements: ["dumbbells", "bench"] },
    { name: "Powell Raise", equipment_requirements: ["dumbbells", "bench"] },
    { name: "Reverse Powell Raise", equipment_requirements: ["dumbbells", "bench"] },
    { name: "Scapular CARs", equipment_requirements: [], cns_cost: 0 },
    "Banded Wall Slide",
    { name: "Serratus Wall Slide", equipment_requirements: [] },
    { name: "Sleeper Stretch", equipment_requirements: [], dosage_unit: "seconds", cns_cost: 0 },
    { name: "Assisted Shoulder Flexion", equipment_requirements: ["dowel"], cns_cost: 0 },
    { name: "Wall Finger Crawl", equipment_requirements: [], cns_cost: 0 },
    { name: "Zottman Curl", equipment_requirements: ["dumbbells"], substitution_family: "forearm_grip" },
    { name: "Incline Dumbbell Hammer Curl", equipment_requirements: ["dumbbells", "bench"], substitution_family: "forearm_grip" },
    { name: "Over Bench Wrist Curl", equipment_requirements: ["dumbbells", "bench"], substitution_family: "forearm_grip" },
    { name: "Reverse Wrist Curl", equipment_requirements: ["dumbbells"], substitution_family: "forearm_grip" },
    { name: "Forearm Pronation Supination", equipment_requirements: ["dumbbells"], substitution_family: "forearm_grip" },
    { name: "Radial Deviation", equipment_requirements: ["dumbbells"], substitution_family: "forearm_grip" },
    { name: "Ulnar Deviation", equipment_requirements: ["dumbbells"], substitution_family: "forearm_grip" },
    { name: "Wrist Roller", equipment_requirements: ["wrist_roller"], substitution_family: "forearm_grip" },
    { name: "Plate Pinch", equipment_requirements: ["plate"], dosage_unit: "seconds", substitution_family: "forearm_grip" },
    { name: "Neck Flexion", equipment_requirements: [], substitution_family: "neck" },
    { name: "Neck Extension", equipment_requirements: [], substitution_family: "neck" },
    { name: "Prone Neck Bridge", equipment_requirements: [], dosage_unit: "seconds", substitution_family: "neck" },
    { name: "Front Neck Bridge", equipment_requirements: [], dosage_unit: "seconds", substitution_family: "neck" },
  ],
);

// ── core — bodyweight legal every phase, loaded offseason only ───────────────
const CORE_BW = build(
  "trunk_bodyweight",
  {
    category: "core",
    movement_category: "core",
    dosage_unit: "reps",
    equipment_requirements: [],
    cns_cost: 1,
    min_age_years: 12,
    min_training_age_years: 0,
    training_age_legality: AGE_ALL,
    in_season: true,
    recovery_window_hours: 24,
    cue: "Ribs stacked over the pelvis, breathe, never let the low back arch.",
    why: "A trunk that transfers force is what turns leg drive into bat and ball speed.",
    game_day_legal: true,
  },
  [
    "Body Saw",
    "Tall Plank Shoulder Tap",
    "Bird Dog",
    "V Up",
    "Cross Body Crunch",
    "Straight Leg Sit Up",
    { name: "Dolphin Plank", dosage_unit: "seconds" },
    { name: "Four Way Plank", dosage_unit: "seconds" },
    { name: "Plank With Reach", dosage_unit: "seconds" },
    { name: "L Sit", dosage_unit: "seconds" },
    { name: "Hanging Knee Raise", equipment_requirements: ["pull_up_bar"] },
    { name: "Hanging Knees To Elbows", equipment_requirements: ["pull_up_bar"] },
    { name: "Garhammer Raise", equipment_requirements: ["pull_up_bar"] },
  ],
);

const CORE_LOADED = build(
  "trunk_loaded",
  {
    category: "core",
    movement_category: "core",
    dosage_unit: "reps",
    equipment_requirements: ["dumbbells"],
    cns_cost: 2,
    min_age_years: 14,
    min_training_age_years: 1,
    training_age_legality: AGE_INT,
    in_season: false,
    recovery_window_hours: 48,
    cue: "Resist the load, do not chase it — the trunk stays quiet.",
    why: "Loaded anti-extension and anti-rotation work builds the stiffness rotation needs.",
  },
  [
    { name: "Kneeling Ab Rollout", equipment_requirements: ["ab_wheel"] },
    { name: "Standing Ab Rollout", equipment_requirements: ["ab_wheel"] },
    "Weighted Dead Bug",
    { name: "Banded Dead Bug", equipment_requirements: ["bands"] },
    { name: "Russian Twist", equipment_requirements: ["medicine_ball"] },
    { name: "Landmine Straight Leg Sit Up", equipment_requirements: ["landmine"] },
    { name: "Landmine Overhead Rotation", equipment_requirements: ["landmine"] },
    { name: "Bench Supported Side Bend", equipment_requirements: ["dumbbells", "bench"] },
    "Weighted Crunch",
    "Dumbbell Crunch",
    { name: "Plank Drag Through", dosage_unit: "reps" },
    { name: "Off Bench Oblique", equipment_requirements: ["bench"] },
    { name: "Resisted Dead Bug", equipment_requirements: ["bands"] },
    { name: "Low Cable Hip Flexor Pull In", equipment_requirements: ["cable"] },
    { name: "Strap Loaded Hip Flexor Raise", equipment_requirements: ["ankle_strap", "cable"] },
  ],
);

// ── carry ────────────────────────────────────────────────────────────────────
const CARRY = build(
  "loaded_carry",
  {
    category: "strength",
    movement_category: "carry",
    dosage_unit: "distance_feet",
    equipment_requirements: ["dumbbells"],
    cns_cost: 2,
    min_age_years: 14,
    min_training_age_years: 1,
    training_age_legality: AGE_INT,
    in_season: false,
    recovery_window_hours: 48,
    cue: "Tall, quiet steps — do not lean away from the load.",
    why: "Carries build grip, trunk and shoulder endurance under a real load.",
  },
  [
    "Suitcase Carry",
    "Offset Farmer Carry",
    { name: "Trap Bar Carry", equipment_requirements: ["trap_bar"] },
    "Overhead Carry",
  ],
);

// ── jump_landing ─────────────────────────────────────────────────────────────
const JUMPS = build(
  "jump_landing",
  {
    category: "plyometrics",
    movement_category: "jump_landing",
    dosage_unit: "reps",
    equipment_requirements: [],
    cns_cost: 4,
    min_age_years: 14,
    min_training_age_years: 1,
    training_age_legality: AGE_INT,
    in_season: false,
    recovery_window_hours: 48,
    cue: "Land quiet, land balanced — a bad landing ends the set.",
    why: "Jump and landing quality is the clearest transfer from the weight room to the field.",
  },
  [
    "Countermovement Jump",
    { name: "Hurdle Jump", equipment_requirements: ["hurdles"] },
    { name: "Continuous Hurdle Jump", equipment_requirements: ["hurdles"] },
    { name: "Single Leg Mini Hurdle Jump", equipment_requirements: ["mini_hurdles"] },
    "Split Squat Jump",
    "Alternating Split Jump",
    { name: "Hurdle Pogo", equipment_requirements: ["mini_hurdles"] },
    { name: "Weighted Squat Jump", equipment_requirements: ["dumbbells"], recovery_window_hours: 72 },
    { name: "Altitude Landing", equipment_requirements: ["box"], eccentric_overload: true, recovery_window_hours: 72 },
    { name: "Depth Drop To Broad Jump", equipment_requirements: ["box"], eccentric_overload: true, recovery_window_hours: 72 },
    { name: "Accentuated Eccentric Box Jump", equipment_requirements: ["box"], eccentric_overload: true, recovery_window_hours: 72 },
    { name: "Accentuated Eccentric Single Leg Box Jump", equipment_requirements: ["box"], eccentric_overload: true, recovery_window_hours: 72 },
    { name: "Loaded Countermovement Jump", equipment_requirements: ["dumbbells"], recovery_window_hours: 72 },
    { name: "Loaded Broad Jump", equipment_requirements: ["dumbbells"], recovery_window_hours: 72 },
    { name: "Trap Bar Jump", equipment_requirements: ["trap_bar"], recovery_window_hours: 72, min_age_years: 16, training_age_legality: AGE_ADV },
    { name: "Seated Vertical Jump", equipment_requirements: ["box"], recovery_window_hours: 96, substitution_family: "seated_jump" },
    { name: "Seated Box Jump", equipment_requirements: ["box"], recovery_window_hours: 96, substitution_family: "seated_jump" },
    { name: "Seated Broad Jump", equipment_requirements: ["box"], recovery_window_hours: 96, substitution_family: "seated_jump" },
    { name: "Single Leg Seated Jump", equipment_requirements: ["box"], recovery_window_hours: 96, substitution_family: "seated_jump" },
    { name: "Non Countermovement Squat Jump", recovery_window_hours: 96, substitution_family: "seated_jump" },
  ],
);

// ── rotation — med ball and cable, 48h window ────────────────────────────────
const ROTATION = build(
  "rotational_power",
  {
    category: "power",
    movement_category: "rotation",
    dosage_unit: "reps",
    equipment_requirements: ["medicine_ball"],
    cns_cost: 3,
    min_age_years: 12,
    min_training_age_years: 0,
    training_age_legality: AGE_ALL,
    in_season: false,
    recovery_window_hours: 48,
    cue: "Ground first, hips second, ball last — throw it, do not place it.",
    why: "Rotational throws train the sequence that produces bat speed and arm speed.",
  },
  [
    { name: "Medicine Ball Chest Pass", intensity_mode: "intensive" },
    { name: "Kneeling Medicine Ball Chest Pass", intensity_mode: "intensive" },
    { name: "Seated Chest Pass", intensity_mode: "intensive" },
    { name: "Medicine Ball Overhead Throw", intensity_mode: "intensive" },
    { name: "Medicine Ball Supine Throw", intensity_mode: "intensive" },
    { name: "Medicine Ball Sit Up Throw", intensity_mode: "intensive" },
    { name: "Medicine Ball Shot Put Throw", intensity_mode: "intensive" },
    { name: "Medicine Ball Side Toss", intensity_mode: "intensive" },
    { name: "Medicine Ball Scoop Toss", intensity_mode: "intensive" },
    { name: "Medicine Ball Slam", intensity_mode: "intensive" },
    { name: "Medicine Ball Hip Toss", intensity_mode: "intensive" },
    { name: "Medicine Ball Push Toss", intensity_mode: "intensive" },
    { name: "Medicine Ball Rotational Deceleration Toss", intensity_mode: "intensive" },
    { name: "Split Stance Overhead Jump Toss", intensity_mode: "intensive" },
    { name: "Wide Stance Cable Rotation", equipment_requirements: ["cable"], intensity_mode: "intensive" },
    { name: "Cable High Low Rotation", equipment_requirements: ["cable"], intensity_mode: "intensive" },
    { name: "Half Kneeling Cable Lift", equipment_requirements: ["cable"], intensity_mode: "intensive" },
    { name: "Half Kneeling Cable Chop", equipment_requirements: ["cable"], intensity_mode: "intensive" },
  ],
);

// ── speed slot ───────────────────────────────────────────────────────────────
const SPEED = build(
  "acceleration",
  {
    category: "speed_lab",
    movement_category: "mobility",
    dosage_unit: "distance_feet",
    equipment_requirements: [],
    cns_cost: 3,
    min_age_years: 12,
    min_training_age_years: 0,
    training_age_legality: AGE_ALL,
    in_season: false,
    recovery_window_hours: 48,
    cue: "Push the ground behind you — angles first, turnover second.",
    why: "Acceleration and deceleration quality is the on-field expression of everything lifted.",
  },
  [
    { name: "Sled Push", equipment_requirements: ["sled"] },
    { name: "Backward Sled Drag", equipment_requirements: ["sled"] },
    { name: "Sled March", equipment_requirements: ["sled"] },
    { name: "Heavy Sled Explosive Start", equipment_requirements: ["sled"] },
    { name: "Resisted Acceleration", equipment_requirements: ["sled"] },
    { name: "Band Resisted Acceleration", equipment_requirements: ["bands"] },
    { name: "Band Assisted Acceleration", equipment_requirements: ["bands"] },
    { name: "Band Release Start", equipment_requirements: ["bands"] },
    "Half Kneeling Start",
    "Push Up Start",
    "Falling Start",
    { name: "Sprint To Backpedal", substitution_family: "change_of_direction" },
    { name: "Sprint Decelerate Sprint", substitution_family: "change_of_direction" },
    { name: "One Eighty Cut Sprint", substitution_family: "change_of_direction" },
    { name: "Backpedal", substitution_family: "change_of_direction" },
    { name: "Lateral Shuffle", substitution_family: "change_of_direction" },
    { name: "Build Up Sprint", substitution_family: "max_velocity" },
    { name: "Tempo Run Hundred Meter", substitution_family: "tempo" },
    { name: "Straight Leg Bound", substitution_family: "elastic_bound" },
    { name: "Hamstring Kick", substitution_family: "elastic_bound" },
    { name: "Rudimentary Skip", substitution_family: "elastic_bound" },
  ],
);

// ── mobility — foot-upward flow (ordered) ────────────────────────────────────
const MOBILITY_FLOW = build(
  "mobility_flow",
  {
    category: "mobility",
    movement_category: "mobility",
    dosage_unit: "seconds",
    equipment_requirements: [],
    cns_cost: 0,
    min_age_years: 12,
    min_training_age_years: 0,
    training_age_legality: AGE_ALL,
    in_season: true,
    recovery_window_hours: 24,
    cue: "Breathe into the stretch — never force the end range.",
    why: "Range you own is range you can use on the field.",
    game_day_legal: true,
  },
  [
    { name: "Plantar Fascia Release", equipment_requirements: ["lacrosse_ball"] },
    "Tibialis Stretch",
    "Single Leg Calf Stretch",
    { name: "Elephant Walk", dosage_unit: "reps" },
    "Single Leg Pike Stretch",
    "Double Leg Pike Stretch",
    "Ninety Ninety Hip Stretch",
    "Half Kneeling Hip Flexor Stretch",
    "Couch Stretch",
    "Frog Rock",
    "Tailors Pose",
    { name: "Butcher Block Stretch", equipment_requirements: ["bench"] },
    "T Stretch",
    "Cobra Stretch",
    { name: "Dead Hang", equipment_requirements: ["pull_up_bar"] },
  ],
);

const MOBILITY_WARMUP = build(
  "warmup_drill",
  {
    category: "mobility",
    movement_category: "mobility",
    dosage_unit: "reps",
    equipment_requirements: [],
    cns_cost: 0,
    min_age_years: 12,
    min_training_age_years: 0,
    training_age_legality: AGE_ALL,
    in_season: true,
    recovery_window_hours: 24,
    cue: "Move through the range with rhythm — this wakes the body up, it does not tire it.",
    why: "A warm-up that covers every joint is what makes the first rep as good as the last.",
    game_day_legal: true,
  },
  [
    "Lateral Leg Swing",
    "Forward Backward Leg Swing",
    "Arm Circle",
    "Reverse Arm Circle",
    "Trunk Twist",
    "Hip Circle",
    "Squat Toe Touch",
    "Frankenstein Walk",
    "Iron Cross",
    "Scorpion",
    "Leg Cradle",
    "Lunge With Elbow Tuck Rotation",
    "Lateral Lunge Switch",
    "All Fours T Spine Rotation",
    "Roll Back To Reach Through",
    "Cat Cow",
    { name: "Hurdle Step Over", equipment_requirements: ["hurdles"] },
    { name: "Lateral Hurdle Step Over", equipment_requirements: ["hurdles"] },
    { name: "Hurdle Over Under", equipment_requirements: ["hurdles"] },
    { name: "Hurdle Rhythm Walk", equipment_requirements: ["hurdles"] },
  ],
);

const MOBILITY_RELEASE = build(
  "stretch_release",
  {
    category: "mobility",
    movement_category: "mobility",
    dosage_unit: "seconds",
    equipment_requirements: [],
    cns_cost: 0,
    min_age_years: 12,
    min_training_age_years: 0,
    training_age_legality: AGE_ALL,
    in_season: true,
    recovery_window_hours: 24,
    cue: "Long, easy breaths — soften into it rather than pushing.",
    why: "Soft-tissue and end-range work keeps a season's worth of stiffness from stacking up.",
    game_day_legal: true,
  },
  [
    "Standing Pancake",
    "Long Lunge",
    "Standing Groin Stretch",
    { name: "Incline Pigeon Pose", equipment_requirements: ["bench"] },
    { name: "Weighted Pigeon Pose", equipment_requirements: ["plate"] },
    { name: "Weighted Butterfly Stretch", equipment_requirements: ["plate"] },
    { name: "Elevated Pigeon Stretch", equipment_requirements: ["bench"] },
    "Bretzel Stretch",
    "Thread The Needle",
    "Childs Pose",
    "Doorway Pec Stretch",
    "Kneeling Achilles Stretch",
    "Wall Ankle Mobilization",
    "Overhead Wall Slide",
    { name: "Lat Foam Roll", equipment_requirements: ["foam_roller"] },
    { name: "Thoracic Foam Roll", equipment_requirements: ["foam_roller"] },
    { name: "Teres Ball Release", equipment_requirements: ["lacrosse_ball"] },
    "Median Nerve Glide",
    "Ulnar Nerve Glide",
    "Brachial Plexus Glide",
    { name: "Slant Board Calf Stretch", equipment_requirements: ["slant_board"] },
    { name: "Slant Board Hamstring Stretch", equipment_requirements: ["slant_board"] },
    { name: "Table Slide", equipment_requirements: ["bench"] },
    { name: "Towel Sleeper Stretch", equipment_requirements: ["towel"] },
    { name: "Mini Band Clamshell", equipment_requirements: ["mini_bands"], dosage_unit: "reps" },
    { name: "Lateral Band Walk", equipment_requirements: ["mini_bands"], dosage_unit: "reps" },
    { name: "Monster Walk", equipment_requirements: ["mini_bands"], dosage_unit: "reps" },
    { name: "Seated Hip CARs", dosage_unit: "reps" },
  ],
);

export const APPENDIX_A: MovementRow[] = [
  ...COMPOUND_LOWER,
  ...STARTING_STRENGTH,
  ...SINGLE_LEG,
  ...POSTERIOR,
  ...FOOT_ANKLE,
  ...UPPER_PUSH,
  ...UPPER_PULL,
  ...ARM_CARE,
  ...CORE_BW,
  ...CORE_LOADED,
  ...CARRY,
  ...JUMPS,
  ...ROTATION,
  ...SPEED,
  ...MOBILITY_FLOW,
  ...MOBILITY_WARMUP,
  ...MOBILITY_RELEASE,
];

/** Appendix D — athlete-facing display renames. Slugs never change. */
export const APPENDIX_D_RENAMES: Array<{ match: RegExp; to: string }> = [
  { match: /\batg\b.*split squat/i, to: "Deep Range Split Squat" },
  { match: /\bkot\b.*calf raise/i, to: "Knee Forward Calf Raise" },
  { match: /\brokp\b/i, to: "Backward Sled Drag" },
  { match: /patrick step/i, to: "Short Range Knee Step Down" },
  { match: /poliquin step/i, to: "Backward Step Down Heel Elevated" },
  { match: /monkeyfoot/i, to: "Strap Loaded Hip Flexor Raise" },
  { match: /prowler explode/i, to: "Heavy Sled Explosive Start" },
];
