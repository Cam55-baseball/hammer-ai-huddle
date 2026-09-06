/**
 * Weight-Room Standards Catalog — v1
 *
 * The roadmap's north star: what "elite" actually looks like under a barbell,
 * on a sled, and in a rotational throw — expressed as tiered, athlete-earnable
 * marks rather than as any one coach's or company's branded program.
 *
 * Doctrine (see docs/wic/weight-room-standards-v1.md):
 *   - Standards are DISPLAY + TARGET only. They never author a dose. Every set
 *     and rep still comes exclusively from the dosage doctrine.
 *   - Tiers are difficulty ladders, not gates. Nothing is withheld because a
 *     standard is unmet, and no standard is specialized to one discipline.
 *   - Self-logged. A logged set that meets the mark unlocks the tag; near
 *     misses are acknowledged so the athlete sees the climb.
 *   - Safety first: chronological floor of 14, plus a training-age floor on
 *     every loaded mark. Youth see the bodyweight ladder only.
 *   - Attribution stays internal. Athlete-facing copy never names outside
 *     programs, coaches or companies.
 */

export type StandardTier = "standard" | "elite" | "world_class";

export const TIER_ORDER: readonly StandardTier[] = ["standard", "elite", "world_class"];

export const TIER_LABEL: Record<StandardTier, string> = {
  standard: "Standard",
  elite: "Elite",
  world_class: "World Class",
};

export const TIER_BLURB: Record<StandardTier, string> = {
  standard: "The mark a well-trained athlete should own.",
  elite: "The mark that separates you inside a strong room.",
  world_class: "The mark almost nobody holds. This is the ceiling we chase.",
};

/** Mirrors the canonical classes in src/lib/wic/trainingAge.ts. */
export type TrainingAgeClass =
  | "beginner"
  | "developing"
  | "intermediate"
  | "advanced"
  | "elite"
  | "professional";

const TA_RANK: Record<TrainingAgeClass, number> = {
  beginner: 0,
  developing: 1,
  intermediate: 2,
  advanced: 3,
  elite: 4,
  professional: 5,
};

export function trainingAgeMeets(actual: string | null, required: TrainingAgeClass): boolean {
  const a = (actual ?? "beginner") as TrainingAgeClass;
  return (TA_RANK[a] ?? 0) >= TA_RANK[required];
}

export type StandardFamily =
  | "joint_armor"
  | "posterior_armor"
  | "relative_strength"
  | "rotational_power"
  | "arm_speed";

export interface FamilyDef {
  id: StandardFamily;
  name: string;
  tagline: string;
  /** Why this family exists — the transfer thesis we are testing over time. */
  thesis: string;
}

export const FAMILIES: readonly FamilyDef[] = [
  {
    id: "joint_armor",
    name: "Joint Armor",
    tagline: "Knees, ankles and hips that don't quit.",
    thesis:
      "Full-range knee and ankle capacity is the cheapest injury insurance in sport and the base every later power mark is built on. We track it first because it is the one ladder every athlete, at every age, can climb safely.",
  },
  {
    id: "posterior_armor",
    name: "Posterior Armor",
    tagline: "Hamstrings, spine and hips built to brake.",
    thesis:
      "Sprinting, decelerating and rotating are braking problems before they are pushing problems. Eccentric posterior capacity is the mark that most separates athletes who stay on the field.",
  },
  {
    id: "relative_strength",
    name: "Relative Strength",
    tagline: "Strength per pound — the number that actually travels.",
    thesis:
      "Absolute strength stops correlating with on-field output early. Strength relative to bodyweight keeps correlating. The combined-lift ladder is our headline mark for this reason.",
  },
  {
    id: "rotational_power",
    name: "Rotational Power",
    tagline: "The turn that becomes bat speed.",
    thesis:
      "Rotational output is the closest weight-room proxy we have for bat speed. We track it separately so hitters own a ladder of their own instead of borrowing the arm's.",
  },
  {
    id: "arm_speed",
    name: "Arm Speed Base",
    tagline: "The physical floor under a big arm.",
    thesis:
      "No lift throws a baseball. But the athletes who reach the top velocity bands almost never fail these physical marks first. We track the base and the velocity band side by side so we can measure, honestly, how much of it really transfers.",
  },
];

