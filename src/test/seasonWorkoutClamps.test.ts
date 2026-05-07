import { describe, it, expect } from 'vitest';
import {
  clampWorkoutSets,
  clampHighCnsSessions,
  rpeDeloadThreshold,
  shouldDeloadByRpe,
  allowsVolumeIncrease,
  applyMacroTilt,
  computeHammerState,
  PHASE_HAMMER_THRESHOLDS,
  type SeasonPhase,
} from '@/lib/seasonPhase';

const PHASES: SeasonPhase[] = ['preseason', 'in_season', 'post_season', 'off_season'];

describe('Workout clamps', () => {
  it.each(PHASES)('clamps sets per exercise for %s', (phase) => {
    const clamped = clampWorkoutSets(8, phase);
    expect(clamped).toBeLessThanOrEqual(8);
    expect(clamped).toBeGreaterThanOrEqual(1);
  });

  it('in_season caps to 4 sets, post_season to 3', () => {
    expect(clampWorkoutSets(99, 'in_season')).toBe(4);
    expect(clampWorkoutSets(99, 'post_season')).toBe(3);
    expect(clampWorkoutSets(99, 'off_season')).toBe(6);
  });

  it('trims high-CNS sessions per phase cap', () => {
    const week = ['s1', 's2', 's3', 's4'];
    expect(clampHighCnsSessions(week, 'in_season')).toHaveLength(1);
    expect(clampHighCnsSessions(week, 'post_season')).toHaveLength(0);
    expect(clampHighCnsSessions(week, 'preseason').length).toBeGreaterThanOrEqual(3);
    expect(clampHighCnsSessions(week, 'off_season').length).toBe(4);
  });
});

describe('Adapt: RPE deload + volume gate', () => {
  it('phase-tuned RPE deload threshold', () => {
    expect(rpeDeloadThreshold('in_season')).toBe(7.5);
    expect(rpeDeloadThreshold('off_season')).toBe(8.5);
    expect(rpeDeloadThreshold('preseason')).toBe(8);
    expect(rpeDeloadThreshold('post_season')).toBe(8);
  });

  it('triggers deload at-or-above threshold and not below', () => {
    expect(shouldDeloadByRpe(7.6, 'in_season')).toBe(true);
    expect(shouldDeloadByRpe(7.4, 'in_season')).toBe(false);
    expect(shouldDeloadByRpe(8.6, 'off_season')).toBe(true);
    expect(shouldDeloadByRpe(8.4, 'off_season')).toBe(false);
  });

  it('blocks volume increases in_season + post_season; allows otherwise', () => {
    expect(allowsVolumeIncrease('in_season')).toBe(false);
    expect(allowsVolumeIncrease('post_season')).toBe(false);
    expect(allowsVolumeIncrease('preseason')).toBe(true);
    expect(allowsVolumeIncrease('off_season')).toBe(true);
  });
});

describe('Nutrition macro tilts', () => {
  const baseline = { protein: 150, carbs: 300, fats: 80 };

  it('preseason: +8% carbs, +5% protein', () => {
    const r = applyMacroTilt(baseline, 'preseason');
    expect(r.carbs).toBe(324);
    expect(r.protein).toBe(158);
    expect(r.fats).toBe(80);
  });

  it('in_season: +5% carbs, slight fat dip', () => {
    const r = applyMacroTilt(baseline, 'in_season');
    expect(r.carbs).toBe(315);
    expect(r.protein).toBe(150);
    expect(r.fats).toBe(76);
  });

  it('post_season: -10% carbs, +5% protein', () => {
    const r = applyMacroTilt(baseline, 'post_season');
    expect(r.carbs).toBe(270);
    expect(r.protein).toBe(158);
  });

  it('off_season: no tilt', () => {
    expect(applyMacroTilt(baseline, 'off_season')).toEqual(baseline);
  });
});

describe('Hammer state thresholds', () => {
  it('in_season + post_season are ~13–17% tighter than off_season', () => {
    const off = PHASE_HAMMER_THRESHOLDS.off_season.prime;
    const inS = PHASE_HAMMER_THRESHOLDS.in_season.prime;
    const post = PHASE_HAMMER_THRESHOLDS.post_season.prime;
    const inRatio = inS / off;
    const postRatio = post / off;
    expect(inRatio).toBeGreaterThan(1.0);
    expect(inRatio).toBeLessThan(1.2);
    expect(postRatio).toBeGreaterThan(1.1);
    expect(postRatio).toBeLessThan(1.2);
  });

  it('identical fixture demotes state under in_season vs off_season', () => {
    const score = 80;
    const recovery = 70;
    expect(computeHammerState(score, recovery, 'off_season')).toBe('prime');
    expect(computeHammerState(score, recovery, 'in_season')).toBe('ready');
    expect(computeHammerState(score, recovery, 'post_season')).toBe('caution');
  });
});
