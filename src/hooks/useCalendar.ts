import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, addDays, eachDayOfInterval, getDay } from 'date-fns';
import { LucideIcon, Target, Utensils, Dumbbell, Calendar, Brain, Eye, Moon, Sun, Activity, Apple, Lightbulb, Sparkles, BedDouble, Timer, Flame } from 'lucide-react';

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  startTime?: string | null;
  endTime?: string | null;
  allDay?: boolean;
  type: 'game_plan' | 'custom_activity' | 'athlete_event' | 'program' | 'meal' | 'manual';
  source: string;
  color?: string;
  icon?: LucideIcon;
  completed?: boolean;
  link?: string;
  editable: boolean;
  deletable: boolean;
  sport?: string;
}

export interface CreateCalendarEvent {
  event_date: string;
  event_type: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  color?: string;
  reminder_enabled?: boolean;
  reminder_minutes?: number;
  sport?: string;
}

interface UseCalendarResult {
  events: Record<string, CalendarEvent[]>;
  loading: boolean;
  fetchEventsForRange: (startDate: Date, endDate: Date) => Promise<void>;
  addEvent: (event: CreateCalendarEvent) => Promise<boolean>;
  updateEvent: (id: string, updates: Partial<CreateCalendarEvent>) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  refetch: () => void;
}

// System tasks that appear on Game Plan
const SYSTEM_TASKS: Record<string, { title: string; icon: LucideIcon; color: string }> = {
  'nutrition': { title: 'Nutrition Check-in', icon: Apple, color: '#22c55e' },
  'mindfuel': { title: 'Mind Fuel Daily', icon: Brain, color: '#8b5cf6' },
  'healthtip': { title: 'Daily Health Tip', icon: Lightbulb, color: '#14b8a6' },
  'quiz-morning': { title: 'Morning Check-in', icon: Sun, color: '#f59e0b' },
  'quiz-night': { title: 'Night Reflection', icon: Moon, color: '#6366f1' },
  'texvision': { title: 'Tex Vision Training', icon: Eye, color: '#0ea5e9' },
  'hydration': { title: 'Hydration Reminder', icon: Sparkles, color: '#06b6d4' },
  'sleep': { title: 'Sleep Tracking', icon: BedDouble, color: '#8b5cf6' },
  'warmup': { title: 'Warm-up Routine', icon: Timer, color: '#f97316' },
  'cooldown': { title: 'Cool-down Routine', icon: Activity, color: '#10b981' },
};

// Map event sources to icons
const getEventIcon = (type: string, source: string): LucideIcon => {
  if (type === 'athlete_event') {
    if (source === 'game') return Target;
    if (source === 'rest') return Moon;
    return Activity;
  }
  if (type === 'custom_activity') return Activity;
  if (type === 'meal') return Utensils;
  if (type === 'program') return Dumbbell;
  if (type === 'game_plan') {
    return SYSTEM_TASKS[source]?.icon || Calendar;
  }
  if (source === 'morning-checkin') return Sun;
  if (source === 'night-reflection') return Moon;
  if (source === 'mindfuel') return Brain;
  if (source === 'tex-vision') return Eye;
  return Calendar;
};

// Map event types to colors
const getEventColor = (type: string, source?: string): string => {
  if (type === 'game_plan' && source && SYSTEM_TASKS[source]) {
    return SYSTEM_TASKS[source].color;
  }
  const colorMap: Record<string, string> = {
    'athlete_event': '#ef4444', // red
    'game_plan': '#3b82f6', // blue
    'custom_activity': '#8b5cf6', // purple
    'program': '#f59e0b', // amber
    'meal': '#22c55e', // green
    'manual': '#6366f1', // indigo
  };
  return colorMap[type] || '#6b7280';
};

