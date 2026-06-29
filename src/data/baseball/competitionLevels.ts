export interface CompetitionLevel {
  key: string;
  label: string;
  category: 'youth' | 'collegiate' | 'summer' | 'professional';
  competition_weight_multiplier: number;
  league_difficulty_index: number;
  pre_collegiate: boolean;
}

export const baseballCompetitionLevels: CompetitionLevel[] = [
  // Youth / Amateur (Pre-Collegiate)
  { key: '6u', label: 'T-Ball / 6U', category: 'youth', competition_weight_multiplier: 0.20, league_difficulty_index: 0.10, pre_collegiate: true },
  { key: '8u', label: '8U Coach Pitch', category: 'youth', competition_weight_multiplier: 0.25, league_difficulty_index: 0.15, pre_collegiate: true },
  { key: '10u', label: '10U', category: 'youth', competition_weight_multiplier: 0.32, league_difficulty_index: 0.20, pre_collegiate: true },
  { key: '12u', label: '12U', category: 'youth', competition_weight_multiplier: 0.40, league_difficulty_index: 0.25, pre_collegiate: true },
  { key: '13u', label: '13U', category: 'youth', competition_weight_multiplier: 0.45, league_difficulty_index: 0.28, pre_collegiate: true },
  { key: '14u', label: '14U', category: 'youth', competition_weight_multiplier: 0.50, league_difficulty_index: 0.32, pre_collegiate: true },
  { key: 'little_league', label: 'Little League', category: 'youth', competition_weight_multiplier: 0.45, league_difficulty_index: 0.30, pre_collegiate: true },
  { key: 'rec', label: 'Recreational', category: 'youth', competition_weight_multiplier: 0.50, league_difficulty_index: 0.35, pre_collegiate: true },
  { key: 'youth', label: 'Youth (Other)', category: 'youth', competition_weight_multiplier: 0.55, league_difficulty_index: 0.40, pre_collegiate: true },
  { key: 'middle_school', label: 'Middle School', category: 'youth', competition_weight_multiplier: 0.60, league_difficulty_index: 0.45, pre_collegiate: true },
  { key: 'travel', label: 'Travel Ball', category: 'youth', competition_weight_multiplier: 0.70, league_difficulty_index: 0.55, pre_collegiate: true },
  { key: 'hs_freshman', label: 'High School Freshman', category: 'youth', competition_weight_multiplier: 0.72, league_difficulty_index: 0.57, pre_collegiate: true },
  { key: 'hs_jv', label: 'High School JV', category: 'youth', competition_weight_multiplier: 0.75, league_difficulty_index: 0.60, pre_collegiate: true },
  { key: 'hs_varsity', label: 'High School Varsity', category: 'youth', competition_weight_multiplier: 0.82, league_difficulty_index: 0.68, pre_collegiate: true },
  { key: 'showcase_perfect_game', label: 'Showcase / Perfect Game', category: 'youth', competition_weight_multiplier: 0.85, league_difficulty_index: 0.72, pre_collegiate: true },

  // Collegiate
  { key: 'juco', label: 'JUCO', category: 'collegiate', competition_weight_multiplier: 0.85, league_difficulty_index: 0.72, pre_collegiate: false },
  { key: 'naia', label: 'NAIA', category: 'collegiate', competition_weight_multiplier: 0.87, league_difficulty_index: 0.74, pre_collegiate: false },
  { key: 'd3', label: 'D3', category: 'collegiate', competition_weight_multiplier: 0.90, league_difficulty_index: 0.78, pre_collegiate: false },
  { key: 'd2', label: 'D2', category: 'collegiate', competition_weight_multiplier: 0.95, league_difficulty_index: 0.83, pre_collegiate: false },
  { key: 'd1', label: 'D1', category: 'collegiate', competition_weight_multiplier: 1.05, league_difficulty_index: 0.92, pre_collegiate: false },

  // Summer Ball (known leagues in summerLeagues.ts, AI-classified fallback)
  { key: 'summer_generic', label: 'College Summer Ball', category: 'summer', competition_weight_multiplier: 0.85, league_difficulty_index: 0.70, pre_collegiate: false },
  { key: 'cape_cod', label: 'Cape Cod League', category: 'summer', competition_weight_multiplier: 1.15, league_difficulty_index: 0.92, pre_collegiate: false },
  { key: 'collegiate_olympic', label: 'Collegiate Olympic', category: 'summer', competition_weight_multiplier: 1.20, league_difficulty_index: 0.94, pre_collegiate: false },

  // Professional
  { key: 'foreign_league', label: 'Foreign League', category: 'professional', competition_weight_multiplier: 1.10, league_difficulty_index: 0.88, pre_collegiate: false },
  { key: 'indie_pro', label: 'Independent Pro', category: 'professional', competition_weight_multiplier: 1.12, league_difficulty_index: 0.90, pre_collegiate: false },
  { key: 'winter_ball', label: 'Winter Ball', category: 'professional', competition_weight_multiplier: 1.08, league_difficulty_index: 0.86, pre_collegiate: false },
  { key: 'academy', label: 'Academy', category: 'professional', competition_weight_multiplier: 1.05, league_difficulty_index: 0.84, pre_collegiate: false },
  { key: 'rookie', label: 'Rookie', category: 'professional', competition_weight_multiplier: 1.10, league_difficulty_index: 0.88, pre_collegiate: false },
  { key: 'low_a', label: 'Low-A', category: 'professional', competition_weight_multiplier: 1.15, league_difficulty_index: 0.91, pre_collegiate: false },
  { key: 'high_a', label: 'High-A', category: 'professional', competition_weight_multiplier: 1.20, league_difficulty_index: 0.93, pre_collegiate: false },
  { key: 'aa', label: 'AA', category: 'professional', competition_weight_multiplier: 1.28, league_difficulty_index: 0.95, pre_collegiate: false },
  { key: 'aaa', label: 'AAA', category: 'professional', competition_weight_multiplier: 1.35, league_difficulty_index: 0.97, pre_collegiate: false },
  // HARD-CODED: MLB = AAA (1.35) + 0.75 = 2.10 (founder mandate — do NOT auto-recalculate)
  { key: 'mlb', label: 'MLB', category: 'professional', competition_weight_multiplier: 2.10, league_difficulty_index: 1.00, pre_collegiate: false },
  { key: 'wbc', label: 'WBC', category: 'professional', competition_weight_multiplier: 1.55, league_difficulty_index: 1.00, pre_collegiate: false },
  { key: 'olympic', label: 'Olympic', category: 'professional', competition_weight_multiplier: 1.55, league_difficulty_index: 1.00, pre_collegiate: false },
];
