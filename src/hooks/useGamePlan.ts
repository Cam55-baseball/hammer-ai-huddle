import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Dumbbell, Flame, Video, Apple, LucideIcon } from 'lucide-react';

export interface GamePlanTask {
  id: string;
  titleKey: string;
  descriptionKey: string;
  completed: boolean;
  icon: LucideIcon;
  link: string;
  module?: 'hitting' | 'pitching' | 'throwing';
  taskType: 'workout' | 'video' | 'nutrition';
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
  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({});
  const [daysUntilRecap, setDaysUntilRecap] = useState(42);
  const [recapProgress, setRecapProgress] = useState(0);

  // Parse subscribed modules to determine access
  const hasHittingAccess = subscribedModules.some(m => 
    m.includes('hitting')
  );
  const hasPitchingAccess = subscribedModules.some(m => 
    m.includes('pitching')
  );
  const hasThrowingAccess = subscribedModules.some(m => 
    m.includes('throwing')
  );
  const hasAnyModuleAccess = subscribedModules.length > 0;

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const fetchTaskStatus = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const today = getTodayDate();
    const status: Record<string, boolean> = {};
    
    try {
      // Fetch workout completion for hitting (Iron Bambino)
      if (hasHittingAccess) {
        const { data: hittingWorkout } = await supabase
          .from('sub_module_progress')
          .select('last_workout_date')
          .eq('user_id', user.id)
          .eq('sport', selectedSport)
          .eq('module', 'hitting');
        
        status['workout-hitting'] = hittingWorkout?.some(w => w.last_workout_date === today) || false;
      }

      // Fetch workout completion for pitching (Heat Factory)
      if (hasPitchingAccess) {
        const { data: pitchingWorkout } = await supabase
          .from('sub_module_progress')
          .select('last_workout_date')
          .eq('user_id', user.id)
          .eq('sport', selectedSport)
          .eq('module', 'pitching');
        
        status['workout-pitching'] = pitchingWorkout?.some(w => w.last_workout_date === today) || false;
      }

      // Fetch video analysis for hitting
      if (hasHittingAccess) {
        const { data: hittingVideos } = await supabase
          .from('videos')
          .select('id')
          .eq('user_id', user.id)
          .eq('sport', selectedSport)
          .eq('module', 'hitting')
          .gte('created_at', `${today}T00:00:00`)
          .limit(1);
        
        status['video-hitting'] = (hittingVideos?.length || 0) > 0;
      }

      // Fetch video analysis for pitching
      if (hasPitchingAccess) {
        const { data: pitchingVideos } = await supabase
          .from('videos')
          .select('id')
          .eq('user_id', user.id)
          .eq('sport', selectedSport)
          .eq('module', 'pitching')
          .gte('created_at', `${today}T00:00:00`)
          .limit(1);
        
        status['video-pitching'] = (pitchingVideos?.length || 0) > 0;
      }

      // Fetch video analysis for throwing
      if (hasThrowingAccess) {
        const { data: throwingVideos } = await supabase
          .from('videos')
          .select('id')
          .eq('user_id', user.id)
          .eq('sport', selectedSport)
          .eq('module', 'throwing')
          .gte('created_at', `${today}T00:00:00`)
          .limit(1);
        
        status['video-throwing'] = (throwingVideos?.length || 0) > 0;
      }

      // Fetch nutrition check-in for today
      const { data: nutritionData } = await supabase
        .from('vault_nutrition_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .limit(1);
      
      status['nutrition'] = (nutritionData?.length || 0) > 0;

      setCompletionStatus(status);

      // Fetch recap countdown
      const { data: streakData } = await supabase
        .from('vault_streaks')
        .select('created_at')
        .eq('user_id', user.id)
        .single();
      
      if (streakData?.created_at) {
        const startDate = new Date(streakData.created_at);
        const now = new Date();
        const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysInCycle = daysSinceStart % 42;
        const remaining = 42 - daysInCycle;
        setDaysUntilRecap(remaining);
        setRecapProgress(Math.round((daysInCycle / 42) * 100));
      } else {
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
  }, [user, selectedSport, hasHittingAccess, hasPitchingAccess, hasThrowingAccess]);

  useEffect(() => {
    fetchTaskStatus();
  }, [fetchTaskStatus]);

  // Build dynamic task list based on user's module access
  const tasks: GamePlanTask[] = [];

  // Workout tasks
  if (hasHittingAccess) {
    tasks.push({
      id: 'workout-hitting',
      titleKey: 'gamePlan.workout.hitting.title',
      descriptionKey: 'gamePlan.workout.hitting.description',
      completed: completionStatus['workout-hitting'] || false,
      icon: Dumbbell,
      link: `/analyze/hitting?sport=${selectedSport}&tab=iron-bambino`,
      module: 'hitting',
      taskType: 'workout',
    });
  }

  if (hasPitchingAccess) {
    tasks.push({
      id: 'workout-pitching',
      titleKey: 'gamePlan.workout.pitching.title',
      descriptionKey: 'gamePlan.workout.pitching.description',
      completed: completionStatus['workout-pitching'] || false,
      icon: Flame,
      link: `/analyze/pitching?sport=${selectedSport}&tab=heat-factory`,
      module: 'pitching',
      taskType: 'workout',
    });
  }

  // Video analysis tasks
  if (hasHittingAccess) {
    tasks.push({
      id: 'video-hitting',
      titleKey: 'gamePlan.video.hitting.title',
      descriptionKey: 'gamePlan.video.hitting.description',
      completed: completionStatus['video-hitting'] || false,
      icon: Video,
      link: `/analyze/hitting?sport=${selectedSport}`,
      module: 'hitting',
      taskType: 'video',
    });
  }

  if (hasPitchingAccess) {
    tasks.push({
      id: 'video-pitching',
      titleKey: 'gamePlan.video.pitching.title',
      descriptionKey: 'gamePlan.video.pitching.description',
      completed: completionStatus['video-pitching'] || false,
      icon: Video,
      link: `/analyze/pitching?sport=${selectedSport}`,
      module: 'pitching',
      taskType: 'video',
    });
  }

  if (hasThrowingAccess) {
    tasks.push({
      id: 'video-throwing',
      titleKey: 'gamePlan.video.throwing.title',
      descriptionKey: 'gamePlan.video.throwing.description',
      completed: completionStatus['video-throwing'] || false,
      icon: Video,
      link: `/analyze/throwing?sport=${selectedSport}`,
      module: 'throwing',
      taskType: 'video',
    });
  }

  // Nutrition task (always shown if user has any module)
  if (hasAnyModuleAccess) {
    tasks.push({
      id: 'nutrition',
      titleKey: 'gamePlan.nutrition.title',
      descriptionKey: 'gamePlan.nutrition.description',
      completed: completionStatus['nutrition'] || false,
      icon: Apple,
      link: '/vault',
      taskType: 'nutrition',
    });
  }

  const completedCount = tasks.filter(t => t.completed).length;

  return {
    tasks,
    completedCount,
    totalCount: tasks.length,
    daysUntilRecap,
    recapProgress,
    loading,
    refetch: fetchTaskStatus,
  };
}
