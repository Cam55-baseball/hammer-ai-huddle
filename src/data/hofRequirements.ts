export const hofRequirements = {
  minProProbability: 100,
  minConsecutiveSeasons: 5,
  eligibleLeagues: { baseball: ['mlb'], softball: ['ausl'] },
  seasonDefinition: 'One or more regular season games played in a single calendar year',
  activationMessage: 'Hall of Fame tracking activated. Continue competing at the highest level.',
};

export function isHoFEligible(proProbability: number, mlbSeasons: number, auslSeasons: number, sport: string): boolean {
  // Baseball: only MLB seasons count. Softball: MLB + AUSL both count.
  const eligibleSeasons = sport === 'baseball' ? mlbSeasons : mlbSeasons + auslSeasons;
  return proProbability >= hofRequirements.minProProbability && eligibleSeasons >= hofRequirements.minConsecutiveSeasons;
}

export function getHoFCountdown(mlbSeasons: number, auslSeasons: number, sport: string): { seasonsRemaining: number; message: string } {
  const eligibleSeasons = sport === 'baseball' ? mlbSeasons : mlbSeasons + auslSeasons;
  const remaining = Math.max(0, hofRequirements.minConsecutiveSeasons - eligibleSeasons);
  return {
    seasonsRemaining: remaining,
    message: remaining > 0 ? `${remaining} more season${remaining > 1 ? 's' : ''} to HoF eligibility` : 'HoF eligible!',
  };
}
