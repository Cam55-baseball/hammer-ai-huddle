import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CalendarEvent } from '@/hooks/useCalendar';
import { GamePlanTask } from '@/hooks/useGamePlan';
import { getActivityIcon } from '@/components/custom-activities';
import { CustomActivityTemplate, CustomActivityLog, CustomActivityWithLog } from '@/types/customActivity';
import { getAllCheckableIds } from '@/components/CustomActivityDetailDialog';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface UseCalendarActivityDetailReturn {
  selectedTask: GamePlanTask | null;
  taskTime: string | null;
  taskReminder: number | null;
  detailDialogOpen: boolean;
  loading: boolean;
  openActivityDetail: (event: CalendarEvent, date: Date) => Promise<void>;
  closeDetailDialog: () => void;
  handleComplete: () => Promise<void>;
  handleSaveTime: (time: string | null, reminder: number | null) => Promise<void>;
  handleToggleCheckbox: (fieldId: string, checked: boolean) => Promise<void>;
  navigateToSystemTask: (event: CalendarEvent) => void;
  quickComplete: (event: CalendarEvent, date: Date) => Promise<boolean>;
  refreshSelectedTask: () => Promise<void>;
  updateSelectedTaskOptimistically: (templateUpdates: Partial<CustomActivityTemplate>) => void;
}

// Route mappings for system tasks
const SYSTEM_TASK_ROUTES: Record<string, string> = {
  'nutrition': '/nutrition-hub',
  'quiz-morning': '/vault?tab=checkin&type=morning',
  'quiz-night': '/vault?tab=checkin&type=night',
  'quiz-prelift': '/vault?tab=checkin&type=pre_lift',
  'mindfuel': '/mind-fuel',
  'healthtip': '/health-tip',
  'texvision': '/tex-vision',
  'hydration': '/nutrition-hub?section=hydration',
  'iron_bambino': '/production-lab',
  'production_lab': '/production-lab',
  'heat_factory': '/production-studio',
  'production_studio': '/production-studio',
  'workout-hitting': '/production-lab',
  'workout-pitching': '/production-studio',
  'cycle': '/cycle-tracking',
  'speed-lab': '/speed-lab',
  'explosive-conditioning': '/explosive-conditioning',
};

