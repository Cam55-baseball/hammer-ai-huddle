export interface AIPromptRule {
  id: string;
  condition: string;
  promptTemplate: string;
  minDataDays: number;
  stabilityThreshold: number;
}

export const aiPromptRules: AIPromptRule[] = [
  { id: 'chase_rate_rising', condition: 'chase_rate_increase_8pct', promptTemplate: 'Your chase rate has increased {{delta}}% over the last {{days}} days. Focus on pitch recognition drills.', minDataDays: 14, stabilityThreshold: 8 },
  { id: 'barrel_drop', condition: 'barrel_pct_decrease_8pct', promptTemplate: 'Barrel rate has dropped {{delta}}%. Consider tee work focusing on swing path consistency.', minDataDays: 14, stabilityThreshold: 8 },
  { id: 'command_improvement', condition: 'command_pct_increase_10pct', promptTemplate: 'Command has improved {{delta}}% — great progress. Maintain current approach.', minDataDays: 14, stabilityThreshold: 10 },
  { id: 'blind_zone_alert', condition: 'heat_map_blind_zone', promptTemplate: 'Blind zone detected in {{zone}} area. Add targeted reps in this zone.', minDataDays: 14, stabilityThreshold: 0 },
  { id: 'consistency_drop', condition: 'grade_stability_drop_8pct', promptTemplate: 'Grade consistency has dropped {{delta}}%. Focus on process over results.', minDataDays: 14, stabilityThreshold: 8 },
  { id: 'fatigue_correlation', condition: 'fatigue_performance_mismatch', promptTemplate: 'Performance dips correlate with sleep/stress patterns. Prioritize recovery.', minDataDays: 14, stabilityThreshold: 0 },
  { id: 'split_weakness', condition: 'split_delta_15pct', promptTemplate: 'Significant split weakness detected: {{weakSide}} side is {{delta}}% below {{strongSide}} side.', minDataDays: 14, stabilityThreshold: 15 },
];
