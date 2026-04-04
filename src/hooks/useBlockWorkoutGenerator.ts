import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { AggregatedGoals } from './useAthleteGoalsAggregated';
import { EnhancedExercise, BlockType, BlockIntent, CNSDemand, VelocityIntent } from '@/types/eliteWorkout';
import { useSubscription } from './useSubscription';
import { useOwnerAccess } from './useOwnerAccess';

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
  blockFocus: string;
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
  const { modules, initialized, loading: subLoading } = useSubscription();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const generatingRef = useRef(false);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  // Fix 1: Subscription ready state
  const subscriptionReady = initialized && !subLoading && !ownerLoading;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const generateExercises = useCallback(async (options: GenerateBlockWorkoutOptions) => {
    const { 
      blockType, blockIntent, blockFocus, 
      personalize = false, goals, 
      existingExercises = [], sport = 'baseball' 
    } = options;

    // Fix 1: Block execution until subscription state resolves
    if (!subscriptionReady) {
      return null;
    }

    // Fix 1: Subscription check only after state is loaded
    if (!isOwner && modules.length === 0) {
      toast.error(t('subscription.aiRequired', "Your plan doesn't include workout generation"));
      return null;
    }
    
    if (!blockFocus) {
      toast.error(t('eliteWorkout.generator.selectFocus', 'Please select a focus for this block'));
      return null;
    }

    // Fix 2: Hard lock — prevent duplicate requests
    if (generatingRef.current) {
      return null;
    }

    generatingRef.current = true;
    const currentRequestId = ++requestIdRef.current;
    setIsGenerating(true);
    setError(null);

    const attemptGenerate = async (): Promise<BlockWorkoutResult | null> => {
      const { data, error: fnError } = await supabase.functions.invoke('generate-block-workout', {
        body: { 
          blockType, blockIntent, blockFocus,
          personalize, goals: personalize ? goals : undefined,
          existingExercises: existingExercises.map(e => e.name),
          sport,
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      // Strict response validation
      if (!data || typeof data !== 'object') {
        throw new Error('No response from server');
      }

      try {
        if (data.error) {
          if (data.error.includes('Rate limits')) {
            toast.error(t('eliteWorkout.generator.rateLimited', 'Too many requests. Please wait a moment.'));
          } else if (data.error.includes('Payment required')) {
            toast.error(t('eliteWorkout.generator.paymentRequired', 'Hammer credits needed. Please contact support.'));
          } else {
            toast.error(data.error);
          }
          throw new Error(data.error);
        }

        if (!data.exercises || !Array.isArray(data.exercises)) {
          throw new Error('Invalid response format');
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && (parseErr.message.includes('Rate limits') || parseErr.message.includes('Payment required') || parseErr.message === data?.error)) {
          throw parseErr;
        }
        throw new Error('Failed to generate workout — invalid AI response');
      }

      return data as BlockWorkoutResult;
    };

    try {
      let generatedData: BlockWorkoutResult | null = null;

      try {
        generatedData = await attemptGenerate();
      } catch (firstErr) {
        const msg = firstErr instanceof Error ? firstErr.message : '';
        // Fix 5: Classify error type
        const isAuthError = msg.includes('Rate limits') || msg.includes('Payment required') || msg.includes("plan doesn't include");

        if (!isAuthError) {
          // Fix 6: Retry once after 1 second for non-auth failures
          await new Promise(r => setTimeout(r, 1000));
          if (!mountedRef.current) return null;
          generatedData = await attemptGenerate();
        } else {
          throw firstErr;
        }
      }

      if (mountedRef.current && generatedData) {
        setResult(generatedData);
      }
      return generatedData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate exercises';
      if (mountedRef.current) setError(message);

      // Fix 5: User-facing error messages
      if (!message.includes('Rate limits') && !message.includes('Payment required')) {
        const isNetwork = message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network') || message === 'No response from server';
        toast.error(
          isNetwork
            ? t('eliteWorkout.generator.networkError', 'Connection issue — please try again')
            : t('eliteWorkout.generator.aiError', "We couldn't generate your workout — retry in a moment")
        );
      }
      return null;
    } finally {
      generatingRef.current = false;
      if (mountedRef.current) setIsGenerating(false);
    }
  }, [t, modules, isOwner, subscriptionReady]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

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
    subscriptionReady,
  };
}
