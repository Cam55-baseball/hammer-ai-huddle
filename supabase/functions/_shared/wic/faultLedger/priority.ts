/**
 * Fault-ledger priority — the reader side of `wk_fault_signals`.
 *
 * What this is allowed to do: raise the priority of a movement that already
 * passed every legality gate, because the athlete's own recorded faults point
 * at it.
 *
 * What it may never do, and cannot do by construction: filter a pool, remove a
 * movement, empty a slot, or author a dose. It returns a non-negative bonus for
 * a slug and nothing else. An athlete with no signals gets a bonus of 0 for
 * every slug, which is arithmetically identical to today's card.
 *
 * Mirrors `src/lib/wic/faultLedger/{families,ranking}.ts`. The mirror is held
 * in step by `src/test/faultLedgerPriorityParity.test.ts`, which fails the
 * build if the two drift.
 */

export type Discipline =
  | "hitting"
  | "pitching"
  | "throwing"
  | "fielding"
  | "running"
  | "lifting";

export interface LedgerSignalRow {
  readonly source: string;
  readonly fault_key: string;
  readonly root_pattern_id: string;
  readonly discipline: string;
  readonly confidence: number;
  readonly sample_size: number;
  readonly severity: number;
  readonly observed_at: string;
}

/** Root pattern id -> owning fault family. Mirror of `FAULT_FAMILIES`. */
export const ROOT_PATTERN_FAMILY: Readonly<Record<string, string>> = {
  slow_first_step: "first_step_capacity",
  weak_hip_flexion: "first_step_capacity",
  late_acceleration: "first_step_capacity",

  poor_deceleration: "deceleration_base",
  shin_splints_history: "deceleration_base",
  weak_lower_leg: "deceleration_base",

  hamstring_strain_risk: "posterior_braking",
  weak_posterior_chain: "posterior_braking",
  poor_eccentric_control: "posterior_braking",

  limited_ankle_dorsiflexion: "ankle_and_depth",
  shallow_squat_depth: "ankle_and_depth",
  knee_pain_anterior: "ankle_and_depth",

  groin_strain_risk: "back_leg_block",
  weak_adductors: "back_leg_block",
  back_leg_collapse: "back_leg_block",
  direction_off_the_target_line: "back_leg_block",

  shoulder_pain: "arm_health",
  poor_scap_control: "arm_health",
  arm_fatigue_high: "arm_health",

  poor_hip_shoulder_separation: "rotational_output",
  low_rotational_power: "rotational_output",
  arm_only_swing: "rotational_output",
  trunk_rotates_before_front_foot_plant: "rotational_output",

  poor_landing_mechanics: "landing_and_elastic",
  low_reactive_strength: "landing_and_elastic",
  heavy_footed: "landing_and_elastic",

  energy_leak_trunk: "trunk_transfer",
  poor_anti_rotation: "trunk_transfer",
  weak_bracing: "trunk_transfer",
  hands_leak_forward_early: "trunk_transfer",

  weak_grip: "grip_and_forearm",
  forearm_fatigue: "grip_and_forearm",
  late_bat_control: "grip_and_forearm",
};

/** Family -> the movements that address it. Mirror of the family ladders. */
export const FAMILY_LADDER_SLUGS: Readonly<Record<string, readonly string[]>> = {
  first_step_capacity: [
    "wu_split_stance_iso_hold",
    "cressey_hip_lift_march",
    "hanging_knee_raise",
    "garhammer_raise",
    "low_cable_hip_flexor_pull_in",
    "strap_loaded_hip_flexor_raise",
  ],
  deceleration_base: [
    "tibialis_raise",
    "straight_leg_calf_raise",
    "seated_tibialis_raise",
    "seated_calf_raise",
    "single_leg_calf_raise_off_block",
    "slant_board_calf_raise",
    "kot_tibialis_raise",
  ],
  posterior_braking: [
    "reverse_nordic",
    "sp_nordic_hamstring",
    "nordic_curl",
    "single_leg_back_extension",
    "ws_reverse_hyper",
    "lift_nordic_curl_ecc",
  ],
  ankle_and_depth: [
    "kneeling_ankle_rocks",
    "wall_ankle_mobilization",
    "kot_elephant_walks",
    "atg_split_squat",
    "kot_atg_split_squat",
    "kot_slantboard_squat",
  ],
  back_leg_block: [
    "wu_copenhagen_short_lever",
    "standing_groin_stretch",
    "cossack_squat",
    "weighted_butterfly_stretch",
    "dumbbell_lateral_lunge",
    "barbell_lateral_lunge",
  ],
  arm_health: [
    "wu_scapular_cars",
    "ac_cressey_wall_slide",
    "ac_xband_pull_apart",
    "ac_jobes_side_lying_er",
    "ac_jobes_prone_ytw",
    "powell_raise",
  ],
  rotational_output: [
    "bs_deep_hip_load",
    "bs_side_plank_rot_reach",
    "wu_medball_rot_toss_wall",
    "medicine_ball_scoop_toss",
    "medicine_ball_shot_put_throw",
    "wide_stance_cable_rotation",
    "bs_landmine_rotational_punch",
  ],
  landing_and_elastic: [
    "wu_pogo_double",
    "sp_pogo_single",
    "hurdle_jump",
    "altitude_landing",
    "depth_drop_to_broad_jump",
  ],
  trunk_transfer: [
    "wu_pallof_press_iso",
    "heenan_dead_bug_reach",
    "bird_dog",
    "four_way_plank",
    "kneeling_ab_rollout",
    "lift_hk_pallof_iso",
  ],
  grip_and_forearm: [
    "wu_forearm_pump",
    "dead_hang",
    "plate_pinch",
    "lift_farmer_carry",
    "offset_farmer_carry",
    "wrist_roller",
  ],
};

