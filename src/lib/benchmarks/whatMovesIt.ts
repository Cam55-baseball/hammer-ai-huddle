/**
 * "What moves this number" — the honest replacement for a future grade.
 *
 * A real projection needs development-curve data we do not have. Rather than
 * invent one, a sub-floor grade points the athlete at the work that actually
 * changes it: the fault family the metric belongs to, the movement they can
 * start today with no equipment at all (tier 0), and the next earnable mark on
 * the standards ladder.
 *
 * Nothing here authors a dose. It names a family, a movement and a target —
 * sets and reps still come exclusively from the dosage doctrine, and the
 * standard is rendered as a target, never as a gate.
 */

import { FAULT_FAMILIES, type FaultFamilyId } from "@/lib/wic/faultLedger/families";
import { standardById, TIER_LABEL } from "@/lib/hammer/standards/catalog";

/** Display names for the tier-0 rungs. Slugs are frozen; names are not. */
const TIER0_NAME: Record<string, string> = {
  wu_split_stance_iso_hold: "Split-Stance Iso Hold",
  tibialis_raise: "Tibialis Raise",
  reverse_nordic: "Reverse Nordic",
  kneeling_ankle_rocks: "Kneeling Ankle Rocks",
  wu_copenhagen_short_lever: "Copenhagen Hold, Short Lever",
  wu_scapular_cars: "Scapular CARs",
  bs_deep_hip_load: "Deep Hip Load",
  wu_pogo_double: "Double-Leg Pogo",
  wu_pallof_press_iso: "Pallof Press Hold",
  wu_forearm_pump: "Forearm Pump",
};

interface MetricRoute {
  family: FaultFamilyId;
  /** Standards-catalog id whose Standard tier is the next mark to chase. */
  standardId?: string;
}

/**
 * Metric → the family that moves it. Deliberately conservative: a metric with
 * no honest family stays absent and simply renders no guidance, the same way
 * an ungraded softball mark stays ungraded.
 */
const ROUTES: Record<string, MetricRoute> = {
  // speed / acceleration
  ten_yard_dash: { family: "first_step_capacity", standardId: "ja_backward_sled" },
  seven_yard_dash: { family: "first_step_capacity", standardId: "ja_backward_sled" },
  first_step_5yd: { family: "first_step_capacity", standardId: "ja_backward_sled" },
  thirty_yard_dash: { family: "landing_and_elastic", standardId: "as_power_base" },
  forty_yard_dash: { family: "landing_and_elastic", standardId: "as_power_base" },
  sixty_yard_dash: { family: "landing_and_elastic", standardId: "as_power_base" },
  ten_thirty_split: { family: "first_step_capacity", standardId: "ja_backward_sled" },
  thirty_sixty_split: { family: "landing_and_elastic", standardId: "as_power_base" },
  sprint_repeat_avg: { family: "deceleration_base", standardId: "ja_calf_raise" },
  three_hundred_yd_shuttle: { family: "deceleration_base", standardId: "ja_calf_raise" },

  // change of direction / braking
  pro_agility: { family: "deceleration_base", standardId: "ja_tib_raise" },
  lateral_shuffle: { family: "back_leg_block" },
  deceleration_10yd: { family: "posterior_braking", standardId: "pa_nordic" },
  sixty_yard_shuttle: { family: "deceleration_base", standardId: "ja_tib_raise" },

  // lower-body power
  vertical_jump: { family: "landing_and_elastic", standardId: "as_power_base" },
  sl_vert_jump: { family: "landing_and_elastic", standardId: "as_power_base" },
  standing_broad_jump: { family: "landing_and_elastic", standardId: "as_power_base" },
  sl_broad_jump: { family: "landing_and_elastic", standardId: "as_power_base" },
  sl_lateral_broad_jump: { family: "back_leg_block" },
  sl_3x_bound: { family: "landing_and_elastic", standardId: "as_power_base" },

  // rotational / bat
  mb_rotational_throw: { family: "rotational_output", standardId: "rp_shot_put" },
  mb_situp_throw: { family: "trunk_transfer", standardId: "rp_shot_put" },
  mb_overhead_throw: { family: "trunk_transfer", standardId: "rp_shot_put" },
  seated_chest_pass: { family: "trunk_transfer", standardId: "rp_shot_put" },
  bat_speed: { family: "rotational_output", standardId: "rp_bat_speed" },
  tee_exit_velocity: { family: "rotational_output", standardId: "rp_bat_speed" },
  max_tee_distance: { family: "rotational_output", standardId: "rp_bat_speed" },
  avg_exit_velo_bp: { family: "rotational_output", standardId: "rp_bat_speed" },

  // arm
  pitching_velocity: { family: "arm_health", standardId: "as_throw_velocity" },
  position_throw_velo: { family: "arm_health", standardId: "as_throw_velocity" },
  pulldown_velocity: { family: "arm_health", standardId: "as_throw_velocity" },
  long_toss_distance: { family: "arm_health", standardId: "as_throw_velocity" },

  // glove
  pop_time: { family: "trunk_transfer" },
  fielding_exchange_time: { family: "grip_and_forearm" },

  // mobility / control
  ankle_dorsiflexion: { family: "ankle_and_depth", standardId: "ja_patrick_step" },
  hip_internal_rotation: { family: "back_leg_block" },
  shoulder_rom_internal: { family: "arm_health" },
  shoulder_rom_external: { family: "arm_health" },
  sl_balance_eyes_closed: { family: "back_leg_block" },
};

export interface WhatMovesIt {
  metricKey: string;
  /** Plain-language name of the problem. */
  familyLabel: string;
  /** What the athlete would actually say when this is the problem. */
  plain: string;
  /** Something they can do today with nothing at all. */
  startHere: string;
  /** Next earnable mark, already labelled as a target. Null when none applies. */
  nextMark: string | null;
}

/** Guidance for one metric, or null when we have nothing honest to say. */
export function whatMovesMetric(metricKey: string): WhatMovesIt | null {
  const route = ROUTES[metricKey];
  if (!route) return null;
  const family = FAULT_FAMILIES.find((f) => f.id === route.family);
  if (!family) return null;

  const tier0 = family.ladder.find((r) => r.tier === 0);
  const startHere = tier0 ? (TIER0_NAME[tier0.slug] ?? tier0.slug.replace(/_/g, " ")) : null;
  if (!startHere) return null;

  let nextMark: string | null = null;
  if (route.standardId) {
    const def = standardById(route.standardId);
    if (def) {
      nextMark = `${def.name} — ${def.targets.standard} ${def.unit} (${TIER_LABEL.standard})`;
    }
  }

  return {
    metricKey,
    familyLabel: family.label,
    plain: family.plain,
    startHere,
    nextMark,
  };
}

/** First available guidance across the supplied metric keys. */
export function firstWhatMovesIt(
  metricKeys: readonly string[],
): WhatMovesIt | null {
  for (const k of metricKeys) {
    const g = whatMovesMetric(k);
    if (g) return g;
  }
  return null;
}
