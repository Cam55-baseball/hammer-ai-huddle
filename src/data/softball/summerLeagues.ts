export interface KnownSummerLeague {
  name: string;
  difficulty_multiplier: number;
  league_difficulty_index: number;
}

export const softballSummerLeagues: KnownSummerLeague[] = [
  { name: 'AUSL Summer', difficulty_multiplier: 1.10, league_difficulty_index: 0.92 },
  { name: 'USA Softball National Team', difficulty_multiplier: 1.15, league_difficulty_index: 0.96 },
  { name: 'Premier Girls Fastpitch', difficulty_multiplier: 0.95, league_difficulty_index: 0.80 },
  { name: 'Alliance Fastpitch', difficulty_multiplier: 0.93, league_difficulty_index: 0.78 },
  { name: 'Top Club National', difficulty_multiplier: 0.90, league_difficulty_index: 0.76 },
  { name: 'USA Elite Select', difficulty_multiplier: 0.92, league_difficulty_index: 0.78 },
  { name: 'Triple Crown Sports', difficulty_multiplier: 0.88, league_difficulty_index: 0.74 },
];
