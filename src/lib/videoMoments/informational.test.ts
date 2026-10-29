import { describe, expect, it } from 'vitest';
import { analysisInfoKeys, matchInfoVideos, infoPlacementTag, infoFaultTag, type InfoVideo } from './informational';
const video: InfoVideo = { id: 'info', title: 'Teaching', video_url: 'https://example.test/teach.mp4', video_type: 'upload', category: 'informational', sport: ['baseball'], skill_domains: ['hitting'], distribution_tier: 'normal', tags: [infoPlacementTag('before_you_start'), infoPlacementTag('after_analysis'), infoPlacementTag('recurring'), infoPlacementTag('growth'), infoFaultTag('early_shoulder_rotation')] };
const context = { sport: 'baseball', allowedDomains: ['hitting'] };
describe('owner informational video timing', () => {
  it('shows the explicitly tagged video before starting', () => { expect(matchInfoVideos([video], { ...context, placement: 'before_you_start' }).map(v => v.id)).toEqual(['info']); });
  it('requires an exact current analysis finding; unrelated prose cannot match', () => {
    const keys = analysisInfoKeys({ violations_detected: { early_shoulder_rotation: true, made_up: true } }, 'hitting', 'baseball');
    expect(keys).toEqual(['early_shoulder_rotation']);
    expect(matchInfoVideos([video], { ...context, placement: 'after_analysis', faultKeys: keys }).map(v => v.id)).toEqual(['info']);
    expect(matchInfoVideos([video], { ...context, placement: 'after_analysis', faultKeys: ['other'] })).toEqual([]);
  });
  it('requires recurring evidence for recurring placement', () => { expect(matchInfoVideos([video], { ...context, placement: 'recurring' })).toEqual([]); expect(matchInfoVideos([video], { ...context, placement: 'recurring', faultKeys: ['early_shoulder_rotation'] })).toHaveLength(1); });
  it('growth requires a known developed player', () => { expect(matchInfoVideos([video], { ...context, placement: 'growth' })).toEqual([]); expect(matchInfoVideos([video], { ...context, placement: 'growth', developed: true })).toHaveLength(1); });
  it('does not expose another sport, unavailable skill, drill attachment or blocked/removed video', () => {
    expect(matchInfoVideos([video], { ...context, sport: 'softball', placement: 'before_you_start' })).toEqual([]);
    expect(matchInfoVideos([video], { ...context, allowedDomains: [], placement: 'before_you_start' })).toEqual([]);
    for (const change of [{ category: 'drill' }, { distribution_tier: 'blocked' }, { moderation_removed_at: '2026-10-29' }]) expect(matchInfoVideos([{ ...video, ...change }], { ...context, placement: 'before_you_start' })).toEqual([]);
  });
});