export type StandardMetric =
  /** load as a % of bodyweight, achieved for at least `reps` reps in one set */
  | "load_pct_bw_at_reps"
  /** bodyweight reps in a single set */
  | "reps"
  /** hold time in seconds */
  | "seconds"
  /** distance in feet */
  | "distance_ft"
  /** speed in mph read from the canonical log metric */
  | "mph"
  /** sum of the best top-set loads across `slugs`, as a % of bodyweight */
  | "combined_pct_bw";

export interface StandardDef {
  id: string;
  family: StandardFamily;
  name: string;
  /** One-line, athlete-facing definition of the mark. */
  definition: string;
  /** Why this mark matters — no outside program or coach is ever named. */
  why: string;
  /** Safety framing shown alongside the target. */
  safety: string;
  slugs: readonly string[];
  metric: StandardMetric;
  /** Required reps for load-based marks. */
  reps?: number;
  /** Canonical metric key on the log row (mph marks only). */
  metricKey?: "throw_velo_mph" | "bat_speed_mph";
  /**
   * Med-ball marks are entered per implement weight. When set, only throws
   * logged with that implement count toward the mark. Entry stays optional and
   * the mark stays visible — but no award is possible without a number.
   */
  implementLbs?: number;
  /** Loaded marks require a training-age floor. */
  minTrainingAge: TrainingAgeClass;
  /** Chronological floor. Bodyweight ladders sit at 14, loaded ones higher. */
  minAgeYears: number;
  /** Tier targets in the metric's unit. */
  targets: Record<StandardTier, number>;
  unit: string;
  /** Internal-only provenance. Never rendered to athletes. */
  internalProvenance: string;
}

/**
 * Every loaded mark is a percentage of bodyweight, and bodyweight is capped at
 * 265 lb for the calculation. Above that the ladder would start rewarding mass
 * for its own sake, which is the opposite of what these marks are for.
 */
export const STANDARDS_BW_CAP_LBS = 265;

export function effectiveBodyweight(bw: number | null | undefined): number | null {
  if (typeof bw !== "number" || !Number.isFinite(bw) || bw <= 0) return null;
  return Math.min(bw, STANDARDS_BW_CAP_LBS);
}

/**
 * Athlete-facing framing required on every standards surface: these are
 * targets seeded from widely used field benchmarks, not marks validated on
 * Hammers athletes.
 */
export const STANDARDS_TARGET_DISCLAIMER =
  "A target seeded from field benchmarks — not yet validated on Hammers athletes.";

  /** Internal-only provenance. Never rendered to athletes. */
  internalProvenance: string;
}

/**
 * Loaded marks are expressed as % of bodyweight so that the ladder scales with
 * the athlete instead of rewarding mass for its own sake.
 */
