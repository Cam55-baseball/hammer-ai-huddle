import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { useVideoSuggestions } from '@/hooks/useVideoSuggestions';
import { useFoundationVideos } from '@/hooks/useFoundationVideos';
import { resolvePositionGroups } from '@/lib/hammer/positions/positionGroups';
import type { TagSport } from '@/lib/videoRecommendationEngine';
import { MOMENT_CONFIG, domainToFoundationDomain, domainToModule } from '@/lib/videoMoments/registry';
import { isVideoDismissed } from '@/lib/videoMoments/cooldown';
import type { VideoMomentEvent, VideoMomentItem, VideoMomentTier } from '@/lib/videoMoments/types';

interface Result {
  items: VideoMomentItem[];
  tier: VideoMomentTier;
  loading: boolean;
  /** False when the athlete has no subscription covering this skill domain. */
  allowed: boolean;
  config: (typeof MOMENT_CONFIG)[keyof typeof MOMENT_CONFIG];
}

const LIMIT = 3;

/**
 * Resolves the videos for a moment with a three-tier fallback so a moment is
 * never silently empty:
 *   1. tag-matched suggestions from what just happened
 *   2. domain + sport + position picks from the library
 *   3. foundation videos for that domain
 */
export function useVideoMoment(event: VideoMomentEvent | null, enabled = true): Result {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { sport: themeSport } = useSportTheme();
  const { hasAccessForSport, initialized } = useSubscription();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();

  const config = MOMENT_CONFIG[event?.kind ?? 'session_saved'];
  const sport: TagSport = (event?.sport ?? (themeSport as TagSport)) ?? 'both';

  const positions = useMemo(() => {
    const groups = resolvePositionGroups(profile?.position);
    return groups.length ? groups : null;
  }, [profile?.position]);

  const allowed = useMemo(() => {
    if (!event) return false;
    if (isOwner || isAdmin) return true;
    if (!initialized) return false;
    const sportKey = sport === 'both' ? (themeSport as string) || 'baseball' : sport;
    return hasAccessForSport(domainToModule(event.skillDomain), sportKey, false);
  }, [event, isOwner, isAdmin, initialized, sport, themeSport, hasAccessForSport]);

  const active = Boolean(event) && enabled && allowed;

  const tagged = useVideoSuggestions({
    skillDomain: event?.skillDomain ?? 'hitting',
    mode: config.mode,
    movementPatterns: event?.movementPatterns ?? [],
    resultTags: event?.resultTags ?? [],
    contextTags: event?.contextTags ?? [],
    sport,
    positions,
    enabled: active,
  });

  const taggedItems = useMemo<VideoMomentItem[]>(
    () =>
      (tagged.data ?? [])
        .filter(s => !isVideoDismissed(user?.id, s.video.id))
        .slice(0, LIMIT)
        .map(s => ({
          id: s.video.id,
          title: s.video.title,
          videoUrl: s.video.video_url,
          thumbnailUrl: s.video.thumbnail_url,
          reasons: s.reasons.slice(0, 3),
        })),
    [tagged.data, user?.id],
  );

  // Analysis moments never pad. A video that was not tagged for the fault the
  // analysis reported is not an answer to it, so the moment stays empty and the
  // UI says so rather than falling back to popular or domain-generic picks.
  const noFallback = event?.kind === 'analysis_complete';
  const needsDomainTier = active && !noFallback && !tagged.isLoading && taggedItems.length === 0;

  const domainQuery = useQuery({
    queryKey: ['video-moment-domain', event?.skillDomain, sport, (positions ?? []).join(','), user?.id],
    enabled: needsDomainTier,
    staleTime: 300_000,
    queryFn: async (): Promise<VideoMomentItem[]> => {
      const { data, error } = await (supabase as any)
        .from('library_videos')
        .select('id, title, video_url, thumbnail_url, skill_domains, sport, confidence_score')
        .contains('skill_domains', [event!.skillDomain])
        .in('sport', [sport, 'both'])
        .order('confidence_score', { ascending: false, nullsFirst: false })
        .limit(12);
      if (error) throw error;
      return (data || [])
        .filter((v: any) => v.video_url && !isVideoDismissed(user?.id, v.id))
        .slice(0, LIMIT)
        .map((v: any) => ({
          id: v.id,
          title: v.title,
          videoUrl: v.video_url,
          thumbnailUrl: v.thumbnail_url,
          reasons: [`Core ${String(event!.skillDomain).replace('_', ' ')} work for your sport`],
        }));
    },
  });

  const domainItems = domainQuery.data ?? [];
  const needsFoundationTier = needsDomainTier && !domainQuery.isLoading && domainItems.length === 0;

  const foundation = useFoundationVideos({
    domain: event ? domainToFoundationDomain(event.skillDomain) : undefined,
    limit: LIMIT,
    triggerGated: false,
    surface: 'library',
  });

  const foundationItems = useMemo<VideoMomentItem[]>(
    () =>
      needsFoundationTier
        ? (foundation.results || [])
            .filter(r => r.video.video_url && !isVideoDismissed(user?.id, r.video.id))
            .slice(0, LIMIT)
            .map(r => ({
              id: r.video.id,
              title: r.video.title,
              videoUrl: r.video.video_url,
              thumbnailUrl: r.video.thumbnail_url,
              reasons: [r.reason || 'Foundation: the philosophy behind this work'],
            }))
        : [],
    [needsFoundationTier, foundation.results, user?.id],
  );

  if (!active) {
    return { items: [], tier: 'none', loading: false, allowed, config };
  }
  if (taggedItems.length) return { items: taggedItems, tier: 'tagged', loading: false, allowed, config };
  if (tagged.isLoading) return { items: [], tier: 'none', loading: true, allowed, config };
  if (domainItems.length) return { items: domainItems, tier: 'domain', loading: false, allowed, config };
  if (domainQuery.isLoading) return { items: [], tier: 'none', loading: true, allowed, config };
  if (foundationItems.length) return { items: foundationItems, tier: 'foundation', loading: false, allowed, config };
  return { items: [], tier: 'none', loading: foundation.loading, allowed, config };
}