export function useCalendarActivityDetail(
  onRefresh?: () => void
): UseCalendarActivityDetailReturn {
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState<GamePlanTask | null>(null);
  const [taskTime, setTaskTime] = useState<string | null>(null);
  const [taskReminder, setTaskReminder] = useState<number | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);

  const openActivityDetail = useCallback(async (event: CalendarEvent, date: Date) => {
    // Only handle custom_activity type with the detail dialog
    if (event.type !== 'custom_activity') {
      // For other types, navigate to the appropriate page
      navigateToSystemTask(event);
      return;
    }

    // Extract template ID from source (format: "template-{uuid}")
    const templateId = event.source?.replace('template-', '');
    if (!templateId) {
      toast.error('Activity not found');
      return;
    }

    setLoading(true);
    setCurrentDate(date);
    setCurrentTemplateId(templateId);

    try {
      // Fetch the full template from database
      const { data: template, error: templateError } = await supabase
        .from('custom_activity_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError || !template) {
        console.error('Error fetching template:', templateError);
        toast.error('Failed to load activity details');
        return;
      }

      // Fetch the log for this date if it exists
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data: log } = await supabase
        .from('custom_activity_logs')
        .select('*')
        .eq('template_id', templateId)
        .eq('entry_date', dateStr)
        .maybeSingle();

      // Construct the CustomActivityWithLog object
      const activityWithLog: CustomActivityWithLog = {
        template: template as unknown as CustomActivityTemplate,
        log: log as CustomActivityLog | undefined,
        isRecurring: (template.display_days as number[] | null)?.length ? true : false,
        isScheduledForToday: true,
      };

      // Get the icon component
      const IconComponent = getActivityIcon(template.icon || 'dumbbell');

      // Construct the GamePlanTask object
      const task: GamePlanTask = {
        id: `custom-${templateId}`,
        titleKey: template.title,
        descriptionKey: template.description || '',
        completed: log?.completed || false,
        icon: IconComponent,
        link: '',
        taskType: 'custom',
        section: 'custom',
        specialStyle: 'custom',
        customActivityData: activityWithLog,
      };

      // Get scheduled time from template
      setTaskTime(template.display_time || null);
      setTaskReminder(template.reminder_minutes || null);
      setSelectedTask(task);
      setDetailDialogOpen(true);
    } catch (err) {
      console.error('Error loading activity detail:', err);
      toast.error('Failed to load activity details');
    } finally {
      setLoading(false);
    }
  }, []);

  const navigateToSystemTask = useCallback((event: CalendarEvent) => {
    const source = event.source || '';
    const route = SYSTEM_TASK_ROUTES[source];
    
    if (route) {
      navigate(route);
    } else if (event.type === 'program' || event.type === 'game_plan') {
      // Try to match partial source names
      for (const [key, path] of Object.entries(SYSTEM_TASK_ROUTES)) {
        if (source.includes(key)) {
          navigate(path);
          return;
        }
      }
      // Default navigation based on type
      if (event.type === 'program') {
        navigate('/production-lab');
      }
    } else if (event.type === 'meal') {
      navigate('/nutrition-hub');
    } else if (event.type === 'athlete_event') {
      // Show info toast for athlete events
      toast.info(event.title, {
        description: event.description || undefined,
      });
    }
  }, [navigate]);

  const closeDetailDialog = useCallback(() => {
    setDetailDialogOpen(false);
    setSelectedTask(null);
    setCurrentTemplateId(null);
    setCurrentDate(null);
  }, []);

  const handleComplete = useCallback(async () => {
    if (!currentTemplateId || !currentDate || !selectedTask?.customActivityData) return;

    const template = selectedTask.customActivityData.template;
    const allCheckableIds = getAllCheckableIds(template);

    // If there are checkable items, toggle ALL checkboxes instead of manual complete
    if (allCheckableIds.length > 0) {
      const currentLog = selectedTask.customActivityData.log;
      const currentData = (currentLog?.performance_data as Record<string, unknown>) || {};
      const currentCheckboxStates = (currentData.checkboxStates as Record<string, boolean>) || {};
      
      // Determine target: if all checked → uncheck all, otherwise check all
      const allChecked = allCheckableIds.every(id => currentCheckboxStates[id] === true);
      const newCheckboxStates: Record<string, boolean> = {};
      allCheckableIds.forEach(id => { newCheckboxStates[id] = !allChecked; });
      const newPerformanceData = { ...currentData, checkboxStates: newCheckboxStates };
      // Derive locally for toast only — DB trigger handles completed/completed_at
      const derivedCompleted = !allChecked;

      try {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: existingLog } = await supabase
          .from('custom_activity_logs')
          .select('*')
          .eq('template_id', currentTemplateId)
          .eq('entry_date', dateStr)
          .maybeSingle();

        if (existingLog) {
          await supabase
            .from('custom_activity_logs')
            .update({ 
              performance_data: newPerformanceData,
            })
            .eq('id', existingLog.id);
        } else {
          await supabase
            .from('custom_activity_logs')
            .insert({
              template_id: currentTemplateId,
              user_id: user.id,
              entry_date: dateStr,
              performance_data: newPerformanceData,
            });
        }

        toast.success(derivedCompleted ? 'Activity completed' : 'Activity uncompleted');
        closeDetailDialog();
        onRefresh?.();
      } catch (err) {
        console.error('Error updating activity:', err);
        toast.error('Failed to update activity');
      }
      return;
    }

    // NO checkable items → treat as manual toggle (auto-complete edge case)
    try {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingLog } = await supabase
        .from('custom_activity_logs')
        .select('*')
        .eq('template_id', currentTemplateId)
        .eq('entry_date', dateStr)
        .maybeSingle();

      if (existingLog) {
        const newCompleted = !existingLog.completed;
        await supabase
          .from('custom_activity_logs')
          .update({ 
            completed: newCompleted,
            completed_at: newCompleted ? new Date().toISOString() : null,
          })
          .eq('id', existingLog.id);
      } else {
        await supabase
          .from('custom_activity_logs')
          .insert({
            template_id: currentTemplateId,
            user_id: user.id,
            entry_date: dateStr,
            completed: true,
            completed_at: new Date().toISOString(),
          });
      }

      toast.success('Activity updated');
      closeDetailDialog();
      onRefresh?.();
    } catch (err) {
      console.error('Error updating activity:', err);
      toast.error('Failed to update activity');
    }
  }, [currentTemplateId, currentDate, selectedTask, closeDetailDialog, onRefresh]);

  const handleSaveTime = useCallback(async (time: string | null, reminder: number | null) => {
    if (!currentTemplateId) return;

    try {
      await supabase
        .from('custom_activity_templates')
        .update({
          display_time: time,
          reminder_minutes: reminder,
        })
        .eq('id', currentTemplateId);

      setTaskTime(time);
      setTaskReminder(reminder);
      toast.success('Time saved');
      onRefresh?.();
    } catch (err) {
      console.error('Error saving time:', err);
      toast.error('Failed to save time');
    }
  }, [currentTemplateId, onRefresh]);

  const handleToggleCheckbox = useCallback(async (fieldId: string, checked: boolean) => {
    if (!currentTemplateId || !currentDate || !selectedTask?.customActivityData) return;

    // Store previous state for rollback
    const previousTask = selectedTask;
    const template = selectedTask.customActivityData.template;

    // Capture the merged state INSIDE the functional updater so back-to-back
    // clicks always operate on the latest in-memory checkboxStates and never
    // overwrite each other through a stale closure.
    let mergedPerformanceData: Record<string, unknown> | null = null;
    let derivedCompleted = false;
    const allCheckableIds = getAllCheckableIds(template);

    setSelectedTask(prev => {
      if (!prev?.customActivityData) return prev;
      const prevLog = prev.customActivityData.log;
      const prevPd = (prevLog?.performance_data as Record<string, unknown>) || {};
      const prevStates = (prevPd.checkboxStates as Record<string, boolean>) || {};
      const nextStates = { ...prevStates, [fieldId]: checked };
      const nextPd = { ...prevPd, checkboxStates: nextStates };

      mergedPerformanceData = nextPd;
      derivedCompleted = allCheckableIds.length > 0
        ? allCheckableIds.every(id => nextStates[id] === true)
        : (prevLog?.completed || false);

      return {
        ...prev,
        completed: derivedCompleted,
        customActivityData: {
          ...prev.customActivityData,
          log: prevLog
            ? { ...prevLog, performance_data: nextPd, completed: derivedCompleted } as CustomActivityLog
            : { id: 'pending', template_id: currentTemplateId, completed: derivedCompleted, performance_data: nextPd, entry_date: format(currentDate, 'yyyy-MM-dd') } as unknown as CustomActivityLog,
        },
      };
    });

    // PERSIST IN BACKGROUND — only send performance_data, trigger handles completed
    try {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get or create log
      let log = selectedTask.customActivityData.log;
      if (!log || (log as unknown as { id: string }).id === 'pending') {
        const { data: existingLog } = await supabase
          .from('custom_activity_logs')
          .select('*')
          .eq('template_id', currentTemplateId)
          .eq('entry_date', dateStr)
          .maybeSingle();

        if (existingLog) {
          log = existingLog as CustomActivityLog;
        } else {
          const { data: newLog } = await supabase
            .from('custom_activity_logs')
            .insert({
              template_id: currentTemplateId,
              user_id: user.id,
              entry_date: dateStr,
              performance_data: mergedPerformanceData ?? { checkboxStates: { [fieldId]: checked } },
            })
            .select()
            .single();
          log = newLog as CustomActivityLog;
        }
      }

      if (!log || !mergedPerformanceData) return;

      // Re-read the row and per-key merge checkboxStates against server state
      // so two near-simultaneous toggles cannot trample each other.
      const { data: latest } = await supabase
        .from('custom_activity_logs')
        .select('performance_data')
        .eq('id', log.id)
        .maybeSingle();
      const serverPd = ((latest?.performance_data as Record<string, unknown> | null) || {});
      const serverStates = (serverPd.checkboxStates as Record<string, boolean>) || {};
      const mergedStates = (mergedPerformanceData.checkboxStates as Record<string, boolean>) || {};
      const finalPd: Record<string, unknown> = {
        ...serverPd,
        ...mergedPerformanceData,
        checkboxStates: { ...serverStates, ...mergedStates },
      };

      await supabase
        .from('custom_activity_logs')
        .update({
          performance_data: finalPd,
        })
        .eq('id', log.id);

      // Trigger game plan refresh so completion propagates
      onRefresh?.();

    } catch (err) {
      console.error('Error toggling checkbox:', err);
      // ROLLBACK on error
      setSelectedTask(previousTask);
      toast.error('Failed to save');
    }
  }, [currentTemplateId, currentDate, selectedTask, onRefresh]);

  // Quick complete for calendar cards without opening detail dialog
  // For activities WITH checklist items, this checks all items; for those without, it toggles completion
  const quickComplete = useCallback(async (event: CalendarEvent, date: Date): Promise<boolean> => {
    if (event.type !== 'custom_activity') return false;

    const templateId = event.source?.replace('template-', '');
    if (!templateId) return false;

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Fetch template to check for checkable items
      const { data: template } = await supabase
        .from('custom_activity_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      const allCheckableIds = template ? getAllCheckableIds(template as unknown as CustomActivityTemplate) : [];

      // Check for existing log
      const { data: existingLog } = await supabase
        .from('custom_activity_logs')
        .select('*')
        .eq('template_id', templateId)
        .eq('entry_date', dateStr)
        .maybeSingle();

      if (allCheckableIds.length > 0) {
        // Has checklist items → toggle all checkboxes
        const currentData = (existingLog?.performance_data as Record<string, unknown>) || {};
        const currentCheckboxStates = (currentData.checkboxStates as Record<string, boolean>) || {};
        const allChecked = allCheckableIds.every(id => currentCheckboxStates[id] === true);
        const newCheckboxStates: Record<string, boolean> = {};
        allCheckableIds.forEach(id => { newCheckboxStates[id] = !allChecked; });
        const newPerformanceData = { ...currentData, checkboxStates: newCheckboxStates };

        if (existingLog) {
          await supabase
            .from('custom_activity_logs')
            .update({
              performance_data: newPerformanceData,
            })
            .eq('id', existingLog.id);
        } else {
          await supabase
            .from('custom_activity_logs')
            .insert({
              template_id: templateId,
              user_id: user.id,
              entry_date: dateStr,
              performance_data: newPerformanceData,
            });
        }
      } else {
        // No checklist items → simple toggle
        if (existingLog) {
          const newCompleted = !existingLog.completed;
          await supabase
            .from('custom_activity_logs')
            .update({
              completed: newCompleted,
              completed_at: newCompleted ? new Date().toISOString() : null,
            })
            .eq('id', existingLog.id);
        } else {
          await supabase
            .from('custom_activity_logs')
            .insert({
              template_id: templateId,
              user_id: user.id,
              entry_date: dateStr,
              completed: true,
              completed_at: new Date().toISOString(),
            });
        }
      }

      onRefresh?.();
      return true;
    } catch (err) {
      console.error('Error quick completing activity:', err);
      return false;
    }
  }, [onRefresh]);

  // Refresh selectedTask with fresh data from database
  const refreshSelectedTask = useCallback(async () => {
    if (!currentTemplateId) return;
    
    try {
      const { data: template } = await supabase
        .from('custom_activity_templates')
        .select('*')
        .eq('id', currentTemplateId)
        .single();
        
      if (!template || !selectedTask) return;
      
      setSelectedTask({
        ...selectedTask,
        customActivityData: {
          ...selectedTask.customActivityData!,
          template: template as unknown as CustomActivityTemplate,
        },
      });
    } catch (err) {
      console.error('Error refreshing task:', err);
    }
  }, [currentTemplateId, selectedTask]);

  // Optimistically update template data without database fetch
  const updateSelectedTaskOptimistically = useCallback((templateUpdates: Partial<CustomActivityTemplate>) => {
    if (!selectedTask?.customActivityData?.template) return;
    
    setSelectedTask({
      ...selectedTask,
      customActivityData: {
        ...selectedTask.customActivityData,
        template: {
          ...selectedTask.customActivityData.template,
          ...templateUpdates,
        },
      },
    });
  }, [selectedTask]);

  return {
    selectedTask,
    taskTime,
    taskReminder,
    detailDialogOpen,
    loading,
    openActivityDetail,
    closeDetailDialog,
    handleComplete,
    handleSaveTime,
    handleToggleCheckbox,
    navigateToSystemTask,
    quickComplete,
    refreshSelectedTask,
    updateSelectedTaskOptimistically,
  };
}
