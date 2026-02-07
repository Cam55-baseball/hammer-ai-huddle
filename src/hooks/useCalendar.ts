import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useGamePlanLock } from '@/hooks/useGamePlanLock';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, addDays, eachDayOfInterval, getDay } from 'date-fns';
import { LucideIcon, Target, Utensils, Dumbbell, Calendar, Brain, Eye, Moon, Sun, Activity, Apple, Lightbulb, Sparkles, BedDouble, Timer, Flame, Zap } from 'lucide-react';
import { getOrderKey, CalendarDayOrder } from '@/hooks/useCalendarDayOrders';
import { TRAINING_DEFAULT_SCHEDULES } from '@/constants/trainingSchedules';

// Helper to get the Game Plan task ID for a calendar event
const getTaskIdForEvent = (event: { type: string; source: string }): string | null => {
  // Game plan tasks match directly
  if (event.type === 'game_plan') {
    return event.source;
  }
  
  // Custom activities: template-{uuid} → custom-{uuid}
  if (event.type === 'custom_activity' && event.source?.startsWith('template-')) {
    return `custom-${event.source.replace('template-', '')}`;
  }
  
  // Custom activity logs have direct template IDs
  if (event.type === 'custom_activity') {
    // Could be a log with source like 'workout' - try custom- prefix
    return null;
  }
  
  // Program sub_modules map to workout task IDs
  if (event.type === 'program') {
    if (event.source === 'iron_bambino' || event.source === 'production_lab') {
      return 'workout-hitting';
    }
    if (event.source === 'heat_factory' || event.source === 'production_studio') {
      return 'workout-pitching';
    }
  }
  
  // Meals, manual events, athlete events not in Game Plan ordering
  return null;
};

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
  orderKey?: string; // Canonical key for ordering (e.g., gp:nutrition, ca:uuid, meal:uuid)
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

// System tasks that appear on Game Plan - EXPANDED to include all task IDs
const SYSTEM_TASKS: Record<string, { title: string; icon: LucideIcon; color: string; type?: 'game_plan' | 'program' }> = {
  // Daily check-ins (blue - game_plan)
  'nutrition': { title: 'Nutrition Check-in', icon: Apple, color: '#22c55e' },
  'mindfuel': { title: 'Mind Fuel Daily', icon: Brain, color: '#8b5cf6' },
  'healthtip': { title: 'Daily Health Tip', icon: Lightbulb, color: '#14b8a6' },
  'quiz-morning': { title: 'Morning Check-in', icon: Sun, color: '#f59e0b' },
  'quiz-night': { title: 'Night Reflection', icon: Moon, color: '#6366f1' },
  'quiz-prelift': { title: 'Pre-Workout Check-in', icon: Dumbbell, color: '#f59e0b' },
  'texvision': { title: 'Tex Vision Training', icon: Eye, color: '#0ea5e9' },
  'hydration': { title: 'Hydration Reminder', icon: Sparkles, color: '#06b6d4' },
  'sleep': { title: 'Sleep Tracking', icon: BedDouble, color: '#8b5cf6' },
  'warmup': { title: 'Warm-up Routine', icon: Timer, color: '#f97316' },
  'cooldown': { title: 'Cool-down Routine', icon: Activity, color: '#10b981' },
  
  // Workouts - these are PROGRAM type (amber for hitting, red/orange for pitching)
  'workout-hitting': { title: 'Iron Bambino', icon: Dumbbell, color: '#f59e0b', type: 'program' },
  'workout-pitching': { title: 'Heat Factory', icon: Flame, color: '#f97316', type: 'program' },
  
  // Video analysis tasks
  'video-hitting': { title: 'Video Analysis (Hitting)', icon: Eye, color: '#3b82f6' },
  'video-pitching': { title: 'Video Analysis (Pitching)', icon: Eye, color: '#3b82f6' },
  'video-throwing': { title: 'Video Analysis (Throwing)', icon: Eye, color: '#3b82f6' },
  'speed-lab': { title: 'Speed Lab', icon: Zap, color: '#eab308' },
  
  // Tracking tasks
  'tracking-performance': { title: 'Performance Tracking', icon: Activity, color: '#3b82f6' },
  'tracking-photos': { title: 'Progress Photos', icon: Activity, color: '#3b82f6' },
  'tracking-grades': { title: 'Self Grades (Hitting)', icon: Target, color: '#3b82f6' },
  'tracking-pitching-grades': { title: 'Self Grades (Pitching)', icon: Target, color: '#3b82f6' },
  'tracking-wellness-goals': { title: 'Wellness Goals', icon: Target, color: '#3b82f6' },
};

