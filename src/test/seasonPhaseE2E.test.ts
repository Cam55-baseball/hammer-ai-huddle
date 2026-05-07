import { describe, it, expect } from 'vitest';
import {
  resolveSeasonPhase,
  getSeasonProfile,
  clampWorkoutSets,
  clampHighCnsSessions,
  applyMacroTilt,
  computeHammerState,
  type SeasonPhase,
} from '@/lib/seasonPhase';

interface Fixture {
  label: string;
  settings: Record<string, string>;
  expected: SeasonPhase;
  expectedSetCap: number;
  expectedHighCns: number;
  expectMacroTilt: boolean;
  expectStateAtPrimeFixture: 'prime' | 'ready' | 'caution';
}

const today = new Date().toISOString().slice(0, 10);
const inAYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

const FIXTURES: Fixture[] = [
  {
    label: 'preseason',
    settings: { preseason_start_date: today, preseason_end_date: inAYear },
    expected: 'preseason',
    expectedSetCap: 6,
    expectedHighCns: 3,
    expectMacroTilt: true,
    expectStateAtPrimeFixture: 'prime',
  },
  {
    label: 'in_season',
    settings: { in_season_start_date: today, in_season_end_date: inAYear },
    expected: 'in_season',
    expectedSetCap: 4,
    expectedHighCns: 1,
    expectMacroTilt: true,
    expectStateAtPrimeFixture: 'ready',
  },
  {
    label: 'post_season',
    settings: { post_season_start_date: today, post_season_end_date: inAYear },
    expected: 'post_season',
    expectedSetCap: 3,
    expectedHighCns: 0,
    expectMacroTilt: true,
    expectStateAtPrimeFixture: 'caution',
  },
  {
    label: 'off_season',
    settings: {},
    expected: 'off_season',
    expectedSetCap: 6,
    expectedHighCns: 4,
    expectMacroTilt: false,
    expectStateAtPrimeFixture: 'prime',
  },
];

describe('Season phase E2E (resolver → workout → nutrition → hammer state)', () => {
  it.each(FIXTURES)('phase pipeline holds for $label', (fx) => {
    // 1. Resolver
    const resolved = resolveSeasonPhase(fx.settings);
    expect(resolved.phase).toBe(fx.expected);

    // 2. Profile
    const profile = getSeasonProfile(resolved.phase);
    expect(profile.maxSetsPerExercise).toBe(fx.expectedSetCap);
    expect(profile.maxHighCnsPerWeek).toBe(fx.expectedHighCns);

    // 3. Workout clamps
    expect(clampWorkoutSets(99, resolved.phase)).toBe(fx.expectedSetCap);
    expect(clampHighCnsSessions(['a', 'b', 'c', 'd'], resolved.phase)).toHaveLength(
      Math.min(fx.expectedHighCns, 4),
    );

    // 4. Nutrition tilt
    const base = { protein: 100, carbs: 100, fats: 100 };
    const tilted = applyMacroTilt(base, resolved.phase);
    if (fx.expectMacroTilt) {
      expect(tilted).not.toEqual(base);
    } else {
      expect(tilted).toEqual(base);
    }

    // 5. Hammer state — identical fixture (score 80, recovery 70)
    expect(computeHammerState(80, 70, resolved.phase)).toBe(fx.expectStateAtPrimeFixture);
  });
});
