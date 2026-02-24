export function getGradeLabel(score: number): string {
  if (score >= 70) return 'Elite';
  if (score >= 60) return 'Plus-Plus';
  if (score >= 55) return 'Plus';
  if (score >= 50) return 'Above Average';
  if (score >= 45) return 'Average';
  if (score >= 40) return 'Below Average';
  if (score >= 30) return 'Fringe';
  return 'Poor';
}
