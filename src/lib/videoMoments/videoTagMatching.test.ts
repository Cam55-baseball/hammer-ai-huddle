import { describe, expect, it } from 'vitest';
import { matchInfoVideos, infoPlacementTag, topicKey, type InfoVideo } from './informational';
import { dimTag, positionDims, levelDims, passesDimensions } from './videoDimensions';
import { mindVideoTopics } from './mindTopics';
import { careVideoExtras } from './careTopics';
import { missingTags } from '@/pages/owner/VideoManager';

const base: InfoVideo = { id: 'v', title: 'Video', video_url: 'https://example.test/v.mp4', video_type: 'external', category: 'informational', sport: ['both'], distribution_tier: 'normal', skill_domains: ['mind'], tags: [] };
const ctx = { sport: 'baseball', allowedDomains: ['mind', 'tissue_care', 'speed_conditioning', 'hitting'] };

describe('owner Nov 2 video tag matching', () => {
  it('Mind video shows only on the matching Mind item', () => {
    const v = { ...base, tags: [infoPlacementTag('mind')], topics: [topicKey('mind', 'movement_pattern', 'focus_routine')] };
    expect(matchInfoVideos([v], { ...ctx, placement: 'mind', topics: mindVideoTopics('focus_routine') })).toHaveLength(1);
    expect(matchInfoVideos([v], { ...ctx, placement: 'mind', topics: mindVideoTopics('journaling') })).toEqual([]);
    expect(matchInfoVideos([v], { ...ctx, placement: 'mind' })).toEqual([]);
  });
  it('tissue care video matches body area and type', () => {
    const v = { ...base, skill_domains: ['tissue_care'], tags: [infoPlacementTag('tissue_care')], topics: [topicKey('tissue_care', 'context', 'hips'), topicKey('tissue_care', 'movement_pattern', 'foam_roll')] };
    expect(matchInfoVideos([v], { ...ctx, placement: 'tissue_care', careAreas: ['hips'], careTypes: ['foam_roll'] })).toHaveLength(1);
    expect(matchInfoVideos([v], { ...ctx, placement: 'tissue_care', careAreas: ['shoulders'], careTypes: ['foam_roll'] })).toEqual([]);
  });
  it('program and pitching role gate with no spill-over', () => {
    const v = { ...base, skill_domains: ['speed_conditioning'], tags: [infoPlacementTag('before_you_start'), dimTag('program', 'pitcher'), dimTag('pitcher_role', 'closer')] };
    expect(matchInfoVideos([v], { ...ctx, placement: 'before_you_start', player: { program: ['pitcher'], pitcher_role: ['closer'] } })).toHaveLength(1);
    expect(matchInfoVideos([v], { ...ctx, placement: 'before_you_start', player: { program: ['5tool'], pitcher_role: ['closer'] } })).toEqual([]);
    expect(matchInfoVideos([v], { ...ctx, placement: 'before_you_start', player: { program: ['pitcher'], pitcher_role: ['starter'] } })).toEqual([]);
    expect(matchInfoVideos([v], { ...ctx, placement: 'before_you_start' })).toEqual([]);
  });
  it('sport is always respected', () => {
    const v = { ...base, sport: ['softball'], tags: [infoPlacementTag('mind')], topics: mindVideoTopics('breathing') };
    expect(matchInfoVideos([v], { ...ctx, placement: 'mind', topics: mindVideoTopics('breathing') })).toEqual([]);
  });
  it('at most 3, unwatched first, at most 1 saved', () => {
    const vids = ['a', 'b', 'c', 'd', 'e'].map(id => ({ ...base, id, skill_domains: ['hitting'], tags: [infoPlacementTag('before_you_start')] }));
    const out = matchInfoVideos(vids, { ...ctx, placement: 'before_you_start', watchedIds: new Set(['a']), savedIds: new Set(['b', 'c']) });
    expect(out.map(v => v.id)).toEqual(['b', 'd', 'e']);
  });
  it('maps player profile to dimensions', () => {
    expect(positionDims(['middle_infield'], false).sort()).toEqual(['hitter', 'infielder', 'runner']);
    expect(levelDims('High School')).toEqual({ level: ['high_school'], progression: [] });
    expect(levelDims('Professional')).toEqual({ level: ['pro'], progression: ['professional'] });
    expect(passesDimensions([dimTag('purpose', 'education')], {})).toBe(true);
  });
  it('reads tissue areas from the shared care tagger', () => {
    expect(careVideoExtras([{ name: 'Mobility + foam roll' }]).careTypes).toEqual(['foam_roll', 'mobility']);
  });
  it('missing-tags finder names what is missing', () => {
    expect(missingTags({ tags: [], sport: ['baseball'], skill_domains: ['hitting'], category: 'informational', topicIds: [] })).toEqual(['what it teaches', 'video purpose', 'where it appears']);
    expect(missingTags({ tags: [dimTag('purpose', 'instruction'), infoPlacementTag('mind')], sport: ['both'], skill_domains: ['mind'], category: 'informational', topicIds: ['x'] })).toEqual([]);
  });
});
