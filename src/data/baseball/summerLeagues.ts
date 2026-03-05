export interface KnownSummerLeague {
  name: string;
  difficulty_multiplier: number;
  league_difficulty_index: number;
}

export const baseballSummerLeagues: KnownSummerLeague[] = [
  { name: 'Cape Cod League', difficulty_multiplier: 1.08, league_difficulty_index: 0.90 },
  { name: 'Northwoods League', difficulty_multiplier: 0.92, league_difficulty_index: 0.78 },
  { name: 'Appalachian League', difficulty_multiplier: 0.95, league_difficulty_index: 0.80 },
  { name: 'New England Collegiate League', difficulty_multiplier: 0.90, league_difficulty_index: 0.76 },
  { name: 'Coastal Plain League', difficulty_multiplier: 0.88, league_difficulty_index: 0.74 },
  { name: 'Valley League', difficulty_multiplier: 0.87, league_difficulty_index: 0.73 },
  { name: 'California Collegiate League', difficulty_multiplier: 0.93, league_difficulty_index: 0.79 },
  { name: 'Alaska Baseball League', difficulty_multiplier: 0.95, league_difficulty_index: 0.80 },
  { name: 'Great Lakes Summer Collegiate League', difficulty_multiplier: 0.86, league_difficulty_index: 0.72 },
  { name: 'Perfect Game Collegiate Baseball League', difficulty_multiplier: 0.89, league_difficulty_index: 0.75 },
  { name: 'Prospect League', difficulty_multiplier: 0.88, league_difficulty_index: 0.74 },
  { name: 'Texas Collegiate League', difficulty_multiplier: 0.91, league_difficulty_index: 0.77 },
  { name: 'USA Collegiate National Team', difficulty_multiplier: 1.15, league_difficulty_index: 0.96 },
  { name: 'MLB Draft League', difficulty_multiplier: 1.05, league_difficulty_index: 0.88 },
];
