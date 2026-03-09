/**
 * Advanced Steal Analytics - Pro-Level Baserunning Metrics
 * All functions are pure and work with both AI and Manual mode data
 */

import {
  getBenchmarksForDistance,
  DEFENSE_TIMING,
  SLIDE_TIME_ADJUSTMENT,
  LEAD_EFFICIENCY,
  ACCELERATION_EFFICIENCY,
  type DistanceBenchmarks,
} from '@/data/baseball/stealBenchmarks';

export type Grade = 'Elite' | 'Good' | 'Average' | 'Needs Work';
export type DefenseLevel = 'avg' | 'elite';

// ============================================
// BENCHMARK FUNCTIONS
// ============================================

export function getEliteBenchmark(baseDist: number): number {
  return getBenchmarksForDistance(baseDist).eliteTime;
}

export function getScaledBenchmarks(baseDist: number): DistanceBenchmarks {
  return getBenchmarksForDistance(baseDist);
}

export function calcBenchmarkDifference(
  playerTime: number,
  baseDist: number
): { diff: number; isElite: boolean; label: string } {
  const elite = getEliteBenchmark(baseDist);
  const diff = playerTime - elite;
  const isElite = diff <= 0;
  const label = isElite 
    ? 'At elite level' 
    : `+${diff.toFixed(2)}s from elite`;
  return { diff, isElite, label };
}

// ============================================
// STEAL WINDOW
// ============================================

function getDefenseTime(defenseLevel: DefenseLevel): number {
  return defenseLevel === 'elite' 
    ? DEFENSE_TIMING.eliteDefenseTotal 
    : DEFENSE_TIMING.avgDefenseTotal;
}

export function calcStealWindow(
  timeToBase: number,
  defenseLevel: DefenseLevel
): number {
  // Subtract slide adjustment since drill is standing run
  const adjustedPlayerTime = timeToBase - SLIDE_TIME_ADJUSTMENT;
  const defenseTime = getDefenseTime(defenseLevel);
  // Positive = safe, negative = out
  return defenseTime - adjustedPlayerTime;
}

export function interpretStealWindow(window: number): {
  label: string;
  color: 'green' | 'yellow' | 'red';
} {
  if (window >= 0.20) {
    return { label: 'Easy steal', color: 'green' };
  } else if (window >= 0.10) {
    return { label: 'Good steal chance', color: 'green' };
  } else if (window >= 0) {
    return { label: 'Bang-bang play', color: 'yellow' };
  } else if (window >= -0.10) {
    return { label: 'Close but likely out', color: 'red' };
  } else {
    return { label: 'Out', color: 'red' };
  }
}

// ============================================
// PROJECTED STEAL SUCCESS %
// ============================================

export function calcProjectedStealSuccess(
  timeToBase: number,
  defenseLevel: DefenseLevel
): number {
  const window = calcStealWindow(timeToBase, defenseLevel);
  
  // Use sigmoid curve centered at 0 window (breakeven point)
  // Steepness of 15 gives reasonable probability distribution
  const steepness = 15;
  const probability = 1 / (1 + Math.exp(-steepness * window));
  
  // Convert to percentage and clamp
  return Math.round(Math.min(100, Math.max(0, probability * 100)));
}

// ============================================
// ACCELERATION EFFICIENCY
// ============================================

export function calcAccelerationEfficiency(
  firstTwoStepsSec: number,
  timeToBaseSec: number
): { pct: number; grade: Grade } {
  if (timeToBaseSec <= 0) {
    return { pct: 0, grade: 'Average' };
  }
  
  const pct = (firstTwoStepsSec / timeToBaseSec) * 100;
  
  let grade: Grade;
  if (pct <= ACCELERATION_EFFICIENCY.eliteMaxPct) {
    grade = 'Elite';
  } else if (pct <= ACCELERATION_EFFICIENCY.goodMaxPct) {
    grade = 'Good';
  } else if (pct <= ACCELERATION_EFFICIENCY.avgMaxPct) {
    grade = 'Average';
  } else {
    grade = 'Needs Work';
  }
  
  return { pct, grade };
}

export function interpretAccelerationEfficiency(pct: number): string {
  if (pct <= ACCELERATION_EFFICIENCY.eliteMaxPct) {
    return 'Elite acceleration profile';
  } else if (pct <= ACCELERATION_EFFICIENCY.goodMaxPct) {
    return 'Good explosiveness';
  } else if (pct <= ACCELERATION_EFFICIENCY.avgMaxPct) {
    return 'Average acceleration';
  } else {
    return 'Slow first steps / strong top speed';
  }
}

// ============================================
// LEAD EFFICIENCY
// ============================================

