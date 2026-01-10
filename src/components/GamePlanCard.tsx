import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, Target, Clock, Trophy, Zap, Plus, ArrowUpDown, GripVertical, Star, Pencil, Utensils, CalendarDays, Lock, Unlock, Save, Bell, BellOff, Trash2, ChevronDown, ChevronUp, Eye, X, Undo2 } from 'lucide-react';
import { getTodayDate } from '@/utils/dateUtils';
import { CustomActivityDetailDialog, getAllCheckableIds } from '@/components/CustomActivityDetailDialog';
import { TimeSettingsDrawer } from '@/components/TimeSettingsDrawer';
import { SystemTaskScheduleDrawer } from '@/components/SystemTaskScheduleDrawer';
import { useSystemTaskSchedule } from '@/hooks/useSystemTaskSchedule';
import { useGamePlan, GamePlanTask } from '@/hooks/useGamePlan';
import { useCustomActivities } from '@/hooks/useCustomActivities';
import { useRecapCountdown } from '@/hooks/useRecapCountdown';
import { QuickNutritionLogDialog } from '@/components/QuickNutritionLogDialog';
import { VaultFocusQuizDialog } from '@/components/vault/VaultFocusQuizDialog';
import { WeeklyWellnessQuizDialog } from '@/components/vault/WeeklyWellnessQuizDialog';
import { CustomActivityBuilderDialog, QuickAddFavoritesDrawer, getActivityIcon } from '@/components/custom-activities';
import { GamePlanCalendarView } from '@/components/GamePlanCalendarView';
import { useVault } from '@/hooks/useVault';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useUserColors, hexToRgba } from '@/hooks/useUserColors';
import { useAutoScrollOnDrag } from '@/hooks/useAutoScrollOnDrag';
import { useScheduleTemplates, ScheduleItem } from '@/hooks/useScheduleTemplates';
import { useDailySummaryNotification } from '@/hooks/useDailySummaryNotification';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CustomActivityTemplate } from '@/types/customActivity';
import { CustomField } from '@/types/customActivity';
import { triggerCelebration } from '@/lib/confetti';
import { format, addDays, startOfWeek, isSameDay, getDay } from 'date-fns';

interface GamePlanCardProps {
  selectedSport: 'baseball' | 'softball';
}

