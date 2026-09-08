// =====================================================================
// GRADE ENGINE — 20-80 Scale Conversion via Piecewise Linear Interpolation
// =====================================================================

import {
  GRADE_BENCHMARKS,
  isSoftballGradable,
  type BenchmarkPoint,
} from '@/data/gradeBenchmarks';

import { METRIC_BY_KEY } from '@/data/performanceTestRegistry';
import {
  SCALE_ANCHOR_SNAPSHOT,
  isScaleOwned,
  resolutionFor,
} from '@/lib/benchmarks/canonical';
import { gradeFromScaleRow } from '@/lib/defense/beatenRunnerGrade';

/**
 * ONE SCALE. The 20-80 grade is MLB-anchored and NOT age-adjusted: a
 * 14-year-old is measured against the same standard as a big leaguer and
 * lands where he lands. Age is still accepted by the grading calls so
 * callers need not change, but it no longer selects a benchmark curve.
 */

/**
 * Piecewise linear interpolation between benchmark points.
 * Points must be sorted by raw value ascending for higher-is-better,
 * or descending for lower-is-better (handled automatically).
 */
function interpolate(raw: number, points: BenchmarkPoint[], higherIsBetter: boolean): number {
  if (points.length === 0) return 50; // No data → average (50 = MLB average)
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

  return 50;
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
  // Duplicated metrics: at the professional band the numbers are owned by
  // `scale_reference`, and the grade is computed by the SAME function the rep
  // surfaces use — so the same input scores the same wherever it is shown.
  // Youth bands keep their age-appropriate table entries (MLB anchors would
  // grade a 14-year-old against a big leaguer).
  if (sport === 'baseball' && isScaleOwned(metricKey)) {
    const canonical = resolutionFor(metricKey)!.canonical;
    const result = gradeFromScaleRow(rawValue, canonical, SCALE_ANCHOR_SNAPSHOT);
    return result.missing ? null : result.grade;
  }

  // Softball: no grade unless the benchmark is a real softball figure. The
  // converted-from-baseball columns are not graded against — see
  // SOFTBALL_UNGRADED_METRICS. The raw value is still recorded.
  if (sport === 'softball' && !isSoftballGradable(metricKey)) return null;


  const benchmarkEntry = GRADE_BENCHMARKS[metricKey];
  if (!benchmarkEntry) return null;

  const points = benchmarkEntry[sport];
  if (!points || points.length === 0) return null;

  const metricDef = METRIC_BY_KEY[metricKey];
  const higherIsBetter = metricDef?.higherIsBetter ?? true;

  const grade = interpolate(rawValue, points, higherIsBetter);
  return Math.max(20, Math.min(80, grade));
}

/**
 * Get a human-readable label for a 20-80 grade.
 */
export function gradeToLabel(grade: number): string {
  if (grade >= 80) return 'Elite';
  if (grade >= 70) return 'Plus-Plus';
  if (grade >= 60) return 'Plus';
  if (grade >= 55) return 'Above Average';
  if (grade >= 50) return 'Average';
  if (grade >= 45) return 'Fringe';
  if (grade >= 40) return 'Below Average';
  if (grade >= 30) return 'Well Below Average';
  return 'Poor';
}

/**
 * Get color class for grade display.
 */
export function gradeToColor(grade: number): string {
  if (grade >= 70) return 'text-emerald-400';
  if (grade >= 60) return 'text-green-500';
  if (grade >= 55) return 'text-blue-500';
  if (grade >= 50) return 'text-foreground';
  if (grade >= 45) return 'text-amber-500';
  if (grade >= 40) return 'text-amber-500';
  if (grade >= 30) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Raw CSS color matching gradeToColor — for SVG strokes, ring glows, and
 * meter fills where a Tailwind text class can't reach. Keep in lockstep
 * with gradeToColor above.
 */
export function gradeToHex(grade: number): string {
  if (grade >= 70) return '#34d399'; // emerald-400
  if (grade >= 60) return '#22c55e'; // green-500
  if (grade >= 55) return '#3b82f6'; // blue-500
  if (grade >= 50) return 'hsl(var(--foreground))';
  if (grade >= 45) return '#f59e0b'; // amber-500
  if (grade >= 40) return '#f59e0b'; // amber-500
  if (grade >= 30) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/**
 * Background wash + border classes matching gradeToColor, for hero panels
 * and anchored score surfaces. Meaningful (tier-driven), not decorative.
 */
export function gradeToSurface(grade: number): string {
  if (grade >= 70) return 'border-emerald-400/40 bg-emerald-400/5';
  if (grade >= 60) return 'border-green-500/40 bg-green-500/5';
  if (grade >= 55) return 'border-blue-500/40 bg-blue-500/5';
  if (grade >= 50) return 'border-border bg-muted/30';
  if (grade >= 45) return 'border-amber-500/40 bg-amber-500/5';
  if (grade >= 40) return 'border-amber-500/40 bg-amber-500/5';
  if (grade >= 30) return 'border-orange-500/40 bg-orange-500/5';
  return 'border-red-500/40 bg-red-500/5';
}

/**
 * Map a 0–100 model efficiency score onto the 20–80 scout scale so the
 * score can speak in the same grade language used everywhere else.
 * 100 → 80 (elite), 50 → 50 (average), 0 → 20 (poor).
 */
export function efficiencyToScoutGrade(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return Math.round(20 + clamped * 0.6);
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
