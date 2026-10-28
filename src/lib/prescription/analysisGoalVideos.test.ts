import { describe, expect, it } from 'vitest';
import { resolveGoalVideos, type GoalLibraryVideo } from './analysisGoalVideos';
import { ELITE_DRILL_CATALOG } from '@/data/drills/eliteDrillCatalog';

const match = (id: string, reason = 'Your goal: Barrel control') => ({ drill: { ...ELITE_DRILL_CATALOG[0], libraryVideoId: id }, score: 10, reasons: [reason] });
const video: GoalLibraryVideo = { id: 'v1', title: 'Current instruction', video_url: 'https://example.test/current.mp4', thumbnail_url: null,
  sport: ['baseball'], skill_domains: ['hitting'], category: 'hitting', distribution_tier: 'normal', moderation_removed_at: null, video_class: 'application' };
const resolve = (v: GoalLibraryVideo) => resolveGoalVideos([match('v1')], [v], 'hitting', 'baseball', ['middle_infield']);

describe('canonical goal instructional videos', () => {
  it('resolves only the attached readable identity using its current URL and no fault scope', () => {
    expect(resolve(video)[0]).toEqual({ video, reasons: ['Your goal: Barrel control'], faultScope: undefined });
    expect(resolveGoalVideos([match('missing')], [video], 'hitting', 'baseball', [])).toEqual([]);
  });
  it('rejects blocked, moderated, foundation and blank-media assets', () => {
    for (const patch of [{ distribution_tier: 'blocked' }, { moderation_removed_at: '2026-10-28' }, { video_class: 'foundation' as const }, { video_url: ' ' }]) {
      expect(resolve({ ...video, ...patch })).toEqual([]);
    }
  });
  it('preserves sport, skill and explicit position scope', () => {
    expect(resolve({ ...video, sport: ['softball'] })).toEqual([]);
    expect(resolve({ ...video, skill_domains: ['pitching'] })).toEqual([]);
    expect(resolve({ ...video, positionScopes: [['catcher']] })).toEqual([]);
    expect(resolve({ ...video, positionScopes: [['middle_infield']] })).toHaveLength(1);
    expect(resolveGoalVideos([match('v1')], [{ ...video, positionScopes: [['catcher']] }], 'hitting', 'baseball', [])).toEqual([]);
  });
  it('requires declared sport before recommending a goal video', () => {
    expect(resolve({ ...video, sport: [] })).toEqual([]);
    expect(resolve({ ...video, sport: ['both'] })).toHaveLength(1);
  });
  it('requires declared skill rather than treating untagged media as hitting', () => {
    expect(resolve({ ...video, skill_domains: [], category: null })).toEqual([]);
    expect(resolve({ ...video, skill_domains: null, category: 'hitting' })).toHaveLength(1);
  });
  it('combines reasons and limits only after inaccessible attachments are removed', () => {
    const matches = [match('gone1'), match('gone2'), match('v1'), match('v1', 'Your goal: Hitting to all fields')];
    expect(resolveGoalVideos(matches, [video], 'hitting', 'baseball', [])[0]?.reasons).toEqual(['Your goal: Barrel control', 'Your goal: Hitting to all fields']);
    expect(resolveGoalVideos(matches, [video], 'hitting', 'baseball', [])).toHaveLength(1);
  });
});