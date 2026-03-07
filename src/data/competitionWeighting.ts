import { baseballCompetitionLevels } from './baseball/competitionLevels';
import { softballCompetitionLevels } from './softball/competitionLevels';
import { baseballSummerLeagues } from './baseball/summerLeagues';
import { softballSummerLeagues } from './softball/summerLeagues';
import { ENGINE_CONTRACT } from './ENGINE_CONTRACT';

export interface CompetitionWeightResult {
  competition_weight_multiplier: number;
  age_play_up_bonus: number;
  league_difficulty_index: number;
}

/**
 * Get competition weight for a given sport and level.
 * Age play-up bonus only applies to pre-collegiate levels.
 */
export function getCompetitionWeight(
  sport: 'baseball' | 'softball',
  levelKey: string,
  athleteAge?: number,
  leagueAge?: number,
): CompetitionWeightResult {
  const levels = sport === 'baseball' ? baseballCompetitionLevels : softballCompetitionLevels;
  const level = levels.find(l => l.key === levelKey);

  if (!level) {
    return { competition_weight_multiplier: 1.0, age_play_up_bonus: 0, league_difficulty_index: 0.50 };
  }

  let ageBonus = 0;
  if (level.pre_collegiate && athleteAge && leagueAge && leagueAge > athleteAge) {
    const diff = leagueAge - athleteAge;
    ageBonus = Math.min(
      diff * ENGINE_CONTRACT.AGE_PLAY_UP_BONUS_PER_YEAR,
      ENGINE_CONTRACT.AGE_PLAY_UP_BONUS_CAP,
    );
  }

  return {
    competition_weight_multiplier: level.competition_weight_multiplier,
    age_play_up_bonus: ageBonus,
    league_difficulty_index: level.league_difficulty_index,
  };
}

/**
 * Apply competition weighting to a raw performance credit.
 * Higher competition = more credit for good performance.
 */
export function applyCompetitionCredit(rawCredit: number, weight: CompetitionWeightResult): number {
  return rawCredit * weight.competition_weight_multiplier * (1 + weight.age_play_up_bonus);
}

/**
 * Apply competition weighting to a raw performance deduction.
 * Higher competition = less penalty for poor performance.
 */
export function applyCompetitionDeduction(rawDeduction: number, weight: CompetitionWeightResult): number {
  return rawDeduction * (2.0 - weight.competition_weight_multiplier);
}

/**
 * Look up a known summer league by name (case-insensitive partial match).
 */
export function findKnownSummerLeague(sport: 'baseball' | 'softball', leagueName: string) {
  const leagues = sport === 'baseball' ? baseballSummerLeagues : softballSummerLeagues;
  const lower = leagueName.toLowerCase().trim();
  return leagues.find(l => l.name.toLowerCase().includes(lower) || lower.includes(l.name.toLowerCase()));
}

/**
 * Get all competition levels for a sport, grouped by category.
 */
export function getCompetitionLevelsByCategory(sport: 'baseball' | 'softball') {
  const levels = sport === 'baseball' ? baseballCompetitionLevels : softballCompetitionLevels;
  const categories = ['youth', 'collegiate', 'summer', 'professional'] as const;
  return categories.map(cat => ({
    category: cat,
    label: cat === 'youth' ? 'Youth / Amateur' : cat === 'collegiate' ? 'Collegiate' : cat === 'summer' ? 'College Summer Ball' : 'Professional',
    levels: levels.filter(l => l.category === cat),
  }));
}
