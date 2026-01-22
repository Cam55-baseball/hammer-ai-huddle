import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface CalendarDayOrder {
  id: string;
  user_id: string;
  event_date: string; // YYYY-MM-DD
  locked: boolean;
  order_keys: string[];
  created_at: string;
  updated_at: string;
}

interface UseCalendarDayOrdersResult {
  dayOrders: Record<string, CalendarDayOrder>; // keyed by event_date
  loading: boolean;
  fetchDayOrdersForRange: (start: Date, end: Date) => Promise<void>;
  getDayOrder: (date: Date) => CalendarDayOrder | null;
  isDateLocked: (date: Date) => boolean;
  getOrderKeysForDate: (date: Date) => string[];
  saveDayOrder: (date: Date, orderKeys: string[], locked: boolean) => Promise<boolean>;
  unlockDate: (date: Date) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useCalendarDayOrders(): UseCalendarDayOrdersResult {
  const [dayOrders, setDayOrders] = useState<Record<string, CalendarDayOrder>>({});
  const [loading, setLoading] = useState(false);
  const [lastRange, setLastRange] = useState<{ start: Date; end: Date } | null>(null);

  const fetchDayOrdersForRange = useCallback(async (start: Date, end: Date) => {
    try {
      setLoading(true);
      setLastRange({ start, end });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      // Use type assertion since the table was just created and types haven't regenerated
      const { data, error } = await (supabase
        .from('calendar_day_orders' as any)
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', startStr)
        .lte('event_date', endStr) as any);

      if (error) {
        console.error('Error fetching day orders:', error);
        setLoading(false);
        return;
      }

      const ordersMap: Record<string, CalendarDayOrder> = {};
      ((data as CalendarDayOrder[]) || []).forEach((order) => {
        ordersMap[order.event_date] = order;
      });

      setDayOrders(ordersMap);
    } catch (err) {
      console.error('Error in fetchDayOrdersForRange:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    if (lastRange) {
      await fetchDayOrdersForRange(lastRange.start, lastRange.end);
    }
  }, [lastRange, fetchDayOrdersForRange]);

  const getDayOrder = useCallback((date: Date): CalendarDayOrder | null => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return dayOrders[dateKey] || null;
  }, [dayOrders]);

  const isDateLocked = useCallback((date: Date): boolean => {
    const order = getDayOrder(date);
    return order?.locked ?? false;
  }, [getDayOrder]);

  const getOrderKeysForDate = useCallback((date: Date): string[] => {
    const order = getDayOrder(date);
    return order?.order_keys || [];
  }, [getDayOrder]);

  const saveDayOrder = useCallback(async (
    date: Date, 
    orderKeys: string[], 
    locked: boolean
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const dateStr = format(date, 'yyyy-MM-dd');

      // Use type assertion since the table was just created
      const { error } = await (supabase
        .from('calendar_day_orders' as any)
        .upsert({
          user_id: user.id,
          event_date: dateStr,
          order_keys: orderKeys,
          locked,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,event_date',
        }) as any);

      if (error) {
        console.error('Error saving day order:', error);
        return false;
      }

      // Update local state
      setDayOrders(prev => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          id: prev[dateStr]?.id || '',
          user_id: user.id,
          event_date: dateStr,
          order_keys: orderKeys,
          locked,
          created_at: prev[dateStr]?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }));

      return true;
    } catch (err) {
      console.error('Error in saveDayOrder:', err);
      return false;
    }
  }, []);

  const unlockDate = useCallback(async (date: Date): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const dateStr = format(date, 'yyyy-MM-dd');

      // Use type assertion since the table was just created
      const { error } = await (supabase
        .from('calendar_day_orders' as any)
        .update({ locked: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('event_date', dateStr) as any);

      if (error) {
        console.error('Error unlocking date:', error);
        return false;
      }

      // Update local state
      setDayOrders(prev => {
        if (prev[dateStr]) {
          return {
            ...prev,
            [dateStr]: { ...prev[dateStr], locked: false }
          };
        }
        return prev;
      });

      return true;
    } catch (err) {
      console.error('Error in unlockDate:', err);
      return false;
    }
  }, []);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('calendar_day_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_day_orders',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newOrder = payload.new as CalendarDayOrder;
            setDayOrders(prev => ({
              ...prev,
              [newOrder.event_date]: newOrder
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldOrder = payload.old as { event_date: string };
            setDayOrders(prev => {
              const updated = { ...prev };
              delete updated[oldOrder.event_date];
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    dayOrders,
    loading,
    fetchDayOrdersForRange,
    getDayOrder,
    isDateLocked,
    getOrderKeysForDate,
    saveDayOrder,
    unlockDate,
    refetch,
  };
}

/**
 * Generate a canonical order key for a calendar event.
 * This key is used to uniquely identify events across Calendar and Game Plan.
 */
export function getOrderKey(event: {
  type: string;
  source?: string;
  id?: string;
  title?: string;
}): string {
  const { type, source, id, title } = event;

  // Game plan system tasks
  if (type === 'game_plan') {
    // source should be the task ID like "nutrition", "workout-hitting", etc.
    return `gp:${source || id || 'unknown'}`;
  }

  // Program workouts (Iron Bambino, Heat Factory)
  if (type === 'program') {
    // source indicates the specific workout type
    return `gp:${source || 'program'}`;
  }

  // Custom activities (template-based)
  if (type === 'custom_activity') {
    // source should be template-<uuid> or just the template id
    const templateId = source?.replace('template-', '') || id;
    return `ca:${templateId}`;
  }

  // Meals
  if (type === 'meal') {
    // Use the actual meal plan ID for uniqueness, not meal_type
    // source should now contain the meal plan ID
    return `meal:${source || id || 'unknown'}`;
  }

  // Athlete events (game days, rest days)
  if (type === 'athlete_event') {
    return `ae:${id || source || 'unknown'}`;
  }

  // Manual events
  if (type === 'manual') {
    return `man:${id || 'unknown'}`;
  }

  // Fallback
  return `other:${type}-${id || source || title || 'unknown'}`;
}
