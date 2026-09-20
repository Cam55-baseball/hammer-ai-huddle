/**
 * Upper-Body Plyometrics v1.1 (Hammers v1.2 §C) — added movements.
 *
 * Covers: the lower-body mirror table (§C2), the Hand and Wrist Chain (§C3),
 * families 17–20 (§C5) and the Banded Sled Press (Rebound) (§C1).
 *
 * Rows are inserted INACTIVE. Nothing here is wired into generation.
 * Naming law: no outside program, brand or coach names in any slug, name or cue.
 */

import { QUALITY_GATE_CUE, U1_ANCHOR, U2_BRIDGE, type Plane, type UbMovement, type UbTier } from "./families.ts";

/** §C3 — the owner's full cue lives in the coach/staff field only (E3). */
export const HAND_CHAIN_STAFF_CUE =
  "Hammers method (E3): fingers retracted to lock the retinaculum for a fascial effect. Not stated to athletes as fact.";

/** §C3 safety rules. */
export const HAND_CHAIN_MAX_CONTACTS_PER_SESSION = 40;
export const HAND_CHAIN_WEEKS_PER_LEVEL_MIN = 3;
export const HAND_CHAIN_WEEKS_PER_LEVEL_MAX = 4;
export const HAND_CHAIN_WALL_MIN_AGE = 13;
export const HAND_CHAIN_FLOOR_MIN_AGE = 14;

export type HandSurface = "wall" | "incline" | "kneeling" | "floor" | "implement";

export interface HandChainMovement extends UbMovement {
  surface: HandSurface;
  /** true when the drill loads the fingertips at maximum — pitcher windowed. */
  maxFingertipLoading: boolean;
  staffCue: string;
  levelIndex: number;
  ladder: string;
}

interface LadderSpec {
  ladder: string;
  key: string;
  athleteCue: string;
  equipment: string[];
  maxFingertip: boolean;
  levels: [surface: HandSurface, tail: string, name: string][];
}

const LADDERS: LadderSpec[] = [
  {
    ladder: "Wrist Wall Pogos",
    key: "wrist_pogo",
    athleteCue: "Stiff wrists, fingers pulled back, bounce off the heel of the hand.",
    equipment: ["bodyweight", "wall"],
    maxFingertip: false,
    levels: [
      ["wall", "wall", "Wrist Wall Pogos, Standing"],
      ["wall", "wall_lean", "Wrist Wall Pogos, Steeper Lean"],
      ["incline", "incline", "Wrist Pogos, Incline Bench"],
      ["kneeling", "kneeling", "Wrist Pogos, Kneeling Floor"],
      ["floor", "floor", "Wrist Pogos, Floor"],
    ],
  },
  {
    ladder: "Fingertip Wall Pogos",
    key: "fingertip_pogo",
    athleteCue: "Fingers firm, don't let them fold.",
    equipment: ["bodyweight", "wall"],
    maxFingertip: true,
    levels: [
      ["wall", "wall", "Fingertip Wall Pogos, Upright"],
      ["wall", "wall_lean", "Fingertip Wall Pogos, Steeper Lean"],
    ],
  },
  {
    ladder: "Finger Push-Ups",
    key: "finger_pushup",
    athleteCue: "Slow and solid.",
    equipment: ["bodyweight", "wall"],
    maxFingertip: true,
    levels: [
      ["wall", "wall", "Finger Push-Ups, Wall"],
      ["incline", "incline", "Finger Push-Ups, Incline"],
      ["kneeling", "kneeling", "Finger Push-Ups, Kneeling"],
      ["floor", "floor", "Finger Push-Ups, Floor"],
    ],
  },
  {
    ladder: "Fingertip Plank Holds",
    key: "fingertip_plank",
    athleteCue: "Tall fingers.",
    equipment: ["bodyweight", "wall"],
    maxFingertip: true,
    levels: [
      ["wall", "wall", "Fingertip Plank Hold, Wall"],
      ["incline", "incline", "Fingertip Plank Hold, Incline"],
      ["kneeling", "kneeling", "Fingertip Plank Hold, Kneeling"],
      ["floor", "floor", "Fingertip Plank Hold, Floor"],
    ],
  },
  {
    ladder: "Plyo-Ball Wrist Snaps",
    key: "wrist_snaps",
    athleteCue: "Quick and relaxed.",
    equipment: ["plyo_ball", "wall"],
    maxFingertip: false,
    levels: [
      ["wall", "half_kg", "Plyo-Ball Wrist Snaps, Four Directions, 0.5 kg"],
      ["wall", "one_kg", "Plyo-Ball Wrist Snaps, Four Directions, 1 kg"],
    ],
  },
  {
    ladder: "Plate Pinch Drop-Catch",
    key: "plate_pinch",
    athleteCue: "Catch it before it falls.",
    equipment: ["plates"],
    maxFingertip: true,
    levels: [
      ["implement", "5lb", "Plate Pinch Drop-Catch, 5 lb"],
      ["implement", "10lb", "Plate Pinch Drop-Catch, 10 lb"],
    ],
  },
  {
    ladder: "Fingertip Wall Ball Pops",
    key: "wall_ball_pops",
    athleteCue: "Fast fingers.",
    equipment: ["plyo_ball", "wall"],
    maxFingertip: true,
    levels: [["wall", "light", "Fingertip Wall Ball Pops, Light Ball"]],
  },
  {
    ladder: "Band Finger-Extension Snaps",
    key: "finger_extension",
    athleteCue: "Open fast.",
    equipment: ["bands"],
    maxFingertip: false,
    levels: [["implement", "light", "Band Finger-Extension Snaps, Light Band"]],
  },
  {
    ladder: "Grain-Bucket Hand Work",
    key: "grain_bucket",
    athleteCue: "Work the hand through the grain, easy pace.",
    equipment: ["grain_bucket"],
    maxFingertip: false,
    levels: [["implement", "prep", "Grain-Bucket Hand Work"]],
  },
];

