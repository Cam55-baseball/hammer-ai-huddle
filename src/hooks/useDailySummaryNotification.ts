import { useEffect, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, isToday } from 'date-fns';

const DAILY_SUMMARY_ENABLED_KEY = 'gameplan-daily-summary-enabled';
const DAILY_SUMMARY_TIME_KEY = 'gameplan-daily-summary-time';
const DAILY_SUMMARY_LAST_SENT_KEY = 'gameplan-daily-summary-last-sent';

export interface ScheduledActivity {
  id: string;
  title: string;
  startTime: string | null; // "HH:mm" format
  reminderMinutes: number | null;
}

export function useDailySummaryNotification() {
  const { t } = useTranslation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [enabled, setEnabled] = useState<boolean>(() => {
    return localStorage.getItem(DAILY_SUMMARY_ENABLED_KEY) === 'true';
  });
  
  const [summaryTime, setSummaryTime] = useState<string>(() => {
    return localStorage.getItem(DAILY_SUMMARY_TIME_KEY) || '06:00';
  });

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
    return false;
  }, [isSupported]);

  // Show notification
  const showNotification = useCallback((title: string, body: string) => {
    if (isSupported && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: 'daily-summary',
        requireInteraction: false,
      });
    }
  }, [isSupported]);

  // Build the daily summary message
  const buildSummaryBody = useCallback((activities: ScheduledActivity[]): string => {
    const scheduledActivities = activities
      .filter(a => a.startTime)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    if (scheduledActivities.length === 0) {
      return t('gamePlan.dailySummary.noActivitiesScheduled', 'No activities scheduled with times today.');
    }

    const lines = scheduledActivities.map(a => {
      const [hours, minutes] = (a.startTime || '00:00').split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 || 12;
      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period} - ${a.title}`;
    });

    const countText = t('gamePlan.dailySummary.activitiesScheduled', { count: scheduledActivities.length });
    const motivationText = t('gamePlan.dailySummary.letsGo', "Let's crush it! 💪");

    return `${lines.join('\n')}\n\n${countText}\n${motivationText}`;
  }, [t]);

  // Schedule the daily summary notification
  const scheduleDailySummary = useCallback((activities: ScheduledActivity[]) => {
    if (!enabled || !isSupported) return;

    // Check if already sent today
    const lastSent = localStorage.getItem(DAILY_SUMMARY_LAST_SENT_KEY);
    const today = format(new Date(), 'yyyy-MM-dd');
    if (lastSent === today) return;

    const [hours, minutes] = summaryTime.split(':').map(Number);
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(hours, minutes, 0, 0);

    // If time has passed today, don't schedule
    if (targetTime <= now) return;

    const delay = targetTime.getTime() - now.getTime();

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      showNotification(
        t('gamePlan.dailySummary.notificationTitle', 'Your Game Plan for Today'),
        buildSummaryBody(activities)
      );
      localStorage.setItem(DAILY_SUMMARY_LAST_SENT_KEY, today);
    }, delay);
  }, [enabled, isSupported, summaryTime, showNotification, buildSummaryBody, t]);

  // Update enabled state
  const setDailySummaryEnabled = useCallback((value: boolean) => {
    setEnabled(value);
    localStorage.setItem(DAILY_SUMMARY_ENABLED_KEY, value.toString());
  }, []);

  // Update summary time
  const setDailySummaryTime = useCallback((time: string) => {
    setSummaryTime(time);
    localStorage.setItem(DAILY_SUMMARY_TIME_KEY, time);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    enabled,
    summaryTime,
    setEnabled: setDailySummaryEnabled,
    setSummaryTime: setDailySummaryTime,
    scheduleDailySummary,
    requestPermission,
    showNotification,
    isSupported,
    permission: isSupported ? Notification.permission : 'unsupported',
  };
}
