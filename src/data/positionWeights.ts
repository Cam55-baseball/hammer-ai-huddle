// Position weight multipliers reflect the difficulty/value of each position
// Higher multiplier = more weight given to that position's performance

export const positionWeights: Record<string, number> = {
  // Baseball positions
  C: 1.08,
  '1B': 0.95,
  '2B': 1.02,
  SS: 1.06,
  '3B': 1.00,
  LF: 0.96,
  CF: 1.04,
  RF: 0.98,
  P: 1.10,
  DH: 0.90,
  UT: 1.00,
  // Softball positions (same mapping)
  DP: 0.90,
};

export function getPositionWeight(position: string | null | undefined): number {
  if (!position) return 1.0;
  return positionWeights[position.toUpperCase()] ?? 1.0;
}
