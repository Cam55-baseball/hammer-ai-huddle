/**
 * Softball Steal Analytics Engine
 * Three elite analytics + core performance metrics
 */

import {
  getBenchmarksForDistance,
  PITCHER_TIME,
  CATCHER_POP_TIME,
  SLIDE_TIME_ADJUSTMENT,
  ACCELERATION_EFFICIENCY,
} from '@/data/softball/softballStealBenchmarks';

export type Grade = 'Elite' | 'Above Average' | 'Average' | 'Below Average';

function grade(value: number, eliteThreshold: number, goodThreshold: number, avgThreshold: number, lowerIsBetter = true): Grade {
  if (lowerIsBetter) {
    if (value <= eliteThreshold) return 'Elite';
    if (value <= goodThreshold) return 'Above Average';
    if (value <= avgThreshold) return 'Average';
    return 'Below Average';
  }
  if (value >= eliteThreshold) return 'Elite';
  if (value >= goodThreshold) return 'Above Average';
  if (value >= avgThreshold) return 'Average';
  return 'Below Average';
}

// ─── Core Metrics ──────────────────────────────────────

export function calcJumpQuality(twoStepTime: number, baseDist: number): { grade: Grade; percentile: number } {
  const b = getBenchmarksForDistance(baseDist);
  const midElite = (b.eliteTwoStepMin + b.eliteTwoStepMax) / 2;
  const midAvg = (b.avgTwoStepMin + b.avgTwoStepMax) / 2;
  const g = grade(twoStepTime, midElite, b.eliteTwoStepMax, midAvg);
  // percentile: 100 = best possible, 0 = worst
  const pct = Math.max(0, Math.min(100, Math.round(((midAvg - twoStepTime) / (midAvg - b.eliteTwoStepMin)) * 100)));
  return { grade: g, percentile: pct };
}

export function calcAccelerationEfficiency(twoStepTime: number, totalTime: number): { pct: number; grade: Grade } {
  const pct = parseFloat(((twoStepTime / totalTime) * 100).toFixed(1));
  const g = grade(pct, ACCELERATION_EFFICIENCY.eliteMaxPct, ACCELERATION_EFFICIENCY.goodMaxPct, ACCELERATION_EFFICIENCY.avgMaxPct);
  return { pct, grade: g };
}

export function calcStrideEfficiency(steps: number, baseDist: number): { strideLength: number; grade: Grade } {
  const strideLength = parseFloat((baseDist / steps).toFixed(2));
  const b = getBenchmarksForDistance(baseDist);
  const eliteStride = baseDist / b.eliteStepsMax; // fewer steps = longer stride
  const avgStride = baseDist / b.avgStepsMax;
  const g = grade(strideLength, eliteStride, (eliteStride + avgStride) / 2, avgStride, false);
  return { strideLength, grade: g };
}

export function calcStealTimeRating(time: number, baseDist: number): { grade: Grade; percentile: number } {
  const b = getBenchmarksForDistance(baseDist);
  const midElite = (b.eliteTimeMin + b.eliteTimeMax) / 2;
  const midAvg = (b.avgTimeMin + b.avgTimeMax) / 2;
  const g = grade(time, midElite, b.eliteTimeMax, midAvg);
  const pct = Math.max(0, Math.min(100, Math.round(((midAvg - time) / (midAvg - b.eliteTimeMin)) * 100)));
  return { grade: g, percentile: pct };
}

// ─── Elite Analytics #1: Catcher Pop-Time Matchup ──────

export interface CatcherMatchupResult {
  vsElite: number;
  vsAverage: number;
  vsSlow: number;
}

export function calcCatcherMatchupSuccess(
  timeToBase: number,
  pitcherLevel: 'elite' | 'average' | 'slow' = 'average'
): CatcherMatchupResult {
  const pitcherTime = (PITCHER_TIME[pitcherLevel].min + PITCHER_TIME[pitcherLevel].max) / 2;
  const runnerArrival = timeToBase + SLIDE_TIME_ADJUSTMENT;

  const calc = (popTime: number) => {
    const defenseTotal = pitcherTime + popTime;
    const margin = defenseTotal - runnerArrival;
    // Convert margin to % — positive margin = runner wins
    const successPct = Math.max(0, Math.min(100, Math.round(50 + margin * 40)));
    return successPct;
  };

  return {
    vsElite: calc(CATCHER_POP_TIME.elite),
    vsAverage: calc(CATCHER_POP_TIME.average),
    vsSlow: calc(CATCHER_POP_TIME.slow),
  };
}

