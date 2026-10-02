import { describe, it, expect } from 'vitest';
import { analysisFeedbackToTaxonomy } from './analysisFeedbackToTaxonomy';
import { recommendVideos, type TaxonomyTag, type VideoWithTags } from './videoRecommendationEngine';

const hittingAnalysis = {
  violations_detected: { early_shoulder_rotation: true, hands_pass_elbow_early: true },
  scorecard: { regressions: [{ area: 'early_extension' }], neutral: [] },
};

describe('analysisFeedbackToTaxonomy', () => {
  it('emits correction keys, not just movement keys, for hitting faults', () => {
    const s = analysisFeedbackToTaxonomy(hittingAnalysis, 'hitting', 'baseball');
    expect(s.movementPatterns).toContain('shoulders_turning_early');
    expect(s.movementPatterns).toContain('hands_forward_early');
    expect(s.movementPatterns).toContain('early_extension');
    expect(s.correctionTags).toContain('keep_hands_back');
    expect(s.correctionTags).toContain('barrel_stays_behind_hands');
    expect(s.correctionTags).toContain('maintain_posture');
  });

  it('carries the feedback phrase behind every key', () => {
    const s = analysisFeedbackToTaxonomy(hittingAnalysis, 'hitting', 'baseball');
    expect(s.evidence['correction:keep_hands_back']).toMatch(/shoulders turned/);
  });

  it('splits pitching by sport — windmill faults never use overhand keys', () => {
    const a = { violations_detected: { early_shoulder_rotation: true } };
    const bb = analysisFeedbackToTaxonomy(a, 'pitching', 'baseball');
    const sb = analysisFeedbackToTaxonomy(a, 'pitching', 'softball');
    expect(bb.correctionTags).toEqual(['bb_delay_trunk_rotation']);
    expect(sb.correctionTags).toEqual(['sb_stay_closed_through_whip']);
  });

  it('emits nothing when the analysis flagged nothing', () => {
    const s = analysisFeedbackToTaxonomy({ violations_detected: {}, scorecard: {} }, 'throwing', 'baseball');
    expect(s.movementPatterns).toEqual([]);
    expect(s.correctionTags).toEqual([]);
  });
  it('matches structured fault keys only within the analysis sport', () => {
    const analysis = { improvements: [{ fault_key: 'hang_at_peak_lift', fault: 'You paused at the top' }] };
    const bb = analysisFeedbackToTaxonomy(analysis, 'pitching', 'baseball');
    expect(bb.correctionTags).toContain('hang_at_peak_lift');
    expect(bb.evidence['correction:hang_at_peak_lift']).toBe('You paused at the top');
    expect(analysisFeedbackToTaxonomy(analysis, 'pitching', 'softball').correctionTags).not.toContain('hang_at_peak_lift');
  });
});

// Minimal taxonomy/video fixtures shaped exactly like the DB rows.
const tax: TaxonomyTag[] = [
  { id: 'corr1', layer: 'correction', key: 'keep_hands_back', label: 'Keep hands back', skill_domain: 'hitting' },
  { id: 'mp1', layer: 'movement_pattern', key: 'shoulders_turning_early', label: 'Pulling front shoulder', skill_domain: 'hitting' },
];
const video = (id: string, tagId: string): VideoWithTags => ({
  id, title: id, video_url: `https://x/${id}`, skill_domains: ['hitting'],
  assignments: [{ tag_id: tagId, weight: 1 }],
});

describe('recommendVideos ranking', () => {
  it('ranks a correction match above a movement-only match', () => {
    const out = recommendVideos({
      skillDomain: 'hitting', mode: 'session',
      movementPatterns: ['shoulders_turning_early'],
      resultTags: [], contextTags: [],
      correctionTags: ['keep_hands_back'],
      candidateVideos: [video('movement-only', 'mp1'), video('correction', 'corr1')],
      taxonomy: tax, rules: [],
    });
    expect(out[0].video.id).toBe('correction');
  });

  it('returns nothing rather than padding when no video matches', () => {
    const out = recommendVideos({
      skillDomain: 'hitting', mode: 'session',
      movementPatterns: ['flat_path'], resultTags: [], contextTags: [],
      correctionTags: ['match_plane_early'],
      candidateVideos: [video('unrelated', 'mp1')],
      taxonomy: tax, rules: [],
    });
    expect(out).toEqual([]);
  });

  it('never answers a throwing fault with a hitting video', () => {
    const out = recommendVideos({
      skillDomain: 'throwing', mode: 'session',
      movementPatterns: ['th_across_body'], resultTags: [], contextTags: [],
      correctionTags: ['th_stay_online_finish'],
      candidateVideos: [video('hitting-video', 'mp1')],
      taxonomy: tax, rules: [],
    });
    expect(out).toEqual([]);
  });

  it('matches an owner-tagged video to an observed fault, but not across sports', () => {
    const analysis = { improvements: [{ fault_key: 'hang_at_peak_lift', fault: 'Paused at the top' }] };
    const signals = analysisFeedbackToTaxonomy(analysis, 'pitching', 'baseball');
    const tag: TaxonomyTag = {
      id: 'owner-pitch-tag', layer: 'correction', key: 'hang_at_peak_lift',
      label: 'Pause at peak lift', skill_domain: 'pitching', sport: 'baseball',
    };
    const tagged: VideoWithTags = {
      id: 'owner-tagged-pitch', title: 'Lift drill', video_url: 'https://example.com/lift',
      sport: ['baseball'], skill_domains: ['pitching'], assignments: [{ tag_id: tag.id, weight: 1 }],
    };
    const input = {
      skillDomain: 'pitching' as const, mode: 'session' as const,
      movementPatterns: signals.movementPatterns, resultTags: [], contextTags: [],
      correctionTags: signals.correctionTags, taxonomy: [tag], rules: [], candidateVideos: [tagged],
    };
    const found = recommendVideos({ ...input, sport: 'baseball' });
    expect(found.map((v) => v.video.id)).toContain(tagged.id);
    expect(found[0].matchedLayers).toContain('correction');
    expect(recommendVideos({ ...input, sport: 'softball' })).toEqual([]);
    expect(analysisFeedbackToTaxonomy(analysis, 'pitching', 'softball').correctionTags).not.toContain(tag.key);
  });
});