// DEFAULT daily tasks that appear EVERY day regardless of explicit scheduling
const DEFAULT_DAILY_TASKS = [
  'nutrition',
  'mindfuel', 
  'healthtip',
  'quiz-morning',
  'quiz-night',
];

// Tasks that require module access
const MODULE_GATED_TASKS: Record<string, string[]> = {
  hitting: ['texvision', 'video-hitting', 'tracking-grades'],
  pitching: ['video-pitching', 'tracking-pitching-grades'],
  throwing: ['video-throwing', 'speed-lab'],
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
  const { getDaySchedule, lockedDays } = useGamePlanLock();
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentRange, setCurrentRange] = useState<{ start: Date; end: Date } | null>(null);

  // Check subscription access for programs
  const hasHittingAccess = useMemo(() => 
    modules.some(m => m.includes('hitting')), [modules]);
  const hasPitchingAccess = useMemo(() => 
    modules.some(m => m.includes('pitching')), [modules]);
  const hasThrowingAccess = useMemo(() => 
    modules.some(m => m.includes('throwing')), [modules]);

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
        dayOrdersRes,
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
          
        // Date-specific day orders (for calendar locking)
        (supabase
          .from('calendar_day_orders' as any)
          .select('*')
          .eq('user_id', user.id)
          .gte('event_date', startStr)
          .lte('event_date', endStr) as any),
      ]);

      // Build date-specific order map
      const dateOrdersMap: Record<string, CalendarDayOrder> = {};
      if (dayOrdersRes.data) {
        (dayOrdersRes.data as CalendarDayOrder[]).forEach((order) => {
          dateOrdersMap[order.event_date] = order;
        });
      }

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
          
          const calEvent: CalendarEvent = {
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
          };
          calEvent.orderKey = getOrderKey(calEvent);
          aggregatedEvents[dateKey].push(calEvent);
        });
      }

      // Process custom activity templates with recurring days
      if (customTemplatesRes.data) {
        customTemplatesRes.data.forEach(template => {
          if (!template.display_on_game_plan) return;
          
          // Fix: Prefer recurring_days ONLY if it has content, otherwise fallback to display_days
          // An empty array [] is falsy for .length but truthy for || check, so check .length explicitly
          const templateRecurringDays = template.recurring_days as number[] | null;
          const templateDisplayDays = template.display_days as number[] | null;
          const recurringDays = (templateRecurringDays && templateRecurringDays.length > 0) 
            ? templateRecurringDays 
            : (templateDisplayDays && templateDisplayDays.length > 0 ? templateDisplayDays : []);
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
                const calEvent: CalendarEvent = {
                  id: `template-${template.id}-${dateKey}`,
                  date: dateKey,
                  title: template.display_nickname || template.title,
                  description: template.description || undefined,
                  startTime: template.display_time,
                  type: 'custom_activity',
                  source: `template-${template.id}`,
                  color: template.color || getEventColor('custom_activity'),
                  icon: Activity,
                  completed: false,
                  editable: false,
                  deletable: false,
                  sport: template.sport,
                };
                calEvent.orderKey = getOrderKey(calEvent);
                aggregatedEvents[dateKey].push(calEvent);
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
          // FIX: Use template-{uuid} format to match Game Plan task IDs
          const sourceId = template?.id ? `template-${template.id}` : (template?.activity_type || 'custom');
          const calEvent: CalendarEvent = {
            id: log.id,
            date: dateKey,
            title: template?.display_nickname || template?.title || 'Custom Activity',
            description: log.notes || template?.description || undefined,
            startTime: log.start_time,
            type: 'custom_activity',
            source: sourceId,
            color: template?.color || getEventColor('custom_activity'),
            icon: Activity,
            completed: log.completed || false,
            editable: true,
            deletable: true,
            sport: template?.sport,
          };
          calEvent.orderKey = getOrderKey(calEvent);
          aggregatedEvents[dateKey].push(calEvent);
        });
      }

      // Process manual calendar events
      if (calendarEventsRes.data) {
        calendarEventsRes.data.forEach(event => {
          const dateKey = event.event_date;
          if (!aggregatedEvents[dateKey]) aggregatedEvents[dateKey] = [];
          
          const calEvent: CalendarEvent = {
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
          };
          calEvent.orderKey = getOrderKey(calEvent);
          aggregatedEvents[dateKey].push(calEvent);
        });
      }

      // Process Game Plan task schedules
      if (taskSchedulesRes.data) {
        console.debug('[Calendar] Processing task schedules:', taskSchedulesRes.data.length);
        
        taskSchedulesRes.data.forEach(schedule => {
          const taskDef = SYSTEM_TASKS[schedule.task_id];
          if (!taskDef) {
            console.debug('[Calendar] Skipping unknown task_id:', schedule.task_id);
            return;
          }
          
          const displayDays = schedule.display_days || [0, 1, 2, 3, 4, 5, 6];
          
          // Determine event type - workouts are 'program', others are 'game_plan'
          const eventType = taskDef.type || 'game_plan';
          
          daysInRange.forEach(day => {
            const dayOfWeek = getDay(day);
            if (displayDays.includes(dayOfWeek)) {
              const dateKey = format(day, 'yyyy-MM-dd');
              if (!aggregatedEvents[dateKey]) aggregatedEvents[dateKey] = [];
              
              const calEvent: CalendarEvent = {
                id: `task-${schedule.task_id}-${dateKey}`,
                date: dateKey,
                title: taskDef.title,
                startTime: schedule.display_time,
                type: eventType,
                source: schedule.task_id,
                color: taskDef.color,
                icon: taskDef.icon,
                editable: false,
                deletable: false,
              };
              calEvent.orderKey = getOrderKey(calEvent);
              aggregatedEvents[dateKey].push(calEvent);
            }
          });
        });
      }
      
      // Add DEFAULT daily tasks (appear every day regardless of explicit scheduling)
      const scheduledTaskIds = new Set(
        (taskSchedulesRes.data || []).map(s => s.task_id)
      );
      
      daysInRange.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayOfWeek = getDay(day);
        if (!aggregatedEvents[dateKey]) aggregatedEvents[dateKey] = [];
        
        // Add default daily tasks that aren't explicitly scheduled
        DEFAULT_DAILY_TASKS.forEach(taskId => {
          // Skip if already added via explicit schedule
          if (scheduledTaskIds.has(taskId)) return;
          
          const taskDef = SYSTEM_TASKS[taskId];
          if (!taskDef) return;
          
          // Check if already exists from another source
          const alreadyExists = aggregatedEvents[dateKey].some(
            e => e.source === taskId && e.type === 'game_plan'
          );
          if (alreadyExists) return;
          
          const calEvent: CalendarEvent = {
            id: `default-${taskId}-${dateKey}`,
            date: dateKey,
            title: taskDef.title,
            type: 'game_plan',
            source: taskId,
            color: taskDef.color,
            icon: taskDef.icon,
            editable: false,
            deletable: false,
          };
          calEvent.orderKey = getOrderKey(calEvent);
          aggregatedEvents[dateKey].push(calEvent);
        });
        
        // Add module-gated tasks with smart default scheduling
        const addGatedTasks = (moduleKey: string, hasAccess: boolean) => {
          if (!hasAccess) return;
          MODULE_GATED_TASKS[moduleKey]?.forEach(taskId => {
            if (scheduledTaskIds.has(taskId)) return;
            
            const taskDef = SYSTEM_TASKS[taskId];
            if (!taskDef) return;
            
            // Apply smart default schedule: only show on recommended days when no custom schedule
            const defaultDays = TRAINING_DEFAULT_SCHEDULES[taskId];
            if (defaultDays && !defaultDays.includes(dayOfWeek)) return;
            
            const alreadyExists = aggregatedEvents[dateKey].some(
              e => e.source === taskId && e.type === 'game_plan'
            );
            if (alreadyExists) return;
            
            const calEvent: CalendarEvent = {
              id: `gated-${taskId}-${dateKey}`,
              date: dateKey,
              title: taskDef.title,
              type: 'game_plan',
              source: taskId,
              color: taskDef.color,
              icon: taskDef.icon,
              editable: false,
              deletable: false,
            };
            calEvent.orderKey = getOrderKey(calEvent);
            aggregatedEvents[dateKey].push(calEvent);
          });
        };

        addGatedTasks('hitting', hasHittingAccess);
        addGatedTasks('pitching', hasPitchingAccess);
        addGatedTasks('throwing', hasThrowingAccess);
      });

      // Process sub_module_progress for Iron Bambino and Heat Factory
      // Now also recognizes production_lab (Iron Bambino) and production_studio (Heat Factory)
      if (subModuleProgressRes.data) {
        console.debug('[Calendar] Processing sub_module_progress:', subModuleProgressRes.data.length);
        const today = format(new Date(), 'yyyy-MM-dd');
        
        subModuleProgressRes.data.forEach(progress => {
          // Recognize both old and new identifiers
          const isIronBambino = progress.sub_module === 'iron_bambino' || 
            (progress.module === 'hitting' && progress.sub_module === 'production_lab');
          const isHeatFactory = progress.sub_module === 'heat_factory' || 
            (progress.module === 'pitching' && progress.sub_module === 'production_studio');
          
          if (!isIronBambino && !isHeatFactory) {
            console.debug('[Calendar] Skipping non-program sub_module:', progress.sub_module);
            return;
          }
          
          // Check subscription access
          if (isIronBambino && !hasHittingAccess) return;
          if (isHeatFactory && !hasPitchingAccess) return;
          
          const programName = isIronBambino ? 'Iron Bambino' : 'Heat Factory';
          const programColor = isIronBambino ? '#f59e0b' : '#ef4444'; // amber / red
          const programTaskId = isIronBambino ? 'workout-hitting' : 'workout-pitching';
          
          // Get current week/day from progress
          const currentWeek = progress.current_week || 1;
          const weekProgress = (progress.week_progress as Record<string, boolean[]>) || {};
          const weekKey = `week${currentWeek}`;
          const days = weekProgress[weekKey] || [];
          
          // Find next uncompleted day
          const nextDay = days.findIndex(completed => !completed) + 1 || 1;
          const isStrengthDay = [1, 5].includes(nextDay);
          
          // Find scheduled days for this program from task schedules
          const programSchedule = taskSchedulesRes.data?.find(s => s.task_id === programTaskId);
          const scheduledDays = programSchedule?.display_days || TRAINING_DEFAULT_SCHEDULES[programTaskId] || [0, 1, 2, 3, 4, 5, 6];
          
          // Add program events on scheduled days across the month
          daysInRange.forEach(day => {
            const dayOfWeek = getDay(day);
            if (scheduledDays.includes(dayOfWeek)) {
              const dateKey = format(day, 'yyyy-MM-dd');
              if (!aggregatedEvents[dateKey]) aggregatedEvents[dateKey] = [];
              
              // For today, show detailed progress; for other days, show general info
              const isToday = dateKey === today;
              const title = isToday 
                ? `${programName} W${currentWeek}D${nextDay}` 
                : `${programName} Session`;
              const description = isToday 
                ? (isStrengthDay ? 'Strength Training' : 'Skill Development')
                : 'Scheduled workout';
              
              const calEvent: CalendarEvent = {
                id: `program-${progress.sub_module}-${dateKey}`,
                date: dateKey,
                title,
                description,
                startTime: programSchedule?.display_time || null,
                type: 'program',
                source: progress.sub_module,
                color: programColor,
                icon: isStrengthDay && isToday ? Dumbbell : Flame,
                editable: false,
                deletable: false,
                sport: progress.sport,
              };
              calEvent.orderKey = getOrderKey(calEvent);
              aggregatedEvents[dateKey].push(calEvent);
            }
          });
        });
      }

      // Process meal plans - use meal.id as the source for unique identification
      if (mealPlansRes.data) {
        mealPlansRes.data.forEach(meal => {
          const dateKey = meal.planned_date;
          if (!aggregatedEvents[dateKey]) aggregatedEvents[dateKey] = [];
          
          const mealTypeName = meal.meal_type 
            ? meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1).replace('_', ' ')
            : 'Meal';
          
          const calEvent: CalendarEvent = {
            id: meal.id,
            date: dateKey,
            title: meal.meal_name || mealTypeName,
            description: meal.estimated_calories 
              ? `${meal.estimated_calories} kcal` 
              : undefined,
            startTime: meal.time_slot || getMealTime(meal.meal_type || 'lunch'),
            type: 'meal',
            source: meal.id, // Use meal ID for unique ordering
            color: '#22c55e', // green
            icon: Utensils,
            completed: meal.is_completed || false,
            editable: false, // Edit in Nutrition Hub
            deletable: false,
          };
          calEvent.orderKey = getOrderKey(calEvent);
          aggregatedEvents[dateKey].push(calEvent);
        });
      }

      // Sort events: date-specific order takes priority, then weekly lock, then time
      Object.keys(aggregatedEvents).forEach(dateKey => {
        const date = new Date(dateKey);
        const dayOfWeek = getDay(date);
        
        // Check for date-specific lock FIRST (highest priority)
        const dateLock = dateOrdersMap[dateKey];
        if (dateLock && dateLock.locked && dateLock.order_keys.length > 0) {
          // Build order map from orderKeys (these use the orderKey format: gp:nutrition, ca:uuid, etc.)
          const orderMap = new Map<string, number>();
          dateLock.order_keys.forEach((key, idx) => {
            orderMap.set(key, idx);
          });
          
          // Sort events by orderKey
          aggregatedEvents[dateKey].sort((a, b) => {
            const aKey = a.orderKey;
            const bKey = b.orderKey;
            const aOrder = aKey ? orderMap.get(aKey) : undefined;
            const bOrder = bKey ? orderMap.get(bKey) : undefined;
            
            // Both in locked order → use order
            if (aOrder !== undefined && bOrder !== undefined) {
              return aOrder - bOrder;
            }
            // Only one in order → ordered item comes first
            if (aOrder !== undefined) return -1;
            if (bOrder !== undefined) return 1;
            
            // Neither in order → fall back to time sorting
            if (!a.startTime && !b.startTime) return 0;
            if (!a.startTime) return 1;
            if (!b.startTime) return -1;
            return a.startTime.localeCompare(b.startTime);
          });
          return; // Done with this date
        }
        
        // Fall back to weekly Game Plan lock (lower priority)
        const lockedSchedule = getDaySchedule(dayOfWeek);
        if (lockedSchedule && lockedSchedule.length > 0) {
          // Build order map: convert weekly taskId format to orderKey format
          const orderMap = new Map<string, number>();
          [...lockedSchedule]
            .sort((a, b) => a.order - b.order)
            .forEach((item, idx) => {
              // Convert weekly lock taskId to orderKey format
              // Weekly locks use: custom-{uuid} for custom activities, or taskId like 'nutrition'
              let orderKey: string;
              if (item.taskId.startsWith('custom-')) {
                // custom-{uuid} → ca:{uuid}
                orderKey = `ca:${item.taskId.replace('custom-', '')}`;
              } else {
                // nutrition → gp:nutrition
                orderKey = `gp:${item.taskId}`;
              }
              orderMap.set(orderKey, idx);
            });
          
          // Sort events using orderKey matching (same format as date-specific locks)
          aggregatedEvents[dateKey].sort((a, b) => {
            const aOrder = a.orderKey ? orderMap.get(a.orderKey) : undefined;
            const bOrder = b.orderKey ? orderMap.get(b.orderKey) : undefined;
            
            // Both in locked schedule → use order
            if (aOrder !== undefined && bOrder !== undefined) {
              return aOrder - bOrder;
            }
            // Only one in schedule → scheduled item comes first
            if (aOrder !== undefined) return -1;
            if (bOrder !== undefined) return 1;
            
            // Neither in schedule → fall back to time sorting
            if (!a.startTime && !b.startTime) return 0;
            if (!a.startTime) return 1;
            if (!b.startTime) return -1;
            return a.startTime.localeCompare(b.startTime);
          });
        } else {
          // No locked schedule → pure time-based sorting
          aggregatedEvents[dateKey].sort((a, b) => {
            if (!a.startTime && !b.startTime) return 0;
            if (!a.startTime) return 1;
            if (!b.startTime) return -1;
            return a.startTime.localeCompare(b.startTime);
          });
        }
      });

      setEvents(aggregatedEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, [user, sport, hasHittingAccess, hasPitchingAccess, hasThrowingAccess, getDaySchedule]);

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

  // Refetch when locked days change (for order-aware sorting)
  useEffect(() => {
    if (currentRange && lockedDays.size >= 0) {
      // Refetch to re-sort events based on new lock state
      fetchEventsForRange(currentRange.start, currentRange.end);
    }
  }, [lockedDays]); // Only depend on lockedDays to avoid infinite loops

  // Set up real-time subscriptions for calendar events, day orders, and weekly locks
  useEffect(() => {
    if (!user) return;

    const eventsChannel = supabase
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
    
    // Subscribe to calendar_day_orders changes for order sync
    const dayOrdersChannel = supabase
      .channel('calendar-day-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_day_orders',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[Calendar] Day orders changed, refetching...');
          refetch();
        }
      )
      .subscribe();
    
    // Subscribe to game_plan_locked_days changes for weekly lock sync
    const weeklyLocksChannel = supabase
      .channel('game-plan-lock-calendar-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_plan_locked_days',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[Calendar] Weekly lock changed, refetching...');
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(dayOrdersChannel);
      supabase.removeChannel(weeklyLocksChannel);
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
