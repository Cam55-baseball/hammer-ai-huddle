import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Dumbbell, Flame, Video, Apple, Sun, Brain, Moon, Activity, Camera, Star, LucideIcon, Lightbulb, Sparkles, Target, Eye, Heart, Zap, Trophy, Timer, Utensils, Coffee, Salad, Bike, Users, Clipboard, Pencil } from 'lucide-react';
import { startOfWeek, differenceInDays, format, getDay } from 'date-fns';
import { CustomActivityWithLog, CustomActivityTemplate, CustomActivityLog } from '@/types/customActivity';
import { getTodayDate } from '@/utils/dateUtils';
import { ActivityFolder, ActivityFolderItem } from '@/types/activityFolder';

export interface FolderGamePlanTask {
  folderId: string;
  folderName: string;
  folderColor: string;
  folderIcon: string;
  placement: string;
  item: ActivityFolderItem;
  completed: boolean;
  completionId?: string;
  isOwner: boolean;
}
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
  folderItemData?: {
    folderId: string;
    folderName: string;
    folderColor: string;
    itemId: string;
    placement: string;
    isOwner: boolean;
  };
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
  const [folderTasks, setFolderTasks] = useState<FolderGamePlanTask[]>([]);

  const [activeProgramStatuses, setActiveProgramStatuses] = useState<Record<string, string>>({});

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
      // Fetch program statuses for all sub_module_progress rows
      const { data: subModuleData } = await supabase
        .from('sub_module_progress')
        .select('sub_module, program_status')
        .eq('user_id', user.id)
        .eq('sport', selectedSport);

      // Fetch speed_goals program status
      const { data: speedGoalsData } = await supabase
        .from('speed_goals')
        .select('program_status')
        .eq('user_id', user.id)
        .eq('sport', selectedSport)
        .maybeSingle();

      const programStatuses: Record<string, string> = {};
      (subModuleData || []).forEach((row: any) => {
        programStatuses[row.sub_module] = row.program_status || 'not_started';
      });
      programStatuses['speed-lab'] = (speedGoalsData as any)?.program_status || 'not_started';
      setActiveProgramStatuses(programStatuses);

      // Determine which programs are active
      const isHittingActive = programStatuses['production_lab'] === 'active';
      const isPitchingActive = programStatuses['production_studio'] === 'active';
      const isUnicornActive = programStatuses['the-unicorn'] === 'active';
      const isSpeedLabActive = programStatuses['speed-lab'] === 'active';
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
      
      // Check Iron Bambino progress for hitting users (only if program is active)
      if (hasHittingAccess && (isHittingActive || isUnicornActive)) {
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
      
      // Check Heat Factory progress for pitching users (only if program is active)
      if (hasPitchingAccess && !strengthDayDetected && (isPitchingActive || isUnicornActive)) {
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

      // Fetch workout completion for The Unicorn
      if (isUnicornActive) {
        const { data: unicornWorkout } = await supabase
          .from('sub_module_progress')
          .select('last_workout_date')
          .eq('user_id', user.id)
          .eq('sport', selectedSport)
          .eq('sub_module', 'the-unicorn')
          .maybeSingle();
        
        status['workout-unicorn'] = unicornWorkout?.last_workout_date === today;
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
      (skipItemsData || []).forEach(item => {
        skipItemsMap.set(item.item_id, item.skip_days || []);
      });

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

      // === FETCH FOLDER ITEMS FOR GAME PLAN ===
      const todayDow = todayDayOfWeek; // already computed above
      
      // 1. Player-owned active folders
      const { data: playerFoldersData } = await supabase
        .from('activity_folders')
        .select('*')
        .eq('owner_id', user.id)
        .eq('owner_type', 'player')
        .eq('sport', selectedSport)
        .eq('status', 'active');

      // 2. Coach-assigned accepted folders
      const { data: assignmentsData } = await supabase
        .from('folder_assignments')
        .select('folder_id')
        .eq('recipient_id', user.id)
        .eq('status', 'accepted');

      const assignedFolderIds = (assignmentsData || []).map((a: any) => a.folder_id);
      
      let coachFolders: any[] = [];
      if (assignedFolderIds.length > 0) {
        const { data: coachFoldersData } = await supabase
          .from('activity_folders')
          .select('*')
          .in('id', assignedFolderIds)
          .eq('status', 'active');
        coachFolders = coachFoldersData || [];
      }

      const allFolders = [
        ...((playerFoldersData || []) as unknown as ActivityFolder[]),
        ...(coachFolders as unknown as ActivityFolder[]),
      ];

      if (allFolders.length > 0) {
        const folderIds = allFolders.map(f => f.id);

        // Fetch items for all folders
        const { data: folderItemsData } = await supabase
          .from('activity_folder_items')
          .select('*')
          .in('folder_id', folderIds)
          .order('order_index');

        const allItems = (folderItemsData || []) as unknown as ActivityFolderItem[];

        // Filter items to today
        const todayItems = allItems.filter(item => {
          const hasDays = item.assigned_days && item.assigned_days.length > 0;
          const hasDates = item.specific_dates && item.specific_dates.length > 0;
          if (!hasDays && !hasDates) return true; // always show
          if (hasDays && item.assigned_days!.includes(todayDow)) return true;
          if (hasDates && item.specific_dates!.includes(today)) return true;
          return false;
        });

        // Fetch completions for today
        const itemIds = todayItems.map(i => i.id);
        let completionsMap: Record<string, { id: string; completed: boolean }> = {};
        if (itemIds.length > 0) {
          const { data: completionsData } = await supabase
            .from('folder_item_completions')
            .select('id, folder_item_id, completed')
            .eq('user_id', user.id)
            .eq('entry_date', today)
            .in('folder_item_id', itemIds);
          
          (completionsData || []).forEach((c: any) => {
            completionsMap[c.folder_item_id] = { id: c.id, completed: c.completed };
          });
        }

        // Build folder tasks
        const folderMap = new Map(allFolders.map(f => [f.id, f]));
        const builtFolderTasks: FolderGamePlanTask[] = todayItems.map(item => {
          const folder = folderMap.get(item.folder_id)!;
          const completion = completionsMap[item.id];
          return {
            folderId: folder.id,
            folderName: folder.name,
            folderColor: folder.color || '#6366f1',
            folderIcon: folder.icon || 'clipboard',
            placement: folder.placement || 'separate_day',
            item,
            completed: completion?.completed || false,
            completionId: completion?.id,
            isOwner: folder.owner_id === user.id,
          };
        });

        setFolderTasks(builtFolderTasks);
      } else {
        setFolderTasks([]);
      }


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

  // Toggle folder item completion
  const toggleFolderItemCompletion = useCallback(async (itemId: string, performanceData?: any) => {
    if (!user) return;
    const today = getTodayDate();

    // Optimistic update
    setFolderTasks(prev => prev.map(ft =>
      ft.item.id === itemId ? { ...ft, completed: !ft.completed } : ft
    ));

    try {
      // Check if completion exists
      const { data: existing } = await supabase
        .from('folder_item_completions')
        .select('id, completed')
        .eq('folder_item_id', itemId)
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle();

      if (existing) {
        const updatePayload: any = { completed: !existing.completed, completed_at: !existing.completed ? new Date().toISOString() : null };
        if (performanceData) updatePayload.performance_data = performanceData;
        await supabase
          .from('folder_item_completions')
          .update(updatePayload)
          .eq('id', existing.id);
      } else {
        const insertPayload: any = {
          folder_item_id: itemId,
          user_id: user.id,
          entry_date: today,
          completed: true,
          completed_at: new Date().toISOString(),
        };
        if (performanceData) insertPayload.performance_data = performanceData;
        await supabase
          .from('folder_item_completions')
          .insert(insertPayload);
      }
    } catch (error) {
      console.error('Error toggling folder item completion:', error);
      // Rollback
      setFolderTasks(prev => prev.map(ft =>
        ft.item.id === itemId ? { ...ft, completed: !ft.completed } : ft
      ));
    }
  }, [user]);

  // Build dynamic task list based on user's module access
  const tasks: GamePlanTask[] = [];
  
  const todayDayOfWeek = getDay(new Date()); // 0=Sun, 1=Mon, etc.

  // Smart default scheduling: only show training tasks on recommended days
  const shouldShowTrainingTask = (taskId: string): boolean => {
    const defaultDays = TRAINING_DEFAULT_SCHEDULES[taskId];
    if (!defaultDays) return true; // No default schedule defined, show every day

    return defaultDays.includes(todayDayOfWeek);
  };

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
    link: '/mind-fuel#mental-fuel-plus',
    taskType: 'quiz',
    section: 'checkin',
  });

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
  // Only show workout tasks for ACTIVE programs
  const isUnicornProgramActive = activeProgramStatuses['the-unicorn'] === 'active';
  const isHittingProgramActive = activeProgramStatuses['production_lab'] === 'active';
  const isPitchingProgramActive = activeProgramStatuses['production_studio'] === 'active';
  const isSpeedLabProgramActive = activeProgramStatuses['speed-lab'] === 'active';

  // The Unicorn: single dedicated task replaces Iron Bambino + Heat Factory
  if (isUnicornProgramActive && shouldShowTrainingTask('workout-unicorn')) {
    tasks.push({
      id: 'workout-unicorn',
      titleKey: 'gamePlan.workout.unicorn.title',
      descriptionKey: 'gamePlan.workout.unicorn.description',
      completed: completionStatus['workout-unicorn'] || false,
      icon: Sparkles,
      link: '/the-unicorn',
      taskType: 'workout',
      section: 'training',
    });
  }

  // Iron Bambino (only when Unicorn is NOT active)
  if (!isUnicornProgramActive && hasHittingAccess && isHittingProgramActive && shouldShowTrainingTask('workout-hitting')) {
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
  if (hasHittingAccess) {
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

  // Heat Factory (only when Unicorn is NOT active)
  if (!isUnicornProgramActive && hasPitchingAccess && isPitchingProgramActive && shouldShowTrainingTask('workout-pitching')) {
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

  // Speed Lab task (throwing module gated + program status gated)
  if (hasThrowingAccess && isSpeedLabProgramActive && shouldShowTrainingTask('speed-lab')) {
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

  // Explosive Conditioning task (pitching module gated, only if NOT already showing Speed Lab)
  if (hasPitchingAccess && !hasThrowingAccess && isSpeedLabProgramActive && shouldShowTrainingTask('explosive-conditioning')) {
    tasks.push({
      id: 'explosive-conditioning',
      titleKey: 'gamePlan.explosiveConditioning.title',
      descriptionKey: 'gamePlan.explosiveConditioning.description',
      completed: completionStatus['speed-lab'] || false,
      icon: Zap,
      link: '/explosive-conditioning',
      module: 'pitching',
      taskType: 'workout',
      section: 'training',
      badge: completionStatus['speed-lab-locked'] ? 'gamePlan.speedLab.recoveryBadge' : undefined,
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

  // Add folder items as tasks
  const PLACEMENT_LABELS: Record<string, string> = {
    before: 'Before Workout',
    after: 'After Workout',
    separate_day: 'Separate Day',
    layered: 'Layered Within',
  };

  folderTasks.forEach(ft => {
    const iconKey = ft.folderIcon || 'clipboard';
    const IconComponent = customActivityIconMap[iconKey] || Activity;

    tasks.push({
      id: `folder-item-${ft.item.id}`,
      titleKey: ft.item.title,
      descriptionKey: ft.folderName,
      completed: ft.completed,
      icon: IconComponent,
      link: '',
      taskType: 'custom',
      section: 'custom',
      specialStyle: 'custom',
      badge: PLACEMENT_LABELS[ft.placement] || undefined,
      folderItemData: {
        folderId: ft.folderId,
        folderName: ft.folderName,
        folderColor: ft.folderColor,
        itemId: ft.item.id,
        placement: ft.placement,
        isOwner: ft.isOwner,
      },
    });
  });

  const completedCount = tasks.filter(t => t.completed).length;

  return {
    tasks,
    customActivities,
    folderTasks,
    completedCount,
    totalCount: tasks.length,
    daysUntilRecap,
    recapProgress,
    loading,
    refetch: fetchTaskStatus,
    addOptimisticActivity,
    refreshCustomActivities,
    toggleFolderItemCompletion,
  };
}
