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
      const { error } = await supabase
        .from('training_preferences')
        .upsert({
          user_id: user!.id,
          ...prefs,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-preferences'] });
      toast.success('Preferences saved');
    },
  });

  const updateGoal = useMutation({
    mutationFn: async (newGoal: string) => {
      // Update preference
      const { error: prefErr } = await supabase
        .from('training_preferences')
        .upsert({
          user_id: user!.id,
          goal: newGoal,
          updated_at: new Date().toISOString(),
        });
      if (prefErr) throw prefErr;

      // If active block exists, flag pending goal change (don't regenerate)
      const { data: activeBlock } = await supabase
        .from('training_blocks')
        .select('id')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();

      if (activeBlock) {
        await supabase
          .from('training_blocks')
          .update({ pending_goal_change: true })
          .eq('id', activeBlock.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['training-block'] });
      toast.success('Goal updated — will apply to your next training block');
    },
  });

  return {
    preferences,
    isLoading,
    upsertPreferences,
    updateGoal,
  };
}