function buildHandChain(): HandChainMovement[] {
  const out: HandChainMovement[] = [];
  for (const spec of LADDERS) {
    let previous: string | null = null;
    spec.levels.forEach(([surface, tail, name], i) => {
      const floorish = surface === "kneeling" || surface === "floor";
      const slug = `hwc_${spec.key}_${tail}`;
      out.push({
        slug,
        name,
        family: 21,
        familyName: "Hand and Wrist Chain",
        letter: "Base",
        plane: "push" as Plane,
        tier: (floorish ? "U2" : "U1") as UbTier,
        equipment: spec.equipment,
        contactsPerRep: spec.ladder === "Grain-Bucket Hand Work" ? 0 : 1,
        cue: spec.athleteCue,
        surface,
        maxFingertipLoading: spec.maxFingertip,
        staffCue: HAND_CHAIN_STAFF_CUE,
        levelIndex: i,
        ladder: spec.ladder,
        // Regression chain: each level steps down to the one below it; the
        // bottom of every ladder is a U1 wall/implement anchor.
        reuseOf: undefined,
        approx: false,
        ...(previous ? {} : {}),
      } as HandChainMovement);
      (out[out.length - 1] as HandChainMovement & { regressionOverride?: string | null }).regressionOverride =
        previous;
      previous = slug;
    });
  }
  return out;
}

export const HAND_CHAIN_MOVEMENTS: (HandChainMovement & { regressionOverride?: string | null })[] =
  buildHandChain();

/** §C2 lower-body mirror + §C5 families 17–20 + §C1 banded sled press. */
type MirrorSpec = [
  slug: string,
  name: string,
  family: number,
  familyName: string,
  tier: UbTier,
  plane: Plane,
  equipment: string[],
  contacts: number,
  cue: string,
  regression: string | null,
];

