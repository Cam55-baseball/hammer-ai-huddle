// Age-performance curve multipliers for softball (peak earlier: 23-28)
export const softballAgeCurves: Record<string, number> = {
  '10-12': 0.55,
  '13-14': 0.65,
  '15-16': 0.78,
  '17-18': 0.88,
  '19-22': 0.95,
  '23-28': 1.0,
  '29-32': 0.94,
  '33-35': 0.87,
  '36+': 0.78,
};

export function getSoftballAgeCurveMultiplier(age: number): number {
  if (age <= 12) return 0.55;
  if (age <= 14) return 0.65;
  if (age <= 16) return 0.78;
  if (age <= 18) return 0.88;
  if (age <= 22) return 0.95;
  if (age <= 28) return 1.0;
  if (age <= 32) return 0.94;
  if (age <= 35) return 0.87;
  return 0.78;
}
