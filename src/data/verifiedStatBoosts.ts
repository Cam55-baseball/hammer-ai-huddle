export const verifiedStatBoosts: Record<string, { competitiveBoost: number; validationBoost: number; label: string }> = {
  mlb: { competitiveBoost: 22, validationBoost: 15, label: 'MLB Verified' },
  milb: { competitiveBoost: 8, validationBoost: 5, label: 'MiLB Verified' },
  ncaa_d1: { competitiveBoost: 12, validationBoost: 10, label: 'NCAA D1 Verified' },
  ncaa_d2: { competitiveBoost: 8, validationBoost: 7, label: 'NCAA D2 Verified' },
  ncaa_d3: { competitiveBoost: 5, validationBoost: 4, label: 'NCAA D3 Verified' },
  naia: { competitiveBoost: 4, validationBoost: 3, label: 'NAIA Verified' },
  ausl: { competitiveBoost: 22, validationBoost: 15, label: 'AUSL Verified' },
  indie_pro: { competitiveBoost: 6, validationBoost: 4, label: 'Indie Pro Verified' },
  foreign_pro: { competitiveBoost: 10, validationBoost: 7, label: 'Foreign Pro Verified' },
};
