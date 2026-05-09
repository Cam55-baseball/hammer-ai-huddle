/**
 * Wave F — Replay test: scoreFoundationCandidates is deterministic given
 * a frozen input. These golden cases are the contract; if scoring math
 * changes, FOUNDATION_RECOMMENDATION_VERSION must bump and goldens update.
 */
import { describe, it, expect } from 'vitest';
import {
  scoreFoundationCandidates,
  FOUNDATION_RECOMMENDATION_VERSION,
  FOUNDATION_EFFECTIVENESS_MIN_SAMPLE,
  type FoundationVideoCandidate,
  type FoundationScoreInput,
} from '../foundationVideos';

const baseCand = (over: Partial<FoundationVideoCandidate> = {}): FoundationVideoCandidate => ({
  id: 'v1',
  title: 'Hitting A–Z',
  video_url: 'https://x/v1.mp4',
  foundation_meta: {
    domain: 'hitting',
    scope: 'philosophy_a_to_z',
    audience_levels: ['all_levels'],
    refresher_triggers: ['lost_feel', 'mechanics_decline'],
    length_tier: 'standard',
    version: 1,
  },
  distribution_tier: 'normal',
  ...over,
});

const tierBoost = { normal: 1, premium: 1.2 };

describe('scoreFoundationCandidates — replay', () => {
  it('is deterministic across two calls with identical input', () => {
    const input: FoundationScoreInput = {
      candidates: [baseCand(), baseCand({ id: 'v2', distribution_tier: 'premium' })],
      activeTriggers: ['lost_feel'],
      userLevel: 'beginner',
      preferredLength: 'standard',
      tierBoost,
    };
    const a = scoreFoundationCandidates(input);
    const b = scoreFoundationCandidates(input);
    expect(a).toEqual(b);
    expect(a[0].breakdown.tier).toBe('premium');
  });

  it('skips candidates whose triggers do not match', () => {
    const input: FoundationScoreInput = {
      candidates: [baseCand()],
      activeTriggers: ['confidence_low'],
      tierBoost,
    };
    expect(scoreFoundationCandidates(input)).toHaveLength(0);
  });

  it('ignores effectiveness when sample_n is below threshold', () => {
    const cand = baseCand({
      effectiveness: {
        lost_feel: {
          resolveRate: 1,
          rewatchRate: 1,
          helpRate: 1,
          sample_n: FOUNDATION_EFFECTIVENESS_MIN_SAMPLE - 1,
        },
      },
    });
    const r = scoreFoundationCandidates({
      candidates: [cand],
      activeTriggers: ['lost_feel'],
      tierBoost,
    });
    expect(r[0].breakdown.effectivenessBonus).toBe(0);
  });

  it('caps effectiveness bonus at FOUNDATION_EFFECTIVENESS_MAX_BONUS', () => {
    const cand = baseCand({
      effectiveness: {
        lost_feel: { resolveRate: 1, rewatchRate: 1, helpRate: 1, sample_n: 100 },
      },
    });
    const r = scoreFoundationCandidates({
      candidates: [cand],
      activeTriggers: ['lost_feel'],
      tierBoost,
    });
    expect(r[0].breakdown.effectivenessBonus).toBeLessThanOrEqual(15);
  });

  it('respects per-domain max', () => {
    const cands = [
      baseCand({ id: 'a' }),
      baseCand({ id: 'b' }),
      baseCand({ id: 'c' }),
    ];
    const r = scoreFoundationCandidates({
      candidates: cands,
      activeTriggers: ['lost_feel'],
      tierBoost,
      maxPerDomain: 2,
    });
    expect(r).toHaveLength(2);
  });

  it('FOUNDATION_RECOMMENDATION_VERSION is pinned (bump intentional)', () => {
    expect(FOUNDATION_RECOMMENDATION_VERSION).toBe(1);
  });
});
