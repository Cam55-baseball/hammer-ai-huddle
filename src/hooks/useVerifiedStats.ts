import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useVerifiedStats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['verified-stats', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('verified_stat_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const submitProfile = useMutation({
    mutationFn: async (input: {
      sport: string;
      league: string;
      profile_type: string;
      team_name?: string;
      profile_url: string;
      screenshot_path?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('verified_stat_profiles').insert({
        user_id: user.id,
        sport: input.sport,
        league: input.league,
        profile_type: input.profile_type,
        team_name: input.team_name,
        profile_url: input.profile_url,
        screenshot_path: input.screenshot_path,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['verified-stats'] }),
  });

  return { ...query, submitProfile };
}

/** Fetch verified stats for any user (public view) */
export function usePublicVerifiedStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['public-verified-stats', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('verified_stat_profiles')
        .select('id, league, profile_type, profile_url, verified_at, confidence_weight, sport, team_name')
        .eq('user_id', userId)
        .eq('verified', true)
        .eq('admin_verified', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}
