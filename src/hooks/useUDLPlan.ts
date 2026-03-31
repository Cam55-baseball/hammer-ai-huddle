import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getTodayDate } from '@/utils/dateUtils';

export interface UDLDrill {
  drill_key: string;
  drill_name: string;
  setup: string;
  execution: string;
  constraints: string[];
  reps: string;
  goal_metric: string;
  difficulty_level: number;
  is_high_intensity: boolean;
  for_constraint: string;
  constraint_label: string;
}

export interface UDLConstraint {
  key: string;
  label: string;
  score: number;
  severity: number;
  description: string;
}

export interface UDLPlan {
  id: string;
  user_id: string;
  plan_date: string;
  constraints_detected: UDLConstraint[];
  prescribed_drills: UDLDrill[];
  readiness_adjustments: {
    volume_modifier?: number;
    note?: string;
  };
  player_state: Record<string, number | boolean>;
  generated_at: string;
}

export function useUDLPlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = getTodayDate();

  const planQuery = useQuery({
    queryKey: ['udl-plan', user?.id, today],
    queryFn: async (): Promise<UDLPlan | null> => {
      if (!user) return null;

      // Try to get from DB first (cached plan)
      const { data: existing } = await supabase
        .from('udl_daily_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_date', today)
        .maybeSingle();

      if (existing) {
        return existing as unknown as UDLPlan;
      }

      // Generate new plan via edge function
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return null;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/udl-generate-plan`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) return null;
      const result = await res.json();
      return (result.plan as UDLPlan) ?? null;
    },
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1,
  });

  const completionQuery = useQuery({
    queryKey: ['udl-completions', planQuery.data?.id],
    queryFn: async () => {
      if (!planQuery.data?.id || !user) return [];
      const { data } = await supabase
        .from('udl_drill_completions')
        .select('*')
        .eq('plan_id', planQuery.data.id)
        .eq('user_id', user.id);
      return data ?? [];
    },
    enabled: !!planQuery.data?.id && !!user,
  });

  const startDrill = useMutation({
    mutationFn: async (drillKey: string) => {
      if (!user || !planQuery.data?.id) throw new Error('No plan');
      const { error } = await supabase.from('udl_drill_completions').insert({
        user_id: user.id,
        plan_id: planQuery.data.id,
        drill_key: drillKey,
        started_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['udl-completions'] });
    },
  });

  const completeDrill = useMutation({
    mutationFn: async ({ drillKey, notes }: { drillKey: string; notes?: string }) => {
      if (!user || !planQuery.data?.id) throw new Error('No plan');
      const { error } = await supabase
        .from('udl_drill_completions')
        .update({
          completed_at: new Date().toISOString(),
          result_notes: notes ?? null,
        })
        .eq('plan_id', planQuery.data.id)
        .eq('drill_key', drillKey)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['udl-completions'] });
    },
  });

  const completions = completionQuery.data ?? [];
  const getDrillStatus = (drillKey: string) => {
    const c = completions.find((x: any) => x.drill_key === drillKey);
    if (!c) return 'pending';
    if (c.completed_at) return 'completed';
    return 'in_progress';
  };

  return {
    plan: planQuery.data,
    isLoading: planQuery.isLoading,
    error: planQuery.error,
    completions,
    startDrill: startDrill.mutate,
    completeDrill: completeDrill.mutate,
    getDrillStatus,
  };
}
