import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useDeltaAnalytics(targetUserId?: string) {
  const { user } = useAuth();
  const userId = targetUserId || user?.id;

  return useQuery({
    queryKey: ['delta-analytics', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('performance_sessions')
        .select('id, session_date, player_grade, coach_grade, effective_grade')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .not('player_grade', 'is', null)
        .order('session_date', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map(s => ({
        ...s,
        delta: s.player_grade != null && s.coach_grade != null ? s.player_grade - s.coach_grade : null,
      }));
    },
    enabled: !!userId,
  });
}
