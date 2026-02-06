import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { AggregatedGoals } from './useAthleteGoalsAggregated';
import { EnhancedExercise, BlockType, BlockIntent, CNSDemand, VelocityIntent } from '@/types/eliteWorkout';

interface GeneratedExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  rest?: number;
  tempo?: string;
  velocity_intent?: VelocityIntent;
  cns_demand?: CNSDemand;
  coaching_cues?: string[];
}

interface BlockWorkoutResult {
  exercises: GeneratedExercise[];
  reasoning: string;
  estimatedDuration: number;
}

interface GenerateBlockWorkoutOptions {
  blockType: BlockType;
  blockIntent: BlockIntent;
  blockFocus: string; // User's answer to block-specific question
  personalize?: boolean;
  goals?: AggregatedGoals;
  existingExercises?: EnhancedExercise[];
  sport?: 'baseball' | 'softball';
}

export function useBlockWorkoutGenerator() {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<BlockWorkoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateExercises = useCallback(async (options: GenerateBlockWorkoutOptions) => {
    const { 
      blockType, 
      blockIntent, 
      blockFocus, 
      personalize = false, 
      goals, 
      existingExercises = [],
      sport = 'baseball' 
    } = options;
    
    if (!blockFocus) {
      toast.error(t('eliteWorkout.generator.selectFocus', 'Please select a focus for this block'));
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-block-workout', {
        body: { 
          blockType,
          blockIntent,
          blockFocus,
          personalize,
          goals: personalize ? goals : undefined,
          existingExercises: existingExercises.map(e => e.name),
          sport,
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        if (data.error.includes('Rate limits')) {
          toast.error(t('eliteWorkout.generator.rateLimited', 'Too many requests. Please wait a moment.'));
        } else if (data.error.includes('Payment required')) {
          toast.error(t('eliteWorkout.generator.paymentRequired', 'Hammer credits needed. Please contact support.'));
        } else {
          toast.error(data.error);
        }
        setError(data.error);
        return null;
      }

      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate exercises';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [t]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  // Convert generated exercises to EnhancedExercise format
  const convertToEnhancedExercises = useCallback((exercises: GeneratedExercise[]): EnhancedExercise[] => {
    return exercises.map((ex, index) => ({
      id: `block-gen-${ex.id}-${Date.now()}-${index}`,
      name: ex.name,
      type: 'strength' as const,
      sets: ex.sets,
      reps: ex.reps,
      rest: ex.rest || 60,
      tempo: ex.tempo,
      velocity_intent: ex.velocity_intent,
      cns_demand: ex.cns_demand,
      coaching_cues: ex.coaching_cues,
    }));
  }, []);

  return {
    generateExercises,
    isGenerating,
    result,
    error,
    clearResult,
    convertToEnhancedExercises,
  };
}
