import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePhysioProfile } from './usePhysioProfile';
import { format } from 'date-fns';

export interface PhysioAdultTracking {
  id: string;
  user_id: string;
  tracking_date: string;
  libido_level: number | null;
  cycle_phase: string | null;
  cycle_day: number | null;
  period_active: boolean;
  wellness_consistency: boolean | null;
  mood_stability: number | null;
  sleep_quality_impact: number | null;
  wellness_consistency_text: string | null;
  symptom_tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export function usePhysioAdultTracking() {
  const { user } = useAuth();
  const { adultFeaturesEnabled } = usePhysioProfile();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: tracking, isLoading } = useQuery({
    queryKey: ['physioAdultTracking', user?.id, today],
    queryFn: async () => {
      if (!user || !adultFeaturesEnabled) return null;
      const { data, error } = await supabase
        .from('physio_adult_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('tracking_date', today)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data as PhysioAdultTracking | null;
    },
    enabled: !!user && adultFeaturesEnabled,
  });

  const saveTracking = useCallback(async (updates: Partial<PhysioAdultTracking>) => {
    if (!user || !adultFeaturesEnabled) return { success: false };
    try {
      const { error } = await supabase
        .from('physio_adult_tracking')
        .upsert({
          user_id: user.id,
          tracking_date: today,
          ...updates,
        }, { onConflict: 'user_id,tracking_date' });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['physioAdultTracking'] });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [user, adultFeaturesEnabled, today, queryClient]);

  return {
    tracking,
    isLoading,
    adultFeaturesEnabled,
    saveTracking,
  };
}
