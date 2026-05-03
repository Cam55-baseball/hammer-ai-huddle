import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FollowerReportListItem {
  id: string;
  player_id: string;
  follower_role: 'scout' | 'coach';
  report_type: 'weekly_digest' | 'monthly_deep' | 'milestone';
  period_start: string;
  period_end: string;
  headline: string | null;
  status: string;
  viewed_at: string | null;
  created_at: string;
  player: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    sport?: string | null;
    primary_position?: string | null;
    position?: string | null;
  } | null;
}

export const useFollowerReports = () => {
  return useQuery({
    queryKey: ['follower-reports'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-follower-reports');
      if (error) throw error;
      return data as { reports: FollowerReportListItem[]; unread_count: number };
    },
    staleTime: 30_000,
  });
};

export const useFollowerReport = (id: string | null) => {
  return useQuery({
    queryKey: ['follower-report', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.functions.invoke('get-follower-reports', {
        body: { id },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

export const useMarkReportViewed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (report_id: string) => {
      const { error } = await supabase.functions.invoke('mark-follower-report-viewed', {
        body: { report_id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follower-reports'] });
    },
  });
};
