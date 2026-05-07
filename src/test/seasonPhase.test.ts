import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  resolveSeasonPhase,
  getSeasonProfile,
  SEASON_PROFILES,
  type SeasonPhase,
} from '@/lib/seasonPhase';

const FIXED_NOW = new Date('2026-04-15T12:00:00Z');

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});
afterAll(() => {
  vi.useRealTimers();
});

describe('resolveSeasonPhase', () => {
  it('returns off_season default when settings are null', () => {
    const r = resolveSeasonPhase(null);
    expect(r.phase).toBe('off_season');
    expect(r.source).toBe('default');
  });

  it('returns off_season default when settings are empty', () => {
    const r = resolveSeasonPhase({});
    expect(r.phase).toBe('off_season');
    expect(r.source).toBe('default');
  });

  it.each<[SeasonPhase, Record<string, string>]>([
    ['preseason', { preseason_start_date: '2026-04-01', preseason_end_date: '2026-04-30' }],
    ['in_season', { in_season_start_date: '2026-04-01', in_season_end_date: '2026-04-30' }],
    ['post_season', { post_season_start_date: '2026-04-01', post_season_end_date: '2026-04-30' }],
  ])('matches the %s window via date_window', (phase, dates) => {
    const r = resolveSeasonPhase(dates);
    expect(r.phase).toBe(phase);
    expect(r.source).toBe('date_window');
    expect(r.daysIntoPhase).toBeGreaterThanOrEqual(0);
    expect(r.daysUntilNextPhase).toBeGreaterThanOrEqual(0);
  });

  it('falls back to stored season_status when no window matches', () => {
    const r = resolveSeasonPhase({ season_status: 'in_season' });
    expect(r.phase).toBe('in_season');
    expect(r.source).toBe('stored');
  });

  it('falls back to off_season default when stored value is invalid', () => {
    const r = resolveSeasonPhase({ season_status: 'bogus' });
    expect(r.phase).toBe('off_season');
    expect(r.source).toBe('default');
  });
});

describe('SEASON_PROFILES invariants', () => {
  it('in_season caps are tightest for sets and high-CNS', () => {
    expect(SEASON_PROFILES.in_season.maxSetsPerExercise).toBeLessThanOrEqual(4);
    expect(SEASON_PROFILES.in_season.maxHighCnsPerWeek).toBeLessThanOrEqual(1);
    expect(SEASON_PROFILES.in_season.newSkillWork).toBe('refinement_only');
  });

  it('post_season forbids high-CNS sessions', () => {
    expect(SEASON_PROFILES.post_season.maxHighCnsPerWeek).toBe(0);
  });

  it('off_season has the highest caps', () => {
    expect(SEASON_PROFILES.off_season.maxSetsPerExercise).toBeGreaterThanOrEqual(
      SEASON_PROFILES.in_season.maxSetsPerExercise,
    );
    expect(SEASON_PROFILES.off_season.maxHighCnsPerWeek).toBeGreaterThanOrEqual(
      SEASON_PROFILES.preseason.maxHighCnsPerWeek,
    );
  });

  it('getSeasonProfile returns the matching profile for each phase', () => {
    (['preseason', 'in_season', 'post_season', 'off_season'] as SeasonPhase[]).forEach((p) => {
      expect(getSeasonProfile(p).phase).toBe(p);
    });
  });
});
