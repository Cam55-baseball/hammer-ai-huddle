import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Cross-module query key mappings
 * When data changes in one table, these related queries should be invalidated
 */
const TABLE_QUERY_MAPPINGS: Record<string, string[][]> = {
  // Check-in data affects recommendations, game plan, nutrition
  'vault_focus_quizzes': [
    ['gamePlan'],
    ['workoutRecommendations'],
    ['nutritionTargets'],
    ['recoveryStatus'],
    ['dailyReadiness'],
  ],
  
  // Workout notes affect vault, recap readiness
  'vault_workout_notes': [
    ['vaultWorkouts'],
    ['recapProgress'],
    ['trainingVolume'],
  ],
  
  // Nutrition affects energy predictions, recovery
  'vault_nutrition_logs': [
    ['nutritionLogs'],
    ['nutritionTargets'],
    ['dailyEnergy'],
    ['macroProgress'],
  ],
  
  // Weight entries affect body composition, nutrition targets
  'weight_entries': [
    ['weightHistory'],
    ['bodyComposition'],
    ['nutritionTargets'],
    ['tdeeCalculation'],
  ],
  
  // Custom activities affect game plan, recap
  'custom_activity_logs': [
    ['gamePlan'],
    ['customActivities'],
    ['recapProgress'],
    ['trainingVolume'],
  ],
  
  // Tex Vision affects visual training stats
  'tex_vision_drill_results': [
    ['texVisionProgress'],
    ['texVisionMetrics'],
    ['recapProgress'],
  ],
  
  // Video analysis affects skill progression
  'videos': [
    ['videoAnalysis'],
    ['skillProgression'],
    ['recapProgress'],
  ],
  
  // Mind Fuel affects mental readiness
  'mindfulness_sessions': [
    ['mindFuelProgress'],
    ['mentalReadiness'],
    ['recapProgress'],
  ],
  
  'emotion_tracking': [
    ['emotionHistory'],
    ['mentalReadiness'],
    ['recapProgress'],
  ],
  
  'mental_health_journal': [
    ['journalEntries'],
    ['mentalReadiness'],
    ['mindFuelProgress'],
  ],
  
  // Hydration affects recovery predictions
  'hydration_logs': [
    ['hydrationProgress'],
    ['dailyHydration'],
    ['recoveryStatus'],
  ],
  
  // Program progress affects game plan
  'sub_module_progress': [
    ['programProgress'],
    ['gamePlan'],
    ['trainingVolume'],
  ],
  
  // Stress assessments affect recovery recommendations
  'stress_assessments': [
    ['stressHistory'],
    ['mentalReadiness'],
    ['recoveryStatus'],
  ],
  
  // Skip settings affect game plan display
  'calendar_skipped_items': [
    ['gamePlan'],
    ['calendarEvents'],
    ['customActivities'],
  ],

  // Physio reports affect badges and banners
  'physio_daily_reports': [
    ['physioDailyReport'],
    ['physioGamePlanBadges'],
  ],

  // Physio profile affects badges and adult tracking
  'physio_health_profiles': [
    ['physioProfile'],
    ['physioGamePlanBadges'],
  ],

  // Adult tracking
  'physio_adult_tracking': [
    ['physioAdultTracking'],
  ],

  // Performance sessions affect all analytics
  'performance_sessions': [
    ['hie-snapshot'], ['progressive-gate'], ['delta-analytics'],
    ['recent-sessions'], ['day-sessions'], ['fatigue-state'], ['calendar'],
    ['split-analytics-composites'], ['latest-session-ts'],
  ],

  // HIE snapshots affect dashboard analytics
  'hie_snapshots': [
    ['hie-snapshot'], ['progressive-gate'], ['delta-analytics'],
  ],
};

interface UseUnifiedDataSyncOptions {
  enabled?: boolean;
  onDataChange?: (table: string, payload: any) => void;
}

/**
 * Hook that provides real-time synchronization across all modules
 * When data changes in one module, related queries in other modules are invalidated
 */
