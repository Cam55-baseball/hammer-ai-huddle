import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerAccess } from './useOwnerAccess';
import { useAdminAccess } from './useAdminAccess';

export interface EngineHealth {
  hieCoverage: number;
  mpiCoverage: number;
  provisionalCount: number;
  matureCount: number;
  lastNightlyMpi: string | null;
  lastNightlyHie: string | null;
  lastHammerState: string | null;
  dirtyQueueDepth: number;
  failures24h: number;
  loading: boolean;
}

export function useEngineHealth(): EngineHealth {
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const enabled = !!(isOwner || isAdmin);

  const query = useQuery({
    queryKey: ['engine-health'],
    enabled,
    refetchInterval: 30_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

      const [activeUsers, hieRecent, mpiRows, mpiRun, hieRun, hsRun, dirty, failures] = await Promise.all([
        (supabase as any).from('athlete_mpi_settings').select('user_id', { count: 'exact', head: true }),
        (supabase as any).from('hie_snapshots').select('user_id', { count: 'exact', head: true }).gte('computed_at', since),
        (supabase as any).from('mpi_scores').select('development_status'),
        (supabase as any).from('audit_log').select('created_at').eq('action', 'nightly_mpi_completed').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        (supabase as any).from('audit_log').select('created_at').eq('action', 'nightly_hie_completed').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        (supabase as any).from('audit_log').select('created_at').eq('action', 'compute_hammer_state_completed').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        (supabase as any).from('hie_dirty_users').select('user_id', { count: 'exact', head: true }),
        (supabase as any).from('audit_log').select('id', { count: 'exact', head: true }).gte('created_at', since).ilike('action', '%failed%'),
      ]);

      const totalActive = activeUsers.count ?? 0;
      const hieRecentCount = hieRecent.count ?? 0;
      const mpiData = mpiRows.data ?? [];
      const provisional = mpiData.filter((r: any) => r.development_status === 'provisional').length;
      const mature = mpiData.length - provisional;

      return {
        hieCoverage: totalActive ? Math.round((hieRecentCount / totalActive) * 100) : 0,
        mpiCoverage: totalActive ? Math.round((mpiData.length / totalActive) * 100) : 0,
        provisionalCount: provisional,
        matureCount: mature,
        lastNightlyMpi: mpiRun.data?.created_at ?? null,
        lastNightlyHie: hieRun.data?.created_at ?? null,
        lastHammerState: hsRun.data?.created_at ?? null,
        dirtyQueueDepth: dirty.count ?? 0,
        failures24h: failures.count ?? 0,
      };
    },
  });

  return {
    hieCoverage: query.data?.hieCoverage ?? 0,
    mpiCoverage: query.data?.mpiCoverage ?? 0,
    provisionalCount: query.data?.provisionalCount ?? 0,
    matureCount: query.data?.matureCount ?? 0,
    lastNightlyMpi: query.data?.lastNightlyMpi ?? null,
    lastNightlyHie: query.data?.lastNightlyHie ?? null,
    lastHammerState: query.data?.lastHammerState ?? null,
    dirtyQueueDepth: query.data?.dirtyQueueDepth ?? 0,
    failures24h: query.data?.failures24h ?? 0,
    loading: query.isLoading,
  };
}
