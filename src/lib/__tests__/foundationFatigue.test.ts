/**
 * Wave F — Fatigue layer pure tests (applyFatigue does not hit DB).
 */
import { describe, it, expect } from 'vitest';
import {
  applyFatigue,
  PER_DOMAIN_WEEKLY_QUOTA,
  type FatigueState,
} from '../foundationFatigue';
import type { FoundationScoreResult } from '../foundationVideos';

const result = (id: string, over: Partial<FoundationScoreResult> = {}): FoundationScoreResult => ({
  video: {
    id,
    title: id,
    video_url: `https://x/${id}`,
    foundation_meta: {
      domain: 'hitting',
      scope: 'philosophy_a_to_z',
      audience_levels: ['all_levels'],
      refresher_triggers: ['lost_feel'],
      length_tier: 'standard',
      version: 1,
    },
  },
  score: 100,
  reason: 'r',
  matchedTriggers: ['lost_feel'],
  breakdown: {
    base: 60, audienceBonus: 0, lengthBonus: 0, effectivenessBonus: 0,
    watchedPenalty: 0, preTier: 60, tier: 'normal', tierMultiplier: 1,
  },
  ...over,
});

const emptyState = (): FatigueState => ({
  exposureByVideo: new Map(),
  surfacedDomainsLast7d: new Map(),
  semanticHashesLast14d: new Set(),
});

describe('applyFatigue', () => {
  it('suppresses heavily exposed videos', () => {
    const state = emptyState();
    state.exposureByVideo.set('a', 5);
    const out = applyFatigue({ results: [result('a')], fatigue: state });
    expect(out.kept).toHaveLength(0);
    expect(out.suppressed[0].reason).toBe('exposure_saturated');
  });

  it('enforces per-domain weekly quota', () => {
    const state = emptyState();
    const items = Array.from({ length: PER_DOMAIN_WEEKLY_QUOTA + 2 }, (_, i) => result(`v${i}`));
    const out = applyFatigue({ results: items, fatigue: state });
    expect(out.kept.length).toBe(PER_DOMAIN_WEEKLY_QUOTA);
    expect(out.suppressed.every(s => s.reason === 'domain_quota_exceeded')).toBe(true);
  });

  it('semantic dedupe blocks same video+trigger combo', () => {
    const state = emptyState();
    state.semanticHashesLast14d.add('a|lost_feel');
    const out = applyFatigue({ results: [result('a')], fatigue: state });
    expect(out.suppressed[0].reason).toBe('semantic_duplicate');
  });

  it('philosophy cap when drills compete', () => {
    const out = applyFatigue({
      results: [result('a'), result('b')],
      fatigue: emptyState(),
      competingDrillRecs: true,
      maxWithDrills: 1,
    });
    expect(out.kept).toHaveLength(1);
    expect(out.suppressed[0].reason).toBe('philosophy_cap');
  });

  it('empty input → empty output', () => {
    const out = applyFatigue({ results: [], fatigue: emptyState() });
    expect(out.kept).toEqual([]);
    expect(out.suppressed).toEqual([]);
  });
});
