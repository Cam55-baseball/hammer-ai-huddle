/**
 * MLB Elite Steal Benchmarks & Defense Timing Constants
 * All times scaled from 90ft reference point
 */

// Base distances supported
export const SUPPORTED_BASE_DISTANCES = [50, 60, 70, 80, 90] as const;
export type BaseDistance = (typeof SUPPORTED_BASE_DISTANCES)[number];

// Reference benchmarks at 90ft
const REFERENCE_DISTANCE = 90;
const ELITE_TIME_90FT = 3.05;
const GOOD_TIME_90FT = 3.30;
const AVG_TIME_90FT = 3.50;
const ELITE_FIRST_TWO_STEPS_90FT = 0.40;
const GOOD_FIRST_TWO_STEPS_90FT = 0.55;
const AVG_FIRST_TWO_STEPS_90FT = 0.70;

// Defense timing constants (seconds)
export const DEFENSE_TIMING = {
  avgPitcherToPlate: 1.2,
  elitePitcherToPlate: 0.9,
  avgCatcherPopTime: 2.0,
  eliteCatcherPopTime: 1.5,
  // Total defense time
  avgDefenseTotal: 3.2, // 1.2 + 2.0
  eliteDefenseTotal: 2.4, // 0.9 + 1.5
} as const;

// Slide time adjustment (drill is standing run, real steal includes slide)
export const SLIDE_TIME_ADJUSTMENT = 0.17;

// Scale a 90ft benchmark to a given base distance
function scaleTime(time90ft: number, baseDist: number): number {
  return (time90ft / REFERENCE_DISTANCE) * baseDist;
}

export interface DistanceBenchmarks {
  baseDist: number;
  eliteTime: number;
  goodTime: number;
  avgTime: number;
  eliteFirstTwoSteps: number;
  goodFirstTwoSteps: number;
  avgFirstTwoSteps: number;
}

// Get benchmarks for a specific base distance
export function getBenchmarksForDistance(baseDist: number): DistanceBenchmarks {
  return {
    baseDist,
    eliteTime: scaleTime(ELITE_TIME_90FT, baseDist),
    goodTime: scaleTime(GOOD_TIME_90FT, baseDist),
    avgTime: scaleTime(AVG_TIME_90FT, baseDist),
    eliteFirstTwoSteps: scaleTime(ELITE_FIRST_TWO_STEPS_90FT, baseDist),
    goodFirstTwoSteps: scaleTime(GOOD_FIRST_TWO_STEPS_90FT, baseDist),
    avgFirstTwoSteps: scaleTime(AVG_FIRST_TWO_STEPS_90FT, baseDist),
  };
}

// Pre-computed benchmarks for all supported distances
export const BENCHMARKS_BY_DISTANCE: Record<number, DistanceBenchmarks> = {
  50: getBenchmarksForDistance(50),
  60: getBenchmarksForDistance(60),
  70: getBenchmarksForDistance(70),
  80: getBenchmarksForDistance(80),
  90: getBenchmarksForDistance(90),
};

// Lead efficiency benchmarks (as % of base distance)
export const LEAD_EFFICIENCY = {
  eliteMinPct: 11,
  eliteMaxPct: 13,
  goodMinPct: 10,
  goodMaxPct: 14,
  avgMinPct: 8,
  avgMaxPct: 15,
} as const;

// Acceleration efficiency benchmarks (first two steps as % of total time)
export const ACCELERATION_EFFICIENCY = {
  eliteMaxPct: 14, // lower is better
  goodMaxPct: 16,
  avgMaxPct: 18,
} as const;
