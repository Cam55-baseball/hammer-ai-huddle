import { DemoSim, between, rng, seedFromString } from './simEngine';

export type PitchType = 'fastball' | 'curveball' | 'changeup' | 'slider';
export type ContactZone = 'inside' | 'middle' | 'outside';

export interface HittingInput { pitch: PitchType; zone: ContactZone; }

export type Severity = 'minor' | 'moderate' | 'critical';

export interface HittingOutput {
  exitVelo: number;
  launchAngle: number;
  batPathScore: number;
  swingIQ: number;
  result: 'Line Drive' | 'Hard Grounder' | 'Fly Ball' | 'Barrel';
  insightTeaser: string;
  benchmark: {
    label: string;
    eliteEv: number;
    eliteLaunch: [number, number];
    gapMph: number;
    severity: Severity;
    primaryAxis: 'exit_velo' | 'launch_angle' | 'bat_path';
    projectedImprovement: string;
    whyItMatters: string;
  };
}

const PITCH_BIAS: Record<PitchType, number> = { fastball: 4, curveball: -2, changeup: 0, slider: -1 };
const ZONE_BIAS: Record<ContactZone, number> = { inside: -3, middle: 6, outside: -2 };
const ELITE_EV = 95;
const ELITE_LA: [number, number] = [14, 22];

function severityFor(gap: number): Severity {
  if (gap >= 8) return 'critical';
  if (gap >= 4) return 'moderate';
  return 'minor';
}

export const hittingSim = {
  id: 'hitting',
  run(input: HittingInput, opts?: { userId?: string | null }): HittingOutput {
    const userKey = opts?.userId ?? 'anon';
    const r = rng(seedFromString(`${input.pitch}:${input.zone}:${userKey}`));
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

    const gapMph = Math.max(0, Math.round((ELITE_EV - exitVelo) * 10) / 10);
    const launchOff = launchAngle < ELITE_LA[0] || launchAngle > ELITE_LA[1];
    const primaryAxis: HittingOutput['benchmark']['primaryAxis'] =
      gapMph >= 4 ? 'exit_velo' : launchOff ? 'launch_angle' : 'bat_path';
    const severity = severityFor(gapMph);

    return {
      exitVelo,
      launchAngle,
      batPathScore: Math.min(100, Math.max(0, batPathScore)),
      swingIQ: Math.min(100, Math.max(0, swingIQ)),
      result,
      insightTeaser: 'Bat-path entry angle vs. pitch tunnel — unlock to see the full breakdown.',
      benchmark: {
        label: 'Elite high-school+ contact',
        eliteEv: ELITE_EV,
        eliteLaunch: ELITE_LA,
        gapMph,
        severity,
        primaryAxis,
        projectedImprovement: gapMph > 0
          ? `+${Math.min(gapMph, 8).toFixed(1)} mph in 8 weeks with prescribed drills`
          : 'Consistency unlock: convert 30% more swings into barrels',
        whyItMatters: gapMph >= 4
          ? `Each 1 mph of EV adds ~5 ft of distance. Your gap costs you ~${Math.round(gapMph * 5)} ft per ball in the air.`
          : launchOff
          ? `Your launch angle is outside the ${ELITE_LA[0]}–${ELITE_LA[1]}° barrel band — most balls in play go for outs.`
          : 'You\'re in range — the unlock is bat-path consistency under elite pitch speeds.',
      },
    };
  },
};