const MIRROR: MirrorSpec[] = [
  // §C2 — lower-body mirror rows not already covered by UBP v1.
  ["ubp_f22_lateral_hand_hops", "Lateral Hand Hops Over a Line", 22, "Lower-Body Mirror", "U2", "push", ["bodyweight"], 1, "Push-up position, hop both hands over the line and back.", "hwc_wrist_pogo_wall"],
  ["ubp_f22_hand_hops_low_line", "Hand Hops Over a Low Line", 22, "Lower-Body Mirror", "U2", "push", ["bodyweight", "mini_hurdle"], 1, "Small line, quick hands, stay stiff.", "hwc_wrist_pogo_wall"],
  ["ubp_f22_box_drop_catch_rebound_pushup", "Box Drop-Catch Rebound Push-Up", 22, "Lower-Body Mirror", "U3", "push", ["bodyweight", "box"], 1, "Hands off the boxes to the floor, catch, rebound straight back up.", U2_BRIDGE.push],
  ["ubp_f22_explosive_pushup_travel", "Explosive Push-Up Travel", 22, "Lower-Body Mirror", "U3", "push", ["bodyweight"], 1, "Jump the hands forward, land soft, go again.", U2_BRIDGE.push],
  ["ubp_f22_alternating_hand_bounds", "Alternating Hand Bounds", 22, "Lower-Body Mirror", "U3", "push", ["bodyweight"], 1, "Travel hand to hand, land soft each time.", U2_BRIDGE.push],
  ["ubp_f22_sa_wall_pogos", "Single-Arm Wall Pogos", 22, "Lower-Body Mirror", "U2", "push", ["bodyweight", "wall"], 1, "One hand on the wall, quick and stiff.", U1_ANCHOR.push],
  ["ubp_f22_offset_hand_plyo_pushup", "Offset-Hand Plyo Push-Up", 22, "Lower-Body Mirror", "U3", "push", ["bodyweight", "box"], 1, "Hands staggered, leave the ground, land soft.", U2_BRIDGE.push],
  ["ubp_f22_rapid_band_punches", "Rapid Band Punches", 22, "Lower-Body Mirror", "U2", "push", ["bands"], 1, "Fast punches, relaxed hand, quick return.", U1_ANCHOR.push],

  // §C1 — banded sled press (rebound).
  ["ubp_f23_banded_sled_press_rebound", "Banded Sled Press (Rebound)", 23, "Banded Sled Press", "U3", "push", ["sled", "bands"], 1, "Press the sled away, catch it coming back, press again.", U2_BRIDGE.push],

  // §C5 family 17 — plyo-ball wall series (throwers, sub-max) · U1
  ["ubp_f17_chest_pass", "Plyo-Ball Wall Chest Pass, Sub-Max", 17, "Plyo-Ball Wall Series", "U1", "push", ["plyo_ball", "wall"], 1, "Easy rhythm, chest height, catch and go.", null],
  ["ubp_f17_pivot_wall_throw", "Plyo-Ball Pivot Wall Throw, Sub-Max", 17, "Plyo-Ball Wall Series", "U1", "rotation", ["plyo_ball", "wall"], 1, "Turn the back hip, easy throw.", null],
  ["ubp_f17_reverse_throw", "Plyo-Ball Reverse Throw, Sub-Max", 17, "Plyo-Ball Wall Series", "U1", "overhead", ["plyo_ball", "wall"], 1, "Face away, throw back over the shoulder, stay easy.", null],
  ["ubp_f17_overhead_throw", "Plyo-Ball Overhead Throw, Sub-Max", 17, "Plyo-Ball Wall Series", "U1", "overhead", ["plyo_ball", "wall"], 1, "Both hands overhead, easy throw into the wall.", null],

  // §C5 family 18 — rotational rebounder series (hitters) · U1 → U3
  ["ubp_f18_scoop", "Rebounder Scoop Toss", 18, "Rotational Rebounder Series", "U1", "rotation", ["med_ball", "rebounder"], 1, "Scoop low to high, catch the return.", null],
  ["ubp_f18_shot_put", "Rebounder Shot-Put Throw", 18, "Rotational Rebounder Series", "U2", "rotation", ["med_ball", "rebounder"], 1, "Push it out off the back hip, catch the return.", U1_ANCHOR.rotation],
  ["ubp_f18_step_behind", "Rebounder Step-Behind Throw", 18, "Rotational Rebounder Series", "U3", "rotation", ["med_ball", "rebounder"], 1, "Step behind, turn, throw, catch the return.", U2_BRIDGE.rotation],

  // §C5 family 19 — offset / single-arm push plyos · U2 → U3
  ["ubp_f19_offset_mb_pushup", "Offset-Hand Push-Up on a Med Ball", 19, "Offset Push Plyos", "U2", "push", ["bodyweight", "med_ball"], 1, "One hand on the ball, chest square, control the drop.", U1_ANCHOR.push],
  ["ubp_f19_mb_crossover_plyo_pushup", "Med-Ball Crossover Plyo Push-Up", 19, "Offset Push Plyos", "U3", "push", ["bodyweight", "med_ball"], 1, "Push off the ball, cross over, land soft.", U2_BRIDGE.push],
  ["ubp_f19_sa_wall_plyo_push", "Single-Arm Wall Plyo Push", 19, "Offset Push Plyos", "U2", "push", ["bodyweight", "wall"], 1, "One hand, leave the wall, catch it clean.", U1_ANCHOR.push],

  // §C5 family 20 — assisted / resisted push speed · U2 → U3
  ["ubp_f20_band_assisted_plyo_pushup", "Band-Assisted Plyo Push-Up (Overspeed)", 20, "Assisted and Resisted Push Speed", "U2", "push", ["bodyweight", "bands"], 1, "Band takes weight off, move fast, land soft.", U1_ANCHOR.push],
  ["ubp_f20_band_resisted_plyo_pushup", "Band-Resisted Plyo Push-Up (Strength-Speed)", 20, "Assisted and Resisted Push Speed", "U3", "push", ["bodyweight", "bands"], 1, "Band across the back, push through it, land soft.", U2_BRIDGE.push],
];

export interface V11Movement extends UbMovement {
  regressionOverride: string | null;
}

export const V11_MOVEMENTS: V11Movement[] = MIRROR.map(
  ([slug, name, family, familyName, tier, plane, equipment, contacts, cue, regression]) => ({
    slug,
    name,
    family,
    familyName,
    letter: "Base",
    plane,
    tier,
    equipment,
    contactsPerRep: contacts,
    cue,
    regressionOverride: regression,
  }),
);

/** Every v1.1 row, hand chain included. */
export const ALL_V11_ROWS: (UbMovement & { regressionOverride?: string | null })[] = [
  ...V11_MOVEMENTS,
  ...HAND_CHAIN_MOVEMENTS,
];

/** Regression chain for a v1.1 row; always terminates at a U1 row. */
export function v11RegressionChain(slug: string): string[] {
  const chain: string[] = [];
  let cursor: string | null | undefined = ALL_V11_ROWS.find((r) => r.slug === slug)?.regressionOverride;
  let guard = 0;
  while (cursor && guard++ < 8) {
    chain.push(cursor);
    const row = ALL_V11_ROWS.find((r) => r.slug === cursor);
    cursor = row?.regressionOverride ?? null;
  }
  return chain;
}

export const FULL_CUE = (m: UbMovement) => `${m.cue} ${QUALITY_GATE_CUE}`;
