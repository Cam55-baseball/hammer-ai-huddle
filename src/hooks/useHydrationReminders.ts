import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface HydrationSettings {
  enabled: boolean;
  daily_goal_oz: number;
  reminder_interval_minutes: number;
  start_time: string;
  end_time: string;
}

export function useHydrationReminders() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<HydrationSettings | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkPermission = useCallback(() => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      setHasPermission(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      return granted;
    }

    return false;
  };

  const showNotification = useCallback((body: string) => {
    if (hasPermission && 'Notification' in window) {
      new Notification('💧 Hydration Reminder', {
        body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: 'hydration-reminder',
        requireInteraction: false,
      });
    }
  }, [hasPermission]);

  const scheduleNextReminder = useCallback(() => {
    if (!settings?.enabled || !hasPermission) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const now = new Date();
    const [startHour, startMin] = settings.start_time.split(':').map(Number);
    const [endHour, endMin] = settings.end_time.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Check if we're within the reminder window
    if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
      // Schedule for start of next window
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + (currentMinutes >= endMinutes ? 1 : 0));
      tomorrow.setHours(startHour, startMin, 0, 0);
      
      const delay = tomorrow.getTime() - now.getTime();
      timeoutRef.current = setTimeout(() => {
        showNotification('Time to drink some water! 💧');
        scheduleNextReminder();
      }, delay);
      return;
    }

    // Schedule next reminder based on interval
    const intervalMs = settings.reminder_interval_minutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      showNotification('Time to drink some water! Stay hydrated! 💧');
      scheduleNextReminder();
    }, intervalMs);
  }, [settings, hasPermission, showNotification]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('hydration_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          enabled: data.enabled ?? true,
          daily_goal_oz: data.daily_goal_oz ?? 100,
          reminder_interval_minutes: data.reminder_interval_minutes ?? 60,
          start_time: data.start_time?.slice(0, 5) ?? '07:00',
          end_time: data.end_time?.slice(0, 5) ?? '21:00',
        });
      }
    };

    fetchSettings();
  }, [user]);

  useEffect(() => {
    if (settings?.enabled && hasPermission) {
      scheduleNextReminder();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [settings, hasPermission, scheduleNextReminder]);

  return {
    settings,
    hasPermission,
    requestPermission,
    showNotification,
  };
}
