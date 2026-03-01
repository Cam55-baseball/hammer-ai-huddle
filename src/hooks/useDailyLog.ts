import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type DayStatus =
  | 'full_training'
  | 'game_only'
  | 'light_work'
  | 'recovery_only'
  | 'travel_day'
  | 'injury_hold'
  | 'voluntary_rest'
  | 'missed';

export type RestReason =
  | 'recovery'
  | 'travel'
  | 'game_day_only'
  | 'minor_soreness'
  | 'personal'
  | 'coach_directed'
  | 'weather'
  | 'injury';

export interface DailyLogEntry {
  id?: string;
  user_id: string;
  entry_date: string;
  day_status: DayStatus;
  rest_reason?: RestReason | null;
  coach_override?: boolean;
  coach_override_by?: string | null;
  injury_mode?: boolean;
  injury_body_region?: string | null;
  injury_expected_days?: number | null;
  game_logged?: boolean;
  cns_load_actual?: number;
  notes?: string | null;
}

export function useDailyLog(date?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['daily-log', user?.id, date],
    queryFn: async () => {
      if (!user || !date) return null;
      const { data, error } = await supabase
        .from('athlete_daily_log')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', date)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!date,
  });

  const upsertMutation = useMutation({
    mutationFn: async (entry: Omit<DailyLogEntry, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('athlete_daily_log')
        .upsert(
          { ...entry, user_id: user.id },
          { onConflict: 'user_id,entry_date' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
      toast({ title: 'Day status saved' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Fetch range for consistency calculations
  const useLogRange = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['daily-log-range', user?.id, startDate, endDate],
      queryFn: async () => {
        if (!user) return [];
        const { data, error } = await supabase
          .from('athlete_daily_log')
          .select('*')
          .eq('user_id', user.id)
          .gte('entry_date', startDate)
          .lte('entry_date', endDate)
          .order('entry_date', { ascending: true });
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!user,
    });
  };

  return {
    entry: query.data,
    isLoading: query.isLoading,
    upsert: upsertMutation.mutateAsync,
    saving: upsertMutation.isPending,
    useLogRange,
  };
}

export const DAY_STATUS_OPTIONS: Array<{ value: DayStatus; label: string; icon: string }> = [
  { value: 'full_training', label: 'Complete Plan', icon: '💪' },
  { value: 'game_only', label: 'Game Only', icon: '⚾' },
  { value: 'light_work', label: 'Light Work', icon: '🏃' },
  { value: 'recovery_only', label: 'Recovery', icon: '🧘' },
  { value: 'travel_day', label: 'Travel Day', icon: '✈️' },
  { value: 'injury_hold', label: 'Injury Hold', icon: '🩹' },
  { value: 'voluntary_rest', label: 'Rest Day', icon: '😴' },
  { value: 'missed', label: 'Mark Missed', icon: '❌' },
];

export const REST_REASON_OPTIONS: Array<{ value: RestReason; label: string }> = [
  { value: 'recovery', label: 'Recovery' },
  { value: 'travel', label: 'Travel' },
  { value: 'game_day_only', label: 'Game Day Only' },
  { value: 'minor_soreness', label: 'Minor Soreness' },
  { value: 'personal', label: 'Personal' },
  { value: 'coach_directed', label: 'Coach Directed' },
  { value: 'weather', label: 'Weather' },
  { value: 'injury', label: 'Injury' },
];
