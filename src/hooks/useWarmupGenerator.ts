import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Exercise } from '@/types/customActivity';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface WarmupExercise {
  id: string;
  name: string;
  type: 'flexibility' | 'cardio' | 'baseball';
  category: 'general' | 'dynamic' | 'movement-prep' | 'arm-care';
  duration?: number;
  sets?: number;
  reps?: number;
  rest?: number;
}

interface WarmupResult {
  warmupExercises: WarmupExercise[];
  reasoning: string;
  estimatedDuration: number;
}

export function useWarmupGenerator() {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [warmupResult, setWarmupResult] = useState<WarmupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateWarmup = useCallback(async (exercises: Exercise[], sport: 'baseball' | 'softball' = 'baseball') => {
    if (exercises.length === 0) {
      toast.error(t('workoutBuilder.warmup.addExercisesFirst', 'Add exercises to your workout first'));
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-warmup', {
        body: { exercises, sport }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        if (data.error.includes('Rate limits')) {
          toast.error(t('workoutBuilder.warmup.rateLimited', 'Too many requests. Please wait a moment.'));
        } else if (data.error.includes('Payment required')) {
          toast.error(t('workoutBuilder.warmup.paymentRequired', 'AI credits needed. Please contact support.'));
        } else {
          toast.error(data.error);
        }
        setError(data.error);
        return null;
      }

      setWarmupResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate warmup';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [t]);

  const clearWarmup = useCallback(() => {
    setWarmupResult(null);
    setError(null);
  }, []);

  // Convert warmup exercises to standard Exercise format for timeline
  const convertToExercises = useCallback((warmupExercises: WarmupExercise[]): Exercise[] => {
    return warmupExercises.map((ex, index) => ({
      id: `warmup-${ex.id}-${Date.now()}-${index}`,
      name: ex.name,
      type: ex.type === 'baseball' ? 'baseball' : ex.type === 'cardio' ? 'cardio' : 'flexibility',
      duration: ex.duration,
      sets: ex.sets,
      reps: ex.reps,
      rest: ex.rest || 0,
    }));
  }, []);

  return {
    generateWarmup,
    isGenerating,
    warmupResult,
    error,
    clearWarmup,
    convertToExercises,
  };
}
