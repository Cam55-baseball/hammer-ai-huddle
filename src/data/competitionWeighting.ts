import { baseballCompetitionLevels } from './baseball/competitionLevels';
import { softballCompetitionLevels } from './softball/competitionLevels';
import { baseballAgeGroups } from './baseball/ageGroups';
import { softballAgeGroups } from './softball/ageGroups';
import { baseballSummerLeagues } from './baseball/summerLeagues';
import { softballSummerLeagues } from './softball/summerLeagues';
import { ENGINE_CONTRACT } from './ENGINE_CONTRACT';

export interface CompetitionWeightResult {
  competition_weight_multiplier: number;
  age_play_up_bonus: number;
  league_difficulty_index: number;
  /** Out-of-state travel modifier applied when play_state ≠ home_state. */
  travel_state_modifier?: number;
}

export interface CompetitionWeightInputs {
  sport: 'baseball' | 'softball';
  levelKey: string;
  ageGroupKey?: string;
  athleteAge?: number;
  leagueAge?: number;
  homeState?: string;
  playState?: string;
}

/**
 * Get competition weight for a given sport and level.
 *
 * Composition (all optional):
 *   base × age_group_factor × (1 + age_play_up_bonus) × travel_state_modifier
 *
 * `ageGroupKey` scales the tier by the age bracket the athlete actually plays
 * in (a 12U on a 14U travel team is different from a natural 14U).
 * `homeState` ≠ `playState` triggers a small out-of-state travel modifier —
 * playing PG events in GA while living in OH is a legitimate signal of
 * competitive circuit exposure.
 */
export function getCompetitionWeight(
  sportOrInputs: 'baseball' | 'softball' | CompetitionWeightInputs,
  levelKey?: string,
  athleteAge?: number,
  leagueAge?: number,
): CompetitionWeightResult {
  // Backwards-compatible legacy signature: (sport, levelKey, athleteAge?, leagueAge?)
  const inputs: CompetitionWeightInputs = typeof sportOrInputs === 'string'
    ? { sport: sportOrInputs, levelKey: levelKey ?? '', athleteAge, leagueAge }
    : sportOrInputs;

  const levels = inputs.sport === 'baseball' ? baseballCompetitionLevels : softballCompetitionLevels;
  const ageGroups = inputs.sport === 'baseball' ? baseballAgeGroups : softballAgeGroups;
  const level = levels.find(l => l.key === inputs.levelKey);

  if (!level) {
    return { competition_weight_multiplier: 1.0, age_play_up_bonus: 0, league_difficulty_index: 0.50 };
  }

  let ageBonus = 0;
  if (level.pre_collegiate && inputs.athleteAge && inputs.leagueAge && inputs.leagueAge > inputs.athleteAge) {
    const diff = inputs.leagueAge - inputs.athleteAge;
    ageBonus = Math.min(
      diff * ENGINE_CONTRACT.AGE_PLAY_UP_BONUS_PER_YEAR,
      ENGINE_CONTRACT.AGE_PLAY_UP_BONUS_CAP,
    );
  }

  const ageGroupFactor = inputs.ageGroupKey
    ? (ageGroups.find(g => g.key === inputs.ageGroupKey)?.multiplier ?? 1.0)
    : 1.0;

  const travelStateModifier =
    inputs.homeState && inputs.playState && inputs.homeState !== inputs.playState && level.pre_collegiate
      ? 1.05
      : 1.0;

  return {
    competition_weight_multiplier: level.competition_weight_multiplier * ageGroupFactor * travelStateModifier,
    age_play_up_bonus: ageBonus,
    league_difficulty_index: level.league_difficulty_index,
    travel_state_modifier: travelStateModifier,
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

/**
 * Age-group catalog per sport (for the picker's conditional sub-select).
 */
export function getAgeGroupsForSport(sport: 'baseball' | 'softball') {
  return sport === 'baseball' ? baseballAgeGroups : softballAgeGroups;
}
