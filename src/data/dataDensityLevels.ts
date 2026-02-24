export interface DataDensityLevel {
  level: number;
  name: string;
  subscriptionTier: string;
  fields: string[];
  description: string;
}

export const dataDensityLevels: DataDensityLevel[] = [
  {
    level: 1,
    name: 'Basic',
    subscriptionTier: 'free',
    fields: ['drill_type', 'intent', 'volume', 'execution_grade', 'outcome_tags'],
    description: 'Core session logging with drill blocks, intent, and outcome tags',
  },
  {
    level: 2,
    name: 'Enhanced',
    subscriptionTier: 'pitcher',
    fields: ['pitch_type', 'pitch_location', 'velocity_band', 'count', 'spin_rate'],
    description: 'Adds pitch-specific data for pitching analysis',
  },
  {
    level: 3,
    name: 'Advanced',
    subscriptionTier: '5tool',
    fields: ['contact_quality', 'exit_direction', 'swing_decision', 'situation_tag', 'fielding_micro', 'split_handedness'],
    description: 'Full micro-layer data for hitting, fielding, and splits',
  },
  {
    level: 4,
    name: 'Elite',
    subscriptionTier: 'golden2way',
    fields: ['pitcher_style_tag', 'cross_splits', 'defensive_splits', 'bio_metrics', 'advanced_fielding'],
    description: 'Complete data capture including cross-splits and pitcher style tags',
  },
];

export function getDataDensityForTier(tier: string): number {
  const mapping: Record<string, number> = {
    free: 1,
    pitcher: 2,
    '5tool': 3,
    golden2way: 4,
  };
  return mapping[tier] ?? 1;
}
