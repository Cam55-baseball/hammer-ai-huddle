import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { calculateFatigueProxy } from '@/data/fatigueThresholds';

export function useFatigueState() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['fatigue-state', user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Get latest focus quiz / check-in data
      const { data, error } = await supabase
        .from('mindfulness_sessions')
        .select('mood_before, mood_after, session_date')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const sleepQuality = data.mood_before ?? 3;
      const stressLevel = 5 - (data.mood_before ?? 3); // Invert mood to stress
      return calculateFatigueProxy(sleepQuality, stressLevel);
    },
    enabled: !!user,
  });
}
