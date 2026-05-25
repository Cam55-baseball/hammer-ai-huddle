import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSchedulingService } from '@/hooks/useSchedulingService';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import type { DayType } from '@/utils/tdeeCalculations';
import { ENGINE_VERSION, computeIdempotencyKey } from '@/lib/asb/engineVersion';
import { emitAsbEvent } from '@/lib/asb/emit';

const ASB_TOPIC_DAY_TYPE = 'athlete.schedule.day_type';
const ASB_TOPIC_DAY_TYPE_DELETED = 'athlete.schedule.day_type.deleted';

/**
 * Build the canonical occurred_at for a day-type event.
 * Deterministic: same (eventDate, eventTime) → same ISO string.
 */
function asbOccurredAt(eventDate: string, eventTime: string | null | undefined): string {
  const time = eventTime && /^\d{2}:\d{2}/.test(eventTime) ? eventTime.slice(0, 5) : '00:00';
  return new Date(`${eventDate}T${time}:00Z`).toISOString();
}

async function emitDayTypeAsbEvent(params: {
  athleteId: string;
  topic: string;
  eventDate: string;
  eventTime: string | null | undefined;
  payload: Record<string, unknown>;
}) {
  try {
    const occurred_at = asbOccurredAt(params.eventDate, params.eventTime);
    const ingested_at = new Date().toISOString();
    const idempotency_key = await computeIdempotencyKey({
      athlete_id: params.athleteId,
      topic_id: params.topic,
      occurred_at,
      payload: params.payload,
    });
    await emitAsbEvent({
      event_id: crypto.randomUUID(),
      athlete_id: params.athleteId,
      topic_id: params.topic,
      actor_role: 'athlete',
      actor_id: params.athleteId,
      occurred_at,
      ingested_at,
      effective_at: occurred_at,
      valid_from: occurred_at,
      valid_to: null,
      payload: params.payload,
      engine_version: ENGINE_VERSION,
      idempotency_key,
      causality_refs: [],
      lineage_refs: [],
    });
  } catch (e) {
    // Additive emission: never break the legacy path.
    console.error('[asb] day_type emit guard', (e as Error)?.message);
  }
}

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
  const schedulingService = useSchedulingService();
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
      const result = await schedulingService.setDayType(input);
      if (!result.success) {
        toast.error('Failed to add event');
        return null;
      }

      await fetchEvents();
      toast.success('Event saved');
      
      // Fetch the created/updated event to return it
      const { data } = await supabase
        .from('athlete_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_date', input.eventDate)
        .maybeSingle();

      // Additive canonical ASB emission. Non-blocking; failures never break legacy.
      void emitDayTypeAsbEvent({
        athleteId: user.id,
        topic: ASB_TOPIC_DAY_TYPE,
        eventDate: input.eventDate,
        eventTime: input.eventTime ?? null,
        payload: {
          event_type: input.eventType,
          event_time: input.eventTime ?? null,
          intensity_level: input.intensityLevel ?? null,
          sport: input.sport ?? null,
          notes: input.notes ?? null,
          legacy_event_id: data?.id ?? null,
        },
      });

      return data ? mapEvent(data) : null;
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to add event');
      return null;
    }
  };

  const deleteEvent = async (eventId: string): Promise<boolean> => {
    if (!user?.id) return false;

    // Capture the legacy row BEFORE deletion so the ASB delete event has a deterministic occurred_at.
    const prior = events.find(e => e.id === eventId) ?? null;

    try {
      const success = await schedulingService.deleteDayType(eventId);
      if (!success) {
        toast.error('Failed to remove event');
        return false;
      }

      await fetchEvents();
      toast.success('Event removed');

      if (prior) {
        void emitDayTypeAsbEvent({
          athleteId: user.id,
          topic: ASB_TOPIC_DAY_TYPE_DELETED,
          eventDate: prior.eventDate,
          eventTime: prior.eventTime,
          payload: {
            event_type: prior.eventType,
            event_time: prior.eventTime,
            intensity_level: prior.intensityLevel,
            sport: prior.sport,
            notes: prior.notes,
            legacy_event_id: prior.id,
          },
        });
      }

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
