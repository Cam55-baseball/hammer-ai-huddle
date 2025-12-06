import { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const NOTIFICATION_STORAGE_KEY = 'workout_notification_scheduled';

export function useWorkoutNotifications() {
  const { t } = useTranslation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  // Show notification immediately
  const showNotification = useCallback((title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: 'workout-unlock',
        requireInteraction: false,
      });
    }
  }, []);

  // Schedule notification for a specific time
  const scheduleNotification = useCallback((unlockTime: Date, workoutName?: string) => {
    const now = new Date();
    const delay = unlockTime.getTime() - now.getTime();

    if (delay <= 0) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Store scheduled time in localStorage for persistence
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify({
      unlockTime: unlockTime.toISOString(),
      workoutName,
    }));

    // Schedule the notification
    timeoutRef.current = setTimeout(() => {
      showNotification(
        t('workoutModules.notifications.workoutUnlockedTitle', 'Workout Unlocked!'),
        t('workoutModules.notifications.workoutUnlockedBody', 'Your next workout is now available. Time to train!')
      );
      localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
    }, delay);
  }, [showNotification, t]);

  // Cancel scheduled notification
  const cancelNotification = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
  }, []);

  // Check for and restore scheduled notifications on mount
  useEffect(() => {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (stored) {
      try {
        const { unlockTime, workoutName } = JSON.parse(stored);
        const unlockDate = new Date(unlockTime);
        const now = new Date();

        if (unlockDate > now) {
          // Re-schedule if still in the future
          scheduleNotification(unlockDate, workoutName);
        } else {
          // Show notification immediately if time has passed
          showNotification(
            t('workoutModules.notifications.workoutUnlockedTitle', 'Workout Unlocked!'),
            t('workoutModules.notifications.workoutUnlockedBody', 'Your next workout is now available. Time to train!')
          );
          localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [scheduleNotification, showNotification, t]);

  return {
    requestPermission,
    scheduleNotification,
    cancelNotification,
    showNotification,
    isSupported: 'Notification' in window,
    permission: typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'denied',
  };
}
