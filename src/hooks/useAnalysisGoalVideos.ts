import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAnalysisGoalDrills } from './useAnalysisGoalDrills';
import { useUserProfile } from './useUserProfile';
import { resolvePositionGroups } from '@/lib/hammer/positions/positionGroups';
import { resolveGoalVideos, type GoalLibraryVideo } from '@/lib/prescription/analysisGoalVideos';

export function useAnalysisGoalVideos(module: string | null | undefined, sport: string | null | undefined) {
  const goals = useAnalysisGoalDrills(module, sport);
  const profile = useUserProfile();
  const ids = [...new Set(goals.matches.map(match => match.drill.libraryVideoId).filter((id): id is string => !!id))].sort();
  const positions = resolvePositionGroups(profile.profile?.position);
  const sourceError = goals.error ?? goals.goalError ?? profile.error;
  const library = useQuery({
    queryKey: ['analysis-goal-videos', goals.userId, module, sport, ids, positions],
    enabled: !!goals.userId && !goals.isPending && !sourceError && (ids.length > 0 || goals.goals?.length > 0) && !profile.loading,
    queryFn: async () => {
      // RLS remains authoritative; blocked, moderated and foundation assets stay off this shelf.
      let read = supabase.from('library_videos')
        .select('id,title,video_url,thumbnail_url,sport,skill_domains,category,distribution_tier,moderation_removed_at,video_class,tags')
        .neq('distribution_tier', 'blocked').is('moderation_removed_at', null).or('video_class.is.null,video_class.eq.application');
      read = goals.goals?.length ? read.contains('skill_domains', [module ?? '']) : read.in('id', ids);
      const { data, error } = await read.limit(1000);
      if (error) throw error;
      if ((data?.length ?? 0) >= 1000) throw new Error('The goal video library could not be checked completely.');
      const readIds = (data ?? []).map(video => video.id);
      if (!readIds.length) return [];
      const { data: tags, error: tagError } = await supabase.from('video_tag_assignments')
        .select('video_id,video_tag_taxonomy(position_scope)').in('video_id', readIds);
      if (tagError) throw tagError;
      return (data ?? []).map(video => ({ ...video, positionScopes: (tags ?? [])
        .filter(tag => tag.video_id === video.id).map(tag => tag.video_tag_taxonomy?.position_scope ?? []) })) as GoalLibraryVideo[];
    },
  });
  const error = sourceError ?? library.error;
  const isPending = goals.isPending || ((ids.length > 0 || goals.goals?.length > 0) && (profile.loading || library.isPending));
  const suggestions = useMemo(() => !goals.userId || error || isPending ? []
    : resolveGoalVideos(goals.matches, library.data ?? [], module ?? '', sport ?? '', positions, goals.goals,
      ['advanced', 'professional'].includes(profile.profile?.experience_level?.toLowerCase() ?? '')),
    [goals.userId, error, isPending, goals.matches, goals.goals, library.data, module, sport, positions.join(',')]);
  return { suggestions, error, isPending, goals: error || isPending ? [] : goals.goals,
    developed: !profile.loading && !profile.error && ['advanced', 'professional'].includes(profile.profile?.experience_level?.toLowerCase() ?? '') };
}