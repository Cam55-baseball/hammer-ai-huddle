// =====================================================================
// GRADE ENGINE — 20-80 Scale Conversion via Piecewise Linear Interpolation
// =====================================================================

import { GRADE_BENCHMARKS, type AgeBand, type BenchmarkPoint } from '@/data/gradeBenchmarks';
import { METRIC_BY_KEY } from '@/data/performanceTestRegistry';

/**
 * Convert an age (number) to an age band for benchmark lookup.
 */
export function ageToAgeBand(age: number | null | undefined): AgeBand {
  if (!age || age <= 14) return '14u';
  if (age <= 18) return '18u';
  if (age <= 22) return 'college';
  return 'pro';
}

/**
 * Piecewise linear interpolation between benchmark points.
 * Points must be sorted by raw value ascending for higher-is-better,
 * or descending for lower-is-better (handled automatically).
 */
function interpolate(raw: number, points: BenchmarkPoint[], higherIsBetter: boolean): number {
  if (points.length === 0) return 45; // No data → average
  if (points.length === 1) return points[0].grade;

  // Sort points by raw value ascending
  const sorted = [...points].sort((a, b) => a.raw - b.raw);

  if (higherIsBetter) {
    // Higher raw = higher grade
    if (raw <= sorted[0].raw) return sorted[0].grade;
    if (raw >= sorted[sorted.length - 1].raw) return sorted[sorted.length - 1].grade;

    for (let i = 0; i < sorted.length - 1; i++) {
      if (raw >= sorted[i].raw && raw <= sorted[i + 1].raw) {
        const t = (raw - sorted[i].raw) / (sorted[i + 1].raw - sorted[i].raw);
        return Math.round(sorted[i].grade + t * (sorted[i + 1].grade - sorted[i].grade));
      }
    }
  } else {
    // Lower raw = higher grade (times, etc.)
    // sorted ascending by raw: [1.55(80), 1.65(65), ..., 2.2(20)]
    // grades decrease as raw increases
    if (raw <= sorted[0].raw) return sorted[0].grade;
    if (raw >= sorted[sorted.length - 1].raw) return sorted[sorted.length - 1].grade;

    for (let i = 0; i < sorted.length - 1; i++) {
      if (raw >= sorted[i].raw && raw <= sorted[i + 1].raw) {
        const t = (raw - sorted[i].raw) / (sorted[i + 1].raw - sorted[i].raw);
        return Math.round(sorted[i].grade + t * (sorted[i + 1].grade - sorted[i].grade));
      }
    }
  }

  return 45;
}

/**
 * Convert a raw metric value to a 20-80 scout grade.
 * Returns null if no benchmark data exists for the metric.
 */
export function rawToGrade(
  metricKey: string,
  rawValue: number,
  sport: 'baseball' | 'softball',
  age?: number | null
): number | null {
  const benchmarkEntry = GRADE_BENCHMARKS[metricKey];
  if (!benchmarkEntry) return null;

  const sportBenchmarks = benchmarkEntry[sport];
  if (!sportBenchmarks || Object.keys(sportBenchmarks).length === 0) return null;

  const ageBand = ageToAgeBand(age);
  const metricDef = METRIC_BY_KEY[metricKey];
  const higherIsBetter = metricDef?.higherIsBetter ?? true;

  // Find best matching age band (try exact, then fall back)
  let points = sportBenchmarks[ageBand];
  if (!points) {
    // Fall back: try nearby age bands
    const fallbackOrder: AgeBand[] = ageBand === '14u' 
      ? ['18u', 'college', 'pro']
      : ageBand === '18u'
      ? ['college', '14u', 'pro']
      : ageBand === 'college'
      ? ['18u', 'pro', '14u']
      : ['college', '18u', '14u'];
    
    for (const fb of fallbackOrder) {
      if (sportBenchmarks[fb]) {
        points = sportBenchmarks[fb];
        break;
      }
    }
  }

  if (!points || points.length === 0) return null;

  const grade = interpolate(rawValue, points, higherIsBetter);
  return Math.max(20, Math.min(80, grade));
}

/**
 * Get a human-readable label for a 20-80 grade.
 */
export function gradeToLabel(grade: number): string {
  if (grade >= 70) return 'Elite';
  if (grade >= 60) return 'Plus-Plus';
  if (grade >= 55) return 'Plus';
  if (grade >= 50) return 'Above Average';
  if (grade >= 45) return 'Average';
  if (grade >= 40) return 'Below Average';
  if (grade >= 30) return 'Fringe';
  return 'Poor';
}

/**
 * Get color class for grade display.
 */
export function gradeToColor(grade: number): string {
  if (grade >= 70) return 'text-emerald-400';
  if (grade >= 60) return 'text-green-500';
  if (grade >= 55) return 'text-blue-500';
  if (grade >= 50) return 'text-cyan-500';
  if (grade >= 45) return 'text-foreground';
  if (grade >= 40) return 'text-amber-500';
  if (grade >= 30) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Batch-grade all results for a test.
 */
export function gradeAllResults(
  results: Record<string, number>,
  sport: 'baseball' | 'softball',
  age?: number | null
): Record<string, number> {
  const grades: Record<string, number> = {};
  for (const [key, value] of Object.entries(results)) {
    if (key.startsWith('_')) continue; // Skip metadata
    const grade = rawToGrade(key, value, sport, age);
    if (grade !== null) grades[key] = grade;
  }
  return grades;
}
