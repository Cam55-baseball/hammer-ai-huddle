import { faultKeysFor } from '../../../supabase/functions/analyze-video/constructiveCriticism';
import type { AnalysisLike } from '@/lib/analysisFeedbackToTaxonomy';

export const INFO_PLACEMENTS = {
  before_you_start: 'Before you start',
  after_analysis: 'After a matching analysis',
  recurring: 'Recurring issues',
  growth: 'Growth for developed players',
} as const;
export type InfoPlacement = keyof typeof INFO_PLACEMENTS;
export const infoPlacementTag = (place: InfoPlacement) => `info:place:${place}`;
export const infoFaultTag = (key: string) => `info:fault:${key}`;
export interface InfoVideo {
  id: string; title: string; video_url: string | null; video_type: string;
  tags: string[]; sport: string[]; skill_domains?: string[] | null;
  category?: string | null; distribution_tier?: string | null; moderation_removed_at?: string | null;
}
export function analysisInfoKeys(analysis: AnalysisLike | null | undefined, domain: string, sport: string): string[] {
  if (!analysis) return [];
  const allowed = new Set(faultKeysFor(domain, sport));
  const keys = [...Object.entries(analysis.violations_detected ?? {}).filter(([, value]) => value === true).map(([key]) => key),
    ...(analysis.improvements ?? []).map(item => item.fault_key ?? '')];
  return [...new Set(keys.filter(key => allowed.has(key)))];
}
export function matchInfoVideos(videos: readonly InfoVideo[], context: {
  placement: InfoPlacement; sport: string; allowedDomains: string[]; faultKeys?: string[]; developed?: boolean;
}): InfoVideo[] {
  return videos.filter(video => {
    if (video.category !== 'informational' || !video.video_url || video.distribution_tier === 'blocked' || video.moderation_removed_at) return false;
    if (!video.tags.includes(infoPlacementTag(context.placement))) return false;
    if (!video.sport.some(sport => sport === context.sport || sport === 'both')) return false;
    if (!(video.skill_domains ?? []).some(domain => context.allowedDomains.includes(domain))) return false;
    if (context.placement === 'growth' && !context.developed) return false;
    if (context.placement === 'after_analysis' || context.placement === 'recurring') {
      return (context.faultKeys ?? []).some(key => video.tags.includes(infoFaultTag(key)));
    }
    return true;
  }).slice(0, 3);
}