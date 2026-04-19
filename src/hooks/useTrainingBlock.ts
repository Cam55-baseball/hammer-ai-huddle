import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useRef } from 'react';

export interface TrainingBlock {
  id: string;
  user_id: string;
  goal: string;
  sport: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  pending_goal_change: boolean;
  generation_metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface BlockWorkout {
  id: string;
  block_id: string;
  week_number: number;
  day_label: string;
  scheduled_date: string | null;
  completed_at: string | null;
  status: string;
  workout_type: string;
  estimated_duration: number | null;
}

export interface BlockExercise {
  id: string;
  workout_id: string;
  ordinal: number;
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  tempo: string | null;
  rest_seconds: number | null;
  velocity_intent: string | null;
  cns_demand: string | null;
  coaching_cues: string[] | null;
}

export function useTrainingBlock() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const generatingRef = useRef(false);

  // Active block
  const { data: activeBlock, isLoading: blockLoading } = useQuery({
    queryKey: ['training-block', 'active', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_blocks')
        .select('*')
        .eq('user_id', user!.id)
        .in('status', ['active', 'nearing_completion', 'ready_for_regeneration'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as TrainingBlock | null;
    },
    enabled: !!user,
  });

  // Workouts for active block
  const { data: workouts, isLoading: workoutsLoading } = useQuery({
    queryKey: ['training-block-workouts', activeBlock?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('block_workouts')
        .select('*')
        .eq('block_id', activeBlock!.id)
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return data as BlockWorkout[];
    },
    enabled: !!activeBlock,
  });

  // Exercises for all workouts
  const { data: exercises } = useQuery({
    queryKey: ['training-block-exercises', activeBlock?.id],
    queryFn: async () => {
      if (!workouts || workouts.length === 0) return [];
      const workoutIds = workouts.map(w => w.id);
      const { data, error } = await supabase
        .from('block_exercises')
        .select('*')
        .in('workout_id', workoutIds)
        .order('ordinal', { ascending: true });
      if (error) throw error;
      return data as BlockExercise[];
    },
    enabled: !!workouts && workouts.length > 0,
  });

  // Generate new block
  const generateBlock = useMutation({
    mutationFn: async (sport?: string) => {
      // Double-invoke guard
      if (generatingRef.current) throw new Error('Generation already in progress');
      generatingRef.current = true;
      try {
        const { data, error } = await supabase.functions.invoke('generate-training-block', {
          body: { sport },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data;
      } finally {
        generatingRef.current = false;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-block'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success(t('trainingBlock.generated', 'Your 6-week training block has been created!'));
    },
    onError: (err: Error) => {
      if (err.message.includes('Rate limits')) {
        toast.error(t('trainingBlock.rateLimited', 'Too many requests — try again shortly'));
      } else if (err.message.includes('Payment required')) {
        toast.error(t('trainingBlock.paymentRequired', 'Hammer credits needed'));
      } else if (err.message.includes('Active training block exists')) {
        toast.error(t('trainingBlock.activeExists', 'Complete or archive your current block first'));
      } else {
        toast.error(t('trainingBlock.generateError', 'Failed to generate training block'));
      }
    },
  });

  // Complete workout
  const completeWorkout = useMutation({
    mutationFn: async ({ workoutId, rpe, notes }: { workoutId: string; rpe: number; notes?: string }) => {
      // Update workout status
      const { error: updateErr } = await supabase
        .from('block_workouts')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', workoutId);
      if (updateErr) throw updateErr;

      // Insert metrics
      const { error: metricsErr } = await supabase
        .from('block_workout_metrics')
        .insert({
          user_id: user!.id,
          workout_id: workoutId,
          rpe,
          completed: true,
          notes: notes || null,
        });
      if (metricsErr) throw metricsErr;

      // Update block status
      if (activeBlock) {
        await supabase.rpc('update_block_status', { p_block_id: activeBlock.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-block'] });
      toast.success(t('trainingBlock.workoutCompleted', 'Workout logged!'));
    },
  });

  // Adapt block — branches between regeneration (preference change) and volume tuning
  const adaptBlock = useMutation({
    mutationFn: async (opts?: { regenerate?: boolean }) => {
      if (!activeBlock) throw new Error('No active block');

      // Fetch current preferences for logging + decisioning
      const { data: prefs } = await supabase
        .from('training_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      console.log('ADAPT CLICKED', { blockId: activeBlock.id, preferences: prefs });

      const shouldRegenerate =
        opts?.regenerate === true ||
        activeBlock.pending_goal_change === true ||
        activeBlock.status === 'ready_for_regeneration';

      const oldId = activeBlock.id;
      const oldCreatedAt = activeBlock.created_at;

      if (shouldRegenerate) {
        const payload = {
          sport: activeBlock.sport,
          blockId: oldId,
          force_new: true,
          preferences: prefs,
          startDate: activeBlock.start_date,
          availability: (prefs as { availability?: unknown } | null)?.availability,
        };
        console.log('ADAPT REQUEST:', payload);

        const { data, error } = await supabase.functions.invoke('generate-training-block', {
          body: payload,
        });
        console.log('ADAPT RESPONSE:', data);
        if (error) {
          console.error('ADAPT RPC ERROR FULL:', error);
          throw error;
        }
        if (data?.error) {
          console.error('ADAPT RPC ERROR FULL:', data);
          throw new Error(data.error === 'active_block_exists' ? 'active_block_exists' : data.error);
        }

        const newBlock = data?.block ?? data;
        if (newBlock?.id && user) {
          // Replace state explicitly — no append
          queryClient.setQueryData(['training-block', 'active', user.id], newBlock);
        }

        // Change-verification guard
        if (newBlock?.id && newBlock.id === oldId) {
          console.warn('Adapt produced no change');
        }
        if (newBlock?.created_at && newBlock.created_at === oldCreatedAt) {
          console.warn('Adapt produced no change');
        }

        return { mode: 'regenerate', block: newBlock, oldId };
      }

      // Volume-tuning path (RPE / missed sessions)
      const payload = { block_id: oldId };
      console.log('ADAPT REQUEST:', payload);
      const { data, error } = await supabase.functions.invoke('adapt-training-block', {
        body: payload,
      });
      console.log('ADAPT RESPONSE:', data);
      if (error) throw error;
      return { mode: 'tune', ...data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-block'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      if (data?.mode === 'regenerate') {
        toast.success(t('trainingBlock.regenerated', 'Training plan regenerated with your updated preferences'));
      } else if (data?.adaptations?.length > 0) {
        toast.info(t('trainingBlock.adapted', 'Training plan adjusted based on your progress'));
      } else {
        toast.message(t('trainingBlock.noAdaptation', 'No changes needed right now'));
      }
    },
    onError: (error: Error) => {
      console.error('ADAPT FAILED:', error);
      if (error.message?.includes('active_block_exists')) {
        toast.error('Existing active block prevented adaptation');
      } else {
        toast.error(t('trainingBlock.adaptFailed', 'Failed to adapt plan'));
      }
    },
  });

  // Archive block
  const archiveBlock = useMutation({
    mutationFn: async () => {
      if (!activeBlock) throw new Error('No active block');
      const { error } = await supabase
        .from('training_blocks')
        .update({ status: 'archived' })
        .eq('id', activeBlock.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-block'] });
      toast.success(t('trainingBlock.archived', 'Training block archived'));
    },
  });

  // Reschedule a single workout to a new date
  const rescheduleWorkout = useMutation({
    mutationFn: async ({ workoutId, newDate }: { workoutId: string; newDate: string }) => {
      // Check for collision on the same block + date
      if (!activeBlock) throw new Error('No active block');
      const { data: collision } = await supabase
        .from('block_workouts')
        .select('id')
        .eq('block_id', activeBlock.id)
        .eq('scheduled_date', newDate)
        .neq('id', workoutId)
        .maybeSingle();

      // If collision, push subsequent scheduled workouts forward 1 day
      if (collision) {
        const prevDay = new Date(newDate);
        prevDay.setDate(prevDay.getDate() - 1);
        await supabase.rpc('shift_workouts_forward', {
          p_block_id: activeBlock.id,
          p_after_date: prevDay.toISOString().split('T')[0],
          p_days: 1,
        });
      }

      const { error } = await supabase
        .from('block_workouts')
        .update({ scheduled_date: newDate })
        .eq('id', workoutId);
      if (error) throw error;

      // Mirror to calendar_events if one exists for this workout
      await supabase
        .from('calendar_events')
        .update({ event_date: newDate })
        .eq('related_id', activeBlock.id)
        .eq('event_type', 'training_block');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-block'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success(t('trainingBlock.rescheduled', 'Workout rescheduled'));
    },
    onError: () => toast.error(t('trainingBlock.rescheduleError', 'Failed to reschedule workout')),
  });

  // Stats
  const stats = workouts ? {
    total: workouts.length,
    completed: workouts.filter(w => w.status === 'completed').length,
    missed: workouts.filter(w => w.status === 'missed').length,
    scheduled: workouts.filter(w => w.status === 'scheduled').length,
    completionRate: workouts.length > 0
      ? Math.round(workouts.filter(w => w.status === 'completed').length / workouts.length * 100)
      : 0,
  } : null;

  return {
    activeBlock,
    workouts: workouts || [],
    exercises: exercises || [],
    stats,
    isLoading: blockLoading || workoutsLoading,
    generateBlock,
    completeWorkout,
    adaptBlock,
    archiveBlock,
    rescheduleWorkout,
  };
}
