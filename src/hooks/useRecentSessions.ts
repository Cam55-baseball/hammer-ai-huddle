import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useRecentSessions(sport: string, module?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-sessions', user?.id, sport, module],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from('performance_sessions')
        .select('id, session_type, session_date, module, effective_grade, drill_blocks, composite_indexes, notes')
        .eq('user_id', user.id)
        .eq('sport', sport)
        .is('deleted_at', null)
        .order('session_date', { ascending: false })
        .limit(10);

      if (module) {
        query = query.eq('module', module);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
