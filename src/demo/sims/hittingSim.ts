import { DemoSim, between, rng, seedFromString } from './simEngine';

export type PitchType = 'fastball' | 'curveball' | 'changeup' | 'slider';
export type ContactZone = 'inside' | 'middle' | 'outside';

export interface HittingInput {
  pitch: PitchType;
  zone: ContactZone;
}

export interface HittingOutput {
  exitVelo: number;        // mph
  launchAngle: number;     // degrees
  batPathScore: number;    // 0-100
  swingIQ: number;         // 0-100
  result: 'Line Drive' | 'Hard Grounder' | 'Fly Ball' | 'Barrel';
  insightTeaser: string;
}

const PITCH_BIAS: Record<PitchType, number> = { fastball: 4, curveball: -2, changeup: 0, slider: -1 };
const ZONE_BIAS: Record<ContactZone, number> = { inside: -3, middle: 6, outside: -2 };

export const hittingSim: DemoSim<HittingInput, HittingOutput> = {
  id: 'hitting',
  run(input) {
    const r = rng(seedFromString(`${input.pitch}:${input.zone}`));
    const baseEv = 82 + PITCH_BIAS[input.pitch] + ZONE_BIAS[input.zone] + between(r, 0, 8);
    const exitVelo = Math.round(baseEv * 10) / 10;
    const launchAngle = Math.round(between(r, 8, 28) * 10) / 10;
    const batPathScore = Math.round(50 + ZONE_BIAS[input.zone] * 4 + between(r, 0, 30));
    const swingIQ = Math.round((batPathScore * 0.6) + (Math.min(95, exitVelo) * 0.4));
    const result: HittingOutput['result'] =
      exitVelo > 92 && launchAngle > 18 && launchAngle < 28 ? 'Barrel'
      : launchAngle < 12 ? 'Hard Grounder'
      : launchAngle > 24 ? 'Fly Ball'
      : 'Line Drive';
    return {
      exitVelo,
      launchAngle,
      batPathScore: Math.min(100, Math.max(0, batPathScore)),
      swingIQ: Math.min(100, Math.max(0, swingIQ)),
      result,
      insightTeaser: 'Bat-path entry angle vs. pitch tunnel — unlock to see the full breakdown.',
    };
  },
};
