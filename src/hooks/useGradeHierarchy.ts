import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Determines effective grade for a session using the hierarchy:
 * Admin > Primary Coach > Secondary Coach > Scout > Player
 */
export function useGradeHierarchy(sessionId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['grade-hierarchy', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      // Get session grades
      const { data: session, error: sErr } = await supabase
        .from('performance_sessions')
        .select('player_grade, coach_grade, effective_grade, user_id')
        .eq('id', sessionId)
        .single();
      if (sErr) throw sErr;

      // Get coach overrides
      const { data: overrides } = await supabase
        .from('coach_grade_overrides')
        .select('override_grade, coach_id')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);

      // Get scout evaluations (latest)
      const { data: scoutEvals } = await supabase
        .from('scout_evaluations')
        .select('overall_grade')
        .eq('athlete_id', session.user_id)
        .order('evaluation_date', { ascending: false })
        .limit(1);

      const coachGrade = overrides?.[0]?.override_grade ?? session.coach_grade;
      const scoutGrade = scoutEvals?.[0]?.overall_grade ?? null;
      const playerGrade = session.player_grade;

      // Hierarchy: coach > scout > player
      const effectiveGrade = coachGrade ?? scoutGrade ?? playerGrade;

      return {
        playerGrade,
        coachGrade,
        scoutGrade,
        effectiveGrade,
        source: coachGrade != null ? 'coach' : scoutGrade != null ? 'scout' : 'player',
      };
    },
    enabled: !!sessionId,
  });
}
