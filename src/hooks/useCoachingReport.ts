import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CoachingReport } from '@/lib/coachingReportTypes';

interface UseCoachingReportResult {
  report: CoachingReport | null;
  isGenerating: boolean;
  error: string | null;
}

export function useCoachingReport(sessionId: string | null, hasScores: boolean): UseCoachingReportResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['coaching-report', sessionId],
    queryFn: async (): Promise<CoachingReport | null> => {
      if (!sessionId) return null;

      // Check cache first
      const { data: cached } = await supabase
        .from('session_insights')
        .select('report')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (cached?.report && typeof cached.report === 'object' && Object.keys(cached.report as object).length > 0) {
        return cached.report as unknown as CoachingReport;
      }

      // Call edge function to generate
      const { data: fnData, error: fnError } = await supabase.functions.invoke('session-insights', {
        body: { session_id: sessionId },
      });

      if (fnError) {
        console.error('Coaching report generation failed:', fnError);
        throw new Error(fnError.message || 'Failed to generate coaching report');
      }

      if (fnData?.report) {
        return fnData.report as CoachingReport;
      }

      return null;
    },
    enabled: !!sessionId && hasScores,
    staleTime: Infinity, // Cached reports don't change
    retry: 1,
  });

  return {
    report: data ?? null,
    isGenerating: isLoading,
    error: error ? (error as Error).message : null,
  };
}
