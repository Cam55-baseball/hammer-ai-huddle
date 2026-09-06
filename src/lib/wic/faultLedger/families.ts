/**
 * Fault families — the ten things that actually go wrong, and the ladder of
 * movements that address each one.
 *
 * Doctrine notes:
 *  - A family is a *problem*, never a slot and never a movement category. It
 *    does not author a dose. It only decides *which* movement a swap or a
 *    corrective reaches for.
 *  - Every ladder starts at tier 0: something the athlete can do with nothing
 *    at all, legal in every season phase, legal at 14. If tier 0 is missing the
 *    family is unreachable for the athlete who needs it most, so
 *    `scripts/check-family-coverage.ts` fails the build.
 *  - Tiers climb by equipment, never by risk-for-its-own-sake:
 *      0 nothing · 1 household/wall/floor/band · 2 dumbbells & basic gear
 *      · 3 full gym (cable, specialty bar, machine).
 *
 * Every slug below is a live, active `wk_movement_catalog` row. Slugs are
 * frozen: rename the display name, never the slug.
 */

export type FaultFamilyId =
  | "first_step_capacity"
  | "deceleration_base"
  | "posterior_braking"
  | "ankle_and_depth"
  | "back_leg_block"
  | "arm_health"
  | "rotational_output"
  | "landing_and_elastic"
  | "trunk_transfer"
  | "grip_and_forearm";

export type EquipmentTier = 0 | 1 | 2 | 3;

export interface FamilyRung {
  /** Frozen `wk_movement_catalog.slug`. */
  readonly slug: string;
  readonly tier: EquipmentTier;
}

export interface FaultFamily {
  readonly id: FaultFamilyId;
  /** Plain words. This is what the athlete reads, not the id. */
  readonly label: string;
  /** What the athlete would actually say when this is the problem. */
  readonly plain: string;
  /** Root pattern ids that collapse into this family. */
  readonly rootPatterns: readonly string[];
  /** What athletes commonly report while doing this work. */
  readonly troubleshooting: readonly string[];
  /** Least gear first. Never empty at tier 0. */
  readonly ladder: readonly FamilyRung[];
}

