import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CoachingReport } from '@/lib/coachingReportTypes';
import { loggedPracticeReport } from '../../supabase/functions/_shared/practiceReport';

export function useCoachingReport(sessionId: string | null, hasScores: boolean) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['logged-practice-report', sessionId],
    queryFn: async (): Promise<CoachingReport | null> => {
      if (!sessionId) return null;
      const result = await supabase.from('performance_sessions')
        .select('session_date,coach_id,drill_blocks').eq('id', sessionId).is('deleted_at', null).maybeSingle();
      if (result.error) throw new Error('Practice log unavailable');
      if (!result.data) return null;
      // RLS-authorized source only: old AI cache is never evidence.
      return loggedPracticeReport(result.data);
    },
    enabled: Boolean(sessionId) && hasScores,
    staleTime: 0,
    retry: 1,
  });
  return { report: data ?? null, isGenerating: isLoading, error: error ? error.message : null };
}
