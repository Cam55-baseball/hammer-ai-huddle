import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSplitAnalytics(splitKey?: string) {
  const { user } = useAuth();

  const composites = useQuery({
    queryKey: ['split-analytics-composites', user?.id, splitKey],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('performance_sessions')
        .select('composite_indexes, batting_side_used, throwing_hand_used, session_date')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('session_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const heatMaps = useQuery({
    queryKey: ['split-analytics-heatmaps', user?.id, splitKey],
    queryFn: async () => {
      if (!user || !splitKey) return [];
      const { data, error } = await supabase
        .from('heat_map_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .eq('split_key', splitKey)
        .order('computed_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!splitKey,
  });

  return { composites, heatMaps };
}
