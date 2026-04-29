// Rep Source Toughness — single source of truth for "how hard was this rep?"
// Used by calculate-session to weight composite scores (BQI, PEI, competitive_execution)
// so that a tee swing isn't graded the same as a swing vs a 90+ mph live BP, and a
// pure bullpen isn't graded the same as a pitcher facing live hitters.

export type Module =
  | 'hitting'
  | 'pitching'
  | 'fielding'
  | 'throwing'
  | 'baserunning'
  | 'bunting';

// Hitting tiers — facing the pitch
const HITTING_TOUGHNESS: Record<string, number> = {
  tee: 0.70,                  // static, pure mechanics
  soft_toss: 0.80,
  flip: 0.80,                 // side flips, predictable
  front_toss: 0.85,           // underhand short distance
  coach_pitch: 0.95,          // slow, predictable arc
  machine_bp: 1.05,           // real velocity, no live read
  regular_bp: 1.15,           // live arm, controlled
  live_bp: 1.25,              // live pitcher, full intent
  live_abs: 1.30,             // competitive at-bats
  sim_game: 1.30,
  game: 1.35,
};

// Pitching tiers — the pitcher's task
const PITCHING_TOUGHNESS: Record<string, number> = {
  bullpen: 0.85,                  // no hitter
  flat_ground: 0.95,              // no mound, no hitter
  flat_ground_vs_hitter: 1.05,    // hitter present, no mound
  bullpen_vs_hitter: 1.15,        // mound + live hitter
  live_bp: 1.25,                  // pitching live BP from mound
  sim_game: 1.30,
  game: 1.35,
};

// Bunting follows hitting (pitch-facing) tiers
const BUNTING_TOUGHNESS = HITTING_TOUGHNESS;

const TIER_MIN = 0.7;
const TIER_MAX = 1.35;

export function getRepSourceToughness(
  module: Module | string | undefined | null,
  repSource?: string | null,
): number {
  if (!repSource) return 1.0;
  let map: Record<string, number> | null = null;
  if (module === 'hitting') map = HITTING_TOUGHNESS;
  else if (module === 'pitching') map = PITCHING_TOUGHNESS;
  else if (module === 'bunting') map = BUNTING_TOUGHNESS;
  if (!map) return 1.0;
  const v = map[repSource];
  if (v == null) return 1.0;
  return v;
}

/** Aggregate toughness across an array of micro reps (each carries rep_source). */
export function computeSessionToughness(
  module: Module | string | undefined | null,
  microReps: Array<{ rep_source?: string | null }>,
): { toughness: number; breakdown: Record<string, number>; weightedReps: number } {
  const breakdown: Record<string, number> = {};
  let sum = 0;
  let n = 0;
  for (const r of microReps) {
    const src = r?.rep_source ?? 'unknown';
    breakdown[src] = (breakdown[src] ?? 0) + 1;
    if (src === 'unknown') continue;
    const t = getRepSourceToughness(module, src);
    sum += t;
    n += 1;
  }
  const toughness = n > 0 ? sum / n : 1.0;
  return {
    toughness: Math.min(TIER_MAX, Math.max(TIER_MIN, toughness)),
    breakdown,
    weightedReps: n,
  };
}

export const REP_SOURCE_TOUGHNESS_BOUNDS = { min: TIER_MIN, max: TIER_MAX };
