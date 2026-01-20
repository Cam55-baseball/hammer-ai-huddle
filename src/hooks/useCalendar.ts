import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, addDays, eachDayOfInterval, getDay } from 'date-fns';
import { LucideIcon, Target, Utensils, Dumbbell, Calendar, Brain, Eye, Moon, Sun, Activity } from 'lucide-react';

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
  if (source === 'morning-checkin') return Sun;
  if (source === 'night-reflection') return Moon;
  if (source === 'mindfuel') return Brain;
  if (source === 'tex-vision') return Eye;
  return Calendar;
};

// Map event types to colors
const getEventColor = (type: string, source?: string): string => {
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

export function useCalendar(sport: 'baseball' | 'softball' = 'baseball'): UseCalendarResult {
  const { user } = useAuth();
  const { modules } = useSubscription();
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentRange, setCurrentRange] = useState<{ start: Date; end: Date } | null>(null);

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
  }, [user, sport]);

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
