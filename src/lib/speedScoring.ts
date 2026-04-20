// =====================================================================
// SPEED SCORING — Sport-Normalized Acceleration & Top-End Speed
// =====================================================================
// Combines sport-specific dash distances into normalized subscores,
// then applies a fascial-elasticity modifier to the overall speed grade.
// =====================================================================

import { rawToGrade } from '@/lib/gradeEngine';

export interface SpeedSubscores {
  accel: number | null;
  maxSpeed: number | null;
  overall: number | null;
  elasticBoost: number;
  asymmetryPenalty: number;
  asymmetryPct: number | null;
  combinedElasticOutput: number | null;
}

const ACCEL_WEIGHT = 0.45;
const MAX_SPEED_WEIGHT = 0.55;

/**
 * Compute sport-normalized speed subscores + elasticity coupling.
 *
 * Baseball:  Accel = 10yd dash, Max Speed = 60yd dash.
 * Softball:  Accel = 7yd dash,  Max Speed = 40yd dash.
 *
 * Elasticity modifier:
 *   +1 grade per 10 elasticity points above 50 (cap +5)
 *   −1 grade per 5% asymmetry above 10% (cap −5)
 */
export function computeSpeedSubscores(
  results: Record<string, number>,
  sport: 'baseball' | 'softball',
  age?: number | null
): SpeedSubscores {
  const accelKey = sport === 'baseball' ? 'ten_yard_dash' : 'seven_yard_dash';
  const maxKey = sport === 'baseball' ? 'sixty_yard_dash' : 'forty_yard_dash';

  const accel = results[accelKey] !== undefined
    ? rawToGrade(accelKey, results[accelKey], sport, age)
    : null;
  const maxSpeed = results[maxKey] !== undefined
    ? rawToGrade(maxKey, results[maxKey], sport, age)
    : null;

  // Elasticity inputs (bilateral)
  const left = results['sl_3x_bound_left'];
  const right = results['sl_3x_bound_right'];
  let combinedElasticOutput: number | null = null;
  let asymmetryPct: number | null = null;

  if (left !== undefined && right !== undefined && left > 0 && right > 0) {
    const leftGrade = rawToGrade('sl_3x_bound', left, sport, age);
    const rightGrade = rawToGrade('sl_3x_bound', right, sport, age);
    if (leftGrade !== null && rightGrade !== null) {
      combinedElasticOutput = Math.round((leftGrade + rightGrade) / 2);
    }
    asymmetryPct = (Math.abs(left - right) / Math.max(left, right)) * 100;
  }

  // Compute base overall (weighted accel + max speed)
  let baseOverall: number | null = null;
  if (accel !== null && maxSpeed !== null) {
    baseOverall = accel * ACCEL_WEIGHT + maxSpeed * MAX_SPEED_WEIGHT;
  } else if (accel !== null) {
    baseOverall = accel;
  } else if (maxSpeed !== null) {
    baseOverall = maxSpeed;
  }

  // Elasticity boost: +1 per 10 pts above 50, capped +5
  let elasticBoost = 0;
  if (combinedElasticOutput !== null && combinedElasticOutput > 50) {
    elasticBoost = Math.min(5, Math.floor((combinedElasticOutput - 50) / 10));
  }

  // Asymmetry penalty: −1 per 5% above 10%, capped −5
  let asymmetryPenalty = 0;
  if (asymmetryPct !== null && asymmetryPct > 10) {
    asymmetryPenalty = -Math.min(5, Math.floor((asymmetryPct - 10) / 5) + 1);
  }

  const overall = baseOverall !== null
    ? Math.max(20, Math.min(80, Math.round(baseOverall + elasticBoost + asymmetryPenalty)))
    : null;

  return {
    accel,
    maxSpeed,
    overall,
    elasticBoost,
    asymmetryPenalty,
    asymmetryPct,
    combinedElasticOutput,
  };
}
