import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSwitchHitterProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const settings = useQuery({
    queryKey: ['switch-hitter-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('athlete_mpi_settings')
        .select('is_switch_hitter, primary_batting_side, is_ambidextrous_thrower, primary_throwing_hand')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const sessionsBySide = useQuery({
    queryKey: ['sessions-by-side', user?.id],
    queryFn: async () => {
      if (!user) return { left: [], right: [] };
      const { data, error } = await supabase
        .from('performance_sessions')
        .select('id, composite_indexes, batting_side_used, session_date')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('session_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      const left = (data ?? []).filter(s => s.batting_side_used === 'L');
      const right = (data ?? []).filter(s => s.batting_side_used === 'R');
      return { left, right };
    },
    enabled: !!user && !!settings.data?.is_switch_hitter,
  });

  const saveIdentityMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      if (!user) throw new Error('Not authenticated');
      const updates: Record<string, unknown> = { [field]: value };
      // When setting switch/ambidextrous flags
      if (field === 'primary_batting_side' && value === 'S') {
        updates.is_switch_hitter = true;
      }
      if (field === 'primary_throwing_hand' && value === 'S') {
        updates.is_ambidextrous_thrower = true;
      }
      const { error } = await supabase
        .from('athlete_mpi_settings')
        .update(updates)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['switch-hitter-settings', user?.id] });
    },
  });

  const saveIdentity = (field: string, value: string) => {
    saveIdentityMutation.mutate({ field, value });
  };

  return {
    settings,
    sessionsBySide,
    isSwitchHitter: settings.data?.is_switch_hitter ?? false,
    isAmbidextrousThrower: settings.data?.is_ambidextrous_thrower ?? false,
    primaryBattingSide: (settings.data?.primary_batting_side as 'L' | 'R' | 'S' | null) ?? null,
    primaryThrowingHand: (settings.data?.primary_throwing_hand as 'L' | 'R' | 'S' | null) ?? null,
    saveIdentity,
    isSavingIdentity: saveIdentityMutation.isPending,
  };
}
