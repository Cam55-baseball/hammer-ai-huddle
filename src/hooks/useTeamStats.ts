import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays } from 'date-fns';

interface TeamStats {
  avgIntegrity: number;
  coachValidationPct: number;
  activeMemberCount: number;
  flaggedCount: number;
}

export function useTeamStats(orgId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-stats', orgId],
    queryFn: async (): Promise<TeamStats> => {
      if (!orgId) return { avgIntegrity: 0, coachValidationPct: 0, activeMemberCount: 0, flaggedCount: 0 };

      // 1. Get active members
      const { data: members, error: mErr } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId)
        .eq('status', 'active');
      if (mErr) throw mErr;

      const memberIds = (members ?? []).map(m => m.user_id);
      const activeMemberCount = memberIds.length;

      if (activeMemberCount === 0) {
        return { avgIntegrity: 0, coachValidationPct: 0, activeMemberCount: 0, flaggedCount: 0 };
      }

      // 2. Get MPI integrity scores
      const { data: mpiScores } = await supabase
        .from('mpi_scores')
        .select('user_id, integrity_score')
        .in('user_id', memberIds)
        .order('calculation_date', { ascending: false });

      // Take latest per user
      const latestMpi = new Map<string, number>();
      for (const s of mpiScores ?? []) {
        if (s.integrity_score != null && !latestMpi.has(s.user_id)) {
          latestMpi.set(s.user_id, s.integrity_score);
        }
      }
      const integrityValues = Array.from(latestMpi.values());
      const avgIntegrity = integrityValues.length > 0
        ? Math.round(integrityValues.reduce((a, b) => a + b, 0) / integrityValues.length)
        : 0;

      // 3. Get recent sessions for coach validation %
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];
      const { data: sessions } = await supabase
        .from('performance_sessions')
        .select('user_id, session_date, coach_override_applied')
        .in('user_id', memberIds)
        .gte('session_date', thirtyDaysAgo);

      const allSessions = sessions ?? [];
      const validatedCount = allSessions.filter(s => s.coach_override_applied).length;
      const coachValidationPct = allSessions.length > 0
        ? Math.round((validatedCount / allSessions.length) * 100)
        : 0;

      // 4. Flagged: players with no session in last 7 days
      const sevenDaysAgo = subDays(new Date(), 7).toISOString().split('T')[0];
      const recentPlayerIds = new Set(
        allSessions
          .filter(s => s.session_date >= sevenDaysAgo)
          .map(s => s.user_id)
      );
      const flaggedCount = memberIds.filter(id => !recentPlayerIds.has(id)).length;

      return { avgIntegrity, coachValidationPct, activeMemberCount, flaggedCount };
    },
    enabled: !!orgId && !!user,
  });
}
