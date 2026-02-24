import type { PitchType } from '../baseball/pitchTypes';

export const softballPitchTypes: PitchType[] = [
  { id: 'fastball_windmill', name: 'Fastball (Windmill)', abbreviation: 'FB', velocityBaseline: { min: 55, max: 72 }, spinNorm: { min: 1000, max: 1600 }, tier: 1 },
  { id: 'circle_change', name: 'Circle Change', abbreviation: 'CC', velocityBaseline: { min: 48, max: 60 }, spinNorm: { min: 800, max: 1300 }, tier: 2 },
  { id: 'riseball', name: 'Riseball', abbreviation: 'RB', velocityBaseline: { min: 54, max: 70 }, spinNorm: { min: 1200, max: 1800 }, tier: 2 },
  { id: 'dropball', name: 'Drop Ball', abbreviation: 'DB', velocityBaseline: { min: 52, max: 66 }, spinNorm: { min: 1100, max: 1600 }, tier: 2 },
  { id: 'drop_curve', name: 'Drop Curve', abbreviation: 'DC', velocityBaseline: { min: 50, max: 64 }, spinNorm: { min: 1200, max: 1700 }, tier: 2 },
  { id: 'screwball', name: 'Screwball', abbreviation: 'SC', velocityBaseline: { min: 50, max: 64 }, spinNorm: { min: 1000, max: 1500 }, tier: 3 },
  { id: 'drop_screw', name: 'Drop Screw', abbreviation: 'DS', velocityBaseline: { min: 48, max: 62 }, spinNorm: { min: 1000, max: 1400 }, tier: 3 },
  { id: 'flip_change', name: 'Flip Change', abbreviation: 'FL', velocityBaseline: { min: 46, max: 58 }, spinNorm: { min: 700, max: 1100 }, tier: 3 },
  { id: 'curveball', name: 'Curveball', abbreviation: 'CU', velocityBaseline: { min: 48, max: 62 }, spinNorm: { min: 1100, max: 1600 }, tier: 2 },
  { id: 'knuckleball', name: 'Knuckle Ball', abbreviation: 'KN', velocityBaseline: { min: 42, max: 56 }, spinNorm: { min: 0, max: 200 }, tier: 4 },
  { id: 'offspeed', name: 'Off-Speed', abbreviation: 'OS', velocityBaseline: { min: 44, max: 58 }, spinNorm: { min: 600, max: 1200 }, tier: 3 },
];
