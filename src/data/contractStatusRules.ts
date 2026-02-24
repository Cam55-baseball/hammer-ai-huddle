export const contractStatusRules = {
  releasePenalties: [
    { releaseNumber: 1, penaltyPct: 12 },
    { releaseNumber: 2, penaltyPct: 18 },
    { releaseNumber: 3, penaltyPct: 25 },
  ],
  resignRelaxationDays: 30,
  freeAgentReduction: 5,
  retiredFreeze: true,
  injuredListMultiplier: 0.9,
};

export function getReleasePenalty(releaseCount: number): number {
  if (releaseCount <= 0) return 0;
  const rule = contractStatusRules.releasePenalties.find(r => r.releaseNumber === releaseCount);
  return rule ? rule.penaltyPct : 30; // 30% max for 4+ releases
}