// Map meal types to approximate times
const getMealTime = (mealType: string): string => {
  const mealTimes: Record<string, string> = {
    'breakfast': '07:00',
    'lunch': '12:00',
    'dinner': '18:00',
    'snack': '15:00',
    'pre_workout': '06:00',
    'post_workout': '10:00',
    'pre_game': '11:00',
    'post_game': '20:00',
  };
  return mealTimes[mealType] || '12:00';
};

export function useCalendar(sport: 'baseball' | 'softball' = 'baseball'): UseCalendarResult {
  const { user } = useAuth();
  const { modules } = useSubscription();
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentRange, setCurrentRange] = useState<{ start: Date; end: Date } | null>(null);

  // Check subscription access for programs
  const hasHittingAccess = useMemo(() => 
    modules.some(m => m.includes('hitting')), [modules]);
  const hasPitchingAccess = useMemo(() => 
    modules.some(m => m.includes('pitching')), [modules]);

  const fetchEventsForRange = useCallback(async (startDate: Date, endDate: Date) => {
    if (!user) return;
    
    setLoading(true);
    setCurrentRange({ start: startDate, end: endDate });
    
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    
    try {
      // Fetch all data sources in parallel
      const [
        athleteEventsRes,
        customTemplatesRes,
        customLogsRes,
        calendarEventsRes,
        taskSchedulesRes,
        subModuleProgressRes,
        mealPlansRes,
      ] = await Promise.all([
        // Athlete events (game days, rest days, etc.)
        supabase
          .from('athlete_events')
          .select('*')
          .eq('user_id', user.id)
          .gte('event_date', startStr)
          .lte('event_date', endStr),
        
        // Custom activity templates (for recurring activities)
        supabase
          .from('custom_activity_templates')
          .select('*')
          .eq('user_id', user.id)
          .or(`sport.eq.${sport},sport.is.null`),
        
        // Custom activity logs (actual scheduled activities)
        supabase
          .from('custom_activity_logs')
          .select('*, custom_activity_templates(*)')
          .eq('user_id', user.id)
          .gte('entry_date', startStr)
          .lte('entry_date', endStr),
        
        // Manual calendar events
        supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', user.id)
          .gte('event_date', startStr)
          .lte('event_date', endStr),
        
        // Game Plan task schedules
        supabase
          .from('game_plan_task_schedule')
          .select('*')
          .eq('user_id', user.id),
        
        // Program progress (Iron Bambino / Heat Factory)
        supabase
          .from('sub_module_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('sport', sport),
        
        // Meal plans
        supabase
          .from('vault_meal_plans')
          .select('*')
          .eq('user_id', user.id)
          .gte('planned_date', startStr)
          .lte('planned_date', endStr),
      ]);

      const aggregatedEvents: Record<string, CalendarEvent[]> = {};
      
      // Initialize all days in range
      const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });
      daysInRange.forEach(day => {
        aggregatedEvents[format(day, 'yyyy-MM-dd')] = [];
      });

      // Process athlete events
      if (athleteEventsRes.data) {
        athleteEventsRes.data.forEach(event => {
          const dateKey = event.event_date;
          if (!aggregatedEvents[dateKey]) aggregatedEvents[dateKey] = [];
          
          aggregatedEvents[dateKey].push({
            id: event.id,
            date: dateKey,
            title: event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1),
            description: event.notes || undefined,
            startTime: event.event_time,
            type: 'athlete_event',
            source: event.event_type,
            color: getEventColor('athlete_event'),
            icon: getEventIcon('athlete_event', event.event_type),
            editable: true,
            deletable: true,
            sport: event.sport || undefined,
          });
        });
      }

      // Process custom activity templates with recurring days
      if (customTemplatesRes.data) {
        customTemplatesRes.data.forEach(template => {
          if (!template.display_on_game_plan) return;
          
          const recurringDays = (template.recurring_days as number[] | null) || template.display_days || [];
          if (recurringDays.length === 0) return;
          
          daysInRange.forEach(day => {
            const dayOfWeek = getDay(day);
            if (recurringDays.includes(dayOfWeek)) {
              const dateKey = format(day, 'yyyy-MM-dd');
              if (!aggregatedEvents[dateKey]) aggregatedEvents[dateKey] = [];
              
              // Check if there's already a log for this template on this day
              const hasLog = customLogsRes.data?.some(
                log => log.template_id === template.id && log.entry_date === dateKey
              );
              
              if (!hasLog) {
                aggregatedEvents[dateKey].push({
                  id: `template-${template.id}-${dateKey}`,
                  date: dateKey,
                  title: template.display_nickname || template.title,
                  description: template.description || undefined,
                  startTime: template.display_time,
                  type: 'custom_activity',
                  source: template.activity_type,
                  color: template.color || getEventColor('custom_activity'),
                  icon: Activity,
                  completed: false,
                  editable: false,
                  deletable: false,
                  sport: template.sport,
                });
              }
            }
          });
        });
      }

      // Process custom activity logs
      if (customLogsRes.data) {
        customLogsRes.data.forEach(log => {
          const dateKey = log.entry_date;
          if (!aggregatedEvents[dateKey]) aggregatedEvents[dateKey] = [];
          
          const template = log.custom_activity_templates;
          aggregatedEvents[dateKey].push({
            id: log.id,
            date: dateKey,
            title: template?.display_nickname || template?.title || 'Custom Activity',
            description: log.notes || template?.description || undefined,
            startTime: log.start_time,
            type: 'custom_activity',
            source: template?.activity_type || 'custom',
            color: template?.color || getEventColor('custom_activity'),
            icon: Activity,
            completed: log.completed || false,
            editable: true,
            deletable: true,
            sport: template?.sport,
          });
        });
      }

      // Process manual calendar events
      if (calendarEventsRes.data) {
        calendarEventsRes.data.forEach(event => {
          const dateKey = event.event_date;
          if (!aggregatedEvents[dateKey]) aggregatedEvents[dateKey] = [];
          
          aggregatedEvents[dateKey].push({
            id: event.id,
            date: dateKey,
            title: event.title,
            description: event.description || undefined,
            startTime: event.start_time,
            endTime: event.end_time,
            allDay: event.all_day || false,
            type: 'manual',
            source: event.event_type,
            color: event.color || getEventColor('manual'),
            icon: Calendar,
            editable: true,
            deletable: true,
            sport: event.sport || undefined,
          });
        });
      }

      // Process Game Plan task schedules
      if (taskSchedulesRes.data) {
        taskSchedulesRes.data.forEach(schedule => {
          const taskDef = SYSTEM_TASKS[schedule.task_id];
          if (!taskDef) return;
          
          const displayDays = schedule.display_days || [0, 1, 2, 3, 4, 5, 6];
          
          daysInRange.forEach(day => {
            const dayOfWeek = getDay(day);
            if (displayDays.includes(dayOfWeek)) {
              const dateKey = format(day, 'yyyy-MM-dd');
              if (!aggregatedEvents[dateKey]) aggregatedEvents[dateKey] = [];
              
              aggregatedEvents[dateKey].push({
                id: `task-${schedule.task_id}-${dateKey}`,
                date: dateKey,
                title: taskDef.title,
                startTime: schedule.display_time,
                type: 'game_plan',
                source: schedule.task_id,
                color: taskDef.color,
                icon: taskDef.icon,
                editable: false,
                deletable: false,
              });
            }
          });
        });
      }

      // Process sub_module_progress for Iron Bambino and Heat Factory
      if (subModuleProgressRes.data) {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        subModuleProgressRes.data.forEach(progress => {
          const isIronBambino = progress.sub_module === 'iron_bambino';
          const isHeatFactory = progress.sub_module === 'heat_factory';
          
          if (!isIronBambino && !isHeatFactory) return;
          
          // Check subscription access
          if (isIronBambino && !hasHittingAccess) return;
          if (isHeatFactory && !hasPitchingAccess) return;
          
          const programName = isIronBambino ? 'Iron Bambino' : 'Heat Factory';
          const programColor = isIronBambino ? '#f59e0b' : '#ef4444'; // amber / red
          
          // Get current week/day from progress
          const currentWeek = progress.current_week || 1;
          const weekProgress = (progress.week_progress as Record<string, boolean[]>) || {};
          const weekKey = `week${currentWeek}`;
          const days = weekProgress[weekKey] || [];
          
          // Find next uncompleted day
          const nextDay = days.findIndex(completed => !completed) + 1 || 1;
          const isStrengthDay = [1, 5].includes(nextDay);
          
          // Add to today's date if it exists in range
          if (aggregatedEvents[today]) {
            aggregatedEvents[today].push({
              id: `program-${progress.sub_module}-${today}`,
              date: today,
              title: `${programName} W${currentWeek}D${nextDay}`,
              description: isStrengthDay ? 'Strength Training' : 'Skill Development',
              type: 'program',
              source: progress.sub_module,
              color: programColor,
              icon: isStrengthDay ? Dumbbell : Flame,
              editable: false,
              deletable: false,
              sport: progress.sport,
            });
          }
        });
      }

      // Process meal plans
      if (mealPlansRes.data) {
        mealPlansRes.data.forEach(meal => {
          const dateKey = meal.planned_date;
          if (!aggregatedEvents[dateKey]) aggregatedEvents[dateKey] = [];
          
          const mealTypeName = meal.meal_type 
            ? meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1).replace('_', ' ')
            : 'Meal';
          
          aggregatedEvents[dateKey].push({
            id: meal.id,
            date: dateKey,
            title: meal.meal_name || mealTypeName,
            description: meal.estimated_calories 
              ? `${meal.estimated_calories} kcal` 
              : undefined,
            startTime: meal.time_slot || getMealTime(meal.meal_type || 'lunch'),
            type: 'meal',
            source: meal.meal_type || 'meal',
            color: '#22c55e', // green
            icon: Utensils,
            completed: meal.is_completed || false,
            editable: false, // Edit in Nutrition Hub
            deletable: false,
          });
        });
      }

      // Sort events by time within each day
      Object.keys(aggregatedEvents).forEach(dateKey => {
        aggregatedEvents[dateKey].sort((a, b) => {
          if (!a.startTime && !b.startTime) return 0;
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return a.startTime.localeCompare(b.startTime);
        });
      });

      setEvents(aggregatedEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, [user, sport, hasHittingAccess, hasPitchingAccess]);

  const addEvent = useCallback(async (event: CreateCalendarEvent): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: user.id,
          ...event,
        });
      
      if (error) throw error;
      
      // Refetch current range
      if (currentRange) {
        await fetchEventsForRange(currentRange.start, currentRange.end);
      }
      
      return true;
    } catch (error) {
      console.error('Error adding calendar event:', error);
      return false;
    }
  }, [user, currentRange, fetchEventsForRange]);

  const updateEvent = useCallback(async (id: string, updates: Partial<CreateCalendarEvent>): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Refetch current range
      if (currentRange) {
        await fetchEventsForRange(currentRange.start, currentRange.end);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return false;
    }
  }, [user, currentRange, fetchEventsForRange]);

  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Refetch current range
      if (currentRange) {
        await fetchEventsForRange(currentRange.start, currentRange.end);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  }, [user, currentRange, fetchEventsForRange]);

  const refetch = useCallback(() => {
    if (currentRange) {
      fetchEventsForRange(currentRange.start, currentRange.end);
    }
  }, [currentRange, fetchEventsForRange]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('calendar-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  return {
    events,
    loading,
    fetchEventsForRange,
    addEvent,
    updateEvent,
    deleteEvent,
    refetch,
  };
}
