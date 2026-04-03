import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useDaySessions(date: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['day-sessions', user?.id, date],
    queryFn: async () => {
      if (!user || !date) return [];
      const { data, error } = await supabase
        .from('performance_sessions')
        .select('id, session_type, module, effective_grade, composite_indexes, drill_blocks, notes, session_date')
        .eq('user_id', user.id)
        .eq('session_date', date)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!date,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 45_000,
  });
}
