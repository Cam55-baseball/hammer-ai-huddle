import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerAccess } from './useOwnerAccess';
import { useAdminAccess } from './useAdminAccess';

export interface HeartbeatHealth {
  recent: Array<{
    id: string;
    run_at: string;
    success: boolean;
    latency_ms: number | null;
    failure_check: string | null;
    failure_reason: string | null;
  }>;
  passCount24h: number;
  totalCount24h: number;
  successRate: number;
  p50Latency: number;
  p95Latency: number;
  lastFailure: { run_at: string; failure_check: string | null; failure_reason: string | null } | null;
  loading: boolean;
}

export function useHeartbeatHealth(): HeartbeatHealth {
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const enabled = !!(isOwner || isAdmin);

  const query = useQuery({
    queryKey: ['heartbeat-health'],
    enabled,
    refetchInterval: 30_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();

      const [recentRes, dayRes] = await Promise.all([
        (supabase as any)
          .from('engine_heartbeat_logs')
          .select('id, run_at, success, latency_ms, failure_check, failure_reason')
          .order('run_at', { ascending: false })
          .limit(10),
        (supabase as any)
          .from('engine_heartbeat_logs')
          .select('success, latency_ms, run_at, failure_check, failure_reason')
          .gte('run_at', since)
          .order('run_at', { ascending: false }),
      ]);

      const recent = recentRes.data ?? [];
      const day = (dayRes.data ?? []) as Array<{
        success: boolean; latency_ms: number | null; run_at: string;
        failure_check: string | null; failure_reason: string | null;
      }>;

      const passes = day.filter(r => r.success).length;
      const latencies = day.map(r => r.latency_ms ?? 0).filter(n => n > 0).sort((a, b) => a - b);
      const pct = (p: number) => latencies.length === 0 ? 0 : latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))];

      const lastFailure = day.find(r => !r.success);

      return {
        recent,
        passCount24h: passes,
        totalCount24h: day.length,
        successRate: day.length ? Math.round((passes / day.length) * 100) : 0,
        p50Latency: pct(0.5),
        p95Latency: pct(0.95),
        lastFailure: lastFailure ? {
          run_at: lastFailure.run_at,
          failure_check: lastFailure.failure_check,
          failure_reason: lastFailure.failure_reason,
        } : null,
      };
    },
  });

  return {
    recent: query.data?.recent ?? [],
    passCount24h: query.data?.passCount24h ?? 0,
    totalCount24h: query.data?.totalCount24h ?? 0,
    successRate: query.data?.successRate ?? 0,
    p50Latency: query.data?.p50Latency ?? 0,
    p95Latency: query.data?.p95Latency ?? 0,
    lastFailure: query.data?.lastFailure ?? null,
    loading: query.isLoading,
  };
}