export const STANDARDS: readonly StandardDef[] = [
  // ---------------------------------------------------------------- joint armor
  {
    id: "ja_split_squat",
    family: "joint_armor",
    name: "Full-Range Split Squat",
    definition: "Dumbbells at a set % of bodyweight per hand, back knee to the floor, front heel down.",
    why: "Full knee flexion under load is the single best predictor we have of an athlete who can decelerate hard and land clean at the end of a long season.",
    safety: "Earn depth before load. Never chase the number with a heel that leaves the floor.",
    slugs: ["kot_atg_split_squat", "lift_atg_split_squat", "atg_split_squat", "sp_atg_split_squat"],
    metric: "load_pct_bw_at_reps",
    reps: 5,
    minTrainingAge: "developing",
    minAgeYears: 14,
    targets: { standard: 15, elite: 25, world_class: 40 },
    unit: "% BW per hand",
    internalProvenance: "ATG/KOT split squat standard — 25% BW per hand flat ground.",
  },
  {
    id: "ja_patrick_step",
    family: "joint_armor",
    name: "Deep Knee Step",
    definition: "Consecutive controlled reps to full ankle bend, bodyweight only.",
    why: "Knee-over-toe control at end range is what keeps the front leg from collapsing on a hard plant.",
    safety: "Bodyweight only. Stop the set the moment the knee wobbles off its track.",
    slugs: ["lift_patrick_step", "poliquin_step_up", "box_step_up"],
    metric: "reps",
    minTrainingAge: "beginner",
    minAgeYears: 14,
    targets: { standard: 15, elite: 25, world_class: 40 },
    unit: "reps",
    internalProvenance: "ATG Patrick step standard — 25 consecutive reps to full ankle bend.",
  },
  {
    id: "ja_tib_raise",
    family: "joint_armor",
    name: "Tibialis Raise",
    definition: "Consecutive reps with a two-second pause top and bottom.",
    why: "The front of the shin is the brake for every stop, cut and slide. It is also the most commonly untrained tissue in baseball and softball.",
    safety: "Pure bodyweight ladder. Add load only after 25 clean paused reps.",
    slugs: ["lift_tib_raise"],
    metric: "reps",
    minTrainingAge: "beginner",
    minAgeYears: 14,
    targets: { standard: 15, elite: 25, world_class: 40 },
    unit: "reps",
    internalProvenance: "ATG standing tibialis raise standard — 25 paused reps.",
  },
  {
    id: "ja_sissy_squat",
    family: "joint_armor",
    name: "Shins-Parallel Squat",
    definition: "Bodyweight reps with the shins driven to parallel with the floor.",
    why: "The deepest knee-extensor position we train. Owning it means the quad can protect the joint where it is most vulnerable.",
    safety: "Bodyweight only, always. Never load this mark.",
    slugs: ["lift_kot_sissy_squat", "sissy_squat", "reverse_nordic", "kot_reverse_nordic", "lift_reverse_nordic"],
    metric: "reps",
    minTrainingAge: "developing",
    minAgeYears: 14,
    targets: { standard: 10, elite: 20, world_class: 30 },
    unit: "reps",
    internalProvenance: "ATG sissy squat standard — 20 bodyweight reps, shins parallel.",
  },
  {
    id: "ja_backward_sled",
    family: "joint_armor",
    name: "Backward Sled Drag",
    definition: "Sled loaded to a set % of bodyweight, dragged with rhythm for distance.",
    why: "The best knee-friendly conditioning we have — it builds the quad and the aerobic base without a single eccentric contraction to recover from.",
    safety: "The goal is burn, not max weight. If rhythm breaks, the load is wrong.",
    slugs: ["kot_backward_sled_drag", "lift_sled_backward", "kot_sled_drag", "sp_backwards_sled", "resisted_sled"],
    metric: "load_pct_bw_at_reps",
    reps: 1,
    minTrainingAge: "beginner",
    minAgeYears: 14,
    targets: { standard: 30, elite: 50, world_class: 75 },
    unit: "% BW on sled",
    internalProvenance: "ATG reverse sled pull standard — 50% BW over ~40m.",
  },
  {
    id: "ja_calf_raise",
    family: "joint_armor",
    name: "Single-Leg Calf Raise",
    definition: "One dumbbell at a set % of bodyweight, full range, one leg.",
    why: "Ankle stiffness is the last thing between force and the ground. Weak calves leak every ounce of it.",
    safety: "Full range, no bouncing at the bottom.",
    slugs: ["lift_kot_calf_raise", "full_rom_calf", "wu_calf_softball_pin"],
    metric: "load_pct_bw_at_reps",
    reps: 10,
    minTrainingAge: "developing",
    minAgeYears: 14,
    targets: { standard: 15, elite: 25, world_class: 40 },
    unit: "% BW",
    internalProvenance: "ATG single-leg calf raise standard — 25% BW for 10 reps.",
  },

  // ------------------------------------------------------------ posterior armor
  {
    id: "pa_nordic",
    family: "posterior_armor",
    name: "Nordic Hamstring Lower",
    definition: "Reps with a four-second lower and a one-second pause at the bottom before driving up.",
    why: "The most direct eccentric hamstring mark that exists — and hamstrings are the most common non-contact injury in both sports.",
    safety: "Add reps before you add speed. Never let the lower turn into a fall.",
    slugs: ["kot_nordic_hamstring", "nordic_curl", "lift_nordic_curl_ecc", "sp_nordic_hamstring"],
    metric: "reps",
    minTrainingAge: "developing",
    minAgeYears: 14,
    targets: { standard: 5, elite: 10, world_class: 15 },
    unit: "reps",
    internalProvenance: "ATG Nordic standard — 10 reps, 4s eccentric, 1s pause.",
  },
  {
    id: "pa_jefferson_curl",
    family: "posterior_armor",
    name: "Loaded Spinal Flexion",
    definition: "Segmented reps at a set % of bodyweight, wrists finishing below the toes.",
    why: "A spine that can load through flexion is a spine that tolerates the awkward positions the game forces on you.",
    safety: "Light and slow, forever. This mark is earned in millimetres, not pounds.",
    slugs: ["kot_jefferson_curl", "lift_jefferson_curl"],
    metric: "load_pct_bw_at_reps",
    reps: 10,
    minTrainingAge: "advanced",
    minAgeYears: 16,
    targets: { standard: 10, elite: 25, world_class: 40 },
    unit: "% BW",
    internalProvenance: "ATG Jefferson curl standard — 25% BW for 10 reps.",
  },
  {
    id: "pa_rdl",
    family: "posterior_armor",
    name: "Hinge Standard",
    definition: "Barbell hinge at a set % of bodyweight for 10 reps, back flat to parallel.",
    why: "Your hinge is your engine. Every throw, swing and sprint is paid for by the back of the body.",
    safety: "Rounding ends the set. Position first, always.",
    slugs: ["rdl_concentric", "rdl_double_ecc", "lift_rdl_cluster", "lift_snatch_grip_rdl", "summers_snatch_grip_rdl", "rdl_db"],
    metric: "load_pct_bw_at_reps",
    reps: 10,
    minTrainingAge: "developing",
    minAgeYears: 15,
    targets: { standard: 60, elite: 100, world_class: 140 },
    unit: "% BW",
    internalProvenance: "ATG RDL standard — 100% BW x10, back parallel.",
  },
  {
    id: "pa_seated_good_morning",
    family: "posterior_armor",
    name: "Seated Hinge",
    definition: "Bar on the back at a set % of bodyweight, abs to the bench, no lower-back rounding.",
    why: "Removes the legs from the equation and tests the spinal erectors on their own — the tissue that holds posture together late in a game.",
    safety: "The bench is the depth gauge. If the back rounds, you are done.",
    slugs: ["kot_seated_good_morning", "lift_ssb_good_morning", "ws_seated_band_good_morning"],
    metric: "load_pct_bw_at_reps",
    reps: 5,
    minTrainingAge: "advanced",
    minAgeYears: 16,
    targets: { standard: 25, elite: 50, world_class: 75 },
    unit: "% BW",
    internalProvenance: "ATG seated good morning standard — 50% BW, thighs parallel.",
  },

  // ---------------------------------------------------------- relative strength
  {
    id: "rs_trap_bar_pull",
    family: "relative_strength",
    name: "Trap-Bar Pull",
    definition: "Best top-set load as a multiple of bodyweight.",
    why: "The safest heavy pull we program, and the one that tracks most cleanly with ground force at the plate and off the mound.",
    safety: "Never a max attempt on a fatigued day. The dosage doctrine still owns your sets and reps.",
    slugs: ["summers_trap_bar_deadlift", "trap_bar_dl_double_ecc", "lift_chain_deadlift", "lift_band_deadlift", "lift_deficit_deadlift"],
    metric: "load_pct_bw_at_reps",
    reps: 1,
    minTrainingAge: "advanced",
    minAgeYears: 16,
    targets: { standard: 175, elite: 225, world_class: 275 },
    unit: "% BW",
    internalProvenance: "Common velocity-development pull benchmarks (2x BW elite band).",
  },
  {
    id: "rs_squat",
    family: "relative_strength",
    name: "Squat Standard",
    definition: "Best top-set squat load as a multiple of bodyweight.",
    why: "Still the cleanest measure of lower-body force production we can compare across an entire roster.",
    safety: "Depth and bar path before number. Loaded tiers open with training age, not birthday.",
    slugs: ["lift_safety_bar_squat", "lift_box_squat_wide", "ws_max_effort_box_squat", "safety_bar_box_squat", "lift_paused_front_squat", "lift_tempo_back_squat", "summers_zercher_squat"],
    metric: "load_pct_bw_at_reps",
    reps: 1,
    minTrainingAge: "advanced",
    minAgeYears: 16,
    targets: { standard: 125, elite: 175, world_class: 225 },
    unit: "% BW",
    internalProvenance: "Velocity-program squat bands (1.75x elite, 2x+ world class).",
  },
  {
    id: "rs_press",
    family: "relative_strength",
    name: "Press Standard",
    definition: "Best top-set horizontal press as a multiple of bodyweight.",
    why: "Upper-body force matters less than the pull, but a press far behind the squat is a balance flag we want visible.",
    safety: "Pull volume stays ahead of press volume for throwers. Always.",
    slugs: ["bench_press_concentric", "bench_press_double_ecc", "summers_pause_bench", "ws_max_effort_bench_board", "lift_swiss_bar_bench", "db_bench"],
    metric: "load_pct_bw_at_reps",
    reps: 1,
    minTrainingAge: "advanced",
    minAgeYears: 16,
    targets: { standard: 90, elite: 125, world_class: 150 },
    unit: "% BW",
    internalProvenance: "Velocity-program press bands (1.25x elite).",
  },
  {
    id: "rs_combined_ladder",
    family: "relative_strength",
    name: "Combined Strength Ladder",
    definition: "Squat plus pull plus press, added together, as a multiple of bodyweight.",
    why: "Our headline mark. One number that says how much force you own per pound you carry — and the number we correlate hardest against on-field output.",
    safety: "Built from lifts you already logged. Nothing here asks you to test on a day the plan says recover.",
    slugs: [
      "lift_safety_bar_squat", "lift_box_squat_wide", "ws_max_effort_box_squat", "safety_bar_box_squat", "lift_paused_front_squat", "summers_zercher_squat",
      "summers_trap_bar_deadlift", "trap_bar_dl_double_ecc", "lift_chain_deadlift", "lift_band_deadlift", "lift_deficit_deadlift",
      "bench_press_concentric", "bench_press_double_ecc", "summers_pause_bench", "ws_max_effort_bench_board", "lift_swiss_bar_bench",
    ],
    metric: "combined_pct_bw",
    minTrainingAge: "advanced",
    minAgeYears: 16,
    targets: { standard: 400, elite: 500, world_class: 600 },
    unit: "% BW combined",
    internalProvenance: "3x bodyweight combined-lift velocity benchmark (Top Velocity style).",
  },

  // ---------------------------------------------------------- rotational power
  {
    id: "rp_shot_put",
    family: "rotational_power",
    name: "Rotational Throw Distance",
    definition: "Best med-ball rotational throw distance.",
    why: "The closest weight-room proxy to bat speed we can measure without a bat in your hands.",
    safety: "Warm hips first. This is a max-intent mark, so it belongs early in a session, never at the end.",
    slugs: ["med_ball_shot_put", "wu_med_ball_shot_put", "dl_med_ball_shotput", "med_ball_scoop_toss", "wu_med_ball_scoop_toss", "heenan_rotational_med_ball_scoop"],
    metric: "distance_ft",
    minTrainingAge: "beginner",
    minAgeYears: 14,
    targets: { standard: 30, elite: 42, world_class: 55 },
    unit: "ft",
    internalProvenance: "Rotational med-ball distance bands used across pro hitting programs.",
  },
  // Med-ball marks are entered per implement weight — a 55-foot throw with a
  // 4 lb ball and a 55-foot throw with a 10 lb ball are not the same mark.
  // Every implement stays visible whether or not the athlete has logged one;
  // entry is optional, and no award is possible without a number.
  {
    id: "rp_shot_put_6lb",
    family: "rotational_power",
    name: "Rotational Throw — 6 lb Ball",
    definition: "Best rotational throw distance with a 6 lb med ball.",
    why: "The implement decides the mark. Six pounds is the standard rotational testing ball.",
    safety: "Warm hips first. Max-intent throws belong early in a session, never at the end.",
    slugs: ["med_ball_shot_put", "wu_med_ball_shot_put", "dl_med_ball_shotput", "med_ball_scoop_toss", "wu_med_ball_scoop_toss", "heenan_rotational_med_ball_scoop"],
    metric: "distance_ft",
    implementLbs: 6,
    minTrainingAge: "beginner",
    minAgeYears: 14,
    targets: { standard: 30, elite: 42, world_class: 55 },
    unit: "ft (6 lb)",
    internalProvenance: "Rotational med-ball distance bands, 6 lb implement.",
  },
  {
    id: "rp_shot_put_4lb",
    family: "rotational_power",
    name: "Rotational Throw — 4 lb Ball",
    definition: "Best rotational throw distance with a 4 lb med ball.",
    why: "The lighter ball reads speed rather than force, so it moves first when rotational velocity improves.",
    safety: "Warm hips first. Max-intent throws belong early in a session, never at the end.",
    slugs: ["med_ball_shot_put", "wu_med_ball_shot_put", "dl_med_ball_shotput", "med_ball_scoop_toss", "wu_med_ball_scoop_toss", "heenan_rotational_med_ball_scoop"],
    metric: "distance_ft",
    implementLbs: 4,
    minTrainingAge: "beginner",
    minAgeYears: 14,
    targets: { standard: 36, elite: 50, world_class: 65 },
    unit: "ft (4 lb)",
    internalProvenance: "Rotational med-ball distance bands, 4 lb implement.",
  },
  {
    id: "rp_shot_put_10lb",
    family: "rotational_power",
    name: "Rotational Throw — 10 lb Ball",
    definition: "Best rotational throw distance with a 10 lb med ball.",
    why: "The heavy ball reads force. Held beside the light ball, the pair says whether you are strong, fast, or both.",
    safety: "Warm hips first. Max-intent throws belong early in a session, never at the end.",
    slugs: ["med_ball_shot_put", "wu_med_ball_shot_put", "dl_med_ball_shotput", "med_ball_scoop_toss", "wu_med_ball_scoop_toss", "heenan_rotational_med_ball_scoop"],
    metric: "distance_ft",
    implementLbs: 10,
    minTrainingAge: "developing",
    minAgeYears: 14,
    targets: { standard: 22, elite: 32, world_class: 42 },
    unit: "ft (10 lb)",
    internalProvenance: "Rotational med-ball distance bands, 10 lb implement.",
  },

  {
    id: "rp_bat_speed",
    family: "rotational_power",
    name: "Bat Speed Band",
    definition: "Best logged bat speed.",
    why: "The output the rotational ladder is trying to buy. Tracked beside it so we can see, athlete by athlete, whether the transfer is real.",
    safety: "Bat speed is chased in the cage, not in the weight room. No lift target is allowed to change your swing dose.",
    slugs: [],
    metric: "mph",
    metricKey: "bat_speed_mph",
    minTrainingAge: "beginner",
    minAgeYears: 14,
    targets: { standard: 65, elite: 75, world_class: 85 },
    unit: "mph",
    internalProvenance: "Bat speed bands: HS avg ~65, college/pro ~75, elite pro ~85.",
  },

  // --------------------------------------------------------------- arm speed
  {
    id: "as_throw_velocity",
    family: "arm_speed",
    name: "Throwing Velocity Band",
    definition: "Best logged throwing velocity.",
    why: "The outcome, not the cause. Kept alongside the physical base so we can measure how much of the weight room actually shows up on the radar gun.",
    safety: "Velocity is earned inside the arm-care and pitch-count doctrine. No standard ever unlocks extra throws.",
    slugs: [],
    metric: "mph",
    metricKey: "throw_velo_mph",
    minTrainingAge: "beginner",
    minAgeYears: 14,
    targets: { standard: 80, elite: 90, world_class: 100 },
    unit: "mph",
    internalProvenance: "90mph / 100mph formula outcome bands.",
  },
  {
    id: "as_power_base",
    family: "arm_speed",
    name: "Explosive Base",
    definition: "Best broad jump distance.",
    why: "Horizontal power is the physical trait that shows up most consistently underneath the highest velocity bands. It is a base, not a promise.",
    safety: "Jump fresh or not at all. A tired jump measures fatigue, not power.",
    slugs: ["sp_continuous_broad", "wu_broad_jump_prep", "bs_broad_jump_to_swing", "pap_trap_dl_to_broad_jump"],
    metric: "distance_ft",
    minTrainingAge: "developing",
    minAgeYears: 14,
    targets: { standard: 8, elite: 9.5, world_class: 10.5 },
    unit: "ft",
    internalProvenance: "Broad jump bands underneath 90/100mph formulas.",
  },
] as const;

export function standardById(id: string): StandardDef | undefined {
  return STANDARDS.find((s) => s.id === id);
}

export function standardsForFamily(f: StandardFamily): StandardDef[] {
  return STANDARDS.filter((s) => s.family === f);
}
