import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SentinelLog {
  id: string;
  run_at: string;
  user_id: string;
  expected_state: string;
  actual_state: string | null;
  drift_score: number;
  drift_flag: boolean;
  failure_reason: string | null;
  inputs_snapshot: Record<string, unknown>;
  engine_snapshot: Record<string, unknown>;
}

export function useSentinelHealth() {
  const { data, isLoading } = useQuery({
    queryKey: ['sentinel-health'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data: rows } = await (supabase as any)
        .from('engine_sentinel_logs')
        .select('*')
        .gte('run_at', since)
        .order('run_at', { ascending: false })
        .limit(500);

      const list = (rows ?? []) as SentinelLog[];
      const total24h = list.length;
      const flagged = list.filter((r) => r.drift_flag);
      const driftRate = total24h > 0 ? Math.round((flagged.length / total24h) * 100) : 0;
      const usersFlagged = new Set(flagged.map((r) => r.user_id)).size;
      const worstDriftCase = list.reduce<SentinelLog | null>(
        (best, r) => (best === null || r.drift_score > best.drift_score ? r : best),
        null
      );
      const recent = list.slice(0, 20);

      return {
        total24h,
        driftRate,
        usersFlagged,
        worstDriftCase,
        recent,
      };
    },
  });

  return {
    loading: isLoading,
    total24h: data?.total24h ?? 0,
    driftRate: data?.driftRate ?? 0,
    usersFlagged: data?.usersFlagged ?? 0,
    worstDriftCase: data?.worstDriftCase ?? null,
    recent: data?.recent ?? [],
  };
}
