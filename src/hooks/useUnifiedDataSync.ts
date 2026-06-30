import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TAB_ID } from '@/utils/tabId';

/**
 * Cross-module query key mappings
 * When data changes in one table, these related queries should be invalidated
 */
const TABLE_QUERY_MAPPINGS: Record<string, string[][]> = {
  'vault_focus_quizzes': [
    ['gamePlan'],
    ['workoutRecommendations'],
    ['nutritionTargets'],
    ['recoveryStatus'],
    ['dailyReadiness'],
  ],
  'vault_workout_notes': [
    ['vaultWorkouts'],
    ['recapProgress'],
    ['trainingVolume'],
  ],
  'vault_nutrition_logs': [
    ['nutritionLogs'],
    ['nutritionTargets'],
    ['dailyEnergy'],
    ['macroProgress'],
  ],
  'weight_entries': [
    ['weightHistory'],
    ['bodyComposition'],
    ['nutritionTargets'],
    ['tdeeCalculation'],
  ],
  'custom_activity_logs': [
    ['gamePlan'],
    ['customActivities'],
    ['recapProgress'],
    ['trainingVolume'],
  ],
  'tex_vision_drill_results': [
    ['texVisionProgress'],
    ['texVisionMetrics'],
    ['recapProgress'],
  ],
  'videos': [
    ['videoAnalysis'],
    ['skillProgression'],
    ['recapProgress'],
  ],
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
  'hydration_logs': [
    ['hydrationProgress'],
    ['dailyHydration'],
    ['recoveryStatus'],
  ],
  'sub_module_progress': [
    ['programProgress'],
    ['gamePlan'],
    ['trainingVolume'],
  ],
  'stress_assessments': [
    ['stressHistory'],
    ['mentalReadiness'],
    ['recoveryStatus'],
  ],
  'calendar_skipped_items': [
    ['gamePlan'],
    ['calendarEvents'],
    ['customActivities'],
  ],
  'physio_daily_reports': [
    ['physioDailyReport'],
    ['physioGamePlanBadges'],
  ],
  'physio_health_profiles': [
    ['physioProfile'],
    ['physioGamePlanBadges'],
  ],
  'physio_adult_tracking': [
    ['physioAdultTracking'],
  ],
  'performance_sessions': [
    ['hie-snapshot'], ['progressive-gate'], ['delta-analytics'],
    ['recent-sessions'], ['day-sessions'], ['fatigue-state'], ['calendar'],
    ['split-analytics-composites'], ['latest-session-ts'],
  ],
  'hie_snapshots': [
    ['hie-snapshot'], ['progressive-gate'], ['delta-analytics'],
  ],
};

