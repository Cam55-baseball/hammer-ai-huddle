import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Dumbbell, Flame, Video, Apple, Sun, Brain, Moon, Activity, Camera, Star, LucideIcon, Lightbulb, Sparkles, Target, Eye, Heart, Zap, Trophy, Timer, Utensils, Coffee, Salad, Bike, Users, Clipboard, Pencil } from 'lucide-react';
import { startOfWeek, differenceInDays, format, getDay } from 'date-fns';
import { CustomActivityWithLog, CustomActivityTemplate, CustomActivityLog } from '@/types/customActivity';

// Icon mapping for custom activities
const customActivityIconMap: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  flame: Flame,
  heart: Heart,
  zap: Zap,
  target: Target,
  trophy: Trophy,
  timer: Timer,
  activity: Activity,
  utensils: Utensils,
  moon: Moon,
  sun: Sun,
  coffee: Coffee,
  apple: Apple,
  salad: Salad,
  bike: Bike,
  users: Users,
  clipboard: Clipboard,
  pencil: Pencil,
  star: Star,
  sparkles: Sparkles,
};

export interface GamePlanTask {
  id: string;
  titleKey: string;
  descriptionKey: string;
  completed: boolean;
  icon: LucideIcon;
  link: string;
  module?: 'hitting' | 'pitching' | 'throwing';
  taskType: 'workout' | 'video' | 'nutrition' | 'quiz' | 'tracking' | 'mental-fuel' | 'custom';
  section: 'checkin' | 'training' | 'tracking' | 'custom';
  badge?: string;
  specialStyle?: 'mental-fuel-plus' | 'tex-vision' | 'custom';
  customActivityData?: CustomActivityWithLog;
}

export interface GamePlanData {
  tasks: GamePlanTask[];
  customActivities: CustomActivityWithLog[];
  completedCount: number;
  totalCount: number;
  daysUntilRecap: number;
  recapProgress: number;
  loading: boolean;
}

// Strength training days for Iron Bambino and Heat Factory (Day 1 and Day 5)
const STRENGTH_TRAINING_DAYS = [1, 5];

