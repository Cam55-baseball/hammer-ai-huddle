import type { PrescriptionMatch } from './matchDrills';
import type { LibraryVideo } from '@/hooks/useVideoLibrary';
import { normalizeTier } from '@/lib/videoTier';

export type GoalLibraryVideo = Pick<LibraryVideo, 'id' | 'title' | 'video_url' | 'thumbnail_url' | 'sport' | 'skill_domains' | 'category' | 'moderation_removed_at' | 'video_class'> & {
  distribution_tier?: string | null;
  positionScopes?: string[][];
};

/** Only explicit attachments read through athlete library access become goal videos. */
export function resolveGoalVideos(matches: PrescriptionMatch[], videos: GoalLibraryVideo[], module: string, sport: string, positions: string[]) {
  if (!['hitting', 'pitching', 'throwing'].includes(module) || !['baseball', 'softball'].includes(sport)) return [];
  return videos.flatMap(video => {
    if (!video.video_url?.trim() || normalizeTier(video.distribution_tier) === 'blocked'
      || video.moderation_removed_at || video.video_class === 'foundation') return [];
    if (video.sport?.length && !video.sport.includes(sport) && !video.sport.includes('both')) return [];
    if (video.skill_domains?.length ? !video.skill_domains.includes(module) : video.category && video.category !== module) return [];
    const scopes = video.positionScopes?.filter(scope => scope.length) ?? [];
    if (scopes.length && !scopes.some(scope => scope.some(position => positions.includes(position)))) return [];
    const linked = matches.filter(match => match.drill.libraryVideoId === video.id);
    if (!linked.length) return [];
    return [{ video, reasons: [...new Set(linked.flatMap(match => match.reasons))], faultScope: undefined }];
  });
}