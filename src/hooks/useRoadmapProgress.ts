import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useRoadmapProgress(sport?: string, module?: string) {
  const { user } = useAuth();

  const milestones = useQuery({
    queryKey: ['roadmap-milestones', sport, module],
    queryFn: async () => {
      let q = supabase.from('roadmap_milestones').select('*').order('milestone_order', { ascending: true });
      if (sport) q = q.eq('sport', sport);
      if (module) q = q.eq('module', module);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const progress = useQuery({
    queryKey: ['roadmap-progress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('athlete_roadmap_progress')
        .select('*, roadmap_milestones(*)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  return { milestones, progress };
}
