import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSwitchHitterProfile() {
  const { user } = useAuth();

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

  return { settings, sessionsBySide, isSwitchHitter: settings.data?.is_switch_hitter ?? false };
}
