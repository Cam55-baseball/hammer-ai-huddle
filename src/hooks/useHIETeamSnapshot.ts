import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import type { HIESnapshot } from '@/hooks/useHIESnapshot';

export interface HIETeamSnapshot {
  id: string;
  organization_id: string;
  computed_at: string;
  team_mpi_avg: number;
  trending_players: any[];
  risk_alerts: any[];
  team_weakness_patterns: any[];
  suggested_team_drills: any[];
}

export function useHIETeamSnapshot() {
  const { user } = useAuth();
  const { myOrgs, members } = useOrganization();
  const orgId = myOrgs.data?.[0]?.id;
  const memberIds = (members.data ?? []).map((m: any) => m.user_id);

  const teamQuery = useQuery({
    queryKey: ['hie-team-snapshot', orgId],
    queryFn: async (): Promise<HIETeamSnapshot | null> => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('hie_team_snapshots')
        .select('*')
        .eq('organization_id', orgId)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as HIETeamSnapshot | null;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const playerSnapshotsQuery = useQuery({
    queryKey: ['hie-player-snapshots', memberIds],
    queryFn: async (): Promise<HIESnapshot[]> => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from('hie_snapshots')
        .select('*')
        .in('user_id', memberIds);
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        weakness_clusters: d.weakness_clusters ?? [],
        prescriptive_actions: d.prescriptive_actions ?? [],
        risk_alerts: d.risk_alerts ?? [],
        smart_week_plan: d.smart_week_plan ?? [],
        before_after_trends: d.before_after_trends ?? [],
        drill_effectiveness: d.drill_effectiveness ?? [],
      })) as HIESnapshot[];
    },
    enabled: memberIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    teamSnapshot: teamQuery.data,
    playerSnapshots: playerSnapshotsQuery.data ?? [],
    isLoading: teamQuery.isLoading || playerSnapshotsQuery.isLoading,
  };
}
