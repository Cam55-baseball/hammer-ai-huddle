import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PhysioHealthProfile {
  id: string;
  user_id: string;
  blood_type: string | null;
  dietary_style: string | null;
  allergies: string[];
  food_intolerances: string[];
  medications: string[];
  medical_conditions: string[];
  injury_history: string[];
  supplements: string[];
  active_illness: string | null;
  illness_started_at: string | null;
  adult_features_enabled: boolean;
  setup_completed: boolean;
  created_at: string;
  updated_at: string;
}

export function usePhysioProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['physioProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('physio_health_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data as PhysioHealthProfile | null;
    },
    enabled: !!user,
  });

  const setupCompleted = profile?.setup_completed ?? false;
  const adultFeaturesEnabled = profile?.adult_features_enabled ?? false;

  const saveProfile = useCallback(async (updates: Partial<PhysioHealthProfile> & { setup_completed?: boolean }) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    try {
      const { error } = await supabase
        .from('physio_health_profiles')
        .upsert({ 
          user_id: user.id, 
          ...updates 
        }, { onConflict: 'user_id' });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['physioProfile'] });
      queryClient.invalidateQueries({ queryKey: ['physioGamePlanBadges'] });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [user, queryClient]);

  const updateIllness = useCallback(async (illness: string | null) => {
    if (!user) return;
    await supabase
      .from('physio_health_profiles')
      .upsert({ 
        user_id: user.id, 
        active_illness: illness,
        illness_started_at: illness ? new Date().toISOString().split('T')[0] : null,
      }, { onConflict: 'user_id' });
    queryClient.invalidateQueries({ queryKey: ['physioProfile'] });
    queryClient.invalidateQueries({ queryKey: ['physioGamePlanBadges'] });
  }, [user, queryClient]);

  const enableAdultFeatures = useCallback(async () => {
    if (!user) return { success: false };
    
    // Age gate: check date_of_birth from profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('date_of_birth')
      .eq('id', user.id)
      .maybeSingle();

    if (profileData?.date_of_birth) {
      const dob = new Date(profileData.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear() - 
        (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      
      if (age < 18) {
        return { success: false, error: 'Age requirement not met' };
      }
    }

    const result = await saveProfile({ adult_features_enabled: true });
    return result;
  }, [user, saveProfile]);

  return {
    profile,
    isLoading,
    setupCompleted,
    adultFeaturesEnabled,
    saveProfile,
    updateIllness,
    enableAdultFeatures,
  };
}