export const FAULT_FAMILIES: readonly FaultFamily[] = [
  {
    id: "first_step_capacity",
    label: "First step",
    plain: "You are slow out of the box — the first two steps cost you, not the top speed.",
    rootPatterns: ["slow_first_step", "weak_hip_flexion", "late_acceleration"],
    troubleshooting: ["cramps in the front of the hip", "lower back takes over", "can't stay tall"],
    ladder: [
      { slug: "wu_split_stance_iso_hold", tier: 0 },
      { slug: "cressey_hip_lift_march", tier: 1 },
      { slug: "hanging_knee_raise", tier: 2 },
      { slug: "garhammer_raise", tier: 2 },
      { slug: "low_cable_hip_flexor_pull_in", tier: 3 },
      { slug: "strap_loaded_hip_flexor_raise", tier: 3 },
    ],
  },
  {
    id: "deceleration_base",
    label: "Stopping and changing direction",
    plain: "You can get going, but slowing down and re-planting is where you lose ground.",
    rootPatterns: ["poor_deceleration", "shin_splints_history", "weak_lower_leg"],
    troubleshooting: ["burning in the front of the shin", "calves cramp", "heels come up"],
    ladder: [
      { slug: "tibialis_raise", tier: 0 },
      { slug: "straight_leg_calf_raise", tier: 1 },
      { slug: "seated_tibialis_raise", tier: 1 },
      { slug: "seated_calf_raise", tier: 2 },
      { slug: "single_leg_calf_raise_off_block", tier: 2 },
      { slug: "slant_board_calf_raise", tier: 2 },
      { slug: "kot_tibialis_raise", tier: 3 },
    ],
  },
  {
    id: "posterior_braking",
    label: "Hamstring braking",
    plain: "The back of your leg has to catch you at speed, and right now it can't.",
    rootPatterns: ["hamstring_strain_risk", "weak_posterior_chain", "poor_eccentric_control"],
    troubleshooting: ["hamstring cramps immediately", "can't control the way down", "back arches"],
    ladder: [
      { slug: "reverse_nordic", tier: 0 },
      { slug: "sp_nordic_hamstring", tier: 1 },
      { slug: "nordic_curl", tier: 2 },
      { slug: "single_leg_back_extension", tier: 3 },
      { slug: "ws_reverse_hyper", tier: 3 },
      { slug: "lift_nordic_curl_ecc", tier: 3 },
    ],
  },
  {
    id: "ankle_and_depth",
    label: "Ankles and depth",
    plain: "Your ankle won't let the knee travel, so everything above it gets squeezed.",
    rootPatterns: ["limited_ankle_dorsiflexion", "shallow_squat_depth", "knee_pain_anterior"],
    troubleshooting: ["heel lifts off the floor", "pinch in the front of the ankle", "knees ache after"],
    ladder: [
      { slug: "kneeling_ankle_rocks", tier: 0 },
      { slug: "wall_ankle_mobilization", tier: 1 },
      { slug: "kot_elephant_walks", tier: 1 },
      { slug: "atg_split_squat", tier: 1 },
      { slug: "kot_atg_split_squat", tier: 2 },
      { slug: "kot_slantboard_squat", tier: 3 },
    ],
  },
  {
    id: "back_leg_block",
    label: "Back leg and groin",
    plain: "The back leg has to hold and block. When the groin is weak it slides instead.",
    rootPatterns: ["groin_strain_risk", "weak_adductors", "back_leg_collapse"],
    troubleshooting: ["groin grabs", "inside of the knee aches", "hip pinches at the bottom"],
    ladder: [
      { slug: "wu_copenhagen_short_lever", tier: 0 },
      { slug: "standing_groin_stretch", tier: 1 },
      { slug: "cossack_squat", tier: 1 },
      { slug: "weighted_butterfly_stretch", tier: 2 },
      { slug: "dumbbell_lateral_lunge", tier: 2 },
      { slug: "barbell_lateral_lunge", tier: 3 },
    ],
  },
  {
    id: "arm_health",
    label: "Arm health",
    plain: "The shoulder blade isn't doing its share, so the arm pays for it.",
    rootPatterns: ["shoulder_pain", "poor_scap_control", "arm_fatigue_high"],
    troubleshooting: ["front of the shoulder pinches", "neck takes over", "arm dead the next day"],
    ladder: [
      { slug: "wu_scapular_cars", tier: 0 },
      { slug: "ac_cressey_wall_slide", tier: 1 },
      { slug: "ac_xband_pull_apart", tier: 1 },
      { slug: "ac_jobes_side_lying_er", tier: 2 },
      { slug: "ac_jobes_prone_ytw", tier: 2 },
      { slug: "powell_raise", tier: 2 },
    ],
  },
  {
    id: "rotational_output",
    label: "Turning power",
    plain: "You turn, but nothing leaves the ground with it — the hips and chest go together.",
    rootPatterns: ["poor_hip_shoulder_separation", "low_rotational_power", "arm_only_swing"],
    troubleshooting: ["all arms, no legs", "lower back sore after", "front side flies open"],
    ladder: [
      { slug: "bs_deep_hip_load", tier: 0 },
      { slug: "bs_side_plank_rot_reach", tier: 1 },
      { slug: "wu_medball_rot_toss_wall", tier: 1 },
      { slug: "medicine_ball_scoop_toss", tier: 2 },
      { slug: "medicine_ball_shot_put_throw", tier: 2 },
      { slug: "wide_stance_cable_rotation", tier: 3 },
      { slug: "bs_landmine_rotational_punch", tier: 3 },
    ],
  },
  {
    id: "landing_and_elastic",
    label: "Landing and bounce",
    plain: "You land heavy. Springy athletes get the ground back; you absorb it and stop.",
    rootPatterns: ["poor_landing_mechanics", "low_reactive_strength", "heavy_footed"],
    troubleshooting: ["loud landings", "knees cave in", "calves sore for days"],
    ladder: [
      { slug: "wu_pogo_double", tier: 0 },
      { slug: "sp_pogo_single", tier: 1 },
      { slug: "hurdle_jump", tier: 2 },
      { slug: "altitude_landing", tier: 2 },
      { slug: "depth_drop_to_broad_jump", tier: 3 },
    ],
  },
  {
    id: "trunk_transfer",
    label: "Middle of the body",
    plain: "Power made by the legs leaks before it reaches the ball because the middle gives.",
    rootPatterns: ["energy_leak_trunk", "poor_anti_rotation", "weak_bracing"],
    troubleshooting: ["lower back does the work", "ribs flare", "can't breathe and brace"],
    ladder: [
      { slug: "wu_pallof_press_iso", tier: 0 },
      { slug: "heenan_dead_bug_reach", tier: 1 },
      { slug: "bird_dog", tier: 1 },
      { slug: "four_way_plank", tier: 1 },
      { slug: "kneeling_ab_rollout", tier: 2 },
      { slug: "lift_hk_pallof_iso", tier: 3 },
    ],
  },
  {
    id: "grip_and_forearm",
    label: "Hands and forearms",
    plain: "The bat or the ball is heavier at the end of the day than at the start.",
    rootPatterns: ["weak_grip", "forearm_fatigue", "late_bat_control"],
    troubleshooting: ["hands give out first", "elbow gets sore", "forearms pump up"],
    ladder: [
      { slug: "wu_forearm_pump", tier: 0 },
      { slug: "dead_hang", tier: 1 },
      { slug: "plate_pinch", tier: 1 },
      { slug: "lift_farmer_carry", tier: 2 },
      { slug: "offset_farmer_carry", tier: 2 },
      { slug: "wrist_roller", tier: 3 },
    ],
  },
];

export const FAMILY_BY_ID: Readonly<Record<FaultFamilyId, FaultFamily>> = Object.fromEntries(
  FAULT_FAMILIES.map((f) => [f.id, f]),
) as Record<FaultFamilyId, FaultFamily>;

/** Which family owns a root pattern, if any. */
export function familyForRootPattern(rootPatternId: string): FaultFamily | null {
  return FAULT_FAMILIES.find((f) => f.rootPatterns.includes(rootPatternId)) ?? null;
}

/** Which family a movement belongs to, if any. */
export function familyForSlug(slug: string): FaultFamily | null {
  return FAULT_FAMILIES.find((f) => f.ladder.some((r) => r.slug === slug)) ?? null;
}

/**
 * Same-family alternatives at or below the athlete's available equipment tier,
 * least gear first. Used by the swap control: "can't do this one" hands back a
 * movement that fixes the same problem, never a random substitute.
 */
export function laddersAtOrBelow(
  family: FaultFamily,
  tier: EquipmentTier,
  excludeSlug?: string,
): readonly FamilyRung[] {
  return family.ladder
    .filter((r) => r.tier <= tier && r.slug !== excludeSlug)
    .slice()
    .sort((a, b) => a.tier - b.tier);
}
