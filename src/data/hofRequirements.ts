export const hofRequirements = {
  minProProbability: 100,
  minConsecutiveSeasons: 5,
  eligibleLeagues: { baseball: ['mlb'], softball: ['ausl'] },
  seasonDefinition: 'One or more regular season games played in a single calendar year',
  activationMessage: 'Hall of Fame tracking activated. Continue competing at the highest level.',
};

export function isHoFEligible(proProbability: number, consecutiveSeasons: number, sport: string): boolean {
  return proProbability >= hofRequirements.minProProbability && consecutiveSeasons >= hofRequirements.minConsecutiveSeasons;
}

export function getHoFCountdown(consecutiveSeasons: number): { seasonsRemaining: number; message: string } {
  const remaining = Math.max(0, hofRequirements.minConsecutiveSeasons - consecutiveSeasons);
  return {
    seasonsRemaining: remaining,
    message: remaining > 0 ? `${remaining} more season${remaining > 1 ? 's' : ''} to HoF eligibility` : 'HoF eligible!',
  };
}
