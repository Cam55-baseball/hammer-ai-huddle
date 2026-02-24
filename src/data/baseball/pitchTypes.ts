export interface PitchType {
  id: string;
  name: string;
  abbreviation: string;
  velocityBaseline: { min: number; max: number };
  spinNorm: { min: number; max: number };
  tier: number;
}

export const baseballPitchTypes: PitchType[] = [
  { id: 'fastball_4seam', name: '4-Seam Fastball', abbreviation: 'FF', velocityBaseline: { min: 88, max: 100 }, spinNorm: { min: 2100, max: 2600 }, tier: 1 },
  { id: 'fastball_2seam', name: '2-Seam Fastball', abbreviation: 'FT', velocityBaseline: { min: 86, max: 96 }, spinNorm: { min: 1800, max: 2300 }, tier: 1 },
  { id: 'cutter', name: 'Cutter', abbreviation: 'FC', velocityBaseline: { min: 84, max: 94 }, spinNorm: { min: 2200, max: 2700 }, tier: 2 },
  { id: 'slider', name: 'Slider', abbreviation: 'SL', velocityBaseline: { min: 78, max: 90 }, spinNorm: { min: 2200, max: 2800 }, tier: 2 },
  { id: 'curveball', name: 'Curveball', abbreviation: 'CU', velocityBaseline: { min: 72, max: 84 }, spinNorm: { min: 2400, max: 3200 }, tier: 2 },
  { id: 'changeup', name: 'Changeup', abbreviation: 'CH', velocityBaseline: { min: 78, max: 88 }, spinNorm: { min: 1400, max: 1900 }, tier: 2 },
  { id: 'splitter', name: 'Splitter', abbreviation: 'FS', velocityBaseline: { min: 82, max: 90 }, spinNorm: { min: 1200, max: 1700 }, tier: 3 },
  { id: 'sinker', name: 'Sinker', abbreviation: 'SI', velocityBaseline: { min: 86, max: 96 }, spinNorm: { min: 1700, max: 2200 }, tier: 2 },
  { id: 'knuckle_curve', name: 'Knuckle Curve', abbreviation: 'KC', velocityBaseline: { min: 72, max: 82 }, spinNorm: { min: 2600, max: 3400 }, tier: 3 },
  { id: 'knuckleball', name: 'Knuckle Ball', abbreviation: 'KN', velocityBaseline: { min: 65, max: 82 }, spinNorm: { min: 0, max: 200 }, tier: 4 },
  { id: 'eephus', name: 'Eephus', abbreviation: 'EP', velocityBaseline: { min: 55, max: 72 }, spinNorm: { min: 800, max: 1500 }, tier: 4 },
];
