// Age curve multipliers by sport
// Younger athletes get slight boost for development potential
// Peak years get 1.0, older athletes get slight reduction

interface AgeBracket {
  minAge: number;
  maxAge: number;
  multiplier: number;
}

export const ageCurves: Record<string, AgeBracket[]> = {
  baseball: [
    { minAge: 0, maxAge: 15, multiplier: 0.85 },
    { minAge: 16, maxAge: 18, multiplier: 0.92 },
    { minAge: 19, maxAge: 22, multiplier: 0.97 },
    { minAge: 23, maxAge: 27, multiplier: 1.0 },   // peak
    { minAge: 28, maxAge: 32, multiplier: 0.98 },
    { minAge: 33, maxAge: 36, multiplier: 0.95 },
    { minAge: 37, maxAge: 40, multiplier: 0.90 },
    { minAge: 41, maxAge: 999, multiplier: 0.85 },
  ],
  softball: [
    { minAge: 0, maxAge: 14, multiplier: 0.85 },
    { minAge: 15, maxAge: 17, multiplier: 0.92 },
    { minAge: 18, maxAge: 21, multiplier: 0.97 },
    { minAge: 22, maxAge: 28, multiplier: 1.0 },   // peak
    { minAge: 29, maxAge: 33, multiplier: 0.97 },
    { minAge: 34, maxAge: 38, multiplier: 0.93 },
    { minAge: 39, maxAge: 999, multiplier: 0.88 },
  ],
};

export function getAgeCurveMultiplier(sport: string, age: number): number {
  const curves = ageCurves[sport] || ageCurves.baseball;
  const bracket = curves.find(b => age >= b.minAge && age <= b.maxAge);
  return bracket?.multiplier ?? 1.0;
}
