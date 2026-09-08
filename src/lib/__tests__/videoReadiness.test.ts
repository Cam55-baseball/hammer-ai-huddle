import { describe, expect, it } from 'vitest';
import { computeMissingFields, isVideoReady } from '../videoReadiness';

const base = {
  videoFormat: 'drill',
  skillDomains: ['fielding'],
  aiDescription: 'How to work the backhand.',
  assignmentCount: 2,
  assignedLayers: ['correction', 'result'],
  sports: ['baseball'],
};

describe('video readiness — taxonomy is mandatory', () => {
  it('accepts a fully tagged video', () => {
    expect(isVideoReady(base)).toBe(true);
  });

  it('blocks a video with no taxonomy assignments', () => {
    const keys = computeMissingFields({ ...base, assignmentCount: 0, assignedLayers: [] }).map(m => m.key);
    expect(keys).toContain('tag_assignments');
    expect(keys).toContain('tag_reach');
  });

  it('blocks result/context-only tagging — it can never be the fix', () => {
    const missing = computeMissingFields({ ...base, assignedLayers: ['result', 'context'] });
    expect(missing.map(m => m.key)).toContain('tag_reach');
    expect(missing.find(m => m.key === 'tag_reach')?.message).toMatch(/correction or movement/i);
  });

  it('accepts a movement-pattern tag as reach', () => {
    expect(isVideoReady({ ...base, assignedLayers: ['movement_pattern'] })).toBe(true);
  });

  it('blocks a missing skill domain and a missing sport', () => {
    const keys = computeMissingFields({ ...base, skillDomains: [], sports: [] }).map(m => m.key);
    expect(keys).toEqual(expect.arrayContaining(['skill_domains', 'sport']));
  });

  it('still requires a sport on foundation videos', () => {
    const keys = computeMissingFields({
      videoClass: 'foundation',
      aiDescription: 'x',
      foundationMeta: { domain: 'hitting', scope: 'full', audience_levels: ['hs'], refresher_triggers: ['slump'] } as never,
      sports: [],
    }).map(m => m.key);
    expect(keys).toEqual(['sport']);
  });
});