const HALF_LIFE_DAYS = 21;

/** 1.0 today, 0.5 three weeks ago, never zero. Mirror of `recencyWeight`. */
export function recencyWeight(observedAt: string, now: number = Date.now()): number {
  const t = new Date(observedAt).getTime();
  if (!Number.isFinite(t)) return 0.25;
  const days = Math.max(0, (now - t) / 86_400_000);
  return Math.max(0.05, Math.pow(0.5, days / HALF_LIFE_DAYS));
}

/** One observation is never treated as a trend. Mirror of `sampleWeight`. */
export function sampleWeight(sampleSize: number): number {
  if (sampleSize <= 0) return 0;
  return Math.min(1, Math.log10(1 + sampleSize) / Math.log10(11));
}

export interface RankedPriority {
  readonly rootPatternId: string;
  readonly family: string | null;
  readonly score: number;
  readonly sampleSize: number;
  readonly disciplines: readonly string[];
  readonly sources: readonly string[];
}

/** Collapse raw rows into ranked root patterns, highest first. Deterministic. */
export function rankLedger(
  rows: readonly LedgerSignalRow[],
  now: number = Date.now(),
): RankedPriority[] {
  const groups = new Map<string, LedgerSignalRow[]>();
  for (const r of rows) {
    if (!r?.root_pattern_id) continue;
    const g = groups.get(r.root_pattern_id);
    if (g) g.push(r);
    else groups.set(r.root_pattern_id, [r]);
  }

  const ranked: RankedPriority[] = [];
  for (const [rootPatternId, group] of groups) {
    const base = group.reduce(
      (sum, s) =>
        sum +
        Number(s.confidence) *
          Number(s.severity) *
          sampleWeight(Number(s.sample_size)) *
          recencyWeight(s.observed_at, now),
      0,
    );
    const sources = Array.from(new Set(group.map((s) => s.source)));
    const disciplines = Array.from(new Set(group.map((s) => s.discipline)));
    const agreement = 1 + 0.35 * (sources.length - 1) + 0.25 * (disciplines.length - 1);
    ranked.push({
      rootPatternId,
      family: ROOT_PATTERN_FAMILY[rootPatternId] ?? null,
      score: base * agreement,
      sampleSize: group.reduce((n, s) => n + Number(s.sample_size), 0),
      disciplines,
      sources,
    });
  }

  return ranked.sort(
    (a, b) => b.score - a.score || a.rootPatternId.localeCompare(b.rootPatternId),
  );
}

/** Priority weight by rank. Three is the ceiling — more is not a plan. */
const RANK_BONUS = [0.9, 0.55, 0.3] as const;

export interface FaultPriority {
  /** Non-negative. 0 for every slug when the ledger is empty. */
  readonly bonusForSlug: (slug: string) => number;
  readonly ranked: readonly RankedPriority[];
  /** Replay trace: what the ledger asked for, and what it was worth. */
  readonly trace: ReadonlyArray<Record<string, unknown>>;
  readonly active: boolean;
}

export const FAULT_PRIORITY_VERSION = "fault_priority_v1";

/**
 * Build the priority view over an athlete's ledger rows.
 * No rows in => `active: false` and a bonus of exactly 0 for every slug.
 */
export function buildFaultPriority(
  rows: readonly LedgerSignalRow[],
  now: number = Date.now(),
  limit = 3,
): FaultPriority {
  const ranked = rankLedger(rows, now).slice(0, limit);
  const bonuses = new Map<string, number>();
  const trace: Array<Record<string, unknown>> = [];

  ranked.forEach((r, i) => {
    const weight = RANK_BONUS[i] ?? 0;
    const slugs = r.family ? (FAMILY_LADDER_SLUGS[r.family] ?? []) : [];
    for (const slug of slugs) {
      // A slug in two priority families keeps the larger claim, never the sum.
      bonuses.set(slug, Math.max(bonuses.get(slug) ?? 0, weight));
    }
    trace.push({
      rank: i + 1,
      root_pattern: r.rootPatternId,
      family: r.family,
      score: Number(r.score.toFixed(6)),
      sample_size: r.sampleSize,
      disciplines: r.disciplines,
      bonus: weight,
      slugs_prioritized: r.family ? slugs.length : 0,
      version: FAULT_PRIORITY_VERSION,
    });
  });

  return {
    bonusForSlug: (slug: string) => bonuses.get(slug) ?? 0,
    ranked,
    trace,
    active: bonuses.size > 0,
  };
}
