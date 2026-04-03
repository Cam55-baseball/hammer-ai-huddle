import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface WeaknessCluster {
  area: string;
  issue: string;
  why: string;
  impact: 'high' | 'medium' | 'low';
  data_points: Record<string, any>;
}

export interface PrescriptiveDrill {
  name: string;
  description: string;
  module: string;
  constraints: string;
}

export interface PrescriptiveAction {
  weakness_area: string;
  drills: PrescriptiveDrill[];
}

export interface RiskAlert {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface HIESnapshot {
  id: string;
  user_id: string;
  sport: string;
  computed_at: string;
  development_status: string;
  primary_limiter: string | null;
  weakness_clusters: WeaknessCluster[];
  prescriptive_actions: PrescriptiveAction[];
  readiness_score: number;
  readiness_recommendation: string | null;
  risk_alerts: RiskAlert[];
  development_confidence: number;
  smart_week_plan: any[];
  before_after_trends: any[];
  drill_effectiveness: any[];
  mpi_score: number | null;
  mpi_trend_7d: number | null;
  mpi_trend_30d: number | null;
  transfer_score: number | null;
  decision_speed_index: number | null;
  movement_efficiency_score: number | null;
}

export function useHIESnapshot() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['hie-snapshot', user?.id],
    queryFn: async (): Promise<HIESnapshot | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('hie_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        weakness_clusters: (data.weakness_clusters as any) ?? [],
        prescriptive_actions: (data.prescriptive_actions as any) ?? [],
        risk_alerts: (data.risk_alerts as any) ?? [],
        smart_week_plan: (data.smart_week_plan as any) ?? [],
        before_after_trends: (data.before_after_trends as any) ?? [],
        drill_effectiveness: (data.drill_effectiveness as any) ?? [],
      } as HIESnapshot;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.functions.invoke('hie-analyze', {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: { user_id: user.id, sport: 'baseball' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hie-snapshot', user?.id] });
      toast({ title: 'Analysis updated', description: 'Your development snapshot has been refreshed.' });
    },
    onError: (err: any) => {
      toast({ title: 'Analysis failed', description: err.message, variant: 'destructive' });
    },
  });

  return {
    snapshot: query.data,
    isLoading: query.isLoading,
    refreshAnalysis: refreshMutation.mutate,
    isRefreshing: refreshMutation.isPending,
  };
}
