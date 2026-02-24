export interface SplitDefinition {
  id: string;
  label: string;
  appliesTo: ('hitting' | 'pitching' | 'fielding')[];
  requiredLevel: number;
}

export const splitDefinitions: SplitDefinition[] = [
  { id: 'all', label: 'Overall', appliesTo: ['hitting', 'pitching', 'fielding'], requiredLevel: 1 },
  { id: 'vs_lhp', label: 'vs LHP', appliesTo: ['hitting'], requiredLevel: 2 },
  { id: 'vs_rhp', label: 'vs RHP', appliesTo: ['hitting'], requiredLevel: 2 },
  { id: 'vs_lhb', label: 'vs LHB', appliesTo: ['pitching'], requiredLevel: 2 },
  { id: 'vs_rhb', label: 'vs RHB', appliesTo: ['pitching'], requiredLevel: 2 },
  { id: 'batting_left', label: 'Batting Left', appliesTo: ['hitting'], requiredLevel: 2 },
  { id: 'batting_right', label: 'Batting Right', appliesTo: ['hitting'], requiredLevel: 2 },
  // Softball-specific
  { id: 'vs_riseball', label: 'vs Riseball Pitcher', appliesTo: ['hitting'], requiredLevel: 4 },
  { id: 'vs_dropball', label: 'vs Dropball Pitcher', appliesTo: ['hitting'], requiredLevel: 4 },
  { id: 'vs_speed', label: 'vs Speed Pitcher', appliesTo: ['hitting'], requiredLevel: 4 },
  { id: 'vs_spin', label: 'vs Spin Pitcher', appliesTo: ['hitting'], requiredLevel: 4 },
];

export const crossSplitCombinations = [
  { id: 'lhb_batting_left', label: 'LHB Batting Left Side', splits: ['vs_lhb', 'batting_left'] },
  { id: 'lhb_batting_right', label: 'LHB Batting Right Side', splits: ['vs_lhb', 'batting_right'] },
  { id: 'rhb_batting_left', label: 'RHB Batting Left Side', splits: ['vs_rhb', 'batting_left'] },
  { id: 'rhb_batting_right', label: 'RHB Batting Right Side', splits: ['vs_rhb', 'batting_right'] },
];