// ─── Elite Analytics #2: Optimal Stride Model ──────────

export interface StrideModelResult {
  currentStride: number;
  optimalStride: number;
  recommendation: string;
}

export function calcOptimalStride(distance: number, steps: number, time: number): StrideModelResult {
  const currentStride = parseFloat((distance / steps).toFixed(2));
  const b = getBenchmarksForDistance(distance);
  const optimalSteps = (b.eliteStepsMin + b.eliteStepsMax) / 2;
  const optimalStride = parseFloat((distance / optimalSteps).toFixed(2));

  let recommendation = '';
  const diff = optimalStride - currentStride;
  if (diff > 0.3) {
    recommendation = `Lengthen your stride by ~${diff.toFixed(1)} ft. Focus on explosive hip drive and full extension.`;
  } else if (diff > 0.1) {
    recommendation = `Slight stride increase of ~${diff.toFixed(1)} ft would optimize your efficiency.`;
  } else if (diff > -0.1) {
    recommendation = 'Your stride length is near-optimal. Maintain current mechanics.';
  } else {
    recommendation = 'Your stride is longer than typical elite — ensure you maintain turnover speed.';
  }

  return { currentStride, optimalStride, recommendation };
}

// ─── Elite Analytics #3: Explosive Start Index ─────────

export function calcExplosiveStartIndex(twoStepTime: number, totalTime: number, steps: number): number {
  // Weighted formula: 50% two-step speed, 30% acceleration ratio, 20% step economy
  const twoStepScore = Math.max(0, Math.min(100, Math.round((1 - twoStepTime / 1.2) * 100)));
  const accelRatio = twoStepTime / totalTime;
  const accelScore = Math.max(0, Math.min(100, Math.round((1 - accelRatio / 0.35) * 100)));
  const stepScore = Math.max(0, Math.min(100, Math.round((1 - steps / 20) * 100)));

  return Math.max(0, Math.min(100, Math.round(twoStepScore * 0.5 + accelScore * 0.3 + stepScore * 0.2)));
}

export function getExplosiveStartGrade(score: number): Grade {
  if (score >= 85) return 'Elite';
  if (score >= 70) return 'Above Average';
  if (score >= 50) return 'Average';
  return 'Below Average';
}

// ─── Composite Profile ────────────────────────────────

export interface SoftballStealProfile {
  jumpQuality: ReturnType<typeof calcJumpQuality>;
  accelerationEfficiency: ReturnType<typeof calcAccelerationEfficiency>;
  strideEfficiency: ReturnType<typeof calcStrideEfficiency>;
  stealTimeRating: ReturnType<typeof calcStealTimeRating>;
  catcherMatchup: CatcherMatchupResult;
  strideModel: StrideModelResult;
  explosiveStartIndex: number;
  explosiveStartGrade: Grade;
  stealEfficiencyScore: number;
}

export function buildStealProfile(
  twoStepTime: number,
  totalTime: number,
  steps: number,
  baseDist: number,
  decisionAccuracyPct: number
): SoftballStealProfile {
  const jumpQuality = calcJumpQuality(twoStepTime, baseDist);
  const accelerationEfficiency = calcAccelerationEfficiency(twoStepTime, totalTime);
  const strideEfficiency = calcStrideEfficiency(steps, baseDist);
  const stealTimeRating = calcStealTimeRating(totalTime, baseDist);
  const catcherMatchup = calcCatcherMatchupSuccess(totalTime);
  const strideModel = calcOptimalStride(baseDist, steps, totalTime);
  const explosiveStartIndex = calcExplosiveStartIndex(twoStepTime, totalTime, steps);
  const explosiveStartGrade = getExplosiveStartGrade(explosiveStartIndex);

  // Weighted composite: Jump 30%, Acceleration 30%, Stride 15%, Accuracy 25%
  const stealEfficiencyScore = Math.round(
    jumpQuality.percentile * 0.3 +
    (100 - accelerationEfficiency.pct * (100 / ACCELERATION_EFFICIENCY.avgMaxPct)) * 0.3 +
    (strideEfficiency.strideLength / (baseDist / 10) * 100) * 0.15 +
    decisionAccuracyPct * 0.25
  );

  return {
    jumpQuality,
    accelerationEfficiency,
    strideEfficiency,
    stealTimeRating,
    catcherMatchup,
    strideModel,
    explosiveStartIndex,
    explosiveStartGrade,
    stealEfficiencyScore: Math.max(0, Math.min(100, stealEfficiencyScore)),
  };
}
