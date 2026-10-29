import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOptionalAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { EliteDrill } from '@/data/drills/eliteDrillCatalog';

/** Favorites use the existing self-owned Vault shelf, never completion events. */
export function useSavedAnalysisDrills(sport: string) {
  const { user } = useOptionalAuth();
  const qc = useQueryClient();
  const key = ['saved-analysis-drills', user?.id, sport];
  const query = useQuery({ queryKey: key, enabled: !!user, queryFn: async () => {
    if (!user) throw new Error('Sign in first');
    const { data, error } = await supabase.from('vault_saved_drills').select('*').eq('user_id', user.id).eq('sport', sport);
    if (error) throw error;
    return data ?? [];
  } });
  const save = useMutation({ mutationFn: async (drill: EliteDrill) => {
    if (!user || !query.isSuccess) throw new Error('Wait for your saved drills to load.');
    if (query.data.some(row => row.drill_name === drill.name && row.module_origin === drill.category)) return;
    const { data, error } = await supabase.from('vault_saved_drills').insert({ user_id: user.id, sport,
      module_origin: drill.category, drill_name: drill.name,
      drill_description: `Purpose: ${drill.fixes}\n\nSetup: ${drill.setup}\n\nSteps:\n${drill.steps.join('\n')}\n\nReps/Sets: ${drill.dosage}\n\nEquipment: ${drill.equipment.join(', ')}\n\nCoaching Cues: ${drill.cues.join(', ')}`,
    }).select('id').single();
    if (error || !data) throw error ?? new Error('Drill save was not confirmed.');
    await qc.invalidateQueries({ queryKey: key });
  } });
  return { save: save.mutateAsync, saving: save.isPending, ready: query.isSuccess, error: query.error,
    isSaved: (drill: EliteDrill) => query.isSuccess && query.data.some(row => row.drill_name === drill.name && row.module_origin === drill.category) };
}