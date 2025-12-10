import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Dumbbell, Apple, Video, LucideIcon } from 'lucide-react';

export interface GamePlanTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  icon: LucideIcon;
  link: string;
  show: boolean;
}

export interface GamePlanData {
  tasks: GamePlanTask[];
  completedCount: number;
  totalCount: number;
  daysUntilRecap: number;
  recapProgress: number;
  loading: boolean;
}

export function useGamePlan(selectedSport: 'baseball' | 'softball') {
  const { user } = useAuth();
  const { modules: subscribedModules } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [nutritionCompleted, setNutritionCompleted] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [daysUntilRecap, setDaysUntilRecap] = useState(42);
  const [recapProgress, setRecapProgress] = useState(0);

  // Check if user has access to Iron Bambino or Heat Factory
  const hasWorkoutAccess = subscribedModules.some(m => 
    m.includes('hitting') || m.includes('pitching')
  );

  // Check if user has any module (for video analysis access)
  const hasModuleAccess = subscribedModules.length > 0;

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const fetchTaskStatus = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const today = getTodayDate();
    
    try {
      // Fetch workout completion - check sub_module_progress for today's workout
      if (hasWorkoutAccess) {
        const { data: workoutData } = await supabase
          .from('sub_module_progress')
          .select('last_workout_date')
          .eq('user_id', user.id)
          .eq('sport', selectedSport);
        
        const todayWorkout = workoutData?.some(w => w.last_workout_date === today);
        setWorkoutCompleted(!!todayWorkout);
      }

      // Fetch nutrition check-in for today
      const { data: nutritionData } = await supabase
        .from('vault_nutrition_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .limit(1);
      
      setNutritionCompleted(!!nutritionData && nutritionData.length > 0);

      // Fetch video analysis for today
      const { data: videoData } = await supabase
        .from('videos')
        .select('id')
        .eq('user_id', user.id)
        .eq('sport', selectedSport)
        .gte('created_at', `${today}T00:00:00`)
        .limit(1);
      
      setVideoCompleted(!!videoData && videoData.length > 0);

      // Fetch recap countdown from vault_streaks or calculate from first activity
      const { data: streakData } = await supabase
        .from('vault_streaks')
        .select('created_at')
        .eq('user_id', user.id)
        .single();
      
      if (streakData?.created_at) {
        const startDate = new Date(streakData.created_at);
        const now = new Date();
        const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysInCycle = daysSinceStart % 42; // 6-week cycle
        const remaining = 42 - daysInCycle;
        setDaysUntilRecap(remaining);
        setRecapProgress(Math.round((daysInCycle / 42) * 100));
      } else {
        // Check subscription start as fallback
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('created_at')
          .eq('user_id', user.id)
          .single();
        
        if (subData?.created_at) {
          const startDate = new Date(subData.created_at);
          const now = new Date();
          const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const daysInCycle = daysSinceStart % 42;
          const remaining = 42 - daysInCycle;
          setDaysUntilRecap(remaining);
          setRecapProgress(Math.round((daysInCycle / 42) * 100));
        }
      }

    } catch (error) {
      console.error('Error fetching game plan status:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedSport, hasWorkoutAccess]);

  useEffect(() => {
    fetchTaskStatus();
  }, [fetchTaskStatus]);

  const tasks: GamePlanTask[] = [
    {
      id: 'workout',
      title: 'gamePlan.workout.title',
      description: 'gamePlan.workout.description',
      completed: workoutCompleted,
      icon: Dumbbell,
      link: hasWorkoutAccess && subscribedModules.some(m => m.includes('hitting')) 
        ? `/analyze/hitting?sport=${selectedSport}&tab=iron-bambino`
        : `/analyze/pitching?sport=${selectedSport}&tab=heat-factory`,
      show: hasWorkoutAccess,
    },
    {
      id: 'nutrition',
      title: 'gamePlan.nutrition.title',
      description: 'gamePlan.nutrition.description',
      completed: nutritionCompleted,
      icon: Apple,
      link: '/vault',
      show: true,
    },
    {
      id: 'video',
      title: 'gamePlan.video.title',
      description: 'gamePlan.video.description',
      completed: videoCompleted,
      icon: Video,
      link: hasModuleAccess ? `/analyze/hitting?sport=${selectedSport}` : '/pricing',
      show: hasModuleAccess,
    },
  ];

  const visibleTasks = tasks.filter(t => t.show);
  const completedCount = visibleTasks.filter(t => t.completed).length;

  return {
    tasks: visibleTasks,
    completedCount,
    totalCount: visibleTasks.length,
    daysUntilRecap,
    recapProgress,
    loading,
    refetch: fetchTaskStatus,
  };
}
