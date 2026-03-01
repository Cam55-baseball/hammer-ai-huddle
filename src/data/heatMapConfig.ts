export interface HeatMapTypeConfig {
  id: string;
  label: string;
  gridSize: { rows: number; cols: number };
  colorScale: string[];
  blindZoneThreshold: number;
}

export const heatMapTypes: HeatMapTypeConfig[] = [
  { id: 'pitch_location', label: 'Pitch Location', gridSize: { rows: 3, cols: 3 }, colorScale: ['#f0f9ff', '#3b82f6', '#1e3a8a'], blindZoneThreshold: 5 },
  { id: 'swing_chase', label: 'Chase Zone', gridSize: { rows: 5, cols: 5 }, colorScale: ['#fef3c7', '#f59e0b', '#b45309'], blindZoneThreshold: 3 },
  { id: 'barrel_zone', label: 'Barrel Zone', gridSize: { rows: 3, cols: 3 }, colorScale: ['#ecfdf5', '#10b981', '#064e3b'], blindZoneThreshold: 5 },
  { id: 'fielding_range', label: 'Fielding Range', gridSize: { rows: 5, cols: 5 }, colorScale: ['#f5f3ff', '#8b5cf6', '#4c1d95'], blindZoneThreshold: 3 },
  { id: 'throw_accuracy', label: 'Throw Accuracy', gridSize: { rows: 3, cols: 3 }, colorScale: ['#fff1f2', '#f43f5e', '#881337'], blindZoneThreshold: 5 },
  { id: 'pitch_command', label: 'Pitch Command', gridSize: { rows: 3, cols: 3 }, colorScale: ['#f0fdfa', '#14b8a6', '#134e4a'], blindZoneThreshold: 5 },
  { id: 'miss_cluster', label: 'Miss Cluster', gridSize: { rows: 5, cols: 5 }, colorScale: ['#fdf2f8', '#ec4899', '#831843'], blindZoneThreshold: 2 },
  { id: 'situational_performance', label: 'Situational', gridSize: { rows: 4, cols: 4 }, colorScale: ['#fffbeb', '#f97316', '#7c2d12'], blindZoneThreshold: 3 },
  // New sport-aware maps
  { id: 'velocity_performance', label: 'Velocity Performance', gridSize: { rows: 3, cols: 3 }, colorScale: ['#fef2f2', '#ef4444', '#7f1d1d'], blindZoneThreshold: 5 },
  { id: 'intent_performance', label: 'Intent Success', gridSize: { rows: 3, cols: 3 }, colorScale: ['#f0fdf4', '#22c55e', '#14532d'], blindZoneThreshold: 5 },
  { id: 'exit_direction', label: 'Exit Direction', gridSize: { rows: 3, cols: 3 }, colorScale: ['#faf5ff', '#a855f7', '#581c87'], blindZoneThreshold: 5 },
  { id: 'bp_distance_power', label: 'BP Distance Power', gridSize: { rows: 3, cols: 3 }, colorScale: ['#fff7ed', '#f97316', '#9a3412'], blindZoneThreshold: 5 },
];

export const timeWindows = ['7d', '30d', 'season', 'career'] as const;
export const contextFilters = ['all', 'practice_only', 'game_only'] as const;

export type TimeWindow = typeof timeWindows[number];
export type ContextFilter = typeof contextFilters[number];
