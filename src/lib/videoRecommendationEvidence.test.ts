/**
 * Outcome confidence floors + the exploration slot.
 *
 * The rule being protected: with a handful of likes and views, an outcome term
 * is noise. Below the floor it contributes exactly zero, and every score
 * carries the sample size it was built on.
 */
import { describe, it, expect } from 'vitest';
import {
  recommendVideos,
  OUTCOME_FLOORS,
  type TaxonomyTag,
  type VideoWithTags,
} from './videoRecommendationEngine';

const tag = (id: string, key: string): TaxonomyTag => ({
  id,
  layer: 'correction',
  key,
  label: key.replace(/_/g, ' '),
  skill_domain: 'fielding',
  sport: 'both',
  position_scope: null,
});

const video = (id: string): VideoWithTags => ({
  id,
  title: `Video ${id}`,
  video_url: `https://example.com/${id}`,
  skill_domains: ['fielding'],
  assignments: [{ tag_id: 't1', weight: 1 }],
  distribution_tier: 'normal',
  created_at: '2020-01-01T00:00:00Z',
});

const base = {
  skillDomain: 'fielding' as const,
  mode: 'session' as const,
  movementPatterns: [],
  resultTags: [],
  contextTags: [],
  correctionTags: ['stay_down_through_the_hop'],
  taxonomy: [tag('t1', 'stay_down_through_the_hop')],
  rules: [],
};

describe('outcome confidence floors', () => {
  it('ignores peer likes below the endorsement floor', () => {
    const v = video('a');
    const without = recommendVideos({ ...base, candidateVideos: [v] })[0];
    const belowFloor = recommendVideos({
      ...base,
      candidateVideos: [v],
      faultEndorsements: new Map([['a', OUTCOME_FLOORS.endorsements - 1]]),
    })[0];
    expect(belowFloor.score).toBe(without.score);
    expect(belowFloor.outcomeEvidence.outcomeApplied).toBe(false);
    expect(belowFloor.outcomeEvidence.endorsementCount).toBe(OUTCOME_FLOORS.endorsements - 1);
  });

  it('counts peer likes once the floor is met', () => {
    const v = video('a');
    const without = recommendVideos({ ...base, candidateVideos: [v] })[0];
    const atFloor = recommendVideos({
      ...base,
      candidateVideos: [v],
      faultEndorsements: new Map([['a', OUTCOME_FLOORS.endorsements]]),
    })[0];
    expect(atFloor.score).toBeGreaterThan(without.score);
    expect(atFloor.outcomeEvidence.outcomeApplied).toBe(true);
  });

  it('ignores a global improvement score built on too few measurements', () => {
    const v = video('a');
    const without = recommendVideos({ ...base, candidateVideos: [v] })[0];
    const thin = recommendVideos({
      ...base,
      candidateVideos: [v],
      globalMetrics: new Map([['a', { improvementScore: 2, sampleSize: 1 }]]),
    })[0];
    expect(thin.score).toBe(without.score);
    expect(thin.outcomeEvidence.globalSampleSize).toBe(1);
  });

  it('carries a sample size on every score', () => {
    const out = recommendVideos({ ...base, candidateVideos: [video('a')] });
    expect(out[0].outcomeEvidence.totalSampleSize).toBe(0);
  });
});

describe('exploration slot', () => {
  it('reserves the last slot for a video with no outcome data', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const candidates = ids.map(video);
    // Every ranked video has data except the last one, which would never surface.
    const globalMetrics = new Map(
      ids.slice(0, 4).map(id => [id, { improvementScore: 1, sampleSize: 20 }] as const),
    );
    const out = recommendVideos({ ...base, candidateVideos: candidates, globalMetrics });
    expect(out).toHaveLength(4);
    const last = out[out.length - 1];
    expect(last.exploration).toBe(true);
    expect(last.outcomeEvidence.outcomeApplied).toBe(false);
  });

  it('does not reserve a slot when an unmeasured video already ranks', () => {
    const out = recommendVideos({ ...base, candidateVideos: ['a', 'b'].map(video) });
    expect(out.every(r => !r.exploration)).toBe(true);
  });
});

describe('fielding empty state', () => {
  it('returns nothing rather than an unrelated clip when no video matches', () => {
    const hittingOnly: VideoWithTags = { ...video('h'), skill_domains: ['hitting'], assignments: [] };
    const out = recommendVideos({ ...base, candidateVideos: [hittingOnly] });
    expect(out).toEqual([]);
  });
});
