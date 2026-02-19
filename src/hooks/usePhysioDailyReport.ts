import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export interface PhysioReportSection {
  why: string;
  what_to_do: string;
  how_it_helps: string;
}

export interface PhysioDailyReport {
  id: string;
  user_id: string;
  report_date: string;
  regulation_score: number;
  regulation_color: 'green' | 'yellow' | 'red';
  sleep_score: number | null;
  stress_score: number | null;
  readiness_score: number | null;
  restriction_score: number | null;
  load_score: number | null;
  fuel_score: number | null;
  calendar_score: number | null;
  report_headline: string | null;
  report_sections: Record<string, PhysioReportSection> | null;
  suggestion_responses: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export function usePhysioDailyReport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: report, isLoading } = useQuery({
    queryKey: ['physioDailyReport', user?.id, today],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('physio_daily_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('report_date', today)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as PhysioDailyReport | null;
    },
    enabled: !!user,
  });

  const regulationScore = report?.regulation_score ?? null;
  const regulationColor = report?.regulation_color ?? null;

  const triggerReportGeneration = useCallback(async () => {
    if (!user) return;
    // Non-blocking: fire and forget, then invalidate
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    fetch(`${supabaseUrl}/functions/v1/calculate-regulation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }).then(() => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['physioDailyReport'] });
        queryClient.invalidateQueries({ queryKey: ['physioGamePlanBadges'] });
      }, 3000);
    }).catch(console.error);
  }, [user, queryClient]);

  const logSuggestionResponse = useCallback(async (sectionKey: string, response: 'apply' | 'modify' | 'decline') => {
    if (!user || !report) return;
    const existingResponses = report.suggestion_responses || {};
    const updated = { ...existingResponses, [sectionKey]: response };
    
    await supabase
      .from('physio_daily_reports')
      .update({ suggestion_responses: updated })
      .eq('id', report.id);
    
    queryClient.invalidateQueries({ queryKey: ['physioDailyReport'] });
  }, [user, report, queryClient]);

  return {
    report,
    isLoading,
    regulationScore,
    regulationColor,
    triggerReportGeneration,
    logSuggestionResponse,
  };
}
