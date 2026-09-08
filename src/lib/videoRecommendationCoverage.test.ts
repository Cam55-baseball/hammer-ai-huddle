/**
 * Coverage before repetition.
 *
 * The rule being protected: an athlete does not see the same video twice for
 * the same fault until they have seen every video tagged to that fault.
 * Implemented as a rank partition — unseen above seen — never as a filter.
 */
import { describe, it, expect } from 'vitest';
import {
  recommendVideos,
  type TaxonomyTag,
  type VideoWithTags,
} from './videoRecommendationEngine';

const tag: TaxonomyTag = {
  id: 't1',
  layer: 'correction',
  key: 'stay_down_through_the_hop',
  label: 'stay down through the hop',
  skill_domain: 'fielding',
  sport: 'both',
  position_scope: null,
};

// Five matching videos with deliberately different ranks (weight drives score).
const ids = ['v1', 'v2', 'v3', 'v4', 'v5'];
const candidates: VideoWithTags[] = ids.map((id, i) => ({
  id,
  title: `Video ${id}`,
  video_url: `https://example.com/${id}`,
  skill_domains: ['fielding'],
  assignments: [{ tag_id: 't1', weight: 1 - i * 0.1 }],
  distribution_tier: 'normal',
  created_at: '2020-01-01T00:00:00Z',
}));

const base = {
  skillDomain: 'fielding' as const,
  mode: 'session' as const,
  movementPatterns: [],
  resultTags: [],
  contextTags: [],
  correctionTags: ['stay_down_through_the_hop'],
  taxonomy: [tag],
  rules: [],
  candidateVideos: candidates,
};

/** One "run" = the athlete watches the top pick, which becomes seen. */
function run(seen: Set<string>) {
  const out = recommendVideos({ ...base, seenVideoIds: seen });
  return out;
}

describe('coverage before repetition', () => {
  it('delivers all 5 distinct videos before repeating, then repeats by rank', () => {
    const seen = new Set<string>();
    const watched: string[] = [];
    for (let i = 0; i < 5; i++) {
      const out = run(seen);
      expect(out.length).toBeGreaterThan(0);
      const pick = out[0];
      watched.push(pick.video.id);
      seen.add(pick.video.id);
    }
    // Five runs, five different videos — full coverage of the fault.
    expect(new Set(watched).size).toBe(5);
    expect(watched.sort()).toEqual([...ids].sort());

    // Sixth run: everything is seen, so the set resets and rank leads again.
    const sixth = run(seen);
    expect(sixth[0].coverage).toBe('reset');
    expect(sixth[0].video.id).toBe('v1'); // highest-ranked
  });

  it('ranks the best UNSEEN video first, not merely a new one', () => {
    // v1 (best) seen. The next pick must be v2 — the best remaining — not v5.
    const out = run(new Set(['v1']));
    expect(out[0].video.id).toBe('v2');
    expect(out[0].coverage).toBe('unseen');
    // v1 is still present, just demoted. Coverage reorders, it never filters.
    expect(out.some(r => r.video.id === 'v1' && r.coverage === 'seen')).toBe(true);
  });

  it('never returns an empty set when every video has been seen', () => {
    const out = run(new Set(ids));
    expect(out.length).toBeGreaterThan(0);
    expect(out.every(r => r.coverage === 'reset')).toBe(true);
  });

  it('never admits a video that failed the tag match', () => {
    const unrelated: VideoWithTags = {
      ...candidates[0],
      id: 'x',
      skill_domains: ['hitting'],
      assignments: [],
    };
    const out = recommendVideos({
      ...base,
      candidateVideos: [...candidates, unrelated],
      seenVideoIds: new Set(ids),
    });
    expect(out.some(r => r.video.id === 'x')).toBe(false);
  });

  it('is deterministic — same athlete, same seen-set, same order', () => {
    const seen = new Set(['v2']);
    const a = run(seen).map(r => r.video.id);
    const b = run(seen).map(r => r.video.id);
    expect(a).toEqual(b);
  });

  it('scopes the seen-set per fault via faultScope on every result', () => {
    const out = run(new Set());
    expect(out[0].faultScope).toEqual(['stay_down_through_the_hop']);
  });
});
