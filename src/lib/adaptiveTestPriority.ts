// =====================================================================
// ADAPTIVE TEST PRIORITIZATION
// =====================================================================
// Determines which metrics to focus on and which to reduce in the
// next test cycle based on current grades and testing history.
// =====================================================================

import { rawToGrade } from '@/lib/gradeEngine';
import { METRIC_BY_KEY } from '@/data/performanceTestRegistry';

export interface NextTestFocus {
  prioritized: { key: string; label: string; reason: string }[];
  reduced: { key: string; label: string; reason: string }[];
  summary: string;
}

interface TestHistoryEntry {
  results: Record<string, number>;
  test_date: string;
}

/**
 * Analyze test history and determine next-cycle focus.
 * Algorithm: priority = (80 - currentGrade) * (1 / (testFrequency + 1))
 */
export function getNextTestFocus(
  testHistory: TestHistoryEntry[],
  sport: 'baseball' | 'softball',
  age?: number | null
): NextTestFocus {
  if (testHistory.length === 0) {
    return {
      prioritized: [],
      reduced: [],
      summary: 'Complete your first test to receive personalized priorities.',
    };
  }

  const latest = testHistory[0];
  
  // Count how many times each metric has been tested across history
  const frequency: Record<string, number> = {};
  for (const entry of testHistory) {
    for (const key of Object.keys(entry.results)) {
      if (key.startsWith('_')) continue;
      frequency[key] = (frequency[key] || 0) + 1;
    }
  }

  // Compute priority score for each metric in latest test
  const scores: { key: string; label: string; grade: number; priority: number; freq: number }[] = [];
  
  for (const [key, value] of Object.entries(latest.results)) {
    if (key.startsWith('_')) continue;
    const def = METRIC_BY_KEY[key];
    if (!def) continue;
    
    const grade = rawToGrade(key, value, sport, age);
    if (grade === null) continue;
    
    const improvementPotential = 80 - grade;
    const freq = frequency[key] || 1;
    const priorityScore = improvementPotential * (1 / (freq + 1));
    
    scores.push({
      key,
      label: def.label,
      grade,
      priority: priorityScore,
      freq,
    });
  }

  // Sort by priority descending
  scores.sort((a, b) => b.priority - a.priority);

  // Top 5 by priority → prioritized
  const prioritized = scores.slice(0, 5).map(s => ({
    key: s.key,
    label: s.label,
    reason: `Grade: ${s.grade} — ${80 - s.grade} points of improvement potential`,
  }));

  // Metrics with grade > 65 AND tested 2+ times → reduced
  const reduced = scores
    .filter(s => s.grade > 65 && s.freq >= 2)
    .slice(0, 5)
    .map(s => ({
      key: s.key,
      label: s.label,
      reason: `Stable at ${s.grade}-grade (${s.freq} tests) — reduce testing frequency`,
    }));

  const summary = prioritized.length > 0
    ? `Focus on ${prioritized.map(p => p.label).join(', ')} next cycle.${reduced.length > 0 ? ` ${reduced.map(r => r.label).join(', ')} can be tested less frequently.` : ''}`
    : 'Continue comprehensive testing to establish baseline data.';

  return { prioritized, reduced, summary };
}
