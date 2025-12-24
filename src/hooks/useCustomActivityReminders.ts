import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface PendingReminder {
  templateId: string;
  title: string;
  reminderTime: string;
}

export function useCustomActivityReminders() {
  const { user } = useAuth();
  const [pendingReminders, setPendingReminders] = useState<PendingReminder[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

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

  const showNotification = useCallback((title: string, body: string) => {
    if (hasPermission && 'Notification' in window) {
      new Notification(title, {
        body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: `activity-reminder-${Date.now()}`,
        requireInteraction: false,
      });
    }
  }, [hasPermission]);

  const scheduleReminder = useCallback((reminder: PendingReminder) => {
    if (!hasPermission) return;

    // Clear existing timeout for this template
    const existingTimeout = timeoutRefs.current.get(reminder.templateId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const now = new Date();
    const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
    
    const reminderDate = new Date();
    reminderDate.setHours(hours, minutes, 0, 0);

    // If the reminder time has passed for today, don't schedule
    if (reminderDate <= now) return;

    const delay = reminderDate.getTime() - now.getTime();
    
    const timeout = setTimeout(() => {
      showNotification(
        '⏰ Activity Reminder',
        `Don't forget: ${reminder.title}`
      );
      timeoutRefs.current.delete(reminder.templateId);
    }, delay);

    timeoutRefs.current.set(reminder.templateId, timeout);
  }, [hasPermission, showNotification]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    const fetchPendingActivities = async () => {
      if (!user || !hasPermission) return;

      const today = format(new Date(), 'yyyy-MM-dd');
      const dayOfWeek = new Date().getDay();

      try {
        // Fetch templates with reminders enabled
        const { data: templates, error: templatesError } = await supabase
          .from('custom_activity_templates')
          .select('id, title, reminder_enabled, reminder_time, recurring_active, recurring_days')
          .eq('user_id', user.id)
          .eq('reminder_enabled', true);

        if (templatesError) throw templatesError;

        // Fetch today's logs
        const { data: logs, error: logsError } = await supabase
          .from('custom_activity_logs')
          .select('template_id, completed')
          .eq('user_id', user.id)
          .eq('entry_date', today);

        if (logsError) throw logsError;

        const completedTemplateIds = new Set(
          logs?.filter(l => l.completed).map(l => l.template_id) || []
        );

        // Filter to templates that are:
        // 1. Scheduled for today (recurring on this day OR has a log entry)
        // 2. Not yet completed
        // 3. Have reminder enabled
        const pending: PendingReminder[] = [];

        templates?.forEach((template: any) => {
          const recurringDays = template.recurring_days || [];
          const isScheduledToday = template.recurring_active && recurringDays.includes(dayOfWeek);
          const hasLogToday = logs?.some(l => l.template_id === template.id);
          const isCompleted = completedTemplateIds.has(template.id);

          if ((isScheduledToday || hasLogToday) && !isCompleted && template.reminder_time) {
            pending.push({
              templateId: template.id,
              title: template.title,
              reminderTime: template.reminder_time.slice(0, 5),
            });
          }
        });

        setPendingReminders(pending);

        // Schedule notifications for each pending activity
        pending.forEach(reminder => scheduleReminder(reminder));

      } catch (error) {
        console.error('Error fetching pending activities:', error);
      }
    };

    fetchPendingActivities();

    // Cleanup timeouts on unmount
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, [user, hasPermission, scheduleReminder]);

  return {
    pendingReminders,
    hasPermission,
    requestPermission,
  };
}