const CRITICAL_KEYS: string[][] = [
  ['hie-snapshot'],
  ['recent-sessions'],
  ['fatigue-state'],
];

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
  const lastEventMapRef = useRef<Map<string, number>>(new Map());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef(TAB_ID);
  // Guards against the "CLOSED triggers reconnect during cleanup" loop that
  // hammered the realtime endpoint every few seconds. Set true when the
  // hook is tearing down so status callbacks become no-ops.
  const teardownRef = useRef(false);
  // Stable refs so the realtime effect does not resubscribe on every render.
  const onDataChangeRef = useRef(onDataChange);
  useEffect(() => { onDataChangeRef.current = onDataChange; }, [onDataChange]);

  // ── PER-ROW DEDUP ──
  const shouldProcessEvent = useCallback((table: string, eventType: string, rowId: string): boolean => {
    if (!rowId) return true;
    const key = `${table}:${eventType}:${rowId}`;
    const now = Date.now();
    const last = lastEventMapRef.current.get(key);
    if (last && now - last < 500) return false;
    lastEventMapRef.current.set(key, now);
    if (lastEventMapRef.current.size > 1000) {
      lastEventMapRef.current.clear();
    }
    return true;
  }, []);

  // ── BROADCAST TO OTHER TABS ──
  const broadcastInvalidate = useCallback((queryKey: string[]) => {
    try {
      broadcastChannelRef.current?.postMessage({ type: 'invalidate', key: queryKey, source: tabIdRef.current });
    } catch {
      // BroadcastChannel may be closed
    }
  }, []);

  const invalidateRelatedQueries = useCallback((tableName: string) => {
    const relatedQueryKeys = TABLE_QUERY_MAPPINGS[tableName];
    if (relatedQueryKeys) {
      relatedQueryKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
        broadcastInvalidate(queryKey);
      });
    }
  }, [queryClient, broadcastInvalidate]);

  // ── MAIN REALTIME SUBSCRIPTION ──
  // Single effect, depends only on user.id + enabled. All callbacks live in
  // refs so this never resubscribes mid-session.
  useEffect(() => {
    if (!user || !enabled) return;
    teardownRef.current = false;
    reconnectAttemptRef.current = 0;

    const buildChannel = () => {
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
          (payload: any) => {
            const rowId = payload?.new?.id || payload?.old?.id || '';
            if (!shouldProcessEvent(table, payload.eventType, rowId)) return;
            invalidateRelatedQueries(table);
            try { onDataChangeRef.current?.(table, payload); } catch { /* ignore */ }
          },
        );
      });
      return channel;
    };

    const scheduleReconnect = () => {
      if (teardownRef.current) return;
      const MAX_ATTEMPTS = 5;
      if (reconnectAttemptRef.current >= MAX_ATTEMPTS) {
        console.warn('[UnifiedDataSync] Max reconnect attempts reached, invalidating critical keys');
        CRITICAL_KEYS.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
          broadcastInvalidate(key);
        });
        reconnectAttemptRef.current = 0;
        return;
      }
      const delay = Math.min(30_000, Math.pow(2, reconnectAttemptRef.current) * 1000);
      reconnectAttemptRef.current += 1;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        if (teardownRef.current) return;
        if (channelRef.current) {
          try { supabase.removeChannel(channelRef.current); } catch { /* ignore */ }
          channelRef.current = null;
        }
        subscribe();
      }, delay);
    };

    const subscribe = () => {
      if (teardownRef.current) return;
      const channel = buildChannel();
      channelRef.current = channel;
      channel.subscribe((status) => {
        if (teardownRef.current) return; // ignore status that fires during teardown
        if (status === 'SUBSCRIBED') {
          if (reconnectAttemptRef.current > 0) {
            console.log('[UnifiedDataSync] Reconnected successfully');
          } else {
            console.log('[UnifiedDataSync] Subscribed to cross-module sync');
          }
          reconnectAttemptRef.current = 0;
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Only reconnect on genuine error/timeout — never on CLOSED, which
          // is what fires when we tear the channel down ourselves.
          console.warn('[UnifiedDataSync] Channel error/timeout, attempting reconnect');
          scheduleReconnect();
        }
      });
    };

    subscribe();

    return () => {
      teardownRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch { /* ignore */ }
        channelRef.current = null;
      }
    };
    // Intentionally only depends on user.id + enabled. shouldProcessEvent,
    // invalidateRelatedQueries, broadcastInvalidate, queryClient are all
    // stable in practice; onDataChange is read through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, enabled]);

  // ── MULTI-TAB BROADCAST CHANNEL ──
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const bc = new BroadcastChannel('data-sync');
    broadcastChannelRef.current = bc;

    bc.onmessage = (event) => {
      if (event.data?.source === tabIdRef.current) return;
      if (event.data?.type === 'invalidate' && Array.isArray(event.data.key)) {
        queryClient.invalidateQueries({ queryKey: event.data.key });
      }
      // Handle custom-activity-updated from other tabs (skip same-tab)
      if (event.data?.type === 'custom-activity-updated' && event.data?.source !== tabIdRef.current) {
        queryClient.invalidateQueries({ queryKey: ['customActivities'] });
        queryClient.invalidateQueries({ queryKey: ['gamePlan'] });
      }
    };

    return () => {
      bc.close();
      broadcastChannelRef.current = null;
    };
  }, [queryClient]);

  // Manual invalidation methods for imperative use
  const invalidateModule = useCallback((module: 'gamePlan' | 'nutrition' | 'vault' | 'texVision' | 'mindFuel' | 'all') => {
    const moduleQueryKeys: Record<string, string[][]> = {
      gamePlan: [['gamePlan'], ['customActivities'], ['recoveryStatus']],
      nutrition: [['nutritionLogs'], ['nutritionTargets'], ['hydrationProgress'], ['macroProgress']],
      vault: [['vaultWorkouts'], ['recapProgress'], ['weightHistory'], ['bodyComposition']],
      texVision: [['texVisionProgress'], ['texVisionMetrics']],
      mindFuel: [['mindFuelProgress'], ['mentalReadiness'], ['emotionHistory'], ['journalEntries']],
      all: [],
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
 */
export function useRecoveryStatus() {
  const { user } = useAuth();

  const getRecoveryStatus = useCallback(async () => {
    if (!user) return null;

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
