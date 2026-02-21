// =====================================================
// CUSTOM ACTIVITY LOAD CALCULATION
// Calculates CNS, fascial, and volume load from custom
// activity exercises to feed into athlete_load_tracking
// =====================================================

import { Exercise } from '@/types/customActivity';

export interface CustomActivityLoadMetrics {
  cnsLoad: number;
  fascialLoad: { compression: number; elastic: number; glide: number };
  volumeLoad: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeNum(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) return value;
  return fallback;
}

function parseReps(reps: number | string | undefined): number {
  if (typeof reps === 'number') return clamp(reps, 1, 100);
  if (typeof reps === 'string') {
    // Handle range like "10-12" → take average
    const parts = reps.split('-').map(s => parseFloat(s.trim()));
    const valid = parts.filter(n => !isNaN(n));
    if (valid.length > 0) return clamp(valid.reduce((a, b) => a + b, 0) / valid.length, 1, 100);
  }
  return 10; // default
}

/**
 * Calculate CNS load for a single custom activity exercise.
 * Mirrors the calculate-load edge function logic.
 */
function calculateExerciseCNS(exercise: Exercise): number {
  let cns = 0;

  // Base by exercise type
  switch (exercise.type) {
    case 'plyometric': cns = 40; break;
    case 'strength':   cns = 30; break;
    case 'baseball':   cns = 25; break;
    case 'cardio':     cns = 20; break;
    case 'core':       cns = 15; break;
    case 'flexibility': cns = 5; break;
    default:           cns = 15;
  }

  // Volume modifier (sets × reps)
  const sets = clamp(safeNum(exercise.sets, 1), 1, 20);
  const reps = parseReps(exercise.reps);
  cns += (sets * reps) * 0.5;

  // Intensity modifier
  if (exercise.intensity) {
    if (exercise.intensity >= 90) cns *= 1.3;
    else if (exercise.intensity >= 70) cns *= 1.1;
    else if (exercise.intensity <= 40) cns *= 0.8;
  }

  return Math.round(cns);
}

/**
 * Calculate fascial bias for a single exercise.
 */
function calculateExerciseFascia(exercise: Exercise): { compression: number; elastic: number; glide: number } {
  switch (exercise.type) {
    case 'strength':
      return { compression: 60, elastic: 20, glide: 20 };
    case 'plyometric':
      return { compression: 20, elastic: 70, glide: 10 };
    case 'flexibility':
      return { compression: 15, elastic: 15, glide: 70 };
    case 'cardio':
      return { compression: 30, elastic: 40, glide: 30 };
    case 'core':
      return { compression: 40, elastic: 30, glide: 30 };
    default:
      return { compression: 33, elastic: 34, glide: 33 };
  }
}

/**
 * Calculate total load metrics for a custom activity's exercises.
 * Returns null if no exercises to calculate (e.g. meal activities).
 */
export function calculateCustomActivityLoad(exercises: Exercise[]): CustomActivityLoadMetrics | null {
  if (!exercises || exercises.length === 0) return null;

  let totalCNS = 0;
  let totalVolume = 0;
  const totalFascia = { compression: 0, elastic: 0, glide: 0 };

  exercises.forEach(ex => {
    totalCNS += calculateExerciseCNS(ex);

    const sets = clamp(safeNum(ex.sets, 1), 1, 20);
    const reps = parseReps(ex.reps);
    totalVolume += sets * reps;

    const fascia = calculateExerciseFascia(ex);
    totalFascia.compression += fascia.compression;
    totalFascia.elastic += fascia.elastic;
    totalFascia.glide += fascia.glide;
  });

  // Average fascial bias across exercises
  const count = exercises.length;
  return {
    cnsLoad: totalCNS,
    fascialLoad: {
      compression: Math.round(totalFascia.compression / count),
      elastic: Math.round(totalFascia.elastic / count),
      glide: Math.round(totalFascia.glide / count),
    },
    volumeLoad: totalVolume,
  };
}
