import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Dumbbell, Flame, Video, Apple, Sun, Brain, Moon, Activity, Camera, Star, LucideIcon, Lightbulb, Sparkles, Target, Eye, Heart, Zap, Trophy, Timer, Utensils, Coffee, Salad, Bike, Users, Clipboard, Pencil } from 'lucide-react';
import { startOfWeek, differenceInDays, format, getDay } from 'date-fns';
import { CustomActivityWithLog, CustomActivityTemplate, CustomActivityLog } from '@/types/customActivity';
import { getTodayDate } from '@/utils/dateUtils';
import { repairRecentCustomActivityLogDatesOncePerDay } from '@/utils/customActivityLogDateRepair';
import { TRAINING_DEFAULT_SCHEDULES } from '@/constants/trainingSchedules';

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
  const currentDateRef = useRef(getTodayDate());
  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({});
  const [daysUntilRecap, setDaysUntilRecap] = useState(42);
  const [recapProgress, setRecapProgress] = useState(0);
  const [trackingDue, setTrackingDue] = useState<Record<string, boolean>>({});
  const [isStrengthDay, setIsStrengthDay] = useState(false);
  const [customActivities, setCustomActivities] = useState<CustomActivityWithLog[]>([]);
  const [gamePlanSkips, setGamePlanSkips] = useState<Map<string, number[]>>(new Map());

  // Parse subscribed modules to determine access (tier-aware)
  const hasHittingAccess = subscribedModules.some(m => m.includes('hitting') || m.includes('5tool') || m.includes('golden2way'));
  const hasPitchingAccess = subscribedModules.some(m => m.includes('pitching') || m.includes('pitcher') || m.includes('golden2way'));
  const hasThrowingAccess = subscribedModules.some(m => m.includes('throwing') || m.includes('5tool') || m.includes('golden2way'));
  const hasAnyModuleAccess = subscribedModules.length > 0;

  // Using imported getTodayDate from utils/dateUtils for consistent local timezone

  // Get user's local midnight as UTC timestamp for database queries
  const getLocalMidnightUTC = () => {
    const now = new Date();
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return localMidnight.toISOString();
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

      // Use local midnight for video queries to ensure proper daily reset
      const localMidnight = getLocalMidnightUTC();

      // Fetch video analysis for hitting
      if (hasHittingAccess) {
        const { data: hittingVideos } = await supabase
          .from('videos')
          .select('id')
          .eq('user_id', user.id)
          .eq('sport', selectedSport)
          .eq('module', 'hitting')
          .gte('created_at', localMidnight)
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
          .gte('created_at', localMidnight)
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
          .gte('created_at', localMidnight)
          .limit(1);
        
        status['video-throwing'] = (throwingVideos?.length || 0) > 0;
      }

      // Fetch Speed Lab completion for today (speed_sessions)
      if (hasThrowingAccess) {
        const { data: speedData } = await supabase
          .from('speed_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('sport', selectedSport)
          .eq('session_date', today)
          .limit(1);

        status['speed-lab'] = (speedData?.length || 0) > 0;

        // Check CNS lockout (12-hour recovery window)
        const { data: latestSession } = await supabase
          .from('speed_sessions')
          .select('created_at')
          .eq('user_id', user.id)
          .eq('sport', selectedSport)
          .order('created_at', { ascending: false })
          .limit(1);

        if (latestSession?.[0]) {
          const lastTime = new Date(latestSession[0].created_at).getTime();
          const unlockAt = lastTime + 43200000; // 12 hours
          if (Date.now() < unlockAt) {
            status['speed-lab-locked'] = true;
          }
        }
      }

      // Fetch nutrition check-in for today
      const { data: nutritionData } = await supabase
        .from('vault_nutrition_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .limit(1);
      
      status['nutrition'] = (nutritionData?.length || 0) > 0;

      // Check if ALL Mind Fuel daily tasks are complete (5 total tasks)
      // Tasks: daily_lesson, mindfulness, journal, emotion_checkin, weekly_challenge

      // 1. Check daily lesson (user_viewed_lessons)
      const { data: lessonData } = await supabase
        .from('user_viewed_lessons')
        .select('id')
        .eq('user_id', user.id)
        .gte('viewed_at', localMidnight)
        .limit(1);
      const hasLesson = (lessonData?.length || 0) > 0;

      // 2. Check mindfulness (mindfulness_sessions)
      const { data: mindfulnessData } = await supabase
        .from('mindfulness_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .limit(1);
      const hasMindfulness = (mindfulnessData?.length || 0) > 0;

      // 3. Check journal (mental_health_journal)
      const { data: journalData } = await supabase
        .from('mental_health_journal')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', localMidnight)
        .limit(1);
      const hasJournal = (journalData?.length || 0) > 0;

      // 4. Check emotion check-in (emotion_tracking)
      const { data: emotionData } = await supabase
        .from('emotion_tracking')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .limit(1);
      const hasEmotionCheckin = (emotionData?.length || 0) > 0;

      // 5. Check weekly challenge (mind_fuel_challenges)
      const { data: challengeData } = await supabase
        .from('mind_fuel_challenges')
        .select('id')
        .eq('user_id', user.id)
        .gte('last_checkin_at', localMidnight)
        .limit(1);
      const hasChallenge = (challengeData?.length || 0) > 0;

      // Mind Fuel is only complete when ALL 5 tasks are done
      status['mindfuel'] = hasLesson && hasMindfulness && hasJournal && hasEmotionCheckin && hasChallenge;

      // Fetch health tip completion for today
      const { data: healthTipData } = await supabase
        .from('user_viewed_tips')
        .select('id')
        .eq('user_id', user.id)
        .gte('viewed_at', localMidnight)
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

      // Fetch skip days from calendar_skipped_items (SINGLE SOURCE OF TRUTH for Repeat Weekly)
      // Include BOTH custom_activity and game_plan types
      const { data: skipItemsData } = await supabase
        .from('calendar_skipped_items')
        .select('item_id, skip_days, item_type')
        .eq('user_id', user.id)
        .in('item_type', ['custom_activity', 'game_plan']);

      const skipItemsMap = new Map<string, number[]>();
      const gamePlanSkipsMap = new Map<string, number[]>();
      (skipItemsData || []).forEach(item => {
        skipItemsMap.set(item.item_id, item.skip_days || []);
        // Also store game_plan skips separately for system task filtering
        if (item.item_type === 'game_plan') {
          gamePlanSkipsMap.set(item.item_id, item.skip_days || []);
        }
      });
      
      // Update state with game_plan skips for use in task building
      setGamePlanSkips(gamePlanSkipsMap);

      const templates = (templatesData || []) as unknown as CustomActivityTemplate[];
      const logs = (logsData || []) as unknown as CustomActivityLog[];

      // Build custom activities list
      const customActivitiesForToday: CustomActivityWithLog[] = [];

      templates.forEach(template => {
        // Check display settings first
        if (template.display_on_game_plan === false) return;
        
        // Check calendar_skipped_items first (SINGLE SOURCE OF TRUTH for Repeat Weekly)
        const itemId = `template-${template.id}`;
        const skipDays = skipItemsMap.get(itemId) || [];
        const isSkippedToday = skipDays.includes(todayDayOfWeek);
        
        // Check if there's a log for today
        const todayLog = logs.find(l => l.template_id === template.id);
        
        // If explicitly skipped for today via calendar settings, only show if already logged
        if (isSkippedToday && !todayLog) {
          return; // Skip this activity entirely
        }
        
        // Fallback to template settings if no skip record exists
        const scheduledDays = template.recurring_active 
          ? (template.recurring_days as number[]) || []
          : (template.display_days as number[] | null) || [0, 1, 2, 3, 4, 5, 6];
        
        const isScheduledToday = scheduledDays.includes(todayDayOfWeek);
        
        // Include if: (scheduled AND not skipped) OR has a log for today
        if ((isScheduledToday && !isSkippedToday) || todayLog) {
          customActivitiesForToday.push({
            template,
            log: todayLog,
            isRecurring: template.recurring_active || false,
            isScheduledForToday: (isScheduledToday && !isSkippedToday) || !!todayLog,
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

  // Midnight detection: re-fetch when the calendar date rolls over
  useEffect(() => {
    const interval = setInterval(() => {
      const now = getTodayDate();
      if (now !== currentDateRef.current) {
        currentDateRef.current = now;
        fetchTaskStatus();
      }
    }, 30000); // check every 30 seconds
    return () => clearInterval(interval);
  }, [fetchTaskStatus]);

  // Run date repair once per day when user is authenticated
  useEffect(() => {
    if (!user?.id) return;
    
    repairRecentCustomActivityLogDatesOncePerDay(user.id)
      .then((result) => {
        if (result.ran && (result.updated > 0 || result.merged > 0)) {
          console.log(`[useGamePlan] Repaired ${result.updated} shifted, merged ${result.merged} duplicates`);
          // Refetch to reflect corrected dates
          fetchTaskStatus();
        }
      })
      .catch((err) => console.error("[useGamePlan] Date repair error:", err));
  }, [user?.id, fetchTaskStatus]);

  // Optimistic injection: immediately add a new activity to state before DB confirms
  const addOptimisticActivity = useCallback((activity: CustomActivityWithLog) => {
    setCustomActivities(prev => {
      // Avoid duplicates if refreshCustomActivities already ran
      if (prev.some(a => a.template.id === activity.template.id)) return prev;
      return [...prev, activity];
    });
  }, []);

  // Lightweight refresh: only re-queries custom_activity_templates + custom_activity_logs
  const refreshCustomActivities = useCallback(async () => {
    if (!user) return;

    const today = getTodayDate();
    const todayDayOfWeek = getDay(new Date());

    const [{ data: templatesData }, { data: logsData }, { data: skipItemsData }] = await Promise.all([
      supabase
        .from('custom_activity_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', selectedSport)
        .is('deleted_at', null),
      supabase
        .from('custom_activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today),
      supabase
        .from('calendar_skipped_items')
        .select('item_id, skip_days, item_type')
        .eq('user_id', user.id)
        .in('item_type', ['custom_activity', 'game_plan']),
    ]);

    const templates = (templatesData || []) as unknown as CustomActivityTemplate[];
    const logs = (logsData || []) as unknown as CustomActivityLog[];

    const skipItemsMap = new Map<string, number[]>();
    (skipItemsData || []).forEach(item => {
      skipItemsMap.set(item.item_id, item.skip_days || []);
    });

    const refreshed: CustomActivityWithLog[] = [];
    templates.forEach(template => {
      if (template.display_on_game_plan === false) return;

      const itemId = `template-${template.id}`;
      const skipDays = skipItemsMap.get(itemId) || [];
      const isSkippedToday = skipDays.includes(todayDayOfWeek);

      const todayLog = logs.find(l => l.template_id === template.id);

      if (isSkippedToday && !todayLog) return;

      const scheduledDays = template.recurring_active
        ? (template.recurring_days as number[]) || []
        : (template.display_days as number[] | null) || [0, 1, 2, 3, 4, 5, 6];

      const isScheduledToday = scheduledDays.includes(todayDayOfWeek);

      if ((isScheduledToday && !isSkippedToday) || todayLog) {
        refreshed.push({
          template,
          log: todayLog,
          isRecurring: template.recurring_active || false,
          isScheduledForToday: (isScheduledToday && !isSkippedToday) || !!todayLog,
        });
      }
    });

    setCustomActivities(refreshed);
  }, [user, selectedSport]);

  // Build dynamic task list based on user's module access
  const tasks: GamePlanTask[] = [];
  
  // Helper to check if a system task is skipped for today
  const todayDayOfWeek = getDay(new Date()); // 0=Sun, 1=Mon, etc.
  const isSystemTaskSkippedToday = (taskId: string): boolean => {
    const skipDays = gamePlanSkips.get(taskId) || [];
    return skipDays.includes(todayDayOfWeek);
  };

  // Smart default scheduling: only show training tasks on recommended days
  // unless user has a custom schedule (calendar_skipped_items row).
  const shouldShowTrainingTask = (taskId: string): boolean => {
    // If user has explicit skip days via Repeat Weekly, that system handles filtering
    const hasCustomSchedule = gamePlanSkips.has(taskId);
    if (hasCustomSchedule) return true; // Custom schedule exists, isSystemTaskSkippedToday handles it

    const defaultDays = TRAINING_DEFAULT_SCHEDULES[taskId];
    if (!defaultDays) return true; // No default schedule defined, show every day

    return defaultDays.includes(todayDayOfWeek);
  };

  // === FREE ACCESS TASKS (Available to all users with a profile) ===
  // These are accessible without module purchase to drive engagement
  
  if (!isSystemTaskSkippedToday('nutrition')) {
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
  }

  if (!isSystemTaskSkippedToday('mindfuel')) {
    tasks.push({
      id: 'mindfuel',
      titleKey: 'gamePlan.mindfuel.title',
      descriptionKey: 'gamePlan.mindfuel.description',
      completed: completionStatus['mindfuel'] || false,
      icon: Sparkles,
      link: '/mind-fuel#mental-fuel-plus',
      taskType: 'quiz',
      section: 'checkin',
    });
  }

  if (!isSystemTaskSkippedToday('healthtip')) {
    tasks.push({
      id: 'healthtip',
      titleKey: 'gamePlan.healthtip.title',
      descriptionKey: 'gamePlan.healthtip.description',
      completed: completionStatus['healthtip'] || false,
      icon: Lightbulb,
      link: '/nutrition#daily-tip',
      taskType: 'quiz',
      section: 'checkin',
    });
  }

  // === MODULE-GATED DAILY CHECK-INS ===
  if (hasAnyModuleAccess) {
    if (!isSystemTaskSkippedToday('quiz-morning')) {
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
    }

    // Only show Pre-Lift Check-in on strength training days (Day 1 and Day 5)
    if (isStrengthDay && (hasHittingAccess || hasPitchingAccess) && !isSystemTaskSkippedToday('quiz-prelift')) {
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

    if (!isSystemTaskSkippedToday('quiz-night')) {
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
  }

  // === TRAINING SECTION ===
  // Workout tasks
  if (hasHittingAccess && !isSystemTaskSkippedToday('workout-hitting') && shouldShowTrainingTask('workout-hitting')) {
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
  }

  // Tex Vision task
  if (hasHittingAccess && !isSystemTaskSkippedToday('texvision')) {
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

  if (hasPitchingAccess && !isSystemTaskSkippedToday('workout-pitching') && shouldShowTrainingTask('workout-pitching')) {
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

  // Speed Lab task (throwing module gated)
  if (hasThrowingAccess && !isSystemTaskSkippedToday('speed-lab') && shouldShowTrainingTask('speed-lab')) {
    tasks.push({
      id: 'speed-lab',
      titleKey: 'gamePlan.speedLab.title',
      descriptionKey: 'gamePlan.speedLab.description',
      completed: completionStatus['speed-lab'] || false,
      icon: Zap,
      link: '/speed-lab',
      module: 'throwing',
      taskType: 'workout',
      section: 'training',
      badge: completionStatus['speed-lab-locked'] ? 'gamePlan.speedLab.recoveryBadge' : undefined,
    });
  }

  // Video analysis tasks
  if (hasHittingAccess && !isSystemTaskSkippedToday('video-hitting')) {
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

  if (hasPitchingAccess && !isSystemTaskSkippedToday('video-pitching')) {
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

  if (hasThrowingAccess && !isSystemTaskSkippedToday('video-throwing')) {
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
      link: '/vault?openSection=progress-photos',
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
    addOptimisticActivity,
    refreshCustomActivities,
  };
}