export function useUnifiedDataSync(options: UseUnifiedDataSyncOptions = {}) {
  const { enabled = true, onDataChange } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastEventRef = useRef<{ table: string; eventType: string; rowId: string; ts: number }>({ table: '', eventType: '', rowId: '', ts: 0 });
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateRelatedQueries = useCallback((tableName: string) => {
    const relatedQueryKeys = TABLE_QUERY_MAPPINGS[tableName];
    if (relatedQueryKeys) {
      relatedQueryKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
    }
  }, [queryClient]);

  const handleDatabaseChange = useCallback((payload: {
    eventType: string;
    table: string;
    new: any;
    old: any;
  }) => {
    const { table } = payload;

    // 500ms deduplication guard
    const now = Date.now();
    if (lastEventRef.current.table === table && now - lastEventRef.current.ts < 500) {
      return;
    }
    lastEventRef.current = { table, ts: now };

    invalidateRelatedQueries(table);

    if (onDataChange) {
      onDataChange(table, payload);
    }
  }, [invalidateRelatedQueries, onDataChange]);

  const setupChannel = useCallback(() => {
    if (!user) return null;

    const channel = supabase.channel(`unified-sync-${user.id}`);
    const tablesToWatch = Object.keys(TABLE_QUERY_MAPPINGS);

    tablesToWatch.forEach(table => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => handleDatabaseChange({
          ...payload,
          table,
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        })
      );
    });

    return channel;
  }, [user, handleDatabaseChange]);

  const attemptReconnect = useCallback(() => {
    const MAX_ATTEMPTS = 5;
    if (reconnectAttemptRef.current >= MAX_ATTEMPTS) {
      console.warn('[UnifiedDataSync] Max reconnect attempts reached, invalidating critical keys');
      queryClient.invalidateQueries({ queryKey: ['hie-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['day-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['delta-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['fatigue-state'] });
      reconnectAttemptRef.current = 0;
      return;
    }

    const delay = Math.pow(2, reconnectAttemptRef.current) * 1000; // 1s, 2s, 4s, 8s, 16s
    reconnectAttemptRef.current += 1;

    reconnectTimerRef.current = setTimeout(() => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      const newChannel = setupChannel();
      if (newChannel) {
        newChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[UnifiedDataSync] Reconnected successfully');
            reconnectAttemptRef.current = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            attemptReconnect();
          }
        });
        channelRef.current = newChannel;
      }
    }, delay);
  }, [setupChannel, queryClient]);

  useEffect(() => {
    if (!user || !enabled) return;

    const channel = setupChannel();
    if (!channel) return;

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[UnifiedDataSync] Subscribed to cross-module sync');
        reconnectAttemptRef.current = 0;
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        console.warn('[UnifiedDataSync] Channel error/closed, attempting reconnect');
        attemptReconnect();
      }
    });

    channelRef.current = channel;

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, enabled, setupChannel, attemptReconnect]);
  // Manual invalidation methods for imperative use
  const invalidateModule = useCallback((module: 'gamePlan' | 'nutrition' | 'vault' | 'texVision' | 'mindFuel' | 'all') => {
    const moduleQueryKeys: Record<string, string[][]> = {
      gamePlan: [['gamePlan'], ['customActivities'], ['recoveryStatus']],
      nutrition: [['nutritionLogs'], ['nutritionTargets'], ['hydrationProgress'], ['macroProgress']],
      vault: [['vaultWorkouts'], ['recapProgress'], ['weightHistory'], ['bodyComposition']],
      texVision: [['texVisionProgress'], ['texVisionMetrics']],
      mindFuel: [['mindFuelProgress'], ['mentalReadiness'], ['emotionHistory'], ['journalEntries']],
      all: [], // Will invalidate everything
    };

    if (module === 'all') {
      queryClient.invalidateQueries();
    } else {
      moduleQueryKeys[module]?.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    }
  }, [queryClient]);

  const forceRefreshAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  return {
    invalidateModule,
    forceRefreshAll,
    invalidateRelatedQueries,
  };
}

/**
 * Hook for checking cross-system recovery status
 * Aggregates data from multiple modules to determine overall recovery state
 */
export function useRecoveryStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const getRecoveryStatus = useCallback(async () => {
    if (!user) return null;

    const today = new Date().toISOString().split('T')[0];

    // Fetch latest check-in data
    const { data: latestQuiz } = await supabase
      .from('vault_focus_quizzes')
      .select('sleep_quality, stress_level, pain_location, pain_scales, physical_readiness, perceived_recovery')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestQuiz) {
      return {
        hasData: false,
        suggestRecovery: false,
        reason: null,
        sleepQuality: null,
        stressLevel: null,
        painAreas: [],
        physicalReadiness: null,
      };
    }

    const sleepQuality = latestQuiz.sleep_quality || 3;
    const stressLevel = latestQuiz.stress_level || 2;
    const painAreas = (latestQuiz.pain_location as string[]) || [];
    const painScales = latestQuiz.pain_scales as Record<string, number> | null;
    const physicalReadiness = latestQuiz.physical_readiness || 3;
    const perceivedRecovery = latestQuiz.perceived_recovery || 3;

    // Determine if recovery should be recommended
    let suggestRecovery = false;
    let reason: string | null = null;

    if (sleepQuality <= 2) {
      suggestRecovery = true;
      reason = 'low_sleep';
    } else if (stressLevel >= 4) {
      suggestRecovery = true;
      reason = 'high_stress';
    } else if (painAreas.length >= 3) {
      suggestRecovery = true;
      reason = 'multiple_pain';
    } else if (physicalReadiness <= 2) {
      suggestRecovery = true;
      reason = 'low_physical_readiness';
    } else if (perceivedRecovery <= 2) {
      suggestRecovery = true;
      reason = 'low_recovery';
    }

    // Calculate average pain if scales exist
    let avgPainLevel = 0;
    if (painScales && Object.keys(painScales).length > 0) {
      avgPainLevel = Object.values(painScales).reduce((sum, v) => sum + v, 0) / Object.keys(painScales).length;
      if (avgPainLevel >= 7 && !suggestRecovery) {
        suggestRecovery = true;
        reason = 'high_pain';
      }
    }

    return {
      hasData: true,
      suggestRecovery,
      reason,
      sleepQuality,
      stressLevel,
      painAreas,
      painScales,
      avgPainLevel,
      physicalReadiness,
      perceivedRecovery,
    };
  }, [user]);

  return { getRecoveryStatus };
}
