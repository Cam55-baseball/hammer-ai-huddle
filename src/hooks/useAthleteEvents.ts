import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import type { DayType } from '@/utils/tdeeCalculations';

export interface AthleteEvent {
  id: string;
  userId: string;
  eventDate: string;
  eventType: DayType;
  eventTime: string | null;
  intensityLevel: number | null;
  sport: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateEventInput {
  eventDate: string;
  eventType: DayType;
  eventTime?: string;
  intensityLevel?: number;
  sport?: string;
  notes?: string;
}

export function useAthleteEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AthleteEvent[]>([]);
  const [todayEvent, setTodayEvent] = useState<AthleteEvent | null>(null);
  const [weekEvents, setWeekEvents] = useState<AthleteEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async (startDate?: string, endDate?: string) => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('athlete_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      if (startDate && endDate) {
        query = query.gte('event_date', startDate).lte('event_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedEvents: AthleteEvent[] = (data || []).map((e) => ({
        id: e.id,
        userId: e.user_id,
        eventDate: e.event_date,
        eventType: e.event_type as DayType,
        eventTime: e.event_time,
        intensityLevel: e.intensity_level,
        sport: e.sport,
        notes: e.notes,
        createdAt: e.created_at
      }));

      setEvents(mappedEvents);

      // Set today's event
      const today = format(new Date(), 'yyyy-MM-dd');
      setTodayEvent(mappedEvents.find(e => e.eventDate === today) || null);

      // Set this week's events
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      setWeekEvents(mappedEvents.filter(e => e.eventDate >= weekStart && e.eventDate <= weekEnd));
    } catch (error) {
      console.error('Error fetching athlete events:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (input: CreateEventInput): Promise<AthleteEvent | null> => {
    if (!user?.id) return null;

    try {
      // Check if event already exists for this date
      const { data: existing } = await supabase
        .from('athlete_events')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_date', input.eventDate)
        .maybeSingle();

      if (existing) {
        // Update existing event
        const { data, error } = await supabase
          .from('athlete_events')
          .update({
            event_type: input.eventType,
            event_time: input.eventTime,
            intensity_level: input.intensityLevel,
            sport: input.sport,
            notes: input.notes
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;

        await fetchEvents();
        toast.success('Event updated');
        return mapEvent(data);
      }

      // Create new event
      const { data, error } = await supabase
        .from('athlete_events')
        .insert({
          user_id: user.id,
          event_date: input.eventDate,
          event_type: input.eventType,
          event_time: input.eventTime,
          intensity_level: input.intensityLevel,
          sport: input.sport,
          notes: input.notes
        })
        .select()
        .single();

      if (error) throw error;

      await fetchEvents();
      toast.success('Event added');
      return mapEvent(data);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to add event');
      return null;
    }
  };

  const deleteEvent = async (eventId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('athlete_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchEvents();
      toast.success('Event removed');
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to remove event');
      return false;
    }
  };

  const setTodayAsGameDay = async (): Promise<boolean> => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const event = await createEvent({
      eventDate: today,
      eventType: 'game',
      intensityLevel: 10
    });
    return !!event;
  };

  const setTodayAsRestDay = async (): Promise<boolean> => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const event = await createEvent({
      eventDate: today,
      eventType: 'rest',
      intensityLevel: 1
    });
    return !!event;
  };

  const getEventForDate = (date: Date): AthleteEvent | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.find(e => e.eventDate === dateStr) || null;
  };

  const getDayTypeForDate = (date: Date): DayType => {
    const event = getEventForDate(date);
    return event?.eventType || 'training'; // Default to training
  };

  return {
    events,
    todayEvent,
    weekEvents,
    loading,
    createEvent,
    deleteEvent,
    setTodayAsGameDay,
    setTodayAsRestDay,
    getEventForDate,
    getDayTypeForDate,
    refetch: fetchEvents
  };
}

function mapEvent(data: any): AthleteEvent {
  return {
    id: data.id,
    userId: data.user_id,
    eventDate: data.event_date,
    eventType: data.event_type as DayType,
    eventTime: data.event_time,
    intensityLevel: data.intensity_level,
    sport: data.sport,
    notes: data.notes,
    createdAt: data.created_at
  };
}
