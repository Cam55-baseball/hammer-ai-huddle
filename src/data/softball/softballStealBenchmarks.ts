/**
 * Softball Steal Benchmarks & Defense Timing Constants
 * Reference distance: 60ft (standard softball)
 * No lead efficiency — softball runners start on the base
 */

export const SUPPORTED_SOFTBALL_DISTANCES = [30, 35, 40, 45, 50, 55, 60, 65, 70] as const;
export type SoftballBaseDistance = (typeof SUPPORTED_SOFTBALL_DISTANCES)[number];

const REFERENCE_DISTANCE = 60;

// Steal time benchmarks at 60ft
const ELITE_TIME_MIN = 2.90;
const ELITE_TIME_MAX = 3.25;
const AVG_TIME_MIN = 3.40;
const AVG_TIME_MAX = 3.70;

// Two-step benchmarks
const ELITE_TWO_STEP_MIN = 0.65;
const ELITE_TWO_STEP_MAX = 0.78;
const AVG_TWO_STEP_MIN = 0.80;
const AVG_TWO_STEP_MAX = 0.95;

// Steps to base at 60ft
const ELITE_STEPS_MIN = 11;
const ELITE_STEPS_MAX = 13;
const AVG_STEPS_MIN = 13;
const AVG_STEPS_MAX = 15;

// Pitcher time to home (seconds)
export const PITCHER_TIME = {
  elite: { min: 1.10, max: 1.25, label: 'Elite Quick Pitcher' },
  average: { min: 1.30, max: 1.45, label: 'Average' },
  slow: { min: 1.50, max: 1.80, label: 'Slow Delivery' },
} as const;

// Catcher pop times (seconds)
export const CATCHER_POP_TIME = {
  elite: 1.70,
  average: 1.85,
  slow: 2.00,
} as const;

// Slide time adjustment
export const SLIDE_TIME_ADJUSTMENT = 0.15;

function scaleTime(time60ft: number, baseDist: number): number {
  return parseFloat(((time60ft / REFERENCE_DISTANCE) * baseDist).toFixed(3));
}

function scaleSteps(steps60ft: number, baseDist: number): number {
  return Math.round((steps60ft / REFERENCE_DISTANCE) * baseDist);
}

export interface SoftballDistanceBenchmarks {
  baseDist: number;
  eliteTimeMin: number;
  eliteTimeMax: number;
  avgTimeMin: number;
  avgTimeMax: number;
  eliteTwoStepMin: number;
  eliteTwoStepMax: number;
  avgTwoStepMin: number;
  avgTwoStepMax: number;
  eliteStepsMin: number;
  eliteStepsMax: number;
  avgStepsMin: number;
  avgStepsMax: number;
}

export function getBenchmarksForDistance(baseDist: number): SoftballDistanceBenchmarks {
  return {
    baseDist,
    eliteTimeMin: scaleTime(ELITE_TIME_MIN, baseDist),
    eliteTimeMax: scaleTime(ELITE_TIME_MAX, baseDist),
    avgTimeMin: scaleTime(AVG_TIME_MIN, baseDist),
    avgTimeMax: scaleTime(AVG_TIME_MAX, baseDist),
    eliteTwoStepMin: scaleTime(ELITE_TWO_STEP_MIN, baseDist),
    eliteTwoStepMax: scaleTime(ELITE_TWO_STEP_MAX, baseDist),
    avgTwoStepMin: scaleTime(AVG_TWO_STEP_MIN, baseDist),
    avgTwoStepMax: scaleTime(AVG_TWO_STEP_MAX, baseDist),
    eliteStepsMin: scaleSteps(ELITE_STEPS_MIN, baseDist),
    eliteStepsMax: scaleSteps(ELITE_STEPS_MAX, baseDist),
    avgStepsMin: scaleSteps(AVG_STEPS_MIN, baseDist),
    avgStepsMax: scaleSteps(AVG_STEPS_MAX, baseDist),
  };
}

export const BENCHMARKS_BY_DISTANCE: Record<number, SoftballDistanceBenchmarks> = Object.fromEntries(
  SUPPORTED_SOFTBALL_DISTANCES.map(d => [d, getBenchmarksForDistance(d)])
);

// Acceleration efficiency benchmarks (two-step as % of total time)
export const ACCELERATION_EFFICIENCY = {
  eliteMaxPct: 22, // lower is better
  goodMaxPct: 25,
  avgMaxPct: 28,
} as const;
