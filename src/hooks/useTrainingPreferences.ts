import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TrainingPreferences {
  user_id: string;
  goal: string | null;
  availability: { days: number[] };
  equipment: string[];
  injuries: string[];
  experience_level: string;
  updated_at: string;
}

export function useTrainingPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['training-preferences', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as TrainingPreferences | null;
    },
    enabled: !!user,
  });

  const upsertPreferences = useMutation({
    mutationFn: async (prefs: Partial<Omit<TrainingPreferences, 'user_id' | 'updated_at'>>) => {
      console.log('SAVE PREFS PAYLOAD:', JSON.stringify(prefs));
      if (!prefs || Object.keys(prefs).length === 0) {
        console.error('Empty preferences payload — Save Preferences aborted');
        throw new Error('Empty preferences payload');
      }
      const { error } = await supabase
        .from('training_preferences')
        .upsert({
          user_id: user!.id,
          ...prefs,
          updated_at: new Date().toISOString(),
        });
      if (error) {
        console.error('SAVE PREFS ERROR:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-preferences'] });
      toast.success('Preferences saved');
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  });

  const updateGoal = useMutation({
    mutationFn: async (newGoal: string) => {
      console.log('UPDATE GOAL PAYLOAD:', newGoal);
      if (!newGoal) {
        console.error('Empty goal — updateGoal aborted');
        throw new Error('Empty goal');
      }
      // Update preference
      const { error: prefErr } = await supabase
        .from('training_preferences')
        .upsert({
          user_id: user!.id,
          goal: newGoal,
          updated_at: new Date().toISOString(),
        });
      if (prefErr) {
        console.error('UPDATE GOAL PREFS ERROR:', prefErr);
        throw new Error(prefErr.message);
      }

      // If active block exists, flag pending goal change (don't regenerate)
      const { data: activeBlock, error: blockFetchErr } = await supabase
        .from('training_blocks')
        .select('id')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();

      if (blockFetchErr) {
        console.error('UPDATE GOAL FETCH BLOCK ERROR:', blockFetchErr);
        throw new Error(blockFetchErr.message);
      }

      if (activeBlock) {
        const { error: blockUpdateErr } = await supabase
          .from('training_blocks')
          .update({ pending_goal_change: true })
          .eq('id', activeBlock.id);
        if (blockUpdateErr) {
          console.error('UPDATE GOAL FLAG BLOCK ERROR:', blockUpdateErr);
          throw new Error(blockUpdateErr.message);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['training-block'] });
      toast.success('Goal updated — will apply to your next training block');
    },
    onError: (e: Error) => toast.error(`Goal update failed: ${e.message}`),
  });

  return {
    preferences,
    isLoading,
    upsertPreferences,
    updateGoal,
  };
}
