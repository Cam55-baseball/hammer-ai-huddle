import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useProfessionalStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['professional-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('athlete_professional_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async (input: Partial<{
      contract_status: string;
      current_league: string;
      current_team: string;
      mlb_seasons_completed: number;
      ausl_seasons_completed: number;
    }>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('athlete_professional_status')
        .upsert({ user_id: user.id, sport: 'baseball', ...input }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professional-status'] }),
  });

  return { ...query, updateStatus };
}
