import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePitcherSchedule } from '@/hooks/usePitcherSchedule';
import { matchInfoVideos, topicKey, type InfoPlacement, type InfoVideo } from '@/lib/videoMoments/informational';
import { positionDims, levelDims, type PlayerDimensions } from '@/lib/videoMoments/videoDimensions';
import { domainToModule } from '@/lib/videoMoments/registry';
import { resolvePositionGroups } from '@/lib/hammer/positions/positionGroups';
import { getActiveTier } from '@/utils/tierAccess';
import { playerPitches, type PrimaryFocus } from '@/lib/hammer/pitching/pitcherRoleAnswers';
import { effectivePitchingRole } from '../../supabase/functions/_shared/wic/pitching/outingFacts';
import type { SkillDomain } from '@/lib/videoRecommendationEngine';
import {testSettingsFor} from '@/lib/intelligence/testSettings';

const SKILL_DOMAINS = ['hitting', 'pitching', 'throwing', 'fielding', 'base_running'];
/** Program-wide domains: any program for this sport opens them; program tags narrow further. */
export const PROGRAM_DOMAINS = ['speed_conditioning', 'lifting', 'jumps', 'bat_speed', 'tissue_care', 'mobility', 'mind', 'vision', 'recovery_education'];

export interface InfoExtras { topics?: string[]; careAreas?: string[]; careTypes?: string[] }

export function useInformationalVideos(placement: InfoPlacement, sport: string, faultKeys: string[] = [], developed = false, domain?: string, goals?: string[], extras: InfoExtras = {}) {
  const { user } = useAuth();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const { initialized, hasAccessForSport, modules } = useSubscription();
  const profile = useUserProfile();
  const pitching = usePitcherSchedule();
  const query = useQuery({
    queryKey: ['informational-videos', user?.id, placement, sport],
    enabled: Boolean(user) && (isOwner || isAdmin || initialized), staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('library_videos').select('id,title,video_url,video_type,tags,sport,skill_domains,category,distribution_tier,moderation_removed_at,test_overrides')
        .eq('category', 'informational')
        .neq('distribution_tier', 'blocked').is('moderation_removed_at', null).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      if((data?.length??0)>=200)throw Error('Could not check the complete informational library.');
      const ids = (data ?? []).map(row => row.id);
      const [assign, outcomes, saves] = ids.length ? await Promise.all([
        supabase.from('video_tag_assignments').select('video_id,video_tag_taxonomy(key,layer,skill_domain)').in('video_id', ids),
        supabase.from('video_user_outcomes').select('video_id').eq('user_id', user!.id).not('watched_at', 'is', null).in('video_id', ids),
        supabase.from('library_video_saves').select('video_id').eq('user_id', user!.id).in('video_id', ids),
      ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
      if (assign.error) throw assign.error;
      if (outcomes.error) throw outcomes.error;
      if (saves.error) throw saves.error;
      const topics = new Map<string, string[]>();
      for (const row of (assign.data ?? []) as any[]) {
        const t = row.video_tag_taxonomy; if (!t) continue;
        topics.set(row.video_id, [...(topics.get(row.video_id) ?? []), topicKey(t.skill_domain, t.layer, t.key)]);
      }
      return {
        videos: (data ?? []).map(row => ({ ...testSettingsFor(row, user?.id), topics: topics.get(row.id) ?? [] })) as InfoVideo[],
        watched: new Set((outcomes.data ?? []).map((r: any) => r.video_id as string)),
        saved: new Set((saves.data ?? []).map((r: any) => r.video_id as string)),
      };
    },
  });
  const domains = domain ? [domain] : [...SKILL_DOMAINS, ...PROGRAM_DOMAINS];
  const anyProgram = initialized && ['hitting', 'pitching', 'throwing'].some(m => hasAccessForSport(m as any, sport, false));
  const allowedDomains = domains.filter(key => isOwner || isAdmin || (PROGRAM_DOMAINS.includes(key) ? anyProgram
    : initialized && hasAccessForSport(domainToModule(key as SkillDomain), sport, false)));
  const settings = pitching.data?.settings ?? null;
  const pitches = playerPitches(modules ?? [], (settings?.primary_focus ?? null) as PrimaryFocus | null);
  const role = pitches ? effectivePitchingRole(settings) : null;
  const tier = getActiveTier(modules ?? [], sport);
  const levels = levelDims(profile.profile?.experience_level);
  const player: PlayerDimensions = {
    position: positionDims(resolvePositionGroups(profile.profile?.position), pitches),
    pitcher_role: role ? [role] : [],
    program: tier ? [tier] : [],
    level: levels.level, progression: levels.progression,
  };
  const ready = user && !query.isPending && !query.isError && !profile.loading;
  return { ...query, videos: !ready ? [] : matchInfoVideos(query.data?.videos ?? [], { placement, sport, allowedDomains, faultKeys, developed, goals, player,
    topics: extras.topics, careAreas: extras.careAreas, careTypes: extras.careTypes, watchedIds: query.data?.watched, savedIds: query.data?.saved }) };
}
