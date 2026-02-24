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
    mutationFn: async (input: { sport: string; league: string; team_name?: string; profile_url: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('verified_stat_profiles').insert({ user_id: user.id, ...input });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['verified-stats'] }),
  });

  return { ...query, submitProfile };
}
