import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateFullNutritionTargets,
  calculateAge,
  type Sex,
  type ActivityLevel,
  type GoalType,
  type DayType,
  type NutritionTargets
} from '@/utils/tdeeCalculations';

interface BiometricData {
  weightLbs: number | null;
  heightInches: number | null;
  dateOfBirth: Date | null;
  sex: Sex | null;
  activityLevel: ActivityLevel;
}

interface AthleteGoal {
  id: string;
  goalType: GoalType;
  targetWeightLbs: number | null;
  targetBodyFatPercent: number | null;
  weeklyChangeRate: number;
  isActive: boolean;
}

interface TodayEvent {
  eventType: DayType;
  intensityLevel: number | null;
}

export function useTDEE() {
  const { user } = useAuth();
  const [biometrics, setBiometrics] = useState<BiometricData | null>(null);
  const [activeGoal, setActiveGoal] = useState<AthleteGoal | null>(null);
  const [todayEvent, setTodayEvent] = useState<TodayEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      // Fetch profile biometrics - use maybeSingle to handle missing rows
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('weight, height_inches, date_of_birth, sex, activity_level')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }
      
      if (profile) {
        const parsedWeight = profile.weight ? parseFloat(profile.weight) : null;
        setBiometrics({
          weightLbs: parsedWeight && !isNaN(parsedWeight) ? parsedWeight : null,
          heightInches: profile.height_inches,
          dateOfBirth: profile.date_of_birth ? new Date(profile.date_of_birth) : null,
          sex: profile.sex as Sex | null,
          activityLevel: (profile.activity_level as ActivityLevel) || 'moderately_active'
        });
      } else {
        // Explicitly clear biometrics if no profile exists
        setBiometrics(null);
      }

      // Fetch active body goal
      const { data: goal } = await supabase
        .from('athlete_body_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (goal) {
        setActiveGoal({
          id: goal.id,
          goalType: goal.goal_type as GoalType,
          targetWeightLbs: goal.target_weight_lbs,
          targetBodyFatPercent: goal.target_body_fat_percent,
          weeklyChangeRate: goal.weekly_change_rate || 1,
          isActive: goal.is_active || false
        });
      } else {
        setActiveGoal(null);
      }

      // Fetch today's event type
      const today = new Date().toISOString().split('T')[0];
      const { data: event } = await supabase
        .from('athlete_events')
        .select('event_type, intensity_level')
        .eq('user_id', user.id)
        .eq('event_date', today)
        .limit(1)
        .maybeSingle();
      
      if (event) {
        setTodayEvent({
          eventType: event.event_type as DayType,
          intensityLevel: event.intensity_level
        });
      } else {
        setTodayEvent(null);
      }
    } catch (error) {
      console.error('Error fetching TDEE data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  const nutritionTargets = useMemo((): NutritionTargets | null => {
    if (!biometrics?.weightLbs || !biometrics?.heightInches || 
        !biometrics?.dateOfBirth || !biometrics?.sex) {
      return null;
    }

    const age = calculateAge(biometrics.dateOfBirth);
    const goalType = activeGoal?.goalType || 'maintain';
    const dayType = todayEvent?.eventType || 'training';

    return calculateFullNutritionTargets(
      biometrics.weightLbs,
      biometrics.heightInches,
      age,
      biometrics.sex,
      biometrics.activityLevel,
      goalType,
      dayType
    );
  }, [biometrics, activeGoal, todayEvent]);

  const isProfileComplete = useMemo(() => {
    return !!(
      biometrics?.weightLbs &&
      biometrics?.heightInches &&
      biometrics?.dateOfBirth &&
      biometrics?.sex
    );
  }, [biometrics]);

  const hasActiveGoal = !!activeGoal;

  return {
    biometrics,
    activeGoal,
    todayEvent,
    nutritionTargets,
    isProfileComplete,
    hasActiveGoal,
    loading,
    refetch
  };
}
