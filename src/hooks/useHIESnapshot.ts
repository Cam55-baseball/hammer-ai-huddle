import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef, useCallback } from 'react';

export interface WeaknessCluster {
  area: string;
  issue: string;
  why: string;
  impact: 'high' | 'medium' | 'low';
  data_points: Record<string, any>;
}

export interface PrescriptiveDrill {
  name: string;
  description: string;
  module: string;
  constraints: string;
  drill_type?: string;
}

export interface PrescriptiveAction {
  weakness_area: string;
  drills: PrescriptiveDrill[];
}

export interface RiskAlert {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface HIESnapshot {
  id: string;
  user_id: string;
  sport: string;
  computed_at: string;
  development_status: string;
  primary_limiter: string | null;
  weakness_clusters: WeaknessCluster[];
  prescriptive_actions: PrescriptiveAction[];
  readiness_score: number;
  readiness_recommendation: string | null;
  risk_alerts: RiskAlert[];
  development_confidence: number;
  smart_week_plan: any[];
  before_after_trends: any[];
  drill_effectiveness: any[];
  mpi_score: number | null;
  mpi_trend_7d: number | null;
  mpi_trend_30d: number | null;
  transfer_score: number | null;
  decision_speed_index: number | null;
  movement_efficiency_score: number | null;
}

export function useHIESnapshot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastInvalidationRef = useRef(0);

  const query = useQuery({
    queryKey: ['hie-snapshot', user?.id],
    queryFn: async (): Promise<HIESnapshot | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('hie_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        weakness_clusters: (data.weakness_clusters as any) ?? [],
        prescriptive_actions: (data.prescriptive_actions as any) ?? [],
        risk_alerts: (data.risk_alerts as any) ?? [],
        smart_week_plan: (data.smart_week_plan as any) ?? [],
        before_after_trends: (data.before_after_trends as any) ?? [],
        drill_effectiveness: (data.drill_effectiveness as any) ?? [],
      } as HIESnapshot;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // ── LATEST SESSION TIMESTAMP ──
  const latestSessionQuery = useQuery({
    queryKey: ['latest-session-ts', user?.id],
    queryFn: async (): Promise<string | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('performance_sessions')
        .select('created_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.created_at ?? null;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // ── SESSION-AWARE RECONCILIATION (cooldown + visibility + online guards) ──
  useEffect(() => {
    if (!query.data || !latestSessionQuery.data) return;
    if (document.visibilityState !== 'visible') return;
    if (!navigator.onLine) return;

    const now = Date.now();
    if (now - lastInvalidationRef.current < 5000) return;

    const computedAt = new Date(query.data.computed_at).getTime();
    const latestSession = new Date(latestSessionQuery.data).getTime();

    if (latestSession > computedAt + 10_000) {
      lastInvalidationRef.current = now;
      queryClient.invalidateQueries({ queryKey: ['hie-snapshot', user?.id] });
    }
  }, [query.data, latestSessionQuery.data, queryClient, user?.id]);

  // ── STALE DATA AUTO-REFRESH (24h fallback — invalidation only) ──
  useEffect(() => {
    if (!query.data) return;
    if (!navigator.onLine) return;

    const computedAt = new Date(query.data.computed_at).getTime();
    const staleThreshold = 24 * 60 * 60 * 1000;
    if (Date.now() - computedAt > staleThreshold) {
      queryClient.invalidateQueries({ queryKey: ['hie-snapshot', user?.id] });
    }
  }, [query.data, queryClient, user?.id]);

  // ── RESUME TRIGGERS (visibilitychange + online) ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ['hie-snapshot', user?.id] });
      }
    };
    const handleOnline = () => {
      queryClient.invalidateQueries({ queryKey: ['hie-snapshot', user?.id] });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [queryClient, user?.id]);

  const isStale = query.data
    ? Date.now() - new Date(query.data.computed_at).getTime() > 24 * 60 * 60 * 1000
    : false;

  // Manual refresh triggers query invalidation only (server owns computation)
  const refreshAnalysis = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['hie-snapshot', user?.id] });
  }, [queryClient, user?.id]);

  return {
    snapshot: query.data,
    isLoading: query.isLoading,
    refreshAnalysis,
    isRefreshing: query.isFetching,
    isStale,
    computedAt: query.data?.computed_at ?? null,
  };
}
