import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { matchInfoVideos, infoPlacementTag, type InfoPlacement, type InfoVideo } from '@/lib/videoMoments/informational';
import { domainToModule } from '@/lib/videoMoments/registry';

export function useInformationalVideos(placement: InfoPlacement, sport: string, faultKeys: string[] = [], developed = false, domain?: string) {
  const { user } = useAuth();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const { initialized, hasAccessForSport } = useSubscription();
  const query = useQuery({
    queryKey: ['informational-videos', user?.id, placement, sport],
    enabled: Boolean(user) && (isOwner || isAdmin || initialized), staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('library_videos').select('id,title,video_url,video_type,tags,sport,skill_domains,category,distribution_tier,moderation_removed_at')
        .eq('category', 'informational').contains('tags', [infoPlacementTag(placement)])
        .neq('distribution_tier', 'blocked').is('moderation_removed_at', null).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as InfoVideo[];
    },
  });
  const domains = domain ? [domain] : ['hitting', 'pitching', 'throwing', 'fielding', 'base_running'];
  const allowedDomains = domains.filter(key => isOwner || isAdmin || (initialized && hasAccessForSport(domainToModule(key), sport, false)));
  return { ...query, videos: matchInfoVideos(query.data ?? [], { placement, sport, allowedDomains, faultKeys, developed }) };
}