export function calcLeadEfficiency(
  leadDist: number,
  baseDist: number
): { pct: number; grade: Grade; label: string } {
  if (baseDist <= 0 || leadDist <= 0) {
    return { pct: 0, grade: 'Average', label: 'No lead data' };
  }
  
  const pct = (leadDist / baseDist) * 100;
  
  let grade: Grade;
  let label: string;
  
  if (pct >= LEAD_EFFICIENCY.eliteMinPct && pct <= LEAD_EFFICIENCY.eliteMaxPct) {
    grade = 'Elite';
    label = 'Optimal lead range';
  } else if (pct >= LEAD_EFFICIENCY.goodMinPct && pct <= LEAD_EFFICIENCY.goodMaxPct) {
    grade = 'Good';
    label = 'Good lead distance';
  } else if (pct < LEAD_EFFICIENCY.avgMinPct) {
    grade = 'Needs Work';
    label = 'Lead too conservative';
  } else if (pct > LEAD_EFFICIENCY.avgMaxPct) {
    grade = 'Average';
    label = 'Lead may be too aggressive';
  } else {
    grade = 'Average';
    label = 'Average lead distance';
  }
  
  return { pct, grade, label };
}

// ============================================
// FEET STOLEN
// ============================================

export function calcFeetStolen(leadDist: number): number {
  // Lead distance directly equals feet saved from running
  return leadDist;
}

export function calcActualRunDistance(baseDist: number, leadDist: number): number {
  return baseDist - leadDist;
}

// ============================================
// ELITE STEAL PROFILE (COMPOSITE)
// ============================================

export interface StealProfile {
  takeoffGrade: Grade | null;
  accelerationEfficiencyPct: number | null;
  accelerationGrade: Grade | null;
  leadEfficiencyPct: number | null;
  leadGrade: Grade | null;
  timeToBase: number | null;
  stealWindowAvg: number | null;
  stealWindowElite: number | null;
  projectedSuccessAvg: number | null;
  projectedSuccessElite: number | null;
  feetStolen: number | null;
  actualRunDistance: number | null;
}

export function buildStealProfile(params: {
  avgDecision: number | null;
  avgFirstTwoSteps: number | null;
  avgRun: number | null;
  leadDist: number;
  baseDist: number;
}): StealProfile {
  const { avgDecision, avgFirstTwoSteps, avgRun, leadDist, baseDist } = params;
  
  // Takeoff grade based on decision time
  let takeoffGrade: Grade | null = null;
  if (avgDecision != null) {
    if (avgDecision <= 0.20) takeoffGrade = 'Elite';
    else if (avgDecision <= 0.30) takeoffGrade = 'Good';
    else if (avgDecision <= 0.45) takeoffGrade = 'Average';
    else takeoffGrade = 'Needs Work';
  }
  
  // Acceleration efficiency
  let accelerationEfficiencyPct: number | null = null;
  let accelerationGrade: Grade | null = null;
  if (avgFirstTwoSteps != null && avgRun != null && avgRun > 0) {
    const accel = calcAccelerationEfficiency(avgFirstTwoSteps, avgRun);
    accelerationEfficiencyPct = accel.pct;
    accelerationGrade = accel.grade;
  }
  
  // Lead efficiency
  let leadEfficiencyPct: number | null = null;
  let leadGrade: Grade | null = null;
  if (leadDist > 0 && baseDist > 0) {
    const lead = calcLeadEfficiency(leadDist, baseDist);
    leadEfficiencyPct = lead.pct;
    leadGrade = lead.grade;
  }
  
  // Steal window and projected success
  let stealWindowAvg: number | null = null;
  let stealWindowElite: number | null = null;
  let projectedSuccessAvg: number | null = null;
  let projectedSuccessElite: number | null = null;
  if (avgRun != null && avgRun > 0) {
    stealWindowAvg = calcStealWindow(avgRun, 'avg');
    stealWindowElite = calcStealWindow(avgRun, 'elite');
    projectedSuccessAvg = calcProjectedStealSuccess(avgRun, 'avg');
    projectedSuccessElite = calcProjectedStealSuccess(avgRun, 'elite');
  }
  
  // Feet stolen
  const feetStolen = leadDist > 0 ? calcFeetStolen(leadDist) : null;
  const actualRunDistance = leadDist > 0 && baseDist > 0 
    ? calcActualRunDistance(baseDist, leadDist) 
    : null;
  
  return {
    takeoffGrade,
    accelerationEfficiencyPct,
    accelerationGrade,
    leadEfficiencyPct,
    leadGrade,
    timeToBase: avgRun,
    stealWindowAvg,
    stealWindowElite,
    projectedSuccessAvg,
    projectedSuccessElite,
    feetStolen,
    actualRunDistance,
  };
}
