/**
 * Notable events — showcase and international competitions that an athlete
 * has participated in. These are NOT levels of play; they surface separately
 * in recruiting / scouting views and never feed the base competition-weight
 * multiplier.
 *
 * `prestige_index` is used by recruiting-visibility surfaces (Phase 111–150
 * doctrine) — it does not modify training load.
 */
export interface CompetitionEvent {
  key: string;
  label: string;
  sports: ('baseball' | 'softball')[];
  prestige_index: number;
}

export const competitionEvents: CompetitionEvent[] = [
  { key: 'showcase_perfect_game', label: 'Perfect Game showcase', sports: ['baseball'], prestige_index: 0.75 },
  { key: 'showcase_pbr', label: 'PBR showcase', sports: ['baseball'], prestige_index: 0.70 },
  { key: 'showcase_pgf', label: 'PGF (Premier Girls Fastpitch)', sports: ['softball'], prestige_index: 0.75 },
  { key: 'showcase_generic', label: 'Other showcase / camp', sports: ['baseball', 'softball'], prestige_index: 0.55 },
  { key: 'collegiate_national_team', label: 'Collegiate National Team', sports: ['baseball', 'softball'], prestige_index: 0.90 },
  { key: 'wbc', label: 'World Baseball Classic', sports: ['baseball'], prestige_index: 1.00 },
  { key: 'world_championship', label: 'World Championship', sports: ['baseball', 'softball'], prestige_index: 0.95 },
  { key: 'olympic', label: 'Olympic Games', sports: ['baseball', 'softball'], prestige_index: 1.00 },
];

export function getEventsForSport(sport: 'baseball' | 'softball'): CompetitionEvent[] {
  return competitionEvents.filter((e) => e.sports.includes(sport));
}
