import { faultKeysFor } from '../../../supabase/functions/analyze-video/constructiveCriticism';
import type { AnalysisLike } from '@/lib/analysisFeedbackToTaxonomy';
import { passesDimensions, type PlayerDimensions } from './videoDimensions';

export const INFO_PLACEMENTS = {
  before_you_start: 'Before you start',
  after_analysis: 'After a matching analysis',
  recurring: 'Recurring issues',
  growth: 'Growth for developed players',
  mind: 'Mind items',
  tissue_care: 'Tissue care',
  education: 'Education',
} as const;
export type InfoPlacement = keyof typeof INFO_PLACEMENTS;
export const infoPlacementTag = (place: InfoPlacement) => `info:place:${place}`;
export const infoFaultTag = (key: string) => `info:fault:${key}`;
export const infoGoalTag = (goal: string) => `info:goal:${goal.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
/** Taxonomy topic key as `<skill_domain>:<layer>:<key>`, read from video_tag_assignments. */
export const topicKey = (domain: string, layer: string, key: string) => `${domain}:${layer}:${key}`;
export interface InfoVideo {
  id: string; title: string; video_url: string | null; video_type: string;
  tags: string[]; sport: string[]; skill_domains?: string[] | null;
  category?: string | null; distribution_tier?: string | null; moderation_removed_at?: string | null;
  /** Canonical taxonomy assignments (`domain:layer:key`). */
  topics?: string[];
}
export interface InfoMatchContext {
  placement: InfoPlacement; sport: string; allowedDomains: string[]; faultKeys?: string[]; developed?: boolean; goals?: string[];
  /** Player position/role/program/level. Omitted = no gating info supplied (restricted videos never show). */
  player?: PlayerDimensions;
  /** Mind placement: the day's Mind kind, e.g. `mind:movement_pattern:focus_routine`. Required to match. */
  topics?: string[];
  /** Tissue care placement: body areas and movement types of the day's care work. */
  careAreas?: string[]; careTypes?: string[];
  watchedIds?: ReadonlySet<string>; savedIds?: ReadonlySet<string>;
}
export function analysisInfoKeys(analysis: AnalysisLike | null | undefined, domain: string, sport: string): string[] {
  if (!analysis) return [];
  const allowed = new Set(faultKeysFor(domain, sport));
  const keys = [...Object.entries(analysis.violations_detected ?? {}).filter(([, value]) => value === true).map(([key]) => key),
    ...(analysis.improvements ?? []).map(item => item.fault_key ?? '')];
  return [...new Set(keys.filter(key => allowed.has(key)))];
}
const careMatch = (topics: readonly string[], layer: string, wanted: readonly string[] | undefined) => {
  const tagged = topics.filter(t => t.startsWith(`tissue_care:${layer}:`)).map(t => t.split(':')[2]);
  return !tagged.length ? true : (wanted ?? []).some(key => tagged.includes(key));
};
export function matchInfoVideos(videos: readonly InfoVideo[], context: InfoMatchContext): InfoVideo[] {
  const matched = videos.filter(video => {
    if (video.category !== 'informational' || !video.video_url || video.distribution_tier === 'blocked' || video.moderation_removed_at) return false;
    if (!video.tags.includes(infoPlacementTag(context.placement))) return false;
    if (!video.sport.some(sport => sport === context.sport || sport === 'both')) return false;
    if (!(video.skill_domains ?? []).some(domain => context.allowedDomains.includes(domain))) return false;
    if (!passesDimensions(video.tags, context.player ?? {})) return false;
    const topics = video.topics ?? [];
    if (context.placement === 'mind') return (context.topics ?? []).some(topic => topics.includes(topic));
    if (context.placement === 'tissue_care') {
      const hasCareTopic = topics.some(t => t.startsWith('tissue_care:'));
      return hasCareTopic && careMatch(topics, 'context', context.careAreas) && careMatch(topics, 'movement_pattern', context.careTypes);
    }
    if (context.placement === 'growth' && !context.developed) return false;
    if (context.placement === 'after_analysis' || context.placement === 'recurring') {
      const findingMatch = (context.faultKeys ?? []).some(key => video.tags.includes(infoFaultTag(key)));
      const goalMatch = context.placement === 'after_analysis' && (context.goals ?? []).some(goal => video.tags.includes(infoGoalTag(goal)));
      return findingMatch || goalMatch;
    }
    if (context.placement === 'growth' && context.goals) return context.goals.some(goal => video.tags.includes(infoGoalTag(goal)));
    return true;
  });
  // Owner Nov 2: at most 3, unwatched first, at most 1 already-saved video.
  const watched = context.watchedIds ?? new Set<string>();
  const saved = context.savedIds ?? new Set<string>();
  const ordered = [...matched.filter(v => !watched.has(v.id)), ...matched.filter(v => watched.has(v.id))];
  const out: InfoVideo[] = [];
  let savedCount = 0;
  for (const video of ordered) {
    if (out.length >= 3) break;
    if (saved.has(video.id)) { if (savedCount >= 1) continue; savedCount++; }
    out.push(video);
  }
  return out;
}