export function useGamePlan(selectedSport: 'baseball' | 'softball') {
  const { user } = useAuth();
  const { modules: subscribedModules } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({});
  const [daysUntilRecap, setDaysUntilRecap] = useState(42);
  const [recapProgress, setRecapProgress] = useState(0);
  const [trackingDue, setTrackingDue] = useState<Record<string, boolean>>({});
  const [isStrengthDay, setIsStrengthDay] = useState(false);
  const [customActivities, setCustomActivities] = useState<CustomActivityWithLog[]>([]);

  // Parse subscribed modules to determine access
  const hasHittingAccess = subscribedModules.some(m => m.includes('hitting'));
  const hasPitchingAccess = subscribedModules.some(m => m.includes('pitching'));
  const hasThrowingAccess = subscribedModules.some(m => m.includes('throwing'));
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
    const tracking: Record<string, boolean> = {};
    
    try {
      // Fetch today's focus quizzes completion
      const { data: quizData } = await supabase
        .from('vault_focus_quizzes')
        .select('quiz_type')
        .eq('user_id', user.id)
        .eq('entry_date', today);

      status['quiz-morning'] = quizData?.some(q => q.quiz_type === 'morning') || false;
      status['quiz-prelift'] = quizData?.some(q => q.quiz_type === 'pre_lift') || false;
      status['quiz-night'] = quizData?.some(q => q.quiz_type === 'night') || false;

      // Detect if today is a strength training day based on user's current program day
      let strengthDayDetected = false;
      
      // Check Iron Bambino progress for hitting users
      if (hasHittingAccess) {
        const { data: hittingProgress } = await supabase
          .from('sub_module_progress')
          .select('week_progress, current_week')
          .eq('user_id', user.id)
          .eq('sport', selectedSport)
          .eq('module', 'hitting')
          .eq('sub_module', 'iron_bambino')
          .maybeSingle();
        
        if (hittingProgress?.week_progress) {
          const weekProgress = hittingProgress.week_progress as Record<string, boolean[]>;
          const currentWeek = hittingProgress.current_week || 1;
          const weekKey = `week${currentWeek}`;
          const days = weekProgress[weekKey] || [];
          // Find the next uncompleted day (1-indexed)
          const nextDay = days.findIndex(completed => !completed) + 1 || 1;
          if (STRENGTH_TRAINING_DAYS.includes(nextDay)) {
            strengthDayDetected = true;
          }
        } else {
          // No progress yet, default to Day 1 which is a strength day
          strengthDayDetected = true;
        }
      }
      
      // Check Heat Factory progress for pitching users
      if (hasPitchingAccess && !strengthDayDetected) {
        const { data: pitchingProgress } = await supabase
          .from('sub_module_progress')
          .select('week_progress, current_week')
          .eq('user_id', user.id)
          .eq('sport', selectedSport)
          .eq('module', 'pitching')
          .eq('sub_module', 'heat_factory')
          .maybeSingle();
        
        if (pitchingProgress?.week_progress) {
          const weekProgress = pitchingProgress.week_progress as Record<string, boolean[]>;
          const currentWeek = pitchingProgress.current_week || 1;
          const weekKey = `week${currentWeek}`;
          const days = weekProgress[weekKey] || [];
          const nextDay = days.findIndex(completed => !completed) + 1 || 1;
          if (STRENGTH_TRAINING_DAYS.includes(nextDay)) {
            strengthDayDetected = true;
          }
        } else {
          // No progress yet, default to Day 1 which is a strength day
          strengthDayDetected = true;
        }
      }
      
      setIsStrengthDay(strengthDayDetected);

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

      // Fetch mind fuel lesson completion for today
      const { data: mindFuelData } = await supabase
        .from('user_viewed_lessons')
        .select('id')
        .eq('user_id', user.id)
        .gte('viewed_at', `${today}T00:00:00`)
        .limit(1);
      
      status['mindfuel'] = (mindFuelData?.length || 0) > 0;

      // Fetch health tip completion for today
      const { data: healthTipData } = await supabase
        .from('user_viewed_tips')
        .select('id')
        .eq('user_id', user.id)
        .gte('viewed_at', `${today}T00:00:00`)
        .limit(1);
      
      status['healthtip'] = (healthTipData?.length || 0) > 0;

      // Fetch Tex Vision checklist completion for today (requires hitting access)
      if (hasHittingAccess) {
        const { data: texVisionData } = await supabase
          .from('tex_vision_daily_checklist')
          .select('all_complete')
          .eq('user_id', user.id)
          .eq('entry_date', today)
          .maybeSingle();
        
        status['texvision'] = texVisionData?.all_complete || false;
      }

      // Check 6-week tracking: Performance Tests
      const { data: perfTestData } = await supabase
        .from('vault_performance_tests')
        .select('next_entry_date')
        .eq('user_id', user.id)
        .order('test_date', { ascending: false })
        .limit(1);

      const perfNextDate = perfTestData?.[0]?.next_entry_date;
      tracking['tracking-performance'] = perfTestData?.length === 0 || 
        !perfNextDate || new Date(perfNextDate) <= new Date(today);

      // Check 6-week tracking: Progress Photos
      const { data: photoData } = await supabase
        .from('vault_progress_photos')
        .select('next_entry_date')
        .eq('user_id', user.id)
        .order('photo_date', { ascending: false })
        .limit(1);

      const photoNextDate = photoData?.[0]?.next_entry_date;
      tracking['tracking-photos'] = photoData?.length === 0 || 
        !photoNextDate || new Date(photoNextDate) <= new Date(today);

      // Check 12-week tracking: Scout Self-Grades (Hitting/Throwing)
      if (hasHittingAccess || hasThrowingAccess) {
        const { data: gradeData } = await supabase
          .from('vault_scout_grades')
          .select('next_prompt_date')
          .eq('user_id', user.id)
          .eq('grade_type', 'hitting_throwing')
          .order('graded_at', { ascending: false })
          .limit(1);

        const gradeNextDate = gradeData?.[0]?.next_prompt_date;
        tracking['tracking-grades'] = gradeData?.length === 0 || 
          !gradeNextDate || new Date(gradeNextDate) <= new Date(today);
      }

      // Check 12-week tracking: Scout Self-Grades (Pitching)
      if (hasPitchingAccess) {
        const { data: pitchingGradeData } = await supabase
          .from('vault_scout_grades')
          .select('next_prompt_date')
          .eq('user_id', user.id)
          .eq('grade_type', 'pitching')
          .order('graded_at', { ascending: false })
          .limit(1);

        const pitchingGradeNextDate = pitchingGradeData?.[0]?.next_prompt_date;
        tracking['tracking-pitching-grades'] = pitchingGradeData?.length === 0 || 
          !pitchingGradeNextDate || new Date(pitchingGradeNextDate) <= new Date(today);
      }

      // Check weekly wellness goals (show all week Mon-Sun until completed)
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      
      const { data: wellnessData } = await supabase
        .from('vault_weekly_wellness_quiz')
        .select('id')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartStr)
        .maybeSingle();
      
      // Show wellness goals task all week (Mon-Sun) until completed
      tracking['tracking-wellness-goals'] = !wellnessData;

      setCompletionStatus(status);
      setTrackingDue(tracking);

      // Fetch custom activities for today
      const todayDayOfWeek = getDay(new Date()); // 0 = Sunday, 6 = Saturday
      
      // Fetch all templates for this sport
      const { data: templatesData } = await supabase
        .from('custom_activity_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', selectedSport);

      // Fetch today's logs
      const { data: logsData } = await supabase
        .from('custom_activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today);

      const templates = (templatesData || []) as unknown as CustomActivityTemplate[];
      const logs = (logsData || []) as unknown as CustomActivityLog[];

      // Build custom activities list
      const customActivitiesForToday: CustomActivityWithLog[] = [];

      templates.forEach(template => {
        const recurringDays = (template.recurring_days || []) as number[];
        const isRecurringToday = template.recurring_active && recurringDays.includes(todayDayOfWeek);
        const todayLog = logs.find(l => l.template_id === template.id);
        
        // Include if recurring today OR has a log for today
        if (isRecurringToday || todayLog) {
          customActivitiesForToday.push({
            template,
            log: todayLog,
            isRecurring: isRecurringToday,
            isScheduledForToday: isRecurringToday || !!todayLog,
          });
        }
      });

      setCustomActivities(customActivitiesForToday);

      // Fetch recap countdown
      const { data: streakData } = await supabase
        .from('vault_streaks')
        .select('created_at')
        .eq('user_id', user.id)
        .maybeSingle();
      
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
          .maybeSingle();
        
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

  // Listen for custom activity creation from other components
  useEffect(() => {
    const checkForNewActivity = () => {
      const created = localStorage.getItem('customActivityCreated');
      if (created) {
        localStorage.removeItem('customActivityCreated');
        fetchTaskStatus();
      }
    };

    // Check on mount
    checkForNewActivity();

    // Listen for storage changes (from other tabs/components)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'customActivityCreated') {
        checkForNewActivity();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also poll periodically in case same-tab changes don't trigger storage event
    const interval = setInterval(checkForNewActivity, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [fetchTaskStatus]);

  // Build dynamic task list based on user's module access
  const tasks: GamePlanTask[] = [];

  // === FREE ACCESS TASKS (Available to all users with a profile) ===
  // These are accessible without module purchase to drive engagement
  
  tasks.push({
    id: 'nutrition',
    titleKey: 'gamePlan.nutrition.title',
    descriptionKey: 'gamePlan.nutrition.description',
    completed: completionStatus['nutrition'] || false,
    icon: Apple,
    link: '/nutrition',
    taskType: 'nutrition',
    section: 'checkin',
  });

  tasks.push({
    id: 'mindfuel',
    titleKey: 'gamePlan.mindfuel.title',
    descriptionKey: 'gamePlan.mindfuel.description',
    completed: completionStatus['mindfuel'] || false,
    icon: Sparkles,
    link: '/mind-fuel',
    taskType: 'quiz',
    section: 'checkin',
  });

  tasks.push({
    id: 'healthtip',
    titleKey: 'gamePlan.healthtip.title',
    descriptionKey: 'gamePlan.healthtip.description',
    completed: completionStatus['healthtip'] || false,
    icon: Lightbulb,
    link: '/bounce-back-bay',
    taskType: 'quiz',
    section: 'checkin',
  });

  // === MODULE-GATED DAILY CHECK-INS ===
  if (hasAnyModuleAccess) {
    tasks.push({
      id: 'quiz-morning',
      titleKey: 'gamePlan.quiz.morning.title',
      descriptionKey: 'gamePlan.quiz.morning.description',
      completed: completionStatus['quiz-morning'] || false,
      icon: Sun,
      link: '/vault',
      taskType: 'quiz',
      section: 'checkin',
    });

    // Only show Pre-Lift Check-in on strength training days (Day 1 and Day 5)
    if (isStrengthDay && (hasHittingAccess || hasPitchingAccess)) {
      tasks.push({
        id: 'quiz-prelift',
        titleKey: 'gamePlan.quiz.prelift.title',
        descriptionKey: 'gamePlan.quiz.prelift.description',
        completed: completionStatus['quiz-prelift'] || false,
        icon: Brain,
        link: '/vault',
        taskType: 'quiz',
        section: 'checkin',
      });
    }

    tasks.push({
      id: 'quiz-night',
      titleKey: 'gamePlan.quiz.night.title',
      descriptionKey: 'gamePlan.quiz.night.description',
      completed: completionStatus['quiz-night'] || false,
      icon: Moon,
      link: '/vault',
      taskType: 'quiz',
      section: 'checkin',
    });
  }

  // === TRAINING SECTION ===
  // Workout tasks
  if (hasHittingAccess) {
    tasks.push({
      id: 'workout-hitting',
      titleKey: 'gamePlan.workout.hitting.title',
      descriptionKey: 'gamePlan.workout.hitting.description',
      completed: completionStatus['workout-hitting'] || false,
      icon: Dumbbell,
      link: '/production-lab',
      module: 'hitting',
      taskType: 'workout',
      section: 'training',
    });

    // Tex Vision task
    tasks.push({
      id: 'texvision',
      titleKey: 'texVision.gamePlan.title',
      descriptionKey: 'texVision.gamePlan.description',
      completed: completionStatus['texvision'] || false,
      icon: Eye,
      link: '/tex-vision',
      module: 'hitting',
      taskType: 'workout',
      section: 'training',
      specialStyle: 'tex-vision',
    });
  }

  if (hasPitchingAccess) {
    tasks.push({
      id: 'workout-pitching',
      titleKey: 'gamePlan.workout.pitching.title',
      descriptionKey: 'gamePlan.workout.pitching.description',
      completed: completionStatus['workout-pitching'] || false,
      icon: Flame,
      link: '/production-studio',
      module: 'pitching',
      taskType: 'workout',
      section: 'training',
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
      section: 'training',
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
      section: 'training',
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
      section: 'training',
    });
  }

  // === CYCLE TRACKING SECTION (only shown when due) ===
  if (hasAnyModuleAccess && trackingDue['tracking-performance']) {
    tasks.push({
      id: 'tracking-performance',
      titleKey: 'gamePlan.tracking.performance.title',
      descriptionKey: 'gamePlan.tracking.performance.description',
      completed: false,
      icon: Activity,
      link: '/vault?openSection=performance-tests',
      taskType: 'tracking',
      section: 'tracking',
      badge: 'gamePlan.tracking.performance.badge',
    });
  }

  if (hasAnyModuleAccess && trackingDue['tracking-photos']) {
    tasks.push({
      id: 'tracking-photos',
      titleKey: 'gamePlan.tracking.photos.title',
      descriptionKey: 'gamePlan.tracking.photos.description',
      completed: false,
      icon: Camera,
      link: '/vault',
      taskType: 'tracking',
      section: 'tracking',
      badge: 'gamePlan.tracking.photos.badge',
    });
  }

  if (hasAnyModuleAccess && trackingDue['tracking-grades']) {
    tasks.push({
      id: 'tracking-grades',
      titleKey: 'gamePlan.tracking.grades.title',
      descriptionKey: 'gamePlan.tracking.grades.description',
      completed: false,
      icon: Star,
      link: '/vault?openSection=scout-grades',
      taskType: 'tracking',
      section: 'tracking',
      badge: 'gamePlan.tracking.grades.badge',
    });
  }

  if (hasPitchingAccess && trackingDue['tracking-pitching-grades']) {
    tasks.push({
      id: 'tracking-pitching-grades',
      titleKey: 'gamePlan.tracking.pitchingGrades.title',
      descriptionKey: 'gamePlan.tracking.pitchingGrades.description',
      completed: false,
      icon: Star,
      link: '/vault?openSection=pitching-grades',
      taskType: 'tracking',
      section: 'tracking',
      badge: 'gamePlan.tracking.pitchingGrades.badge',
    });
  }

  // Weekly Wellness Goals (appears Mon-Wed if not completed this week)
  if (hasAnyModuleAccess && trackingDue['tracking-wellness-goals']) {
    tasks.push({
      id: 'tracking-wellness-goals',
      titleKey: 'gamePlan.tracking.wellnessGoals.title',
      descriptionKey: 'gamePlan.tracking.wellnessGoals.description',
      completed: false,
      icon: Target,
      link: '/vault?openSection=wellness-goals',
      taskType: 'tracking',
      section: 'tracking',
      badge: 'gamePlan.tracking.wellnessGoals.badge',
    });
  }

  // Add custom activities as tasks
  customActivities.forEach(activity => {
    const iconKey = activity.template.icon || 'activity';
    const IconComponent = customActivityIconMap[iconKey] || Activity;
    
    tasks.push({
      id: `custom-${activity.template.id}`,
      titleKey: activity.template.title, // Use raw title, not translation key
      descriptionKey: activity.template.description || '',
      completed: activity.log?.completed || false,
      icon: IconComponent,
      link: '', // Custom activities don't navigate
      taskType: 'custom',
      section: 'custom',
      specialStyle: 'custom',
      customActivityData: activity,
    });
  });

  const completedCount = tasks.filter(t => t.completed).length;

  return {
    tasks,
    customActivities,
    completedCount,
    totalCount: tasks.length,
    daysUntilRecap,
    recapProgress,
    loading,
    refetch: fetchTaskStatus,
  };
}
