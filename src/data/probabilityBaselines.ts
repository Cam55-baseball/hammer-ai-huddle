// Tiered probability thresholds for pro probability calculation
// Maps MPI score ranges to probability percentages

export interface TierThreshold {
  label: string;
  minScore: number;
  maxScore: number;
  minProb: number;
  maxProb: number;
}

export const tierThresholds: TierThreshold[] = [
  { label: 'elite', minScore: 80, maxScore: 100, minProb: 75, maxProb: 99 },
  { label: 'high', minScore: 65, maxScore: 79.99, minProb: 45, maxProb: 74 },
  { label: 'above_average', minScore: 55, maxScore: 64.99, minProb: 20, maxProb: 44 },
  { label: 'average', minScore: 45, maxScore: 54.99, minProb: 8, maxProb: 19 },
  { label: 'developing', minScore: 30, maxScore: 44.99, minProb: 2, maxProb: 7 },
  { label: 'entry', minScore: 0, maxScore: 29.99, minProb: 0.1, maxProb: 1.9 },
];

export function calculateProProbability(score: number): number {
  const tier = tierThresholds.find(t => score >= t.minScore && score <= t.maxScore);
  if (!tier) return 0.1;

  // Linear interpolation within the tier
  const scoreRange = tier.maxScore - tier.minScore;
  const probRange = tier.maxProb - tier.minProb;
  const ratio = scoreRange > 0 ? (score - tier.minScore) / scoreRange : 0;
  return tier.minProb + ratio * probRange;
}
