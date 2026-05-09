/**
 * Wave F — Corner cases: malformed meta, zero candidates, all-suppressed,
 * cold start, rollout hashing.
 */
import { describe, it, expect } from 'vitest';
import {
  parseFoundationMeta,
  scoreFoundationCandidates,
} from '../foundationVideos';
import {
  computeOnboardingGate,
  applyOnboardingGate,
  isBeginnerSafe,
  userInRollout,
} from '../foundationOnboarding';

describe('parseFoundationMeta — malformed inputs', () => {
  it('null / non-object → null', () => {
    expect(parseFoundationMeta(null)).toBeNull();
    expect(parseFoundationMeta('x')).toBeNull();
    expect(parseFoundationMeta(42)).toBeNull();
  });
  it('unknown domain → null', () => {
    expect(parseFoundationMeta({
      domain: 'cricket', scope: 'philosophy_a_to_z',
      audience_levels: ['beginner'], refresher_triggers: ['lost_feel'],
    })).toBeNull();
  });
  it('empty audience_levels → null', () => {
    expect(parseFoundationMeta({
      domain: 'hitting', scope: 'philosophy_a_to_z',
      audience_levels: [], refresher_triggers: ['lost_feel'],
    })).toBeNull();
  });
  it('strips unknown enum values forward-compat', () => {
    const r = parseFoundationMeta({
      domain: 'hitting', scope: 'philosophy_a_to_z',
      audience_levels: ['beginner', 'super_elite'],
      refresher_triggers: ['lost_feel', 'unknown_trigger_v2'],
    });
    expect(r?.audience_levels).toEqual(['beginner']);
    expect(r?.refresher_triggers).toEqual(['lost_feel']);
  });
});

describe('scoreFoundationCandidates — edge cases', () => {
  it('zero candidates → empty', () => {
    expect(scoreFoundationCandidates({
      candidates: [], activeTriggers: ['lost_feel'], tierBoost: { normal: 1 },
    })).toEqual([]);
  });
  it('no active triggers → still scores with base=30', () => {
    const r = scoreFoundationCandidates({
      candidates: [{
        id: 'v', title: 't', video_url: 'https://x',
        foundation_meta: {
          domain: 'hitting', scope: 'philosophy_a_to_z',
          audience_levels: ['all_levels'], refresher_triggers: ['lost_feel'],
        },
      }],
      activeTriggers: [], tierBoost: { normal: 1 },
    });
    expect(r[0].breakdown.base).toBe(30);
  });
});

describe('Onboarding gate', () => {
  it('cold start under 30d', () => {
    expect(computeOnboardingGate({ accountAgeDays: 5, totalRepsLogged: 0 }).inColdStart)
      .toBe(true);
  });
  it('advanced unlocked at >=14d AND >=10 reps', () => {
    expect(computeOnboardingGate({ accountAgeDays: 20, totalRepsLogged: 15 }).advancedAllowed)
      .toBe(true);
    expect(computeOnboardingGate({ accountAgeDays: 20, totalRepsLogged: 5 }).advancedAllowed)
      .toBe(false);
  });
  it('isBeginnerSafe filters audience', () => {
    const safe = { foundation_meta: { audience_levels: ['beginner'] } } as any;
    const adv = { foundation_meta: { audience_levels: ['advanced'] } } as any;
    expect(isBeginnerSafe(safe)).toBe(true);
    expect(isBeginnerSafe(adv)).toBe(false);
  });
  it('weekly cap suppresses overflow during cold start', () => {
    const r = (id: string, levels: any[]) => ({
      video: { id, foundation_meta: { audience_levels: levels, domain: 'hitting' } },
      score: 1, reason: '', matchedTriggers: [], breakdown: {} as any,
    } as any);
    const out = applyOnboardingGate({
      results: [r('a', ['beginner']), r('b', ['beginner'])],
      gate: { inColdStart: true, advancedAllowed: false, weeklyCap: 1 },
      surfacedThisWeek: 0,
    });
    expect(out.kept).toHaveLength(1);
    expect(out.suppressed).toHaveLength(1);
  });
});

describe('userInRollout — deterministic hashing', () => {
  it('100% always true, 0% always false', () => {
    expect(userInRollout('any-id', 100)).toBe(true);
    expect(userInRollout('any-id', 0)).toBe(false);
  });
  it('same id → same bucket across calls', () => {
    const id = 'user-abc-123';
    const a = userInRollout(id, 50);
    const b = userInRollout(id, 50);
    expect(a).toBe(b);
  });
});
