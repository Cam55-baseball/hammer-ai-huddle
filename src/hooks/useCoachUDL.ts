import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PlayerOverview {
  id: string;
  full_name: string;
  avatar_url: string | null;
  latest_plan: any | null;
  compliance_pct: number;
  trend: 'improving' | 'declining' | 'stable';
  status_light: 'green' | 'yellow' | 'red';
  alerts: any[];
  constraints: any[];
}

export interface UDLAlert {
  id: string;
  target_user_id: string;
  alert_type: string;
  severity: string;
  message: string;
  metadata: any;
  dismissed_by: string | null;
  created_at: string;
}

export function useCoachUDL() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const overviewQuery = useQuery({
    queryKey: ['udl-coach-overview', user?.id],
    queryFn: async (): Promise<{ players: PlayerOverview[]; alerts: UDLAlert[] }> => {
      if (!user) return { players: [], alerts: [] };

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return { players: [], alerts: [] };

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/udl-coach-overview`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!res.ok) return { players: [], alerts: [] };
      return await res.json();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const dismissAlert = useMutation({
    mutationFn: async (alertId: string) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('udl_alerts')
        .update({ dismissed_by: user.id })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['udl-coach-overview'] });
    },
  });

  return {
    players: overviewQuery.data?.players ?? [],
    alerts: overviewQuery.data?.alerts ?? [],
    isLoading: overviewQuery.isLoading,
    error: overviewQuery.error,
    dismissAlert: dismissAlert.mutate,
  };
}
