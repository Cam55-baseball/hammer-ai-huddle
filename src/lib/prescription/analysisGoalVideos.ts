import type { PrescriptionMatch } from './matchDrills';
import type { LibraryVideo } from '@/hooks/useVideoLibrary';
import { normalizeTier } from '@/lib/videoTier';

export type GoalLibraryVideo = Pick<LibraryVideo, 'id' | 'title' | 'video_url' | 'thumbnail_url' | 'sport' | 'skill_domains' | 'category' | 'moderation_removed_at' | 'video_class'> & {
  distribution_tier?: string | null;
  positionScopes?: string[][];
  tags?: string[] | null;
};
/** Explicit existing library tags, not fuzzy text or manufactured fault evidence. */
const GOAL_TAGS: Record<string, readonly string[]> = {
  'hitting:Barrel control': ['Barrel Path', 'Barrel', 'Contact Hitting'],
  'hitting:Contact Rate': ['Contact Hitting', 'Contact Point'],
  'hitting:Plate discipline': ['Plate Discipline', 'Strike Zone Control', 'Pitch Recognition'],
  'hitting:Oppo / all-fields power': ['Opposite Field', 'All Fields'],
  'hitting:Hitting to all fields': ['Opposite Field', 'All Fields'],
  'hitting:In-game power hitting': ['Power Hitting', 'Hard Contact'],
  'hitting:Situational hitting': ['Situational Hitting'],
  'hitting:Confidence at the plate': ['Confidence', 'Competitive Mindset'],
  'pitching:Command / zone %': ['Command', 'Pitching Command'],
  'pitching:Add velocity': ['Pitching Velocity'],
  'throwing:On-line accuracy': ['Throwing Accuracy'],
  'throwing:Arm strength': ['Arm Strength'],
  'throwing:Footwork into the throw': ['Throwing Footwork'],
};

/** Only explicit attachments read through athlete library access become goal videos. */
export function resolveGoalVideos(matches: PrescriptionMatch[], videos: GoalLibraryVideo[], module: string, sport: string, positions: string[], goals: string[] = [], developed = false) {
  if (!['hitting', 'pitching', 'throwing'].includes(module) || !['baseball', 'softball'].includes(sport)) return [];
  const resolved = videos.flatMap(video => {
    if (!video.video_url?.trim() || normalizeTier(video.distribution_tier) === 'blocked'
      || video.moderation_removed_at || video.video_class === 'foundation' || video.category === 'informational') return [];
    if (!video.sport?.length || (!video.sport.includes(sport) && !video.sport.includes('both'))) return [];
    if (video.skill_domains?.length ? !video.skill_domains.includes(module) : video.category !== module) return [];
    const scopes = video.positionScopes?.filter(scope => scope.length) ?? [];
    if (scopes.length && !scopes.some(scope => scope.some(position => positions.includes(position)))) return [];
    const linked = matches.filter(match => match.drill.libraryVideoId === video.id);
    const taggedGoals = goals.filter(goal => GOAL_TAGS[`${module}:${goal}`]?.some(tag => video.tags?.includes(tag)));
    if (!linked.length && !taggedGoals.length) return [];
    return [{ video, reasons: [...new Set([...linked.flatMap(match => match.reasons), ...taggedGoals.map(goal => `Your goal: ${goal}`),
      ...(developed && video.tags?.includes('Player Development') ? ['Keep developing this skill'] : [])])], faultScope: undefined }];
  });
  return resolved.sort((a, b) => matches.findIndex(m => m.drill.libraryVideoId === a.video.id)
    - matches.findIndex(m => m.drill.libraryVideoId === b.video.id)).slice(0, 2);
}