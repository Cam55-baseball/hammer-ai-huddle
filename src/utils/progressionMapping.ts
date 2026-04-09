/**
 * Maps experience_level strings to progression_level numeric ranges
 * and progression numbers to display labels.
 */

export function getProgressionRange(experienceLevel: string | null): [number, number] {
  switch (experienceLevel?.toLowerCase()) {
    case 'beginner':
    case 'youth':
      return [1, 3];
    case 'intermediate':
    case 'middle_school':
      return [3, 5];
    case 'advanced':
    case 'high_school':
      return [4, 6];
    case 'professional':
    case 'college':
    case 'elite':
      return [5, 7];
    default:
      return [2, 5];
  }
}

export function getProgressionLabel(level: number): string {
  if (level <= 2) return 'Youth';
  if (level === 3) return 'Middle School';
  if (level === 4) return 'High School';
  if (level === 5) return 'College';
  return 'Pro/Elite';
}

/** Expand range by ±1 for fallback (clamped 1-7) */
export function expandRange(range: [number, number]): [number, number] {
  return [Math.max(1, range[0] - 1), Math.min(7, range[1] + 1)];
}
