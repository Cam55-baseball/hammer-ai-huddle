import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Heart, PenLine, Smile, Target, LucideIcon } from 'lucide-react';
import type { WellnessModule } from '@/components/mind-fuel/wellness-hub/WellnessHubNav';
import { getTodayDate } from '@/utils/dateUtils';

export type TaskId = 'daily_lesson' | 'mindfulness' | 'journal' | 'emotion_checkin' | 'weekly_challenge';

export interface DailyTask {
  id: TaskId;
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  completed: boolean;
  targetModule: WellnessModule | 'lesson' | 'challenge';
  color: string;
}

const TASK_CONFIG: Omit<DailyTask, 'completed'>[] = [
  {
    id: 'daily_lesson',
    titleKey: 'mindFuel.dailyChecklist.tasks.dailyLesson.title',
    descriptionKey: 'mindFuel.dailyChecklist.tasks.dailyLesson.description',
    icon: BookOpen,
    targetModule: 'lesson',
    color: 'violet',
  },
  {
    id: 'mindfulness',
    titleKey: 'mindFuel.dailyChecklist.tasks.mindfulness.title',
    descriptionKey: 'mindFuel.dailyChecklist.tasks.mindfulness.description',
    icon: Heart,
    targetModule: 'mindfulness',
    color: 'pink',
  },
  {
    id: 'journal',
    titleKey: 'mindFuel.dailyChecklist.tasks.journal.title',
    descriptionKey: 'mindFuel.dailyChecklist.tasks.journal.description',
    icon: PenLine,
    targetModule: 'journal',
    color: 'blue',
  },
  {
    id: 'emotion_checkin',
    titleKey: 'mindFuel.dailyChecklist.tasks.emotionCheckin.title',
    descriptionKey: 'mindFuel.dailyChecklist.tasks.emotionCheckin.description',
    icon: Smile,
    targetModule: 'emotional-awareness',
    color: 'amber',
  },
  {
    id: 'weekly_challenge',
    titleKey: 'mindFuel.dailyChecklist.tasks.weeklyChallenge.title',
    descriptionKey: 'mindFuel.dailyChecklist.tasks.weeklyChallenge.description',
    icon: Target,
    targetModule: 'challenge',
    color: 'emerald',
  },
];

export function useMindFuelDailyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [allComplete, setAllComplete] = useState(false);

  // Using imported getTodayDate from utils/dateUtils for consistent local timezone

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks(TASK_CONFIG.map(t => ({ ...t, completed: false })));
      setLoading(false);
      return;
    }

    setLoading(true);
    const today = getTodayDate();

    try {
      // Fetch completed tasks for today
      const { data: completedTasks, error } = await supabase
        .from('mind_fuel_daily_tasks')
        .select('task_id')
        .eq('user_id', user.id)
        .eq('task_date', today);

      if (error) throw error;

      const completedIds = new Set(completedTasks?.map(t => t.task_id) || []);

      // Also check for auto-completion based on existing activity
      const autoCompleted = new Set<string>();

      // Check if user viewed a lesson today
      const { data: lessonData } = await supabase
        .from('user_viewed_lessons')
        .select('id')
        .eq('user_id', user.id)
        .gte('viewed_at', `${today}T00:00:00`)
        .limit(1);
      
      if (lessonData && lessonData.length > 0) {
        autoCompleted.add('daily_lesson');
      }

      // Check if user did mindfulness today
      const { data: mindfulnessData } = await supabase
        .from('mindfulness_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .limit(1);
      
      if (mindfulnessData && mindfulnessData.length > 0) {
        autoCompleted.add('mindfulness');
      }

      // Check if user wrote journal entry today
      const { data: journalData } = await supabase
        .from('mental_health_journal')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .limit(1);
      
      if (journalData && journalData.length > 0) {
        autoCompleted.add('journal');
      }

      // Check if user did emotion tracking today
      const { data: emotionData } = await supabase
        .from('emotion_tracking')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .limit(1);
      
      if (emotionData && emotionData.length > 0) {
        autoCompleted.add('emotion_checkin');
      }

      // Check weekly challenge completion
      const { data: challengeData } = await supabase
        .from('mind_fuel_challenges')
        .select('id')
        .eq('user_id', user.id)
        .gte('last_checkin_at', `${today}T00:00:00`)
        .limit(1);
      
      if (challengeData && challengeData.length > 0) {
        autoCompleted.add('weekly_challenge');
      }

      // Merge manual and auto-completed
      const allCompleted = new Set([...completedIds, ...autoCompleted]);

      const updatedTasks = TASK_CONFIG.map(t => ({
        ...t,
        completed: allCompleted.has(t.id),
      }));

      setTasks(updatedTasks);
      setAllComplete(updatedTasks.every(t => t.completed));
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
      setTasks(TASK_CONFIG.map(t => ({ ...t, completed: false })));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleTask = async (taskId: TaskId) => {
    if (!user) return;

    const today = getTodayDate();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      if (task.completed) {
        // Remove task
        await supabase
          .from('mind_fuel_daily_tasks')
          .delete()
          .eq('user_id', user.id)
          .eq('task_date', today)
          .eq('task_id', taskId);
      } else {
        // Add task
        await supabase
          .from('mind_fuel_daily_tasks')
          .insert({
            user_id: user.id,
            task_date: today,
            task_id: taskId,
          });
      }

      // Refresh tasks
      await fetchTasks();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return {
    tasks,
    loading,
    toggleTask,
    refetch: fetchTasks,
    completedCount,
    totalCount,
    progress,
    allComplete,
  };
}
