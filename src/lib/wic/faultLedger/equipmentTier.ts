/**
 * Athlete equipment → ladder tier.
 *
 * The ladder is fixed: none → bands → dumbbells → barbell/full gym.
 *
 * Safety rule, and it is not symmetric: an unrecognised value maps to the
 * LOWEST tier that is certainly true. Offering an athlete a barbell they don't
 * own fails them worse than offering a bodyweight option they didn't need.
 */
import type { EquipmentTier } from "./families";

/**
 * Ambient surroundings. A wall is not equipment — neither is a floor, and
 * neither is somewhere to sit. Nobody is blocked from a drill because they
 * lack a wall, so these prove tier 0 and are never listed as a requirement.
 */
export const AMBIENT_EQUIPMENT: ReadonlySet<string> = new Set([
  "wall", "floor", "ground", "mat", "chair", "bodyweight", "none", "step", "stairs", "curb",
]);

/** Everything we recognise, and the tier it proves. */
const TIER_BY_VALUE: Readonly<Record<string, EquipmentTier>> = {
  // tier 0 — ambient. Present everywhere; proves nothing about the athlete's kit.
  wall: 0,
  floor: 0,
  ground: 0,
  mat: 0,
  chair: 0,
  step: 0,
  stairs: 0,
  curb: 0,
  bodyweight: 0,
  none: 0,
  // tier 1 — a band, a pull-up bar, a plate
  bands: 1,
  band: 1,
  resistance_bands: 1,
  xband: 1,
  mini_band: 1,
  pull_up_bar: 1,
  plate: 1,
  jband: 1,
  j_bands: 1,
  ladder: 1,
  foam_roller: 1,
  lacrosse_ball: 1,
  tee: 1,
  ball: 1,
  net: 1,
  rebounder: 1,
  gamer_bat: 1,
  overload_bat: 1,
  underload_bat: 1,
  field: 0,
  open_space: 0,
  // tier 2 — hand weights and basic gear
  dumbbell: 2,
  dumbbells: 2,
  kettlebell: 2,
  kettlebells: 2,
  bench: 2,
  box: 2,
  medicine_ball: 2,
  med_ball: 2,
  plyo_ball: 2,
  plates: 2,
  slant_board: 2,
  slantboard: 2,
  block: 2,
  hurdles: 2,
  ab_wheel: 2,
  home_gym: 2,
  // tier 3 — barbell or a real gym
  barbell: 3,
  rack: 3,
  squat_rack: 3,
  cable: 3,
  cable_stack: 3,
  machine: 3,
  full_gym: 3,
  gym: 3,
  weight_room: 3,
  trap_bar: 3,
  landmine: 3,
  tib_bar: 3,
  reverse_hyper: 3,
  nordic_bench: 3,
  back_extension: 3,
  wrist_roller: 3,
};

export interface EquipmentTierResult {
  readonly tier: EquipmentTier;
  /** Values we understood, with the tier each one proved. */
  readonly recognised: ReadonlyArray<{ value: string; tier: EquipmentTier }>;
  /** Values we did not understand. These raised nothing. */
  readonly unrecognised: readonly string[];
}

/**
 * The highest tier the athlete's own profile *proves*. No profile, or nothing
 * recognisable in it, means tier 0 — nothing at all.
 */
export function resolveEquipmentTier(values: readonly string[] | null | undefined): EquipmentTierResult {
  const recognised: Array<{ value: string; tier: EquipmentTier }> = [];
  const unrecognised: string[] = [];
  let tier: EquipmentTier = 0;

  for (const raw of values ?? []) {
    const key = String(raw).trim().toLowerCase().replace(/[\s-]+/g, "_");
    const known = TIER_BY_VALUE[key];
    if (known === undefined) {
      unrecognised.push(String(raw));
      continue;
    }
    recognised.push({ value: String(raw), tier: known });
    if (known > tier) tier = known;
  }

  return { tier, recognised, unrecognised };
}
