import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface HeatMapFilters {
  map_type?: string;
  time_window?: string;
  context_filter?: string;
  split_key?: string;
}

export function useHeatMaps(filters?: HeatMapFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['heat-maps', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase.from('heat_map_snapshots').select('*').eq('user_id', user.id);
      if (filters?.map_type) q = q.eq('map_type', filters.map_type);
      if (filters?.time_window) q = q.eq('time_window', filters.time_window);
      if (filters?.context_filter) q = q.eq('context_filter', filters.context_filter);
      if (filters?.split_key) q = q.eq('split_key', filters.split_key);
      q = q.order('computed_at', { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
