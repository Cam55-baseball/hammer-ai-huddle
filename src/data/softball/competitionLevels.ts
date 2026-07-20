export interface CompetitionLevel {
  key: string;
  label: string;
  category: 'youth' | 'collegiate' | 'summer' | 'professional';
  competition_weight_multiplier: number;
  league_difficulty_index: number;
  pre_collegiate: boolean;
  /** When true, the picker prompts for an age-group sub-selection (6U…18U). */
  ageGroupEligible?: boolean;
}

// Playing tiers ONLY — no age groups, no events. Age groups live in
// `src/data/softball/ageGroups.ts`; events live in `src/data/competitionEvents.ts`.
export const softballCompetitionLevels: CompetitionLevel[] = [
  // Youth / Amateur (Pre-Collegiate)
  { key: 'rec', label: 'Recreational', category: 'youth', competition_weight_multiplier: 0.50, league_difficulty_index: 0.35, pre_collegiate: true, ageGroupEligible: true },
  { key: 'little_league', label: 'Little League', category: 'youth', competition_weight_multiplier: 0.55, league_difficulty_index: 0.38, pre_collegiate: true, ageGroupEligible: true },
  { key: 'middle_school', label: 'Middle School', category: 'youth', competition_weight_multiplier: 0.60, league_difficulty_index: 0.45, pre_collegiate: true },
  { key: 'travel', label: 'Travel Ball', category: 'youth', competition_weight_multiplier: 0.75, league_difficulty_index: 0.60, pre_collegiate: true, ageGroupEligible: true },
  { key: 'hs_jv', label: 'High School JV', category: 'youth', competition_weight_multiplier: 0.80, league_difficulty_index: 0.65, pre_collegiate: true },
  { key: 'hs_varsity', label: 'High School Varsity', category: 'youth', competition_weight_multiplier: 0.85, league_difficulty_index: 0.70, pre_collegiate: true },

  // Collegiate
  { key: 'juco', label: 'JUCO', category: 'collegiate', competition_weight_multiplier: 0.90, league_difficulty_index: 0.75, pre_collegiate: false },
  { key: 'naia', label: 'NAIA', category: 'collegiate', competition_weight_multiplier: 0.92, league_difficulty_index: 0.77, pre_collegiate: false },
  { key: 'd3', label: 'NCAA D3', category: 'collegiate', competition_weight_multiplier: 0.95, league_difficulty_index: 0.80, pre_collegiate: false },
  { key: 'd2', label: 'NCAA D2', category: 'collegiate', competition_weight_multiplier: 1.00, league_difficulty_index: 0.85, pre_collegiate: false },
  { key: 'd1', label: 'NCAA D1', category: 'collegiate', competition_weight_multiplier: 1.10, league_difficulty_index: 0.92, pre_collegiate: false },

  // Summer Ball
  { key: 'summer_generic', label: 'Summer League', category: 'summer', competition_weight_multiplier: 0.90, league_difficulty_index: 0.72, pre_collegiate: false },

  // Professional
  { key: 'indie_pro', label: 'Independent Pro', category: 'professional', competition_weight_multiplier: 1.12, league_difficulty_index: 0.90, pre_collegiate: false },
  { key: 'foreign_league', label: 'International Pro', category: 'professional', competition_weight_multiplier: 1.15, league_difficulty_index: 0.90, pre_collegiate: false },
  { key: 'wpf', label: 'WPF', category: 'professional', competition_weight_multiplier: 1.30, league_difficulty_index: 0.94, pre_collegiate: false },
  { key: 'npf', label: 'NPF', category: 'professional', competition_weight_multiplier: 1.35, league_difficulty_index: 0.96, pre_collegiate: false },
  { key: 'ausl', label: 'AUSL', category: 'professional', competition_weight_multiplier: 1.40, league_difficulty_index: 0.98, pre_collegiate: false },
];
