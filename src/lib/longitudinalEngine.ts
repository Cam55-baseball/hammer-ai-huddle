// =====================================================================
// LONGITUDINAL ENGINE — Trend Analysis & Projections
// =====================================================================

import { rawToGrade, gradeToLabel } from '@/lib/gradeEngine';
import { METRIC_BY_KEY } from '@/data/performanceTestRegistry';

export interface MetricTrend {
  metricKey: string;
  label: string;
  currentGrade: number;
  previousGrade: number;
  ratePerCycle: number;
  trend: 'improving' | 'plateaued' | 'regressing';
  projection: string | null;
}

interface TestEntry {
  results: Record<string, number>;
  test_date: string;
}

/**
 * Compute trends for all metrics across test history.
 * Requires at least 2 test entries for meaningful results.
 */
export function computeTrends(
  testHistory: TestEntry[],
  sport: 'baseball' | 'softball',
  age?: number | null
): MetricTrend[] {
  if (testHistory.length < 2) return [];

  const trends: MetricTrend[] = [];
  const latest = testHistory[0];
  const previous = testHistory[1];

  for (const [key, currentValue] of Object.entries(latest.results)) {
    if (key.startsWith('_')) continue;
    const def = METRIC_BY_KEY[key];
    if (!def) continue;

    const prevValue = previous.results[key];
    if (prevValue === undefined) continue;

    const currentGrade = rawToGrade(key, currentValue, sport, age);
    const previousGrade = rawToGrade(key, prevValue, sport, age);
    
    if (currentGrade === null || previousGrade === null) continue;

    // Calculate rate per cycle (each test is ~6 weeks)
    const ratePerCycle = currentGrade - previousGrade;

    // If we have more history, compute average rate
    let avgRate = ratePerCycle;
    if (testHistory.length >= 3) {
      const grades: number[] = [];
      for (const entry of testHistory) {
        if (entry.results[key] !== undefined) {
          const g = rawToGrade(key, entry.results[key], sport, age);
          if (g !== null) grades.push(g);
        }
      }
      if (grades.length >= 2) {
        avgRate = (grades[0] - grades[grades.length - 1]) / (grades.length - 1);
      }
    }

    // Classify trend
    let trend: 'improving' | 'plateaued' | 'regressing';
    if (avgRate > 1.5) trend = 'improving';
    else if (avgRate < -1.5) trend = 'regressing';
    else trend = 'plateaued';

    // Generate projection
    let projection: string | null = null;
    if (trend === 'improving' && avgRate > 0) {
      const targetGrade = currentGrade < 60 ? 60 : 70;
      if (currentGrade < targetGrade) {
        const cyclesNeeded = Math.ceil((targetGrade - currentGrade) / avgRate);
        const weeks = cyclesNeeded * 6;
        projection = `Reach ${targetGrade}-grade ${gradeToLabel(targetGrade)} in ~${weeks} weeks`;
      }
    } else if (trend === 'regressing') {
      projection = `Declining at ${Math.abs(avgRate).toFixed(1)} points/cycle — needs attention`;
    }

    trends.push({
      metricKey: key,
      label: def.label,
      currentGrade,
      previousGrade,
      ratePerCycle: Math.round(avgRate * 10) / 10,
      trend,
      projection,
    });
  }

  return trends;
}

/**
 * Get summary statistics from trends.
 */
export function getTrendSummary(trends: MetricTrend[]): {
  improving: number;
  plateaued: number;
  regressing: number;
  topImproving: MetricTrend | null;
  topRegressing: MetricTrend | null;
} {
  const improving = trends.filter(t => t.trend === 'improving').length;
  const plateaued = trends.filter(t => t.trend === 'plateaued').length;
  const regressing = trends.filter(t => t.trend === 'regressing').length;
  
  const sorted = [...trends].sort((a, b) => b.ratePerCycle - a.ratePerCycle);
  
  return {
    improving,
    plateaued,
    regressing,
    topImproving: sorted.length > 0 && sorted[0].ratePerCycle > 0 ? sorted[0] : null,
    topRegressing: sorted.length > 0 && sorted[sorted.length - 1].ratePerCycle < 0 ? sorted[sorted.length - 1] : null,
  };
}
