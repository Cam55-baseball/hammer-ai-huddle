// Age-performance curve multipliers for baseball (peak 27-31)
export const baseballAgeCurves: Record<string, number> = {
  '10-12': 0.55,
  '13-14': 0.65,
  '15-16': 0.75,
  '17-18': 0.85,
  '19-22': 0.92,
  '23-26': 0.97,
  '27-31': 1.0,
  '32-35': 0.95,
  '36-38': 0.88,
  '39+': 0.80,
};

export function getBaseballAgeCurveMultiplier(age: number): number {
  if (age <= 12) return 0.55;
  if (age <= 14) return 0.65;
  if (age <= 16) return 0.75;
  if (age <= 18) return 0.85;
  if (age <= 22) return 0.92;
  if (age <= 26) return 0.97;
  if (age <= 31) return 1.0;
  if (age <= 35) return 0.95;
  if (age <= 38) return 0.88;
  return 0.80;
}