// Stable constant to avoid new array instances triggering re-renders
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function GamePlanCard({ selectedSport }: GamePlanCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tasks, customActivities, completedCount, totalCount, loading, refetch } = useGamePlan(selectedSport);
  const { daysUntilRecap, recapProgress } = useRecapCountdown();
  const { getFavorites, toggleComplete, addToToday, templates, todayLogs, createTemplate, updateTemplate, deleteTemplate: deleteActivityTemplate, updateLogPerformanceData, ensureLogExists, refetch: refetchActivities } = useCustomActivities(selectedSport);
  const { getEffectiveColors } = useUserColors(selectedSport);
  const colors = useMemo(() => getEffectiveColors(), [getEffectiveColors]);
  const isSoftball = selectedSport === 'softball';
  const { saveFocusQuiz } = useVault();
  
  // System task schedule hook
  const { schedules: taskSchedules, saveSchedule: saveTaskSchedule, getSchedule, getScheduledOffTaskIds, isScheduledForToday } = useSystemTaskSchedule();
  
  // Schedule templates hook
  const { templates: scheduleTemplates, saveTemplate, deleteTemplate, getDefaultTemplate } = useScheduleTemplates();
  
  // Daily summary notification hook
  const { 
    enabled: dailySummaryEnabled, 
    summaryTime: dailySummaryTime, 
    setEnabled: setDailySummaryEnabled, 
    setSummaryTime: setDailySummaryTime,
    scheduleDailySummary,
    requestPermission: requestNotificationPermission,
    isSupported: notificationsSupported
  } = useDailySummaryNotification();
  
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [wellnessQuizOpen, setWellnessQuizOpen] = useState(false);
  const [activeQuizType, setActiveQuizType] = useState<'pre_lift' | 'night' | 'morning'>('morning');
  const [sortMode, setSortMode] = useState<'auto' | 'manual' | 'timeline'>(() => {
    const stored = localStorage.getItem('gameplan-sort-mode');
    if (stored === 'manual' || stored === 'timeline') return stored;
    return 'auto';
  });
  const autoSort = sortMode === 'auto';
  
  // View mode: today or calendar
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Task times and reminders (stored in localStorage)
  const [taskTimes, setTaskTimes] = useState<Record<string, string | null>>(() => {
    try {
      const stored = localStorage.getItem('gameplan-task-times');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const [taskReminders, setTaskReminders] = useState<Record<string, number | null>>(() => {
    try {
      const stored = localStorage.getItem('gameplan-task-reminders');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  
  // Lock order state with day selection for "this week"
  const [orderLocked, setOrderLocked] = useState<'day' | 'week' | null>(() => {
    try {
      const stored = localStorage.getItem('gameplan-order-lock');
      if (!stored) return null;
      const { type, expires, days } = JSON.parse(stored);
      if (new Date(expires) < new Date()) {
        localStorage.removeItem('gameplan-order-lock');
        return null;
      }
      // For week lock, check if today is in the selected days
      if (type === 'week' && days) {
        const todayDayOfWeek = getDay(new Date());
        if (!days.includes(todayDayOfWeek)) {
          return null; // Lock doesn't apply today
        }
      }
      return type;
    } catch { return null; }
  });
  
  // Selected days for week lock (0=Sunday, 1=Monday, ... 6=Saturday)
  const [lockDays, setLockDays] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('gameplan-order-lock');
      if (!stored) return [1, 2, 3, 4, 5]; // Default to weekdays
      const { days } = JSON.parse(stored);
      return days || [1, 2, 3, 4, 5];
    } catch { return [1, 2, 3, 4, 5]; }
  });
  
  // Day picker dialog for "Lock for This Week"
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  
  // Template dialogs
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  
  // Daily summary settings popover
  const [dailySummaryPopoverOpen, setDailySummaryPopoverOpen] = useState(false);
  
  // Time picker popover state
  const [activeTimePickerTaskId, setActiveTimePickerTaskId] = useState<string | null>(null);
  const [tempTime, setTempTime] = useState('');
  const [tempReminder, setTempReminder] = useState<number | null>(null);
  
  // System task schedule drawer state
  const [activeScheduleTaskId, setActiveScheduleTaskId] = useState<string | null>(null);
  
  // Custom activity state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [favoritesDrawerOpen, setFavoritesDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomActivityTemplate | null>(null);
  const [presetActivityType, setPresetActivityType] = useState<'meal' | null>(null);
  
  // Custom activity detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCustomTask, setSelectedCustomTask] = useState<GamePlanTask | null>(null);
  
  // Inline time picker state (for non-timeline modes)
  const [expandedTimeTaskId, setExpandedTimeTaskId] = useState<string | null>(null);
  
  // State for ordered tasks per section
  const [orderedCheckin, setOrderedCheckin] = useState<GamePlanTask[]>([]);
  const [orderedTraining, setOrderedTraining] = useState<GamePlanTask[]>([]);
  const [orderedTracking, setOrderedTracking] = useState<GamePlanTask[]>([]);
  const [orderedCustom, setOrderedCustom] = useState<GamePlanTask[]>([]);
  
  // Timeline mode: single unified list for complete control
  const [timelineTasks, setTimelineTasks] = useState<GamePlanTask[]>([]);
  
  // Skipped tasks state (load management)
  const [skippedTasks, setSkippedTasks] = useState<Set<string>>(new Set());
  const [showSkippedSection, setShowSkippedSection] = useState(false);
  const { user } = useAuth();
  
  const favorites = useMemo(() => getFavorites(), [getFavorites, templates]);
  
  // Auto-scroll for drag and drop
  const { onDragStart, onDragEnd, handleDrag } = useAutoScrollOnDrag();
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  }).toUpperCase();

  const allComplete = completedCount === totalCount && totalCount > 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Create stable dependency key to prevent infinite loops
  const tasksKey = JSON.stringify(tasks.map(t => ({ id: t.id, section: t.section, completed: t.completed })));

  // Save task times and reminders to localStorage
  useEffect(() => {
    localStorage.setItem('gameplan-task-times', JSON.stringify(taskTimes));
  }, [taskTimes]);
  
  useEffect(() => {
    localStorage.setItem('gameplan-task-reminders', JSON.stringify(taskReminders));
  }, [taskReminders]);

  // Fetch skipped tasks for today (using imported getTodayDate from utils/dateUtils)
  
  useEffect(() => {
    const fetchSkippedTasks = async () => {
      if (!user) return;
      
      const today = getTodayDate();
      const { data, error } = await supabase
        .from('game_plan_skipped_tasks')
        .select('task_id')
        .eq('user_id', user.id)
        .eq('skip_date', today);
      
      if (!error && data) {
        setSkippedTasks(new Set(data.map(d => d.task_id)));
      }
    };
    
    fetchSkippedTasks();
  }, [user]);
  
  // Skip task handler (load management)
  const handleSkipTask = async (taskId: string) => {
    if (!user) return;
    
    // Optimistic UI update
    setSkippedTasks(prev => new Set([...prev, taskId]));
    
    const today = getTodayDate();
    const { error } = await supabase
      .from('game_plan_skipped_tasks')
      .upsert({
        user_id: user.id,
        task_id: taskId,
        skip_date: today,
      }, { onConflict: 'user_id,task_id,skip_date' });
    
    if (error) {
      console.error('Error skipping task:', error);
      // Rollback on error
      setSkippedTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      toast.error(t('gamePlan.skipError', 'Failed to skip task'));
    } else {
      toast.success(t('gamePlan.taskSkipped', 'Task skipped for today'));
    }
  };
  
  // Restore skipped task handler
  const handleRestoreTask = async (taskId: string) => {
    if (!user) return;
    
    // Optimistic UI update
    setSkippedTasks(prev => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    
    const today = getTodayDate();
    const { error } = await supabase
      .from('game_plan_skipped_tasks')
      .delete()
      .eq('user_id', user.id)
      .eq('task_id', taskId)
      .eq('skip_date', today);
    
    if (error) {
      console.error('Error restoring task:', error);
      // Rollback on error
      setSkippedTasks(prev => new Set([...prev, taskId]));
      toast.error(t('gamePlan.restoreError', 'Failed to restore task'));
    } else {
      toast.success(t('gamePlan.taskRestored', 'Task restored'));
    }
  };

  // Auto-populate task times from template reminder settings for custom activities
  useEffect(() => {
    const allTasks = [...tasks];
    const customTasks = allTasks.filter(
      t => t.taskType === 'custom' && t.customActivityData?.template
    );
    
    if (customTasks.length === 0) return;
    
    let updated = false;
    const newTimes = { ...taskTimes };
    const newReminders = { ...taskReminders };
    
    customTasks.forEach(task => {
      const template = task.customActivityData?.template;
      if (template?.reminder_enabled && template?.reminder_time && !taskTimes[task.id]) {
        // Format reminder_time (HH:MM:SS) to HH:MM for the time picker
        const timeValue = template.reminder_time.split(':').slice(0, 2).join(':');
        newTimes[task.id] = timeValue;
        // Default to 10 minutes before if reminder is enabled
        if (!taskReminders[task.id]) {
          newReminders[task.id] = 10;
        }
        updated = true;
      }
    });
    
    if (updated) {
      setTaskTimes(newTimes);
      setTaskReminders(newReminders);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);
  
  // Schedule daily summary notification when enabled
  useEffect(() => {
    if (dailySummaryEnabled && tasks.length > 0) {
      const scheduledActivities = tasks
        .filter(task => taskTimes[task.id])
        .map(task => ({
          id: task.id,
          title: task.taskType === 'custom' ? task.titleKey : t(task.titleKey),
          startTime: taskTimes[task.id] || null,
          reminderMinutes: taskReminders[task.id] || null,
        }));
      scheduleDailySummary(scheduledActivities);
    }
  }, [dailySummaryEnabled, tasks, taskTimes, taskReminders, scheduleDailySummary]);

  // Sync ordered tasks with fetched tasks and restore saved order
  useEffect(() => {
    const checkinTasksList = tasks.filter(t => t.section === 'checkin');
    const trainingTasksList = tasks.filter(t => t.section === 'training');
    const trackingTasksList = tasks.filter(t => t.section === 'tracking');
    const customTasksList = tasks.filter(t => t.section === 'custom');

    // Restore saved orders helper
    const restoreOrder = (sectionTasks: GamePlanTask[], storageKey: string): GamePlanTask[] => {
      const savedOrder = localStorage.getItem(storageKey);
      if (savedOrder) {
        try {
          const orderIds = JSON.parse(savedOrder) as string[];
          return [...sectionTasks].sort((a, b) => {
            const aIdx = orderIds.indexOf(a.id);
            const bIdx = orderIds.indexOf(b.id);
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          });
        } catch {
          return sectionTasks;
        }
      }
      return sectionTasks;
    };

    if (sortMode === 'timeline') {
      // Timeline mode: single unified list
      const savedTimelineOrder = localStorage.getItem('gameplan-timeline-order');
      if (savedTimelineOrder) {
        try {
          const orderIds = JSON.parse(savedTimelineOrder) as string[];
          const allTasks = [...tasks].sort((a, b) => {
            const aIdx = orderIds.indexOf(a.id);
            const bIdx = orderIds.indexOf(b.id);
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          });
          setTimelineTasks(allTasks);
        } catch {
          setTimelineTasks([...tasks]);
        }
      } else {
        setTimelineTasks([...tasks]);
      }
    } else if (sortMode === 'manual') {
      setOrderedCheckin(restoreOrder(checkinTasksList, 'gameplan-checkin-order'));
      setOrderedTraining(restoreOrder(trainingTasksList, 'gameplan-training-order'));
      setOrderedTracking(restoreOrder(trackingTasksList, 'gameplan-tracking-order'));
      setOrderedCustom(restoreOrder(customTasksList, 'gameplan-custom-order'));
    } else {
      setOrderedCheckin(checkinTasksList);
      setOrderedTraining(trainingTasksList);
      setOrderedTracking(trackingTasksList);
      setOrderedCustom(customTasksList);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksKey, sortMode]);

  const handleTaskClick = (task: GamePlanTask) => {
    // Handle custom activities - open detail dialog
    if (task.taskType === 'custom' && task.customActivityData) {
      setSelectedCustomTask(task);
      setDetailDialogOpen(true);
      return;
    }

    // Handle mindfuel and healthtip - navigate directly
    if (task.id === 'mindfuel' || task.id === 'healthtip') {
      navigate(task.link);
      return;
    }

    // Handle Tex Vision - navigate directly
    if (task.id === 'texvision') {
      navigate(task.link);
      return;
    }

    // Handle quiz tasks - open dialog directly
    if (task.taskType === 'quiz') {
      if (task.id === 'quiz-morning') {
        setActiveQuizType('morning');
        setQuizDialogOpen(true);
      } else if (task.id === 'quiz-prelift') {
        setActiveQuizType('pre_lift');
        setQuizDialogOpen(true);
      } else if (task.id === 'quiz-night') {
        setActiveQuizType('night');
        setQuizDialogOpen(true);
      }
      return;
    }

    // Handle tracking tasks - navigate to vault with section param or open dialog
    if (task.taskType === 'tracking') {
      if (task.id === 'tracking-wellness-goals') {
        setWellnessQuizOpen(true);
        return;
      }
      navigate(task.link);
      return;
    }

    // Handle nutrition task - navigate to vault with nutrition section
    if (task.taskType === 'nutrition') {
      navigate('/vault?openSection=nutrition');
      return;
    }

    // Default: navigate to task link
    navigate(task.link);
  };

  const handleQuickLogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickLogOpen(true);
  };

  const handleQuizSubmit = async (data: any) => {
    const result = await saveFocusQuiz(activeQuizType, data);
    if (result.success) {
      toast.success(t('vault.quiz.saved'));
      refetch();
    } else {
      toast.error(t('vault.quiz.error'));
    }
    return result;
  };

  // Sort helper: incomplete tasks first, completed tasks at bottom (preserves relative order)
  const sortByCompletion = (tasksList: GamePlanTask[]) => 
    [...tasksList].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));
  
  // Sort timeline tasks with completed at bottom (preserves relative order within each group)
  const sortTimelineByCompletion = useCallback((tasksList: GamePlanTask[]) => {
    const incomplete = tasksList.filter(t => !t.completed);
    const completed = tasksList.filter(t => t.completed);
    return [...incomplete, ...completed];
  }, []);

  const cycleSortMode = () => {
    if (orderLocked) {
      toast.error(t('gamePlan.lockOrder.locked'));
      return;
    }
    const modes: ('auto' | 'manual' | 'timeline')[] = ['auto', 'manual', 'timeline'];
    const currentIdx = modes.indexOf(sortMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    setSortMode(nextMode);
    localStorage.setItem('gameplan-sort-mode', nextMode);
  };

  const handleReorderTimeline = (newOrder: GamePlanTask[]) => {
    if (orderLocked) return;
    setTimelineTasks(newOrder);
    localStorage.setItem('gameplan-timeline-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  const handleReorderCheckin = (newOrder: GamePlanTask[]) => {
    if (orderLocked) return;
    setOrderedCheckin(newOrder);
    localStorage.setItem('gameplan-checkin-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  const handleReorderTraining = (newOrder: GamePlanTask[]) => {
    if (orderLocked) return;
    setOrderedTraining(newOrder);
    localStorage.setItem('gameplan-training-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  const handleReorderTracking = (newOrder: GamePlanTask[]) => {
    if (orderLocked) return;
    setOrderedTracking(newOrder);
    localStorage.setItem('gameplan-tracking-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  const handleReorderCustom = (newOrder: GamePlanTask[]) => {
    if (orderLocked) return;
    setOrderedCustom(newOrder);
    localStorage.setItem('gameplan-custom-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  // Custom activity handlers
  const handleCustomActivityToggle = async (task: GamePlanTask) => {
    if (task.customActivityData) {
      const success = await toggleComplete(task.customActivityData.template.id);
      if (success) {
        // In timeline mode, re-sort to move completed to bottom
        if (sortMode === 'timeline') {
          const updatedTasks = timelineTasks.map(t => 
            t.id === task.id ? { ...t, completed: !t.completed } : t
          );
          const sorted = sortTimelineByCompletion(updatedTasks);
          setTimelineTasks(sorted);
          localStorage.setItem('gameplan-timeline-order', JSON.stringify(sorted.map(t => t.id)));
        }
        refetch();
        toast.success(task.completed ? t('customActivity.unmarkedComplete') : t('customActivity.markedComplete'));
      }
    }
  };

  const handleCustomActivityEdit = (task: GamePlanTask) => {
    if (task.customActivityData) {
      setEditingTemplate(task.customActivityData.template);
      setBuilderOpen(true);
    }
  };

  const handleAddFavoriteToToday = async (templateId: string) => {
    const success = await addToToday(templateId);
    if (success) {
      refetch();
      toast.success(t('customActivity.addedToToday'));
    }
  };
  
  // Time picker handlers
  const openTimePicker = (taskId: string) => {
    setActiveTimePickerTaskId(taskId);
    setTempTime(taskTimes[taskId] || '');
    setTempReminder(taskReminders[taskId] || null);
  };
  
  const saveTime = () => {
    if (activeTimePickerTaskId) {
      setTaskTimes(prev => ({ ...prev, [activeTimePickerTaskId]: tempTime || null }));
      setTaskReminders(prev => ({ ...prev, [activeTimePickerTaskId]: tempReminder }));
      setActiveTimePickerTaskId(null);
    }
  };
  
  const removeTime = (taskId: string) => {
    setTaskTimes(prev => ({ ...prev, [taskId]: null }));
    setTaskReminders(prev => ({ ...prev, [taskId]: null }));
    setActiveTimePickerTaskId(null);
  };
  
  // Lock order handlers
  const handleLockOrder = (type: 'day' | 'week') => {
    if (type === 'week') {
      // Open day picker dialog for week lock
      setDayPickerOpen(true);
      return;
    }
    
    const expires = new Date(new Date().setHours(23, 59, 59, 999));
    localStorage.setItem('gameplan-order-lock', JSON.stringify({ type, expires: expires.toISOString() }));
    setOrderLocked(type);
    toast.success(t('gamePlan.lockOrder.locked'));
  };
  
  const handleConfirmWeekLock = () => {
    if (lockDays.length === 0) {
      toast.error(t('gamePlan.lockOrder.selectAtLeastOne'));
      return;
    }
    
    const expires = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7);
    localStorage.setItem('gameplan-order-lock', JSON.stringify({ 
      type: 'week', 
      expires: expires.toISOString(),
      days: lockDays 
    }));
    setOrderLocked('week');
    setDayPickerOpen(false);
    toast.success(t('gamePlan.lockOrder.locked'));
  };
  
  const toggleLockDay = (day: number) => {
    setLockDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };
  
  const handleUnlockOrder = () => {
    localStorage.removeItem('gameplan-order-lock');
    setOrderLocked(null);
    toast.success(t('gamePlan.lockOrder.unlocked'));
  };
  
  // Template handlers
  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) return;
    
    const schedule: ScheduleItem[] = timelineTasks.map(t => ({
      taskId: t.id,
      startTime: taskTimes[t.id] || null,
      reminderMinutes: taskReminders[t.id] || null,
    }));
    
    const success = await saveTemplate(newTemplateName, schedule, setAsDefault);
    if (success) {
      setSaveTemplateOpen(false);
      setNewTemplateName('');
      setSetAsDefault(false);
    }
  };
  
  const handleApplyTemplate = (template: { schedule: ScheduleItem[] }) => {
    // Apply order
    const orderedIds = template.schedule.map(s => s.taskId);
    const newOrderedTasks = [...tasks].sort((a, b) => {
      const aIdx = orderedIds.indexOf(a.id);
      const bIdx = orderedIds.indexOf(b.id);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
    setTimelineTasks(newOrderedTasks);
    localStorage.setItem('gameplan-timeline-order', JSON.stringify(orderedIds));
    
    // Apply times and reminders
    const newTimes: Record<string, string | null> = {};
    const newReminders: Record<string, number | null> = {};
    template.schedule.forEach(s => {
      newTimes[s.taskId] = s.startTime;
      newReminders[s.taskId] = s.reminderMinutes;
    });
    setTaskTimes(newTimes);
    setTaskReminders(newReminders);
    
    setApplyTemplateOpen(false);
    toast.success(t('gamePlan.scheduleTemplate.applySuccess'));
  };
  
  // Format time for display
  const formatTimeDisplay = (time: string | null) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  // Get scheduled-off task IDs (tasks not scheduled for today)
  const scheduledOffTaskIds = useMemo(() => getScheduledOffTaskIds(), [getScheduledOffTaskIds]);

  // Get display tasks based on sort mode, filtering out skipped AND scheduled-off tasks
  const filterSkippedAndScheduledOff = (taskList: GamePlanTask[]) => 
    taskList.filter(t => !skippedTasks.has(t.id) && !scheduledOffTaskIds.has(t.id));
  const checkinTasks = filterSkippedAndScheduledOff(autoSort ? sortByCompletion(orderedCheckin) : orderedCheckin);
  const trainingTasks = filterSkippedAndScheduledOff(autoSort ? sortByCompletion(orderedTraining) : orderedTraining);
  const trackingTasks = filterSkippedAndScheduledOff(autoSort ? sortByCompletion(orderedTracking) : orderedTracking);
  const customTasks = filterSkippedAndScheduledOff(autoSort ? sortByCompletion(orderedCustom) : orderedCustom);
  
  // Get all tasks for skipped section - include timeline tasks when in that mode
  const allTasks = sortMode === 'timeline' 
    ? timelineTasks 
    : [...orderedCheckin, ...orderedTraining, ...orderedTracking, ...orderedCustom];
  
  // Skipped tasks: manually skipped OR scheduled off for today
  const skippedTasksList = allTasks.filter(t => skippedTasks.has(t.id) || scheduledOffTaskIds.has(t.id));

  const renderTask = (task: GamePlanTask, index?: number) => {
    const Icon = task.icon;
    const isIncomplete = !task.completed;
    const isTracking = task.section === 'tracking';
    const isTexVision = task.specialStyle === 'tex-vision';
    const isCustom = task.specialStyle === 'custom';
    const showTimelineNumber = sortMode === 'timeline' && typeof index === 'number';
    const taskTime = taskTimes[task.id];
    const hasReminder = taskReminders[task.id];
    
    // Get dynamic colors based on task type
    const pendingColors = colors.gamePlan.pending;
    const trackingColors = colors.gamePlan.tracking;
    const texVisionColors = colors.gamePlan.texVision;
    
    // Custom activity uses its own color
    const customColor = task.customActivityData?.template.color || '#10b981';
    const customColors = {
      background: hexToRgba(customColor, 0.15),
      border: hexToRgba(customColor, 0.5),
      icon: customColor,
      text: '#fff',
    };
    
    // Determine which color set to use for pending tasks
    const activeColors = isCustom ? customColors : isTexVision ? texVisionColors : isTracking ? trackingColors : pendingColors;
    
    const showTimeBadge = sortMode === 'timeline' && taskTime;
    
    return (
      <div
        className={cn(
          "group relative w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-200",
          "border-2",
          task.completed && "bg-green-500/20 border-green-500/50",
          showTimeBadge && "pt-8"
        )}
        style={!task.completed ? {
          backgroundColor: activeColors.background,
          borderColor: activeColors.border,
          animation: 'game-plan-pulse-custom 2s ease-in-out infinite',
        } : undefined}
      >
        {/* Time badge - positioned absolutely at top right with proper spacing */}
        {showTimeBadge && (
          <button
            className="absolute top-1.5 right-12 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 border border-primary/30 text-[10px] font-bold text-primary hover:bg-primary/30 transition-colors shadow-sm"
            onClick={(e) => { e.stopPropagation(); openTimePicker(task.id); }}
          >
            <Clock className="h-2.5 w-2.5" />
            {formatTimeDisplay(taskTime)}
            {hasReminder && <Bell className="h-2.5 w-2.5 text-yellow-400" />}
          </button>
        )}
        
        {/* Drag handle - visible in manual and timeline modes (disabled when locked) */}
        {(sortMode === 'manual' || sortMode === 'timeline') && (
          <div className={cn(
            "flex-shrink-0 text-white/60",
            orderLocked ? "opacity-30" : "cursor-grab active:cursor-grabbing hover:text-white"
          )}>
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        
        {/* Clickable main area */}
        <button
          onClick={() => handleTaskClick(task)}
          className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
        >
          {/* Icon */}
          <div 
            className={cn(
              "flex-shrink-0 p-2 sm:p-2.5 rounded-lg",
              task.completed && "bg-green-500"
            )}
            style={!task.completed ? { backgroundColor: activeColors.icon } : undefined}
          >
            <Icon className={cn(
              "h-5 w-5 sm:h-6 sm:w-6",
              task.completed ? "text-white" : "text-white"
            )} />
          </div>
          
          {/* Content */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className={cn(
                "text-sm sm:text-base line-clamp-2",
                task.completed 
                  ? "font-semibold text-white/50 line-through" 
                  : "font-black text-white"
              )}>
                {task.taskType === 'custom' ? task.titleKey : t(task.titleKey)}
              </h3>
              {isCustom && !task.completed && (
                <span 
                  className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-white animate-pulse"
                >
                  {t('customActivity.badge')}
                </span>
              )}
              {isCustom && task.completed && (
                <span 
                  className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-white/10 text-white/60"
                >
                  <Eye className="h-3 w-3" />
                  {t('customActivity.tapToView', 'View')}
                </span>
              )}
              {task.badge && !task.completed && (
                <span 
                  className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                  style={{
                    backgroundColor: hexToRgba(activeColors.icon, 0.3),
                    color: activeColors.text,
                  }}
                >
                  {t(task.badge)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-xs sm:text-sm line-clamp-1",
                task.completed ? "text-white/40" : "text-white/70"
              )}>
                {task.taskType === 'custom' ? (task.descriptionKey || t(`customActivity.types.${task.customActivityData?.template.activity_type}`)) : t(task.descriptionKey)}
              </p>
            </div>
          </div>
        </button>
        
        {/* Edit button - opens schedule drawer for system tasks, activity editor for custom */}
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
          onClick={(e) => { 
            e.stopPropagation(); 
            if (isCustom) {
              // For custom activities, open the activity editor
              handleCustomActivityEdit(task);
            } else {
              // For system tasks, check auth first
              if (!user) {
                toast.error(t('gamePlan.taskSchedule.signInRequired', 'Please sign in to edit schedule'));
                navigate('/auth');
                return;
              }
              setActiveScheduleTaskId(task.id);
            }
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        
        {/* Status indicator - clickable for custom activities with prominent styling */}
        <button
          onClick={(e) => { e.stopPropagation(); if (isCustom) handleCustomActivityToggle(task); }}
          disabled={!isCustom}
          className={cn(
            "flex-shrink-0 rounded-full flex items-center justify-center transition-all",
            task.completed && "bg-green-500 text-white",
            isCustom && !task.completed && "hover:scale-110 cursor-pointer",
            // Larger touch target for custom activities
            isCustom ? "h-10 w-10 sm:h-11 sm:w-11" : "h-7 w-7 sm:h-8 sm:w-8"
          )}
          style={!task.completed ? { 
            border: `3px ${isCustom ? 'solid' : 'dashed'} ${activeColors.border}`,
            backgroundColor: isCustom ? hexToRgba(customColor, 0.2) : undefined,
          } : undefined}
          title={isCustom ? (task.completed ? t('customActivity.unmarkedComplete') : t('customActivity.detail.markComplete')) : undefined}
        >
          {task.completed ? (
            <Check className={cn(
              isCustom ? "h-5 w-5 sm:h-6 sm:w-6" : "h-4 w-4 sm:h-5 sm:w-5"
            )} />
          ) : isCustom ? (
            <Check 
              className="h-5 w-5 sm:h-6 sm:w-6"
              style={{ color: activeColors.icon }}
            />
          ) : (
            <Zap 
              className="h-3 w-3 sm:h-4 sm:w-4 animate-pulse"
              style={{ color: activeColors.icon }}
            />
          )}
        </button>

        {/* Urgency indicator for incomplete tasks */}
        {isIncomplete && (
          <div 
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full border"
            style={{
              backgroundColor: hexToRgba(activeColors.icon, 0.2),
              borderColor: hexToRgba(activeColors.icon, 0.4),
            }}
          >
            <span 
              className="text-[10px] font-black uppercase tracking-wider"
              style={{ color: activeColors.text }}
            >
              {t('gamePlan.doIt')}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderTaskSection = (
    sectionTasks: GamePlanTask[], 
    orderedTasks: GamePlanTask[],
    onReorder: (newOrder: GamePlanTask[]) => void,
    title: string,
    titleColor: string,
    lineColor: string,
    showQuickAction?: boolean
  ) => {
    if (sectionTasks.length === 0) return null;

    return (
      <div className="space-y-2">
        <h3 className={`text-xs font-black ${titleColor} uppercase tracking-widest flex items-center gap-2`}>
          <span className={`h-px flex-1 ${lineColor}`} />
          {title}
          <span className={`h-px flex-1 ${lineColor}`} />
        </h3>
        
        {showQuickAction && (
          <div className="flex justify-center pb-1">
            <Button
              size="sm"
              onClick={handleQuickLogClick}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              <Plus className="h-4 w-4" />
              {t('gamePlan.quickActions.logMeal')}
            </Button>
          </div>
        )}
        
        {sortMode === 'auto' ? (
          <div className="space-y-2">
            {sectionTasks.map((task) => (
              <div key={task.id}>
                {renderTask(task)}
              </div>
            ))}
          </div>
        ) : sortMode === 'manual' ? (
          <Reorder.Group axis="y" values={orderedTasks} onReorder={onReorder} className="space-y-2">
            {orderedTasks.map((task) => (
              <Reorder.Item key={task.id} value={task} drag={!orderLocked}>
                {renderTask(task)}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : null}
      </div>
    );
  };

  // Only show skeleton on initial load (when we have no tasks yet)
  // This prevents the dialog from unmounting during background refreshes
  if (loading && tasks.length === 0) {
    return (
      <Card className="relative overflow-hidden border-3 border-primary/50 bg-secondary">
        <CardContent className="p-4 sm:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-56 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="space-y-3">
              <div className="h-14 bg-muted rounded-lg" />
              <div className="h-14 bg-muted rounded-lg" />
              <div className="h-14 bg-muted rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If calendar view is active, show it instead
  if (showCalendarView) {
    return (
      <div className="space-y-4">
        <Card className="p-4 bg-secondary border-primary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary">
                <CalendarDays className="h-5 w-5 text-primary-foreground" />
              </div>
              <h2 className="text-lg font-black text-white uppercase">{t('gamePlan.calendarView.title')}</h2>
            </div>
            <ToggleGroup 
              type="single" 
              value="week" 
              onValueChange={(value) => {
                if (value === 'today') setShowCalendarView(false);
              }}
              className="bg-background/10 rounded-lg p-0.5"
            >
              <ToggleGroupItem 
                value="today" 
                className="h-7 px-3 text-xs font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {t('gamePlan.calendarView.today')}
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="week" 
                className="h-7 px-3 text-xs font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {t('gamePlan.calendarView.viewWeek')}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </Card>
        <GamePlanCalendarView
          tasks={tasks}
          taskTimes={taskTimes}
          onDaySelect={setSelectedDate}
          selectedDate={selectedDate}
        />
      </div>
    );
  }

  return (
    <Card className="relative overflow-hidden border-3 border-primary bg-secondary shadow-2xl">
      {/* Athletic diagonal stripe accent */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 transform rotate-45 translate-x-20 -translate-y-20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 transform -rotate-45 -translate-x-16 translate-y-16" />
      
      <CardContent className="relative p-4 sm:p-6 space-y-4">
        {/* Bold Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary">
              <Target className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                {t('gamePlan.title')}
              </h2>
                <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-primary tracking-wide">{today}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {t('gamePlan.subtitle')}
                </span>
              </div>
            </div>
          </div>
          
          {/* Action buttons row */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Today/Week View Toggle */}
            <ToggleGroup 
              type="single" 
              value={showCalendarView ? 'week' : 'today'} 
              onValueChange={(value) => {
                if (value === 'week') setShowCalendarView(true);
                else if (value === 'today') setShowCalendarView(false);
              }}
              className="bg-background/10 rounded-lg p-0.5"
            >
              <ToggleGroupItem 
                value="today" 
                className="h-7 px-3 text-xs font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {t('gamePlan.calendarView.today')}
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="week" 
                className="h-7 px-3 text-xs font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {t('gamePlan.calendarView.viewWeek')}
              </ToggleGroupItem>
            </ToggleGroup>
            
            {/* Sort mode toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={cycleSortMode}
              className="flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white h-8"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortMode === 'auto' ? t('gamePlan.autoSort') : sortMode === 'manual' ? t('gamePlan.manualSort') : t('gamePlan.timelineSort')}
            </Button>
            
            {/* Lock Order dropdown (timeline mode only) */}
            {sortMode === 'timeline' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2",
                      orderLocked ? "text-yellow-400" : "text-white/70 hover:text-white"
                    )}
                  >
                    {orderLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  {orderLocked ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={handleUnlockOrder}
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      {t('gamePlan.lockOrder.unlock')}
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => handleLockOrder('day')}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        {t('gamePlan.lockOrder.forToday')}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => handleLockOrder('week')}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        {t('gamePlan.lockOrder.forWeek')}
                      </Button>
                    </>
                  )}
                </PopoverContent>
              </Popover>
            )}
            
            {/* Save/Apply template buttons (timeline mode only) */}
            {sortMode === 'timeline' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSaveTemplateOpen(true)}
                  className="text-white/70 hover:text-white h-8 px-2"
                >
                  <Save className="h-4 w-4" />
                </Button>
                {scheduleTemplates.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setApplyTemplateOpen(true)}
                    className="text-white/70 hover:text-white h-8 px-2 text-xs"
                  >
                    {t('gamePlan.scheduleTemplate.applyTemplate')}
                  </Button>
                )}
              </>
            )}
            
            {/* Daily Summary Settings */}
            {notificationsSupported && (
              <Popover open={dailySummaryPopoverOpen} onOpenChange={setDailySummaryPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2",
                      dailySummaryEnabled ? "text-primary" : "text-white/70 hover:text-white"
                    )}
                  >
                    {dailySummaryEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 space-y-3" align="end">
                  <h4 className="text-sm font-bold">{t('gamePlan.dailySummary.title')}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('gamePlan.dailySummary.enable')}</span>
                    <Switch 
                      checked={dailySummaryEnabled} 
                      onCheckedChange={async (checked) => {
                        if (checked) {
                          await requestNotificationPermission();
                        }
                        setDailySummaryEnabled(checked);
                      }} 
                    />
                  </div>
                  {dailySummaryEnabled && (
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">{t('gamePlan.dailySummary.sendAt')}</label>
                      <Select value={dailySummaryTime} onValueChange={setDailySummaryTime}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="05:00">5:00 AM</SelectItem>
                          <SelectItem value="06:00">6:00 AM</SelectItem>
                          <SelectItem value="07:00">7:00 AM</SelectItem>
                          <SelectItem value="08:00">8:00 AM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            )}
          </div>
          
          {/* Progress Ring */}
          <div className="flex items-center gap-3 bg-background/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-primary/30">
            {allComplete ? (
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-green-500">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-black text-green-400 uppercase tracking-wide">
                  {t('gamePlan.allComplete')}
                </span>
              </div>
            ) : (
              <>
                <div className="relative h-12 w-12">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      className="stroke-muted/30"
                      strokeWidth="4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      className="stroke-primary"
                      strokeWidth="4"
                      strokeDasharray={`${progressPercent * 0.88} 88`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">
                    {completedCount}/{totalCount}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
                    {t('gamePlan.tasksLabel')}
                  </span>
                  <span className="text-sm font-black text-white">
                    {t('gamePlan.tasksCompleted', { completed: completedCount, total: totalCount })}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 6-Week Recap Countdown - Compact Box */}
        <div className="flex items-center gap-3 bg-background/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-primary/30">
          <Clock className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/70 uppercase tracking-wide">
                {t('gamePlan.recapCountdown.title')}
              </span>
              <Progress value={recapProgress} className="h-1.5 flex-1 bg-muted/20 max-w-24" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/30 flex-shrink-0">
            <span className="text-sm font-black text-primary">
              {daysUntilRecap}
            </span>
            <span className="text-[10px] font-bold text-white/70 uppercase">
              {t('gamePlan.recapCountdown.days')}
            </span>
          </div>
        </div>

        {/* Task Sections */}
        <div className="space-y-4">
          {/* Timeline Mode - Unified list with full control */}
          {sortMode === 'timeline' ? (
            <div className="space-y-2">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <span className="h-px flex-1 bg-primary/30" />
                {t('gamePlan.sections.timeline')}
                <span className="h-px flex-1 bg-primary/30" />
              </h3>
              <p className="text-xs text-muted-foreground text-center mb-2">
                {t('gamePlan.timelineHint')}
              </p>
              <Reorder.Group axis="y" values={timelineTasks.filter(t => !skippedTasks.has(t.id))} onReorder={handleReorderTimeline} className="space-y-2">
                {timelineTasks.filter(t => !skippedTasks.has(t.id)).map((task, index) => (
                  <Reorder.Item 
                    key={task.id} 
                    value={task}
                    drag={!orderLocked}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onDrag={(e) => handleDrag(e as any)}
                  >
                    {renderTask(task, index)}
                  </Reorder.Item>
                ))}
              </Reorder.Group>
              
              {/* Quick add buttons for timeline mode */}
              <div className="flex flex-wrap gap-2 justify-center pt-4">
                <Button
                  size="sm"
                  onClick={() => { setEditingTemplate(null); setPresetActivityType(null); setBuilderOpen(true); }}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Plus className="h-4 w-4" />
                  {t('customActivity.createNew')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleQuickLogClick}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                  <Utensils className="h-4 w-4" />
                  {t('customActivity.logMeal')}
                </Button>
                {favorites.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFavoritesDrawerOpen(true)}
                    className="gap-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    <Star className="h-4 w-4 fill-yellow-500" />
                    {t('customActivity.quickAdd')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Daily Check-ins Section */}
              {renderTaskSection(
                checkinTasks,
                orderedCheckin,
                handleReorderCheckin,
                t('gamePlan.sections.dailyCheckins'),
                'text-primary',
                'bg-primary/30'
              )}

              {/* Training Section */}
              {renderTaskSection(
                trainingTasks,
                orderedTraining,
                handleReorderTraining,
                t('gamePlan.sections.training'),
                'text-primary',
                'bg-primary/30'
              )}

              {/* Cycle Tracking Section */}
              {renderTaskSection(
                trackingTasks,
                orderedTracking,
                handleReorderTracking,
                t('gamePlan.sections.cycleTracking'),
                'text-purple-400',
                'bg-purple-500/30'
              )}

              {/* Custom Activities Section - Always visible */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="h-px flex-1 bg-emerald-500/30" />
                  {t('gamePlan.sections.customActivities')}
                  <span className="h-px flex-1 bg-emerald-500/30" />
                </h3>
                
                <div className="flex flex-wrap gap-2 justify-center pb-2">
                  <Button
                    size="sm"
                    onClick={() => { setEditingTemplate(null); setPresetActivityType(null); setBuilderOpen(true); }}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <Plus className="h-4 w-4" />
                    {t('customActivity.createNew')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleQuickLogClick}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    <Utensils className="h-4 w-4" />
                    {t('customActivity.logMeal')}
                  </Button>
                  {favorites.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFavoritesDrawerOpen(true)}
                      className="gap-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      <Star className="h-4 w-4 fill-yellow-500" />
                      {t('customActivity.quickAdd')}
                    </Button>
                  )}
                </div>
                
                {customTasks.length > 0 && renderTaskSection(
                  customTasks,
                  orderedCustom,
                  handleReorderCustom,
                  '',
                  'text-emerald-400',
                  'bg-emerald-500/30'
                )}
              </div>
            </>
          )}
        </div>

        {/* Skipped Tasks Section - Now inside CardContent */}
        {skippedTasksList.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/20">
            <Collapsible open={showSkippedSection} onOpenChange={setShowSkippedSection}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-amber-400/80 py-2 w-full hover:text-amber-300 transition-colors font-medium">
                <ChevronDown className={cn("h-4 w-4 transition-transform", showSkippedSection && "rotate-180")} />
                {t('gamePlan.skippedForToday', 'Skipped for today')} ({skippedTasksList.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {skippedTasksList.map(task => {
                  const Icon = task.icon;
                  const isScheduledOff = scheduledOffTaskIds.has(task.id) && !skippedTasks.has(task.id);
                  return (
                    <div 
                      key={task.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                    >
                      <Icon className="h-5 w-5 text-amber-400/50 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm line-through text-white/50 block truncate">
                          {task.taskType === 'custom' ? task.titleKey : t(task.titleKey)}
                        </span>
                        {isScheduledOff && (
                          <span className="text-[10px] text-amber-400/70 font-medium flex items-center gap-1 mt-0.5">
                            <CalendarDays className="h-3 w-3" />
                            {t('gamePlan.taskSchedule.scheduledOff', 'Scheduled off')}
                          </span>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => isScheduledOff ? setActiveScheduleTaskId(task.id) : handleRestoreTask(task.id)}
                        className="h-10 px-3 text-green-400 hover:text-green-300 hover:bg-green-500/10 gap-1"
                      >
                        {isScheduledOff ? (
                          <>
                            <Pencil className="h-4 w-4" />
                            <span className="text-xs">{t('common.edit', 'Edit')}</span>
                          </>
                        ) : (
                          <>
                            <Undo2 className="h-4 w-4" />
                            <span className="text-xs">{t('gamePlan.restore', 'Restore')}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

      </CardContent>
      
      {/* Quick Nutrition Log Dialog */}
      <QuickNutritionLogDialog
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        onSuccess={refetch}
      />
      
      {/* Focus Quiz Dialog */}
      <VaultFocusQuizDialog
        open={quizDialogOpen}
        onOpenChange={setQuizDialogOpen}
        quizType={activeQuizType}
        onSubmit={handleQuizSubmit}
      />
      
      {/* Weekly Wellness Goals Dialog */}
      <WeeklyWellnessQuizDialog
        open={wellnessQuizOpen}
        onOpenChange={setWellnessQuizOpen}
        onComplete={refetch}
      />
      
      {/* Custom Activity Builder Dialog */}
      <CustomActivityBuilderDialog
        open={builderOpen}
        onOpenChange={(open) => {
          setBuilderOpen(open);
          if (!open) {
            setPresetActivityType(null);
            setEditingTemplate(null);
          }
        }}
        template={editingTemplate}
        presetActivityType={presetActivityType}
        onSave={async (data, scheduleForToday) => {
          let result;
          if (editingTemplate) {
            // Update existing template
            result = await updateTemplate(editingTemplate.id, data);
            if (result) {
              toast.success(t('customActivity.saved'));
            }
          } else {
            // Create new template
            result = await createTemplate(data as Omit<CustomActivityTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>, scheduleForToday);
            if (result) {
              toast.success(t('customActivity.saved'));
            }
          }
          
          if (result) {
            refetch();
            setEditingTemplate(null);
          }
          return result;
        }}
        onDelete={async (id) => {
          const success = await deleteActivityTemplate(id || editingTemplate?.id || '');
          if (success) {
            toast.success(t('customActivity.deleted'));
            refetch();
            setEditingTemplate(null);
          }
          return success;
        }}
        selectedSport={selectedSport}
      />

      {/* Custom Activity Detail Dialog */}
      <CustomActivityDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        task={selectedCustomTask}
        taskTime={selectedCustomTask ? taskTimes[selectedCustomTask.id] || null : null}
        taskReminder={selectedCustomTask ? taskReminders[selectedCustomTask.id] || null : null}
        onComplete={() => {
          if (selectedCustomTask) {
            handleCustomActivityToggle(selectedCustomTask);
          }
        }}
        onEdit={() => {
          if (selectedCustomTask) {
            handleCustomActivityEdit(selectedCustomTask);
            setDetailDialogOpen(false);
          }
        }}
        onSaveTime={(time, reminder) => {
          if (selectedCustomTask) {
            setTaskTimes(prev => ({ ...prev, [selectedCustomTask.id]: time }));
            setTaskReminders(prev => ({ ...prev, [selectedCustomTask.id]: reminder }));
          }
        }}
        onToggleCheckbox={async (fieldId, checked) => {
          if (!selectedCustomTask?.customActivityData) return;
          
          try {
            const template = selectedCustomTask.customActivityData.template;
            let log = selectedCustomTask.customActivityData.log;
            
            // Build new checkbox states
            const currentData = (log?.performance_data as Record<string, any>) || {};
            const currentCheckboxStates = (currentData.checkboxStates as Record<string, boolean>) || {};
            const newCheckboxStates = { ...currentCheckboxStates, [fieldId]: checked };
            const newPerformanceData = { ...currentData, checkboxStates: newCheckboxStates };
            
            // OPTIMISTIC UI UPDATE: Immediately update the checkbox state
            setSelectedCustomTask(prev => {
              if (!prev?.customActivityData) return prev;
              return {
                ...prev,
                customActivityData: {
                  ...prev.customActivityData,
                  log: prev.customActivityData.log 
                    ? { ...prev.customActivityData.log, performance_data: newPerformanceData }
                    : { id: 'pending', template_id: template.id, completed: false, performance_data: newPerformanceData } as any
                }
              };
            });
            
            // ENSURE LOG EXISTS: Get log directly (avoids stale closure!)
            if (!log) {
              const newLog = await ensureLogExists(template.id);
              if (!newLog) {
                toast.error(t('customActivity.addError'));
                return;
              }
              log = newLog;
              
              // Update selected task with real log
              setSelectedCustomTask(prev => prev ? {
                ...prev,
                customActivityData: prev.customActivityData ? {
                  ...prev.customActivityData,
                  log: { ...log!, performance_data: newPerformanceData }
                } : undefined
              } : null);
            }
            
            // PERSIST: Save checkbox states to database
            await updateLogPerformanceData(log.id, newPerformanceData);
            
            // AUTO-COMPLETE LOGIC: Check if ALL checkable items are now checked
            const allCheckableIds = getAllCheckableIds(template);
            
            if (allCheckableIds.length > 0) {
              const allChecked = allCheckableIds.every(id => newCheckboxStates[id] === true);
              const wasCompleted = log.completed;
              
              if (allChecked && !wasCompleted) {
                // Auto-complete with celebration!
                await toggleComplete(template.id);
                setSelectedCustomTask(prev => prev ? {
                  ...prev,
                  completed: true,
                  customActivityData: prev.customActivityData ? {
                    ...prev.customActivityData,
                    log: { ...prev.customActivityData.log!, completed: true }
                  } : undefined
                } : null);
                triggerCelebration();
                toast.success(t('customActivity.allTasksComplete', 'All tasks complete! 🎉'), {
                  description: template.title
                });
              } else if (!allChecked && wasCompleted) {
                // Un-complete if a checkbox is unchecked
                await toggleComplete(template.id);
                setSelectedCustomTask(prev => prev ? {
                  ...prev,
                  completed: false,
                  customActivityData: prev.customActivityData ? {
                    ...prev.customActivityData,
                    log: { ...prev.customActivityData.log!, completed: false }
                  } : undefined
                } : null);
              }
            }
            
            // Background refresh (safe - dialog won't unmount)
            refetch();
          } catch (error) {
            console.error('Error toggling checkbox:', error);
            toast.error(t('common.error'));
          }
        }}
      />
      {/* Quick Add Favorites Drawer */}
      <QuickAddFavoritesDrawer
        open={favoritesDrawerOpen}
        onOpenChange={setFavoritesDrawerOpen}
        favorites={favorites}
        onAddToToday={async (templateId) => {
          const success = await addToToday(templateId);
          if (success) {
            toast.success(t('customActivity.addedToToday'));
            refetch();
          }
        }}
        onEdit={(template) => {
          setEditingTemplate(template);
          setBuilderOpen(true);
        }}
      />
      
      {/* Save Template Dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('gamePlan.scheduleTemplate.saveAsTemplate')}</DialogTitle>
            <DialogDescription>
              {t('gamePlan.scheduleTemplate.templateName')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder={t('gamePlan.scheduleTemplate.namePlaceholder')}
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Switch checked={setAsDefault} onCheckedChange={setSetAsDefault} id="default-switch" />
              <label htmlFor="default-switch" className="text-sm">{t('gamePlan.scheduleTemplate.setAsDefault')}</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTemplateOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveTemplate} disabled={!newTemplateName.trim()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Apply Template Drawer */}
      <Drawer open={applyTemplateOpen} onOpenChange={setApplyTemplateOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('gamePlan.scheduleTemplate.myTemplates')}</DrawerTitle>
            <DrawerDescription>{t('gamePlan.scheduleTemplate.applyTemplate')}</DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="h-[300px] px-4 pb-4">
            {scheduleTemplates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('gamePlan.scheduleTemplate.noTemplates')}</p>
            ) : (
              <div className="space-y-2">
                {scheduleTemplates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.name}</span>
                      {template.is_default && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{t('gamePlan.scheduleTemplate.default')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => handleApplyTemplate(template)}>
                        {t('gamePlan.scheduleTemplate.applyTemplate')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteTemplate(template.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
      
      {/* Day Picker Dialog for Week Lock */}
      <Dialog open={dayPickerOpen} onOpenChange={setDayPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('gamePlan.lockOrder.selectDays')}</DialogTitle>
            <DialogDescription>
              {t('gamePlan.lockOrder.selectDaysDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { day: 0, label: t('gamePlan.lockOrder.days.sun') },
                { day: 1, label: t('gamePlan.lockOrder.days.mon') },
                { day: 2, label: t('gamePlan.lockOrder.days.tue') },
                { day: 3, label: t('gamePlan.lockOrder.days.wed') },
                { day: 4, label: t('gamePlan.lockOrder.days.thu') },
                { day: 5, label: t('gamePlan.lockOrder.days.fri') },
                { day: 6, label: t('gamePlan.lockOrder.days.sat') },
              ].map(({ day, label }) => (
                <div 
                  key={day}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    lockDays.includes(day) 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => toggleLockDay(day)}
                >
                  <Checkbox 
                    checked={lockDays.includes(day)}
                    onCheckedChange={() => toggleLockDay(day)}
                  />
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              {t('gamePlan.lockOrder.daysSelected', { count: lockDays.length })}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDayPickerOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleConfirmWeekLock} disabled={lockDays.length === 0}>
              <Lock className="h-4 w-4 mr-2" />
              {t('gamePlan.lockOrder.lock')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Time Settings Drawer - mobile friendly */}
      <TimeSettingsDrawer
        open={activeTimePickerTaskId !== null}
        onOpenChange={(open) => { if (!open) setActiveTimePickerTaskId(null); }}
        taskTitle={(() => {
          if (!activeTimePickerTaskId) return '';
          const allTasks = [...orderedCheckin, ...orderedTraining, ...orderedTracking, ...orderedCustom, ...timelineTasks];
          const task = allTasks.find(t => t.id === activeTimePickerTaskId);
          if (!task) return '';
          return task.taskType === 'custom' ? task.titleKey : t(task.titleKey);
        })()}
        currentTime={activeTimePickerTaskId ? taskTimes[activeTimePickerTaskId] || null : null}
        currentReminder={activeTimePickerTaskId ? taskReminders[activeTimePickerTaskId] || null : null}
        onSave={(time, reminder) => {
          if (activeTimePickerTaskId) {
            setTaskTimes(prev => ({ ...prev, [activeTimePickerTaskId]: time }));
            setTaskReminders(prev => ({ ...prev, [activeTimePickerTaskId]: reminder }));
          }
        }}
        onRemove={() => {
          if (activeTimePickerTaskId) {
            setTaskTimes(prev => ({ ...prev, [activeTimePickerTaskId]: null }));
            setTaskReminders(prev => ({ ...prev, [activeTimePickerTaskId]: null }));
          }
        }}
        onSkipTask={() => {
          if (activeTimePickerTaskId) {
            handleSkipTask(activeTimePickerTaskId);
          }
        }}
        showSkipOption={true}
      />
      
      {/* System Task Schedule Drawer - for configuring display days */}
      <SystemTaskScheduleDrawer
        open={activeScheduleTaskId !== null}
        onOpenChange={(open) => { if (!open) setActiveScheduleTaskId(null); }}
        taskId={activeScheduleTaskId || ''}
        taskTitle={(() => {
          if (!activeScheduleTaskId) return '';
          const allTasksList = [...orderedCheckin, ...orderedTraining, ...orderedTracking, ...orderedCustom, ...timelineTasks];
          const task = allTasksList.find(t => t.id === activeScheduleTaskId);
          if (!task) return '';
          return task.taskType === 'custom' ? task.titleKey : t(task.titleKey);
        })()}
        currentDisplayDays={(() => {
          if (!activeScheduleTaskId) return [...ALL_DAYS];
          const schedule = getSchedule(activeScheduleTaskId);
          return schedule?.display_days || [...ALL_DAYS];
        })()}
        currentDisplayTime={activeScheduleTaskId ? (getSchedule(activeScheduleTaskId)?.display_time || taskTimes[activeScheduleTaskId] || null) : null}
        currentReminderEnabled={activeScheduleTaskId ? (getSchedule(activeScheduleTaskId)?.reminder_enabled || false) : false}
        currentReminderMinutes={activeScheduleTaskId ? (getSchedule(activeScheduleTaskId)?.reminder_minutes || 15) : 15}
        onSave={async (displayDays, displayTime, reminderEnabled, reminderMinutes) => {
          if (activeScheduleTaskId) {
            const success = await saveTaskSchedule(activeScheduleTaskId, displayDays, displayTime, reminderEnabled, reminderMinutes);
            if (success) {
              // Only update local task times if save succeeded
              setTaskTimes(prev => ({ ...prev, [activeScheduleTaskId]: displayTime }));
              setTaskReminders(prev => ({ ...prev, [activeScheduleTaskId]: reminderEnabled ? reminderMinutes : null }));
            }
            return success;
          }
          return false;
        }}
        onSkipTask={() => {
          if (activeScheduleTaskId) {
            handleSkipTask(activeScheduleTaskId);
          }
        }}
        showSkipOption={true}
      />
      
      {/* Pulsing animation for incomplete tasks */}
      <style>{`
        @keyframes game-plan-pulse-custom {
          0%, 100% {
            box-shadow: 0 0 0 0 ${hexToRgba(colors.gamePlan.pending.icon, 0.4)};
          }
          50% {
            box-shadow: 0 0 0 6px ${hexToRgba(colors.gamePlan.pending.icon, 0.1)};
          }
        }
      `}</style>
    </Card>
  );
}

