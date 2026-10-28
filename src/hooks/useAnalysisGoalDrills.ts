import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDrillCirculation } from '@/hooks/useDrillCirculation';
import { categoryGoals, matchGoalDrills } from '@/lib/prescription/analysisGoals';

/** One self/sport/category goal interpretation for the drill list and video shelf. */
export function useAnalysisGoalDrills(module: string | null | undefined, sport: string | null | undefined) {
  const drills = useDrillCirculation();
  const goals = useQuery({
    queryKey: ['analysis-saved-goals', drills.userId, module, sport],
    enabled: !!drills.userId,
    queryFn: async () => {
      if (!drills.userId) return [];
      const { data, error } = await supabase.from('athlete_context')
        .select('category_goals,position_primary').eq('user_id', drills.userId).maybeSingle();
      if (error) throw error;
      return categoryGoals(data?.category_goals, module ?? '', sport ?? '', data?.position_primary);
    },
  });
  const isPending = !drills.ready || (!!drills.userId && goals.isPending);
  const matches = useMemo(() => isPending || goals.isError || drills.error ? []
    : matchGoalDrills(drills.catalog, goals.data ?? [], module ?? '', sport ?? ''),
  [isPending, goals.isError, drills.error, drills.catalog, goals.data, module, sport]);
  return { ...drills, matches, isPending, goalError: goals.error, goals: goals.data ?? [] };
}