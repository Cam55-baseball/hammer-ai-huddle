export interface PitcherStyle {
  id: string;
  label: string;
  description: string;
  bqiImpactMultiplier: number;
}

export const softballPitcherStyles: PitcherStyle[] = [
  { id: 'riseball', label: 'Riseball Pitcher', description: 'Relies heavily on riseball to get swings and misses up in the zone', bqiImpactMultiplier: 1.15 },
  { id: 'dropball', label: 'Dropball Pitcher', description: 'Uses drop ball and drop curve to generate ground balls', bqiImpactMultiplier: 1.1 },
  { id: 'speed', label: 'Speed Pitcher', description: 'Overpowers hitters with velocity and fastball command', bqiImpactMultiplier: 1.05 },
  { id: 'spin', label: 'Spin Pitcher', description: 'Uses movement and deception over raw velocity', bqiImpactMultiplier: 1.12 },
];
