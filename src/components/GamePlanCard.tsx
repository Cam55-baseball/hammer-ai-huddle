import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Check, Target, Clock, Trophy, Zap, Plus, ArrowUpDown, GripVertical, Star, Pencil, Utensils, CalendarDays, Lock, Unlock, Save, Bell, BellOff, Trash2, ChevronDown, ChevronUp, Eye, X, Undo2, UserCheck, Sparkles, Dumbbell, Info, GraduationCap, SkipForward, ArrowRight, NotebookPen, Flame, AlertTriangle, CheckCircle2, Moon } from 'lucide-react';

import { useDayState } from '@/hooks/useDayState';
import { useDailyOutcome, type DailyOutcomeStatus } from '@/hooks/useDailyOutcome';
import { Badge } from '@/components/ui/badge';
import { getTodayDate } from '@/utils/dateUtils';
import { CustomActivityDetailDialog, getAllCheckableIds } from '@/components/CustomActivityDetailDialog';
import { TimeSettingsDrawer } from '@/components/TimeSettingsDrawer';
import { SystemTaskScheduleDrawer, displayDaysToSkipDays, skipDaysToDisplayDays } from '@/components/SystemTaskScheduleDrawer';
import { useSystemTaskSchedule } from '@/hooks/useSystemTaskSchedule';
import { useCalendarSkips } from '@/hooks/useCalendarSkips';
import { useGamePlan, GamePlanTask } from '@/hooks/useGamePlan';
import { useCustomActivities } from '@/hooks/useCustomActivities';
import { useRecapCountdown } from '@/hooks/useRecapCountdown';
import { useReceivedActivities } from '@/hooks/useReceivedActivities';
import { PendingCoachActivityCard } from '@/components/game-plan/PendingCoachActivityCard';

import { PendingSessionApprovals } from '@/components/practice/PendingSessionApprovals';
import { SchedulePracticeDialog } from '@/components/practice/SchedulePracticeDialog';
import { QuickNutritionLogDialog } from '@/components/QuickNutritionLogDialog';
import { QuickNoteDialog } from '@/components/game-plan/QuickNoteDialog';
import { FolderItemPerformanceLogger } from '@/components/folders/FolderItemPerformanceLogger';
import { FolderItemEditDialog } from '@/components/folders/FolderItemEditDialog';
import { VaultFocusQuizDialog } from '@/components/vault/VaultFocusQuizDialog';
import { WeeklyWellnessQuizDialog } from '@/components/vault/WeeklyWellnessQuizDialog';
import { CustomActivityBuilderDialog, QuickAddFavoritesDrawer, getActivityIcon } from '@/components/custom-activities';
import { SendCardToCoachDialog } from '@/components/custom-activities/SendCardToCoachDialog';
import { Json } from '@/integrations/supabase/types';
import { GamePlanCalendarView } from '@/components/GamePlanCalendarView';
import { useVault } from '@/hooks/useVault';
import { useAuth } from '@/hooks/useAuth';
import { PhysioPostWorkoutBanner } from '@/components/physio/PhysioPostWorkoutBanner';
import { usePhysioGamePlanBadges } from '@/hooks/usePhysioGamePlanBadges';
import { supabase } from '@/integrations/supabase/client';
import { useSchedulingService } from '@/hooks/useSchedulingService';
import { useUserColors, hexToRgba } from '@/hooks/useUserColors';
import { useAutoScrollOnDrag } from '@/hooks/useAutoScrollOnDrag';
import { useRescheduleEngine } from '@/hooks/useRescheduleEngine';
import { useScheduleTemplates, ScheduleItem } from '@/hooks/useScheduleTemplates';
import { useDailySummaryNotification } from '@/hooks/useDailySummaryNotification';
import { useGamePlanLock, ScheduleItem as LockScheduleItem } from '@/hooks/useGamePlanLock';
import { useCalendarDayOrders, getOrderKey } from '@/hooks/useCalendarDayOrders';
import { UnlockDayPickerDialog } from '@/components/game-plan/UnlockDayPickerDialog';
import { LockDayPickerDialog } from '@/components/game-plan/LockDayPickerDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CustomActivityTemplate } from '@/types/customActivity';
import { CustomField } from '@/types/customActivity';
import { triggerCelebration } from '@/lib/confetti';
import { trackOnce } from '@/lib/launchEvents';
import { buildNNContext } from '@/lib/nnContract';
import { NNManualCompletionGate } from '@/components/custom-activities/NNManualCompletionGate';
import { format, addDays, startOfWeek, isSameDay, getDay } from 'date-fns';

interface GamePlanCardProps {
  selectedSport: 'baseball' | 'softball';
}

// Stable constant to avoid new array instances triggering re-renders
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function GamePlanCard({ selectedSport }: GamePlanCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tasks, customActivities, completedCount, totalCount, loading, refetch, addOptimisticActivity, updateOptimisticActivity, refreshCustomActivities, folderTasks, toggleFolderItemCompletion, saveFolderCheckboxState, saveFolderPerformanceData, setFolderItemCompletionState, markFolderItemAllAndComplete, reopenFolderItem, isDayComplete } = useGamePlan(selectedSport);
  const { daysUntilRecap, recapProgress, canGenerateRecap, hasMissedRecap, waitingForProgressReports } = useRecapCountdown();
  const { pendingActivities, pendingCount, acceptActivity, rejectActivity, refetch: refetchPending } = useReceivedActivities();
  const { getFavorites, toggleComplete, addToToday, templates, todayLogs, createTemplate, updateTemplate, updateTemplateSchedule, deleteTemplate: deleteActivityTemplate, updateLogPerformanceData, ensureLogExists, setCompletionState, markAllCheckboxesAndComplete, reopenActivity, refetch: refetchActivities } = useCustomActivities(selectedSport);
  const { getEffectiveColors } = useUserColors(selectedSport);
  const colors = useMemo(() => getEffectiveColors(), [getEffectiveColors]);
  const isSoftball = selectedSport === 'softball';
  const { saveFocusQuiz, todaysQuizzes } = useVault();
  const { getBadgesForTask } = usePhysioGamePlanBadges();
  const scheduling = useSchedulingService();
  
  // System task schedule hook - for time/reminder settings only
  const { schedules: taskSchedules, saveSchedule: saveTaskSchedule, getSchedule } = useSystemTaskSchedule();
  
  // Calendar skips hook - SINGLE SOURCE OF TRUTH for weekly skip logic
  const { isSkippedForDay: isCalendarSkipped, getSkipDays, updateSkipDays, refetch: refetchCalendarSkips } = useCalendarSkips();
  
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
  const { skipDay, pushForwardOneDay, pushToDate, replaceDay, undoLastAction } = useRescheduleEngine();
  
  // Guard against overlapping optimistic updates from rapid double-clicks
  const isUpdatingRef = useRef(false);

  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
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
  
  // Database-backed lock state (weekly template)
  const { 
    isTodayLocked: isWeeklyTodayLocked, 
    getLockedDayNumbers, 
    getTodaySchedule,
    lockToday, 
    lockDays: lockDaysDb, 
    unlockDays,
    loading: lockLoading,
    refetch: refetchLockedDays
  } = useGamePlanLock();
  
  // Date-specific lock state (synced with Calendar)
  const {
    isDateLocked,
    getOrderKeysForDate,
    fetchDayOrdersForRange,
    saveDayOrder,
    unlockDate,
    refetch: refetchDayOrders
  } = useCalendarDayOrders();
  
  // Helper to convert Game Plan task to Calendar order key
  const getGamePlanOrderKey = useCallback((task: GamePlanTask): string => {
    // Custom activities use template IDs
    if (task.taskType === 'custom' && task.customActivityData?.template?.id) {
      return `ca:${task.customActivityData.template.id}`;
    }
    // All other Game Plan tasks use gp: prefix
    return `gp:${task.id}`;
  }, []);
  
  // Determine lock status - date-specific takes priority over weekly
  const todayDate = useMemo(() => new Date(), []);
  const isDateLockedToday = isDateLocked(todayDate);
  const isWeeklyLocked = isWeeklyTodayLocked() && !isDateLockedToday;
  const todayLocked = isDateLockedToday || isWeeklyTodayLocked();
  const lockedDayNumbers = getLockedDayNumbers();
  
  // Lock/Unlock dialogs
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  
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
  
  // Custom activity schedule drawer state (separate from system task schedule)
  const [activeCustomScheduleTask, setActiveCustomScheduleTask] = useState<GamePlanTask | null>(null);
  
  // Custom activity state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [favoritesDrawerOpen, setFavoritesDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomActivityTemplate | null>(null);
  const [presetActivityType, setPresetActivityType] = useState<'meal' | null>(null);
  
  // Custom activity detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCustomTask, setSelectedCustomTask] = useState<GamePlanTask | null>(null);
  
  // Folder item performance logger dialog state
  const [folderLoggerOpen, setFolderLoggerOpen] = useState(false);
  const [selectedFolderTask, setSelectedFolderTask] = useState<GamePlanTask | null>(null);
  const [folderItemEditOpen, setFolderItemEditOpen] = useState(false);
  const [folderCheckboxStates, setFolderCheckboxStates] = useState<Record<string, boolean>>({});
  const [sendToCoachOpen, setSendToCoachOpen] = useState(false);
  const [sendToCoachTitle, setSendToCoachTitle] = useState('');
  const [sendToCoachTemplateData, setSendToCoachTemplateData] = useState<Json | null>(null);
  const [daySkipped, setDaySkipped] = useState(false);
  const skippedTaskIdsRef = useRef<string[]>([]);

  // Initialize folder checkbox states when dialog opens
  useEffect(() => {
    if (selectedFolderTask?.folderItemData && folderLoggerOpen) {
      const ft = folderTasks.find(ft => ft.item.id === selectedFolderTask.folderItemData!.itemId);
      const pd = ft?.performanceData as any;
      setFolderCheckboxStates(pd?.checkboxStates || {});
    }
  }, [selectedFolderTask, folderLoggerOpen, folderTasks]);
  
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
  const [showSkippedSection, setShowSkippedSection] = useState(true);
  const { user } = useAuth();
  
  const favorites = useMemo(() => getFavorites(), [getFavorites, templates]);
  
  // Fetch today's calendar_day_orders on mount
  useEffect(() => {
    const today = new Date();
    fetchDayOrdersForRange(today, today);
  }, [fetchDayOrdersForRange]);
  
  // Auto-scroll for drag and drop
  const { onDragStart, onDragEnd, handleDrag } = useAutoScrollOnDrag();
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  }).toUpperCase();

  const allComplete = isDayComplete;
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
  
  // Skip task handler (load management) — routed through scheduling service
  const handleSkipTask = async (taskId: string) => {
    if (!user) return;
    
    // Optimistic UI update
    setSkippedTasks(prev => new Set([...prev, taskId]));
    
    const today = getTodayDate();
    const success = await scheduling.skipTask(taskId, today);
    
    if (!success) {
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
  
  // Restore skipped task handler — routed through scheduling service
  const handleRestoreTask = async (taskId: string) => {
    if (!user) return;
    
    // Optimistic UI update
    setSkippedTasks(prev => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    
    const today = getTodayDate();
    const success = await scheduling.unskipTask(taskId, today);
    
    if (!success) {
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

  // Sync ordered tasks with fetched tasks and restore saved order (or locked order)
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
      const today = new Date();
      
      // PRIORITY 1: Check date-specific lock from calendar_day_orders
      const dateOrderKeys = getOrderKeysForDate(today);
      const isDateLockedForToday = isDateLocked(today);
      
      if (isDateLockedForToday && dateOrderKeys.length > 0) {
        // Apply date-specific order from calendar_day_orders
        const allTasks = [...tasks].sort((a, b) => {
          const aKey = getGamePlanOrderKey(a);
          const bKey = getGamePlanOrderKey(b);
          const aIdx = dateOrderKeys.indexOf(aKey);
          const bIdx = dateOrderKeys.indexOf(bKey);
          if (aIdx === -1 && bIdx === -1) return 0;
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
        setTimelineTasks(allTasks);
      } else {
        // PRIORITY 2: Fall back to weekly lock (game_plan_locked_days)
        const lockedSchedule = getTodaySchedule();
        
        if (lockedSchedule && lockedSchedule.length > 0) {
          // Apply locked order from database
          const orderIds = lockedSchedule.sort((a, b) => a.order - b.order).map(s => s.taskId);
          const allTasks = [...tasks].sort((a, b) => {
            const aIdx = orderIds.indexOf(a.id);
            const bIdx = orderIds.indexOf(b.id);
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          });
          setTimelineTasks(allTasks);
          
          // Also apply saved times/reminders from locked schedule
          const newTimes: Record<string, string | null> = { ...taskTimes };
          const newReminders: Record<string, number | null> = { ...taskReminders };
          lockedSchedule.forEach(item => {
            if (item.displayTime) newTimes[item.taskId] = item.displayTime;
            if (item.reminderEnabled && item.reminderMinutes) {
              newReminders[item.taskId] = item.reminderMinutes;
            }
          });
          // Only update if there are differences to avoid infinite loops
          const timesChanged = JSON.stringify(newTimes) !== JSON.stringify(taskTimes);
          const remindersChanged = JSON.stringify(newReminders) !== JSON.stringify(taskReminders);
          if (timesChanged) setTaskTimes(newTimes);
          if (remindersChanged) setTaskReminders(newReminders);
        } else {
          // PRIORITY 3: Fall back to localStorage
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
        }
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
  }, [tasksKey, sortMode, todayLocked, isDateLocked, getOrderKeysForDate, getGamePlanOrderKey]);

  const [searchParams, setSearchParams] = useSearchParams();

  const setUrlParam = useCallback((key: string, value: string | null) => {
    setSearchParams(prev => {
      if (value) {
        prev.set(key, value);
      } else {
        prev.delete(key);
      }
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  const handleDetailClose = useCallback((open: boolean) => {
    setDetailDialogOpen(open);
    if (!open) {
      setSelectedCustomTask(null);
      setUrlParam('activityId', null);
    }
  }, [setUrlParam]);

  const handleFolderLoggerClose = useCallback((open: boolean) => {
    setFolderLoggerOpen(open);
    if (!open) {
      setSelectedFolderTask(null);
      setUrlParam('folderItemId', null);
    }
  }, [setUrlParam]);

  // Restore dialog state from URL on mount
  useEffect(() => {
    if (loading) return;
    const activityId = searchParams.get('activityId');
    const folderItemId = searchParams.get('folderItemId');
    const allGamePlanTasks: GamePlanTask[] = tasks;

    if (activityId) {
      const match = allGamePlanTasks.find(t => t.id === activityId);
      if (match?.taskType === 'custom' && match.customActivityData) {
        setSelectedCustomTask(match);
        setDetailDialogOpen(true);
        toast.info("Resuming your last activity");
      } else {
        setUrlParam('activityId', null);
      }
    }

    if (folderItemId) {
      const match = allGamePlanTasks.find(t => t.folderItemData?.itemId === folderItemId);
      if (match?.folderItemData) {
        setSelectedFolderTask(match);
        setFolderLoggerOpen(true);
        toast.info("Resuming your last activity");
      } else {
        setUrlParam('folderItemId', null);
      }
    }
  // Run only once when data loads
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleTaskClick = (task: GamePlanTask) => {
    // Handle folder items - open performance logger dialog
    if (task.folderItemData) {
      setSelectedFolderTask(task);
      setFolderLoggerOpen(true);
      setUrlParam('folderItemId', task.folderItemData.itemId);
      return;
    }

    // Handle custom activities - open detail dialog
    if (task.taskType === 'custom' && task.customActivityData) {
      setSelectedCustomTask(task);
      setDetailDialogOpen(true);
      setUrlParam('activityId', task.id);
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

  const selectSortMode = (mode: 'auto' | 'manual' | 'timeline') => {
    setSortMode(mode);
    localStorage.setItem('gameplan-sort-mode', mode);
  };


  const handleReorderCheckin = (newOrder: GamePlanTask[]) => {
    if (todayLocked) return;
    setOrderedCheckin(newOrder);
    localStorage.setItem('gameplan-checkin-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  const handleReorderTraining = (newOrder: GamePlanTask[]) => {
    if (todayLocked) return;
    setOrderedTraining(newOrder);
    localStorage.setItem('gameplan-training-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  const handleReorderTracking = (newOrder: GamePlanTask[]) => {
    if (todayLocked) return;
    setOrderedTracking(newOrder);
    localStorage.setItem('gameplan-tracking-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  const handleReorderCustom = (newOrder: GamePlanTask[]) => {
    if (todayLocked) return;
    setOrderedCustom(newOrder);
    localStorage.setItem('gameplan-custom-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  // Custom activity handlers
  const handleCustomActivityToggle = async (task: GamePlanTask) => {
    if (task.customActivityData) {
      const success = await toggleComplete(task.customActivityData.template.id, task.customActivityData.log?.id);
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

  // Phase 12.2 — gated NN completion. The gate has already been satisfied
  // by the user (timer expired, count reached, or binary confirmed). We
  // record the proof in performance_data and then trigger the standard
  // completion path so all downstream engine triggers fire unchanged.
  const handleNNGateSatisfied = async (
    task: GamePlanTask,
    gate: { type: string; satisfied_at: string; [k: string]: any },
  ) => {
    const ca = task.customActivityData;
    if (!ca || task.completed) return;
    try {
      // Make sure a log row exists, then write the gate audit.
      const ensured = ca.log ?? (await ensureLogExists(ca.template.id));
      const logId = ensured?.id;
      if (logId) {
        const prevPd = ((ensured as any)?.performance_data as Record<string, any>) || {};
        await updateLogPerformanceData(logId, { ...prevPd, nn_gate: gate });
      }
      const success = await toggleComplete(ca.template.id, logId ?? undefined);
      if (success) {
        if (sortMode === 'timeline') {
          const updatedTasks = timelineTasks.map(t =>
            t.id === task.id ? { ...t, completed: true } : t
          );
          const sorted = sortTimelineByCompletion(updatedTasks);
          setTimelineTasks(sorted);
          localStorage.setItem('gameplan-timeline-order', JSON.stringify(sorted.map(t => t.id)));
        }
        refetch();
        toast.success(t('customActivity.markedComplete'));
      }
    } catch (e) {
      console.error('[NNGate] complete failed', e);
      toast.error('Could not complete this Non-Negotiable.');
    }
  };


  // Custom activity schedule edit handler - now opens schedule drawer like system tasks
  const handleCustomActivityScheduleEdit = (task: GamePlanTask) => {
    if (task.customActivityData) {
      // For custom activities, we'll use a separate state to track that we're editing a custom activity schedule
      setActiveCustomScheduleTask(task);
    }
  };

  // Custom activity full edit handler - for editing the activity template itself
  const handleCustomActivityFullEdit = (task: GamePlanTask) => {
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
  
  // Lock order handlers - dual-write to calendar_day_orders AND game_plan_locked_days
  // IMPORTANT: Only lock visible tasks (exclude manually skipped and weekly scheduled-off)
  const handleLockCurrentOrder = async () => {
    const today = new Date();
    
    // Build order_keys for calendar_day_orders (date-specific) using visible tasks only
    const orderKeys = timelineVisibleTasks.map(task => getGamePlanOrderKey(task));
    
    // Save to calendar_day_orders first (syncs with Calendar)
    const dayOrderSuccess = await saveDayOrder(today, orderKeys, true);
    
    // Also save to game_plan_locked_days for backward compatibility
    const schedule: LockScheduleItem[] = timelineVisibleTasks.map((t, idx) => ({
      taskId: t.id,
      order: idx,
      displayTime: taskTimes[t.id] || null,
      reminderMinutes: taskReminders[t.id] || null,
      reminderEnabled: !!taskReminders[t.id],
    }));
    
    await lockToday(schedule);
    await refetchLockedDays();
    await refetchDayOrders();
    
    if (dayOrderSuccess) {
      toast.success(t('gamePlan.lockOrder.locked', 'Schedule locked for today'));
    }
  };
  
  const handleOpenUnlockDialog = () => {
    setUnlockDialogOpen(true);
  };
  
  const handleUnlockSave = async (daysToUnlock: number[], daysToLock: number[]) => {
    const today = new Date();
    const todayDayOfWeek = getDay(today);
    
    // Build current schedule for any new locks (only visible tasks)
    const schedule: LockScheduleItem[] = timelineVisibleTasks.map((t, idx) => ({
      taskId: t.id,
      order: idx,
      displayTime: taskTimes[t.id] || null,
      reminderMinutes: taskReminders[t.id] || null,
      reminderEnabled: !!taskReminders[t.id],
    }));
    
    // If today is being unlocked, also unlock in calendar_day_orders
    if (daysToUnlock.includes(todayDayOfWeek)) {
      await unlockDate(today);
    }
    
    // Unlock days first (weekly template)
    if (daysToUnlock.length > 0) {
      await unlockDays(daysToUnlock);
    }
    
    // Lock new days
    if (daysToLock.length > 0) {
      await lockDaysDb(daysToLock, schedule);
    }
    
    // Force refresh the local state immediately
    await refetchLockedDays();
    await refetchDayOrders();
  };
  
  // Handle locking multiple days with current schedule
  const handleLockDays = async (daysToLock: number[]) => {
    const schedule: LockScheduleItem[] = timelineVisibleTasks.map((t, idx) => ({
      taskId: t.id,
      order: idx,
      displayTime: taskTimes[t.id] || null,
      reminderMinutes: taskReminders[t.id] || null,
      reminderEnabled: !!taskReminders[t.id],
    }));
    
    await lockDaysDb(daysToLock, schedule);
    await refetchLockedDays();
  };
  
  // Template handlers
  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) return;
    
    const schedule: ScheduleItem[] = timelineVisibleTasks.map(t => ({
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
    
    // Auto-lock after applying template so it persists to database
    setTimeout(() => handleLockCurrentOrder(), 100);
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

  // Helper to get the correct item ID and type for calendar skip lookup
  // CRITICAL: This MUST match how Calendar saves skips for each task type
  const getCalendarSkipInfo = useCallback((task: GamePlanTask): { itemId: string; itemType: string } => {
    if (task.taskType === 'custom' && task.customActivityData?.template) {
      // Custom activities use template-{uuid} format
      return { 
        itemId: `template-${task.customActivityData.template.id}`, 
        itemType: 'custom_activity' 
      };
    }
    // Workout tasks (Iron Bambino, Heat Factory) are saved as 'program' type by Calendar
    if (task.taskType === 'workout') {
      return { itemId: task.id, itemType: 'program' };
    }
    // All other system tasks use 'game_plan' type
    return { itemId: task.id, itemType: 'game_plan' };
  }, []);

  // Check if a task is weekly-skipped via calendar skips (SINGLE SOURCE OF TRUTH)
  const isWeeklySkipped = useCallback((task: GamePlanTask): boolean => {
    const { itemId, itemType } = getCalendarSkipInfo(task);
    return isCalendarSkipped(itemId, itemType, new Date());
  }, [isCalendarSkipped, getCalendarSkipInfo]);

  // Helper to check if a task should be hidden from the main list today
  // Hidden = manually skipped today OR weekly scheduled off
  const isTaskHiddenToday = useCallback((task: GamePlanTask): boolean => {
    return skippedTasks.has(task.id) || isWeeklySkipped(task);
  }, [skippedTasks, isWeeklySkipped]);

  // Get visible timeline tasks (excludes manually skipped AND weekly scheduled-off)
  const timelineVisibleTasks = useMemo(() => 
    timelineTasks.filter(t => !isTaskHiddenToday(t)),
  [timelineTasks, isTaskHiddenToday]);

  // Reorder handler for timeline mode - preserves hidden tasks in place
  const handleReorderTimeline = useCallback((newVisibleOrder: GamePlanTask[]) => {
    if (todayLocked) return;
    
    // Merge the new visible order back into the full timeline, preserving hidden tasks in place
    const visibleQueue = [...newVisibleOrder];
    const mergedOrder = timelineTasks.map(task => {
      if (isTaskHiddenToday(task)) {
        // Keep hidden tasks in their original position
        return task;
      }
      // Replace visible tasks with reordered version
      return visibleQueue.shift() || task;
    });
    
    setTimelineTasks(mergedOrder);
    localStorage.setItem('gameplan-timeline-order', JSON.stringify(mergedOrder.map(t => t.id)));
  }, [todayLocked, timelineTasks, isTaskHiddenToday]);

  // Get display tasks based on sort mode, filtering out skipped (today only) AND weekly-skipped tasks
  const filterSkippedAndScheduledOff = useCallback((taskList: GamePlanTask[]) => 
    taskList.filter(t => !skippedTasks.has(t.id) && !isWeeklySkipped(t)),
  [skippedTasks, isWeeklySkipped]);
  
  const checkinTasks = filterSkippedAndScheduledOff(autoSort ? sortByCompletion(orderedCheckin) : orderedCheckin);
  const trainingTasks = filterSkippedAndScheduledOff(autoSort ? sortByCompletion(orderedTraining) : orderedTraining);
  const trackingTasks = filterSkippedAndScheduledOff(autoSort ? sortByCompletion(orderedTracking) : orderedTracking);
  const customTasks = filterSkippedAndScheduledOff(autoSort ? sortByCompletion(orderedCustom) : orderedCustom);
  
  // Get all tasks for skipped section - include timeline tasks when in that mode
  const allTasks = sortMode === 'timeline' 
    ? timelineTasks 
    : [...orderedCheckin, ...orderedTraining, ...orderedTracking, ...orderedCustom];
  
  // Skipped tasks: manually skipped (today only) OR weekly skipped via calendar
  const skippedTasksList = allTasks.filter(t => skippedTasks.has(t.id) || isWeeklySkipped(t));

  // Day-state context — drives NN visibility + push glow
  const { dayType: __dayType } = useDayState();
  const hideNN = __dayType === 'rest';
  const skipDimming = __dayType === 'skip';
  const pushGlow = __dayType === 'push';

  // ── Phase 10.4 — Live Standard Awareness ────────────────────────────
  // Pure derivation from the single source of truth.
  const dailyOutcome = useDailyOutcome();
  const nnRemaining = Math.max(0, dailyOutcome.nnTotal - dailyOutcome.nnCompleted);
  const standardIncomplete =
    dailyOutcome.nnTotal > 0 &&
    dailyOutcome.nnCompleted < dailyOutcome.nnTotal &&
    !hideNN &&
    __dayType !== 'skip';

  // One-shot smart scroll to NN section on mount when standard is incomplete.
  // Phase 10.5: respect manual user scroll — bail if user already scrolled.
  const scrollFiredRef = useRef(false);
  const userScrolledRef = useRef(false);
  useEffect(() => {
    const onUserScroll = () => { userScrolledRef.current = true; };
    window.addEventListener('wheel', onUserScroll, { passive: true, once: true });
    window.addEventListener('touchstart', onUserScroll, { passive: true, once: true });
    window.addEventListener('keydown', onUserScroll, { once: true });
    return () => {
      window.removeEventListener('wheel', onUserScroll);
      window.removeEventListener('touchstart', onUserScroll);
      window.removeEventListener('keydown', onUserScroll);
    };
  }, []);
  useEffect(() => {
    if (scrollFiredRef.current) return;
    if (loading || dailyOutcome.loading) return;
    if (!standardIncomplete) return;
    if (userScrolledRef.current) {
      scrollFiredRef.current = true; // mark satisfied; don't override user
      return;
    }
    scrollFiredRef.current = true;
    requestAnimationFrame(() => {
      // Re-check at fire time — user may have scrolled in the same frame
      if (userScrolledRef.current) return;
      const el = document.getElementById('nn-section');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, dailyOutcome.loading, standardIncomplete]);

  // Completion reinforcement pulse — fires once on the < → === transition.
  // Phase 10.5: hard single-fire gate via pulsedRef in addition to transition guard.
  const [pulseStandard, setPulseStandard] = useState(false);
  const prevNnCompletedRef = useRef<number | null>(null);
  const pulsedRef = useRef(false);
  // Reset pulse latch when day changes
  useEffect(() => { pulsedRef.current = false; }, [__dayType]);
  useEffect(() => {
    const prev = prevNnCompletedRef.current;
    const cur = dailyOutcome.nnCompleted;
    const total = dailyOutcome.nnTotal;
    prevNnCompletedRef.current = cur;
    if (prev === null) return; // skip first observation
    if (total <= 0) return;
    if (__dayType === 'rest' || __dayType === 'skip') return;
    if (pulsedRef.current) return;
    if (prev < total && cur === total) {
      pulsedRef.current = true;
      setPulseStandard(true);
      toast.success('Standard met.');
      const __today = getTodayDate();
      trackOnce('STANDARD_MET', `standard_met:${__today}`, { date: __today });
      const t = setTimeout(() => setPulseStandard(false), 1000);
      return () => clearTimeout(t);
    }
  }, [dailyOutcome.nnCompleted, dailyOutcome.nnTotal, __dayType]);

  // Toggle NON-NEGOTIABLE on a custom activity template (1-click)
  const toggleNonNegotiable = async (templateId: string, current: boolean) => {
    const next = !current;
    try {
      const ok = await updateTemplate(templateId, { is_non_negotiable: next } as any);
      if (!ok) return;
      // Recompute identity + hammer state immediately
      if (user?.id) {
        supabase.functions.invoke('evaluate-behavioral-state', { body: { user_id: user.id } }).catch(() => {});
        supabase.functions.invoke('compute-hammer-state',     { body: { user_id: user.id } }).catch(() => {});
      }
      refetch();
      refetchActivities();
      toast.success(next
        ? 'Set as Non-Negotiable — now required daily.'
        : 'Removed from Non-Negotiables.');
    } catch (e) {
      console.error('[toggleNonNegotiable]', e);
      toast.error('Could not update standard');
    }
  };

  const renderTask = (task: GamePlanTask, index?: number) => {
    const Icon = task.icon;
    const isIncomplete = !task.completed;
    const isTracking = task.section === 'tracking';
    const isTexVision = task.specialStyle === 'tex-vision';
    const isCustom = task.specialStyle === 'custom';
    const isNN = !!task.customActivityData?.template?.is_non_negotiable && !hideNN;
    // Phase 12 — NN context contract render guard.
    // If a task is marked Non-Negotiable but cannot produce a fully-explained
    // context (title + action at minimum, no shorthand titles), drop the card.
    // Non-NN tasks are unaffected.
    const nnCtx = isNN ? buildNNContext(task.customActivityData?.template) : null;
    if (isNN && !nnCtx) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[HM-NN-INVALID]', task.customActivityData?.template?.id);
      }
      return null;
    }
    const showTimelineNumber = sortMode === 'timeline' && typeof index === 'number';
    const taskTime = taskTimes[task.id];
    const hasReminder = taskReminders[task.id];
    
    // Get dynamic colors based on task type
    const pendingColors = colors.gamePlan.pending;
    const trackingColors = colors.gamePlan.tracking;
    const texVisionColors = colors.gamePlan.texVision;
    
    // Custom activity / folder item uses its own color
    const customColor = task.folderItemData?.folderColor || task.customActivityData?.template.color || '#10b981';
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
          // NN tasks no longer get a red border/glow on the row — full NN context lives in the task detail.
          skipDimming && isCustom && "opacity-60 grayscale pointer-events-none",
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
            todayLocked ? "opacity-30" : "cursor-grab active:cursor-grabbing hover:text-white"
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
              {isNN && (
                <span
                  aria-label="Non-Negotiable"
                  title="Non-Negotiable — required for today's standard"
                  className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400"
                >
                  <Flame className="h-2.5 w-2.5 fill-red-500/60" />
                </span>
              )}
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
            {/* PHYSIO: Badge chips */}
            {(() => {
              const badges = getBadgesForTask(task.id);
              if (badges.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-1 mt-1">
                  {badges.map(badge => (
                    <Popover key={badge.type}>
                      <PopoverTrigger asChild>
                        <button className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          badge.color === 'red' && "bg-red-500/20 text-red-400 border-red-500/30",
                          badge.color === 'amber' && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                          badge.color === 'orange' && "bg-orange-500/20 text-orange-400 border-orange-500/30",
                          badge.color === 'yellow' && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                        )} onClick={e => e.stopPropagation()}>
                          {badge.label}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 text-xs p-3" onClick={e => e.stopPropagation()}>
                        <p>{badge.message}</p>
                        <p className="text-muted-foreground mt-2 text-[10px]">Educational only. Consult a professional for medical concerns.</p>
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
              );
            })()}
            {isNN && nnCtx ? (
              // Phase 12 — Structured NN body. Every NN ships with purpose,
              // action, and success criteria so the card is self-explanatory.
              <div className="mt-1 space-y-1">
                <p className={cn(
                  "text-[11px] sm:text-xs leading-snug",
                  task.completed ? "text-white/35" : "text-white/60"
                )}>
                  {nnCtx.purpose}
                </p>
                <p className={cn(
                  "text-xs sm:text-sm leading-snug",
                  task.completed ? "text-white/40" : "text-white/85"
                )}>
                  {nnCtx.action}
                </p>
                <p className={cn(
                  "text-[10px] sm:text-[11px] leading-snug",
                  task.completed ? "text-white/30" : "text-white/50"
                )}>
                  <span className="font-bold uppercase tracking-wider">Done when:</span>{' '}
                  {nnCtx.successCriteria}
                </p>
                {/* Phase 12.2 — gated manual completion. Renders timer / count /
                    binary controls inline. In-app NNs keep the standard tap-to-
                    complete behavior on the right-side check button. */}
                {nnCtx.completion?.kind === 'manual' && !task.completed && (
                  <NNManualCompletionGate
                    templateId={task.customActivityData!.template.id}
                    binding={nnCtx.completion}
                    successCriteria={nnCtx.successCriteria}
                    onSatisfied={(gate) => handleNNGateSatisfied(task, gate)}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-xs sm:text-sm line-clamp-1",
                  task.completed ? "text-white/40" : "text-white/70"
                )}>
                  {task.taskType === 'custom' ? (task.descriptionKey || t(`customActivity.types.${task.customActivityData?.template.activity_type}`)) : t(task.descriptionKey)}
                </p>
              </div>
            )}
          </div>
        </button>
        
        {/* Inline NN toggle — set/unset Non-Negotiable in 1 click (custom activities only) */}
        {isCustom && task.customActivityData?.template?.id && !hideNN && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const tpl = task.customActivityData!.template;
              toggleNonNegotiable(tpl.id, !!tpl.is_non_negotiable);
            }}
            title={isNN ? 'Remove from Non-Negotiables' : 'Mark as Non-Negotiable'}
            className={cn(
              "flex-shrink-0 h-8 w-8 rounded-md flex items-center justify-center transition-all",
              isNN
                ? "text-red-400 hover:bg-red-500/15"
                : "text-white/30 hover:text-red-300 hover:bg-white/5"
            )}
          >
            <Flame className={cn("h-4 w-4", isNN && "fill-red-400")} />
          </button>
        )}

        {/* Edit button - opens schedule drawer for system tasks, activity editor for custom */}
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
          onClick={(e) => { 
            e.stopPropagation(); 
            if (isCustom) {
              // For custom activities, open the full editor (includes delete button)
              handleCustomActivityFullEdit(task);
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

        {/* Send to Coach button - only for custom activities */}
        {isCustom && !task.completed && (
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
            onClick={(e) => {
              e.stopPropagation();
              setSendToCoachTitle(task.taskType === 'custom' ? task.titleKey : '');
              setSendToCoachTemplateData(task.customActivityData?.template as unknown as Json || null);
              setSendToCoachOpen(true);
            }}
            title="Send to Coach for Edit"
          >
            <GraduationCap className="h-4 w-4" />
          </Button>
        )}
        
        {/* Status indicator - clickable for custom activities with prominent styling.
            Phase 12.2: for manual NNs, this button is gated — completion must
            go through the inline timer/count/binary gate inside the card body. */}
        {(() => {
          const isManualNN = !!(isNN && nnCtx?.completion?.kind === 'manual' && !task.completed);
          return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (task.folderItemData) {
              setSelectedFolderTask(task);
              setFolderLoggerOpen(true);
              setUrlParam('folderItemId', task.folderItemData.itemId);
            } else if (isCustom) {
              if (isManualNN) {
                toast.info('Use the timer or counter on this card to complete.');
                return;
              }
              handleCustomActivityToggle(task);
            }
          }}
          disabled={!isCustom || isManualNN}
          className={cn(
            "flex-shrink-0 rounded-full flex items-center justify-center transition-all",
            task.completed && "bg-green-500 text-white",
            isCustom && !task.completed && !isManualNN && "hover:scale-110 cursor-pointer",
            isManualNN && "opacity-40 cursor-not-allowed",
            // Larger touch target for custom activities
            isCustom ? "h-10 w-10 sm:h-11 sm:w-11" : "h-7 w-7 sm:h-8 sm:w-8"
          )}
          style={!task.completed ? {
            border: `3px ${isCustom ? 'solid' : 'dashed'} ${activeColors.border}`,
            backgroundColor: isCustom ? hexToRgba(customColor, 0.2) : undefined,
          } : undefined}
          title={
            isManualNN
              ? 'Complete the gate inside this card to finish'
              : (isCustom ? (task.completed ? t('customActivity.unmarkedComplete') : t('customActivity.detail.markComplete')) : undefined)
          }
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
          );
        })()}

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
              <Reorder.Item key={task.id} value={task} drag={!todayLocked}>
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

  // Calendar view removed - now use dedicated /calendar page
  // Users can access via navigation sidebar

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-3 border-primary bg-secondary shadow-2xl transition-shadow duration-700",
        pulseStandard && "ring-2 ring-emerald-500/60 shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)]"
      )}
    >
      {/* Athletic diagonal stripe accent */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 transform rotate-45 translate-x-20 -translate-y-20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 transform -rotate-45 -translate-x-16 translate-y-16" />

      <CardContent className="relative p-4 sm:p-6 space-y-4">
        {/* Phase 10.4 — Live Standard Header (single source of truth) */}
        <StandardAwarenessHeader
          status={dailyOutcome.status}
          remaining={nnRemaining}
          showRemaining={standardIncomplete}
          loading={dailyOutcome.loading}
        />

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
            <SchedulePracticeDialog />
            {/* Skip Day / Undo Skip */}
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (daySkipped) {
                  for (const id of skippedTaskIdsRef.current) await handleRestoreTask(id);
                  skippedTaskIdsRef.current = [];
                  setDaySkipped(false);
                  toast.success('Day restored');
                } else {
                  const allTaskIds = tasks.filter(t => !t.completed).map(t => t.id);
                  if (allTaskIds.length === 0) { toast.info('No tasks to skip'); return; }
                  for (const id of allTaskIds) await handleSkipTask(id);
                  skippedTaskIdsRef.current = allTaskIds;
                  setDaySkipped(true);
                  toast.success(`Skipped ${allTaskIds.length} tasks for today`);
                }
              }}
              className={daySkipped
                ? "text-green-400 hover:text-green-300 h-8 px-2 gap-1 text-xs font-medium"
                : "text-amber-400 hover:text-amber-300 h-8 px-2 gap-1 text-xs font-medium"
              }
            >
              {daySkipped ? <Undo2 className="h-3.5 w-3.5" /> : <SkipForward className="h-3.5 w-3.5" />}
              {daySkipped ? 'Undo Skip' : 'Skip Day'}
            </Button>
            {/* Sort mode toggle - 3-segment Auto / Timeline / Manual */}
            <div className="inline-flex items-center rounded-md border border-white/10 bg-white/5 p-0.5 h-8">
              {([
                { mode: 'auto' as const, label: t('gamePlan.autoSort'), Icon: ArrowUpDown },
                { mode: 'timeline' as const, label: t('gamePlan.timelineSort'), Icon: Clock },
                { mode: 'manual' as const, label: t('gamePlan.manualSort'), Icon: GripVertical },
              ]).map(({ mode, label, Icon }) => {
                const active = sortMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => selectSortMode(mode)}
                    className={cn(
                      "flex items-center gap-1 px-2 h-7 rounded text-[11px] font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-white/60 hover:text-white"
                    )}
                    aria-pressed={active}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Lock Order dropdown (always available) */}
            {(
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2 gap-1",
                      isDateLockedToday ? "text-yellow-400" : isWeeklyLocked ? "text-amber-300" : "text-white/70 hover:text-white"
                    )}
                  >
                    {todayLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    {isDateLockedToday && <span className="text-[10px] font-bold hidden sm:inline">DAY</span>}
                    {isWeeklyLocked && <span className="text-[10px] font-bold hidden sm:inline">WK</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="space-y-1">
                    {/* Unlock Today - shown when date-specific lock exists */}
                    {isDateLockedToday && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-yellow-500 hover:text-yellow-600"
                        onClick={async () => {
                          const today = new Date();
                          await unlockDate(today);
                          await refetchDayOrders();
                          toast.success(t('gamePlan.lockOrder.unlocked', 'Day unlocked'));
                        }}
                      >
                        <Unlock className="h-4 w-4 mr-2" />
                        {t('gamePlan.lockOrder.unlockToday', 'Unlock Today')}
                      </Button>
                    )}
                    
                    {/* Lock current order for today */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={handleLockCurrentOrder}
                      disabled={isDateLockedToday}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {t('gamePlan.lockOrder.forToday', 'Lock for Today')}
                    </Button>
                    
                    {/* Lock for multiple days */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => setLockDialogOpen(true)}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {t('gamePlan.lockOrder.lockForDays', 'Lock for Days...')}
                    </Button>
                    
                    {/* Unlock for week - opens dialog */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={handleOpenUnlockDialog}
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      {t('gamePlan.lockOrder.unlockForWeek', 'Unlock for Week...')}
                    </Button>
                    
                    {/* Show lock source indicator */}
                    {todayLocked && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1 pt-2">
                        <span className="flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          {isDateLockedToday 
                            ? t('gamePlan.lockOrder.lockedForToday', 'Today: Day Locked')
                            : t('gamePlan.lockOrder.lockedWeekly', 'Today: Weekly Lock')
                          }
                        </span>
                      </div>
                    )}
                    
                    {/* Show weekly locked days count */}
                    {lockedDayNumbers.length > 0 && (
                      <div className="px-2 py-1 text-xs text-muted-foreground">
                        {t('gamePlan.lockOrder.weeklyLocked', 'Weekly:')} {lockedDayNumbers.length} {t('gamePlan.lockOrder.daysLabel', 'days')}
                      </div>
                    )}
                  </div>
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
                  {skippedTasksList.length > 0 && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-full">
                      {skippedTasksList.length} skipped
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 6-Week Recap Countdown - Compact Box */}
        <div className={cn(
          "flex items-center gap-3 bg-background/10 backdrop-blur-sm px-4 py-2 rounded-xl border transition-all duration-300",
          (canGenerateRecap || hasMissedRecap) && !waitingForProgressReports
            ? "border-violet-500 ring-2 ring-violet-500/30" 
            : waitingForProgressReports
              ? "border-cyan-500 ring-2 ring-cyan-500/30"
              : "border-primary/30"
        )}>
          <Clock className={cn(
            "h-4 w-4 flex-shrink-0",
            (canGenerateRecap || hasMissedRecap) && !waitingForProgressReports ? "text-violet-500" : 
            waitingForProgressReports ? "text-cyan-500" : "text-primary"
          )} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/70 uppercase tracking-wide">
                {t('gamePlan.recapCountdown.title')}
              </span>
              <Progress value={waitingForProgressReports ? 100 : recapProgress} className="h-1.5 flex-1 bg-muted/20 max-w-24" />
            </div>
          </div>
          
          {waitingForProgressReports ? (
            <Button
              size="sm"
              onClick={() => navigate('/vault?openSection=six-week-checkin')}
              className="gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-white h-7 px-3"
            >
              <Target className="h-3 w-3" />
              <span className="text-xs font-bold">{t('gamePlan.recapCountdown.goToVault')}</span>
            </Button>
          ) : (canGenerateRecap || hasMissedRecap) ? (
            <Button
              size="sm"
              onClick={() => navigate('/vault?openSection=recap-generation')}
              className="gap-1.5 bg-violet-500 hover:bg-violet-600 text-white animate-pulse h-7 px-3"
            >
              <Sparkles className="h-3 w-3" />
              <span className="text-xs font-bold">{t('gamePlan.recapCountdown.generateRecap')}</span>
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/30 flex-shrink-0">
              <span className="text-sm font-black text-primary">
                {daysUntilRecap}
              </span>
              <span className="text-[10px] font-bold text-white/70 uppercase">
                {t('gamePlan.recapCountdown.days')}
              </span>
            </div>
          )}
        </div>

        {/* Skipped Tasks Section - Always visible, before task list */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <Collapsible open={showSkippedSection} onOpenChange={setShowSkippedSection}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-amber-400/80 py-2 w-full hover:text-amber-300 transition-colors font-medium">
              <ChevronDown className={cn("h-4 w-4 transition-transform", showSkippedSection && "rotate-180")} />
              {t('gamePlan.skippedForToday', 'Skipped for today')} ({skippedTasksList.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {skippedTasksList.length === 0 ? (
                <p className="text-xs text-white/40 italic pl-6 py-2">
                  {t('gamePlan.noSkippedTasks', 'No activities skipped today')}
                </p>
              ) : (
                skippedTasksList.map(task => {
                  const Icon = task.icon;
                  const isWeeklySkippedTask = isWeeklySkipped(task) && !skippedTasks.has(task.id);
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
                        {isWeeklySkippedTask && (
                          <span className="text-[10px] text-amber-400/70 font-medium flex items-center gap-1 mt-0.5">
                            <CalendarDays className="h-3 w-3" />
                            {t('gamePlan.taskSchedule.scheduledOff', 'Scheduled off')}
                          </span>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => isWeeklySkippedTask 
                          ? (task.taskType === 'custom' ? setActiveCustomScheduleTask(task) : setActiveScheduleTaskId(task.id))
                          : handleRestoreTask(task.id)
                        }
                        className="h-10 px-3 text-green-400 hover:text-green-300 hover:bg-green-500/10 gap-1"
                      >
                        {isWeeklySkippedTask ? (
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
                })
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Task Sections */}
        <PhysioPostWorkoutBanner />
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
              <Reorder.Group axis="y" values={timelineVisibleTasks} onReorder={handleReorderTimeline} className="space-y-2">
                {timelineVisibleTasks.map((task, index) => (
                  <Reorder.Item 
                    key={task.id} 
                    value={task}
                    drag={!todayLocked}
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setQuickNoteOpen(true)}
                  className="gap-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                >
                  <NotebookPen className="h-4 w-4" />
                  Quick Note
                </Button>
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

              {/* Coach Activities Section - Only visible when pending activities exist */}
              {pendingCount > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="h-px flex-1 bg-blue-500/30" />
                    <UserCheck className="h-4 w-4" />
                    {t('gamePlan.sections.coachActivities', 'Coach Activities')}
                    <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-blue-500 text-white text-xs font-bold">
                      {pendingCount}
                    </span>
                    <span className="h-px flex-1 bg-blue-500/30" />
                  </h3>
                  
                  <div className="space-y-2">
                    {pendingActivities.map(activity => (
                      <PendingCoachActivityCard
                        key={activity.id}
                        activity={activity}
                        onAccept={async () => {
                          const template = await acceptActivity(activity.id, createTemplate);
                          if (template) {
                            refetch();
                            refetchActivities();
                          }
                        }}
                        onReject={async () => {
                          await rejectActivity(activity.id);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Session Approvals */}
              <PendingSessionApprovals />

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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQuickNoteOpen(true)}
                    className="gap-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  >
                    <NotebookPen className="h-4 w-4" />
                    Quick Note
                  </Button>
                </div>
                
                {customTasks.length > 0 && (() => {
                  const isNNRow = (t: GamePlanTask) => !!t.customActivityData?.template?.is_non_negotiable;
                  const nnTasks  = customTasks.filter(isNNRow);
                  const optTasks = customTasks.filter(t => !isNNRow(t));
                  const nnOrdered  = orderedCustom.filter(isNNRow);
                  const optOrdered = orderedCustom.filter(t => !isNNRow(t));
                  return (
                    <div className="space-y-4">
                      {/* NON-NEGOTIABLES — required, always rendered first; hidden on rest day */}
                      {!hideNN && nnTasks.length > 0 && (
                        <div
                          id="nn-section"
                          className={cn(
                            "space-y-1 rounded-xl scroll-mt-4",
                            pushGlow && "ring-2 ring-amber-500/40 p-2"
                          )}
                        >
                          <div className="px-1">
                            <p className="text-[10px] uppercase tracking-widest text-red-300/80 font-bold">
                              Required — standard is built here
                            </p>
                          </div>
                          {renderTaskSection(
                            nnTasks,
                            nnOrdered,
                            (newOrder) => handleReorderCustom([...newOrder, ...optOrdered]),
                            'NON-NEGOTIABLES',
                            'text-red-400',
                            'bg-red-500/40',
                          )}
                        </div>
                      )}

                      {/* OPTIONAL WORK */}
                      {optTasks.length > 0 && renderTaskSection(
                        optTasks,
                        optOrdered,
                        (newOrder) => handleReorderCustom([...nnOrdered, ...newOrder]),
                        hideNN ? '' : 'OPTIONAL WORK',
                        'text-emerald-400',
                        'bg-emerald-500/30',
                      )}

                      {/* When hiding NN (rest day), still render NN tasks under OPTIONAL silently */}
                      {hideNN && nnTasks.length > 0 && renderTaskSection(
                        nnTasks,
                        nnOrdered,
                        (newOrder) => handleReorderCustom([...newOrder, ...optOrdered]),
                        '',
                        'text-emerald-400',
                        'bg-emerald-500/30',
                      )}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {/* Skipped tasks section removed from here - moved higher */}

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
        existingNightQuiz={todaysQuizzes.find(q => q.quiz_type === 'night') ?? null}
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
          // Guard against overlapping updates from rapid double-clicks
          if (isUpdatingRef.current) return;
          isUpdatingRef.current = true;
          try {
          let result;
          if (editingTemplate) {
            // Snapshot for rollback
            const previousTemplate = customActivities.find(a => a.template.id === editingTemplate.id)?.template;
            // Optimistic update: patch UI immediately before DB write
            updateOptimisticActivity(editingTemplate.id, data as Partial<CustomActivityTemplate>);
            // Update existing template
            result = await updateTemplate(editingTemplate.id, data);
            if (result) {
              setEditingTemplate(null);
              // Delayed background refresh to guarantee DB/UI consistency
              setTimeout(() => refreshCustomActivities(), 400);
            } else if (previousTemplate) {
              // Instant rollback to previous state
              updateOptimisticActivity(editingTemplate.id, previousTemplate);
            }
          } else {
            // Create new template
            result = await createTemplate(data as Omit<CustomActivityTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>, scheduleForToday);
            if (result) {
              toast.success(t('customActivity.saved'));
              const todayDayOfWeek = new Date().getDay();
              const isScheduledForToday = scheduleForToday ||
                (result.recurring_active && (result.recurring_days as number[] || []).includes(todayDayOfWeek));

              if (isScheduledForToday) {
                // 1. Instantly inject into Game Plan UI (0ms)
                addOptimisticActivity({
                  template: result,
                  log: scheduleForToday
                    ? {
                        id: `optimistic-${result.id}`,
                        user_id: result.user_id,
                        template_id: result.id,
                        entry_date: getTodayDate(),
                        completed: false,
                        completed_at: undefined,
                        created_at: new Date().toISOString(),
                        notes: undefined,
                        actual_duration_minutes: undefined,
                        performance_data: {},
                      }
                    : undefined,
                  isRecurring: result.recurring_active || false,
                  isScheduledForToday: true,
                });
                // 2. Background: confirm with lightweight DB refresh
                refreshCustomActivities();
              }

              setEditingTemplate(null);
            }
          }
          return result;
          } finally {
            isUpdatingRef.current = false;
          }
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
        onOpenChange={handleDetailClose}
        task={selectedCustomTask}
        taskTime={selectedCustomTask ? taskTimes[selectedCustomTask.id] || null : null}
        taskReminder={selectedCustomTask ? taskReminders[selectedCustomTask.id] || null : null}
        onComplete={() => {
          if (selectedCustomTask) {
            handleCustomActivityToggle(selectedCustomTask);
          }
        }}
        onDone={async () => {
          if (!selectedCustomTask?.customActivityData) return;
          const template = selectedCustomTask.customActivityData.template;
          const logId = selectedCustomTask.customActivityData.log?.id;
          await setCompletionState(template.id, 'completed', 'done_button', logId);
          triggerCelebration();
          toast.success(t('customActivity.markedComplete', 'Marked complete'));
          refetch();
        }}
        onCheckAll={async () => {
          if (!selectedCustomTask?.customActivityData) return;
          const template = selectedCustomTask.customActivityData.template;
          const logId = selectedCustomTask.customActivityData.log?.id;
          const allIds = getAllCheckableIds(template);
          await markAllCheckboxesAndComplete(template.id, allIds, logId);
          triggerCelebration();
          toast.success(t('customActivity.allTasksComplete', 'All tasks complete! 🎉'));
          refetch();
        }}
        onReopen={async () => {
          if (!selectedCustomTask?.customActivityData) return;
          const template = selectedCustomTask.customActivityData.template;
          const logId = selectedCustomTask.customActivityData.log?.id;
          await reopenActivity(template.id, logId);
          refetch();
        }}
        onEdit={() => {
          if (selectedCustomTask) {
            handleCustomActivityFullEdit(selectedCustomTask);
            handleDetailClose(false);
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

            // DEMOTE rule: if user previously clicked "Mark all complete" (check_all)
            // and is now unchecking a box, demote completion back to in_progress.
            const currentState = (log as any).completion_state as string | undefined;
            const currentMethod = (log as any).completion_method as string | undefined;
            if (!checked && currentState === 'completed' && currentMethod === 'check_all') {
              await setCompletionState(template.id, 'in_progress', 'none');
              setSelectedCustomTask(prev => prev ? {
                ...prev,
                completed: false,
                completionState: 'in_progress',
                completionMethod: 'none',
                customActivityData: prev.customActivityData ? {
                  ...prev.customActivityData,
                  log: { ...prev.customActivityData.log!, completed: false, completion_state: 'in_progress', completion_method: 'none' } as any,
                } : undefined,
              } : null);
            }

            // Background refresh (safe - dialog won't unmount)
            refetch();
          } catch (error) {
            console.error('Error toggling checkbox:', error);
            toast.error(t('common.error'));
          }
        }}
        onUpdateFieldValue={async (fieldId, value) => {
          if (!selectedCustomTask?.customActivityData) return;
          
          try {
            const template = selectedCustomTask.customActivityData.template;
            let log = selectedCustomTask.customActivityData.log;
            
            // Build new field values
            const currentData = (log?.performance_data as Record<string, any>) || {};
            const currentFieldValues = (currentData.fieldValues as Record<string, string>) || {};
            const newFieldValues = { ...currentFieldValues, [fieldId]: value };
            const newPerformanceData = { ...currentData, fieldValues: newFieldValues };
            
            // OPTIMISTIC UI UPDATE
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
            
            // ENSURE LOG EXISTS
            if (!log) {
              const newLog = await ensureLogExists(template.id);
              if (!newLog) {
                toast.error(t('customActivity.addError'));
                return;
              }
              log = newLog;
              
              setSelectedCustomTask(prev => prev ? {
                ...prev,
                customActivityData: prev.customActivityData ? {
                  ...prev.customActivityData,
                  log: { ...log!, performance_data: newPerformanceData }
                } : undefined
              } : null);
            }
            
            // PERSIST
            await updateLogPerformanceData(log.id, newPerformanceData);
            refetch();
          } catch (error) {
            console.error('Error updating field value:', error);
            toast.error(t('common.error'));
          }
        }}
        onSkipTask={() => {
          if (selectedCustomTask) {
            handleSkipTask(selectedCustomTask.id);
            handleDetailClose(false);
          }
        }}
        onSavePerformanceData={async (data) => {
          if (!selectedCustomTask?.customActivityData) return;
          const template = selectedCustomTask.customActivityData.template;
          let log = selectedCustomTask.customActivityData.log;
          if (!log) {
            log = await ensureLogExists(template.id);
            if (!log) return;
          }
          const currentPd = (log.performance_data as Record<string, any>) || {};
          await updateLogPerformanceData(log.id, { ...currentPd, ...data });
          setSelectedCustomTask(prev => {
            if (!prev?.customActivityData) return prev;
            return {
              ...prev,
              customActivityData: {
                ...prev.customActivityData,
                log: prev.customActivityData.log 
                  ? { ...prev.customActivityData.log, performance_data: { ...currentPd, ...data } }
                  : { id: 'pending', template_id: template.id, completed: false, performance_data: { ...currentPd, ...data } } as any
              }
            };
          });
          toast.success('Performance data saved');
          refetch();
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
            // Small delay to let DB settle, then refetch game plan
            await new Promise(r => setTimeout(r, 300));
            await refetch();
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
      
      {/* Unlock Day Picker Dialog */}
      <UnlockDayPickerDialog
        open={unlockDialogOpen}
        onOpenChange={setUnlockDialogOpen}
        lockedDays={lockedDayNumbers}
        onSave={handleUnlockSave}
      />
      
      {/* Lock Day Picker Dialog */}
      <LockDayPickerDialog
        open={lockDialogOpen}
        onOpenChange={setLockDialogOpen}
        lockedDays={lockedDayNumbers}
        onSave={handleLockDays}
      />
      
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
      
      {/* System Task Schedule Drawer - for configuring weekly repeat days */}
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
          // Find task to determine correct item_type
          const allTasksList = [...orderedCheckin, ...orderedTraining, ...orderedTracking, ...orderedCustom, ...timelineTasks];
          const task = allTasksList.find(t => t.id === activeScheduleTaskId);
          const itemType = task?.taskType === 'workout' ? 'program' : 'game_plan';
          // Load from calendar_skipped_items and convert skip days to display days
          const skipDays = getSkipDays(activeScheduleTaskId, itemType);
          return skipDaysToDisplayDays(skipDays);
        })()}
        currentDisplayTime={activeScheduleTaskId ? (getSchedule(activeScheduleTaskId)?.display_time || taskTimes[activeScheduleTaskId] || null) : null}
        currentReminderEnabled={activeScheduleTaskId ? (getSchedule(activeScheduleTaskId)?.reminder_enabled || false) : false}
        currentReminderMinutes={activeScheduleTaskId ? (getSchedule(activeScheduleTaskId)?.reminder_minutes || 15) : 15}
        onSave={async (displayDays, displayTime, reminderEnabled, reminderMinutes) => {
          if (activeScheduleTaskId) {
            // Find task to determine correct item_type
            const allTasksList = [...orderedCheckin, ...orderedTraining, ...orderedTracking, ...orderedCustom, ...timelineTasks];
            const task = allTasksList.find(t => t.id === activeScheduleTaskId);
            const itemType = task?.taskType === 'workout' ? 'program' : 'game_plan';
            
            // Convert display days to skip days and save to calendar_skipped_items
            const skipDays = displayDaysToSkipDays(displayDays);
            const skipSuccess = await updateSkipDays(activeScheduleTaskId, itemType, skipDays);
            
            // Also save time/reminder to game_plan_task_schedule (for time/reminder only)
            await saveTaskSchedule(activeScheduleTaskId, displayDays, displayTime, reminderEnabled, reminderMinutes);
            
            if (skipSuccess) {
              setTaskTimes(prev => ({ ...prev, [activeScheduleTaskId]: displayTime }));
              setTaskReminders(prev => ({ ...prev, [activeScheduleTaskId]: reminderEnabled ? reminderMinutes : null }));
              // Refetch calendar skips to update UI
              refetchCalendarSkips();
            }
            return skipSuccess;
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
      
      {/* Custom Activity Schedule Drawer - same UI as system tasks */}
      <SystemTaskScheduleDrawer
        open={activeCustomScheduleTask !== null}
        onOpenChange={(open) => { if (!open) setActiveCustomScheduleTask(null); }}
        taskId={activeCustomScheduleTask?.customActivityData?.template.id || ''}
        taskTitle={activeCustomScheduleTask?.titleKey || ''}
        currentDisplayDays={(() => {
          if (!activeCustomScheduleTask?.customActivityData) return [...ALL_DAYS];
          const templateId = `template-${activeCustomScheduleTask.customActivityData.template.id}`;
          // Load from calendar_skipped_items and convert skip days to display days
          const skipDays = getSkipDays(templateId, 'custom_activity');
          if (skipDays.length > 0) {
            return skipDaysToDisplayDays(skipDays);
          }
          // Fallback to template's display_days or recurring_days
          const template = activeCustomScheduleTask.customActivityData.template;
          return (template.display_days as number[]) || template.recurring_days || [...ALL_DAYS];
        })()}
        currentDisplayTime={activeCustomScheduleTask?.customActivityData?.template.display_time || null}
        currentReminderEnabled={activeCustomScheduleTask?.customActivityData?.template.reminder_enabled || false}
        currentReminderMinutes={activeCustomScheduleTask?.customActivityData?.template.reminder_minutes || 15}
        onSave={async (displayDays, displayTime, reminderEnabled, reminderMinutes) => {
          if (activeCustomScheduleTask?.customActivityData) {
            const templateId = activeCustomScheduleTask.customActivityData.template.id;
            const itemId = `template-${templateId}`;
            
            // Convert display days to skip days and save to calendar_skipped_items
            const skipDays = displayDaysToSkipDays(displayDays);
            const skipSuccess = await updateSkipDays(itemId, 'custom_activity', skipDays);
            
            // Also update template schedule for backwards compatibility
            await updateTemplateSchedule(templateId, displayDays, displayTime, reminderEnabled, reminderMinutes);
            
            if (skipSuccess) {
              setTaskTimes(prev => ({ ...prev, [activeCustomScheduleTask.id]: displayTime }));
              setTaskReminders(prev => ({ ...prev, [activeCustomScheduleTask.id]: reminderEnabled ? reminderMinutes : null }));
              refetchCalendarSkips();
              refetch();
            }
            return skipSuccess;
          }
          return false;
        }}
        onSkipTask={() => {
          if (activeCustomScheduleTask) {
            handleSkipTask(activeCustomScheduleTask.id);
          }
        }}
        showSkipOption={true}
      />
      {/* Folder Item Detail Dialog (Unified with Custom Activity layout) */}
      {selectedFolderTask?.folderItemData && (() => {
        const ft = folderTasks.find(ft => ft.item.id === selectedFolderTask.folderItemData!.itemId);
        const item = ft?.item;
        const snapshot = (item as any)?.template_snapshot;

        // If item has a template_snapshot, render via CustomActivityDetailDialog for pixel-perfect parity
        if (snapshot && item) {
          const pseudoTemplate: CustomActivityTemplate = {
            id: item.id,
            user_id: '',
            title: item.title,
            description: item.description || null,
            activity_type: snapshot.activity_type || item.item_type || 'workout',
            icon: snapshot.icon || selectedFolderTask.folderItemData.folderIcon || 'clipboard',
            color: snapshot.color || selectedFolderTask.folderItemData.folderColor || '#6366f1',
            duration_minutes: snapshot.duration_minutes || item.duration_minutes || null,
            intensity: snapshot.intensity || null,
            exercises: snapshot.exercises || item.exercises || [],
            meals: snapshot.meals || { items: [], vitamins: [], supplements: [] },
            custom_fields: snapshot.custom_fields || [],
            intervals: snapshot.intervals || [],
            embedded_running_sessions: snapshot.embedded_running_sessions || [],
            sport: selectedSport,
            is_favorited: false,
            recurring_active: false,
            recurring_days: [],
            created_at: item.created_at,
            updated_at: null,
            display_nickname: snapshot.display_nickname || null,
            custom_logo_url: snapshot.custom_logo_url || null,
            pace_value: null,
            distance_value: null,
            distance_unit: null,
            deleted_at: null,
            display_on_game_plan: true,
            display_days: null,
            display_time: null,
            reminder_enabled: false,
            reminder_time: null,
            reminder_minutes: null,
          };

          const performanceData = ft?.performanceData as Record<string, any> | null;
          const pseudoLog = {
            id: ft?.completionId || '',
            user_id: '',
            template_id: item.id,
            entry_date: getTodayDate(),
            completed: selectedFolderTask.completed,
            completed_at: null,
            created_at: '',
            notes: null,
            performance_data: performanceData || null,
            actual_duration_minutes: null,
            start_time: null,
            sort_order: null,
            reminder_minutes: null,
          };

          const pseudoTask: GamePlanTask = {
            ...selectedFolderTask,
            customActivityData: {
              template: pseudoTemplate,
              log: pseudoLog as any,
              isRecurring: false,
              isScheduledForToday: true,
            },
          };

          const folderTaskTime = taskTimes[selectedFolderTask.id] || null;
          const folderTaskReminder = taskReminders[selectedFolderTask.id] || null;

          return (
            <>
              <CustomActivityDetailDialog
                open={folderLoggerOpen}
                onOpenChange={handleFolderLoggerClose}
                task={pseudoTask}
                taskTime={folderTaskTime}
                taskReminder={folderTaskReminder}
                categoryLabel={selectedFolderTask.folderItemData.folderName}
                hideEdit={!selectedFolderTask.folderItemData.isOwner}
                onComplete={() => {
                   toggleFolderItemCompletion(selectedFolderTask.folderItemData!.itemId);
                   toast.success(selectedFolderTask.completed ? t('customActivity.unmarkedComplete') : t('customActivity.markedComplete'));
                   handleFolderLoggerClose(false);
                }}
                onDone={async () => {
                  const itemId = selectedFolderTask.folderItemData!.itemId;
                  await setFolderItemCompletionState(itemId, 'completed', 'done_button');
                  triggerCelebration();
                  toast.success(t('customActivity.markedComplete', 'Marked complete'));
                }}
                onCheckAll={async () => {
                  const itemId = selectedFolderTask.folderItemData!.itemId;
                  const allIds = getAllCheckableIds(pseudoTemplate);
                  await markFolderItemAllAndComplete(itemId, allIds);
                  triggerCelebration();
                  toast.success(t('customActivity.allTasksComplete', 'All tasks complete! 🎉'));
                }}
                onReopen={async () => {
                  const itemId = selectedFolderTask.folderItemData!.itemId;
                  await reopenFolderItem(itemId);
                }}
               onEdit={() => {
                   handleFolderLoggerClose(false);
                  setFolderItemEditOpen(true);
                }}
                onSaveTime={(time, reminder) => {
                  setTaskTimes(prev => ({ ...prev, [selectedFolderTask.id]: time }));
                  setTaskReminders(prev => ({ ...prev, [selectedFolderTask.id]: reminder }));
                }}
                onToggleCheckbox={async (fieldId, checked) => {
                  const itemId = selectedFolderTask.folderItemData!.itemId;
                  const currentPd = performanceData || {};
                  const currentStates = (currentPd.checkboxStates as Record<string, boolean>) || {};
                  const newStates = { ...currentStates, [fieldId]: checked };

                  // Optimistic update so the dialog re-renders immediately
                  setSelectedFolderTask(prev => {
                    if (!prev?.customActivityData) return prev;
                    const prevPd = (prev.customActivityData.log?.performance_data as Record<string, any>) || {};
                    return {
                      ...prev,
                      customActivityData: {
                        ...prev.customActivityData,
                        log: {
                          ...(prev.customActivityData.log as any),
                          performance_data: { ...prevPd, checkboxStates: newStates },
                        } as any,
                      },
                    };
                  });

                  await saveFolderCheckboxState(itemId, newStates);

                  // DEMOTE rule: if previously marked complete via check_all and user unchecks → in_progress
                  const currentState = (selectedFolderTask as any).completionState as string | undefined;
                  const currentMethod = (selectedFolderTask as any).completionMethod as string | undefined;
                  if (!checked && currentState === 'completed' && currentMethod === 'check_all') {
                    await setFolderItemCompletionState(itemId, 'in_progress', 'none');
                    setSelectedFolderTask(prev => prev ? { ...prev, completed: false, completionState: 'in_progress', completionMethod: 'none' } as any : null);
                  }
                }}
                onSavePerformanceData={async (data) => {
                  const itemId = selectedFolderTask.folderItemData!.itemId;
                  await saveFolderPerformanceData(itemId, data);
                  toast.success('Performance data saved');
                }}
                onSkipTask={() => {
                  handleSkipTask(selectedFolderTask.id);
                   handleFolderLoggerClose(false);
                }}
              />
              {item && (
                <FolderItemEditDialog
                  open={folderItemEditOpen}
                  onOpenChange={setFolderItemEditOpen}
                  item={item}
                  onSaved={() => {
                    setFolderItemEditOpen(false);
                    refetch();
                  }}
                />
              )}
            </>
          );
        }

        // No template_snapshot: build pseudo-template from raw folder item fields
        const rawExercises = (item?.exercises as any[] | null) || [];
        const mappedExercises = rawExercises.map((ex: any, idx: number) => ({
          id: `folder_ex_${idx}`,
          name: ex.name || `Exercise ${idx + 1}`,
          type: ex.type || 'other',
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          weightUnit: ex.weight_unit || ex.weightUnit || 'lbs',
          duration: ex.duration,
          rest: ex.rest,
          notes: ex.notes,
        }));

        const folderColor = selectedFolderTask.folderItemData.folderColor;
        const folderIcon = selectedFolderTask.folderItemData.folderIcon || 'clipboard';

        const pseudoTemplate: CustomActivityTemplate = {
          id: item?.id || '',
          user_id: '',
          title: item?.title || selectedFolderTask.titleKey,
          description: item?.description || null,
          activity_type: (item?.item_type as any) || 'workout',
          icon: folderIcon,
          color: folderColor || '#6366f1',
          duration_minutes: item?.duration_minutes || null,
          intensity: null,
          exercises: mappedExercises,
          meals: { items: [], vitamins: [], supplements: [] },
          custom_fields: [],
          intervals: [],
          embedded_running_sessions: [],
          sport: selectedSport,
          is_favorited: false,
          recurring_active: false,
          recurring_days: [],
          created_at: item?.created_at || '',
          updated_at: null,
          pace_value: null,
          distance_value: null,
          distance_unit: null,
          deleted_at: null,
          display_on_game_plan: true,
          display_days: null,
          display_time: null,
          reminder_enabled: false,
          reminder_time: null,
          reminder_minutes: null,
        };

        const performanceData = ft?.performanceData as Record<string, any> | null;
        const pseudoLog = {
          id: ft?.completionId || '',
          user_id: '',
          template_id: item?.id || '',
          entry_date: getTodayDate(),
          completed: selectedFolderTask.completed,
          completed_at: null,
          created_at: '',
          notes: item?.notes || null,
          performance_data: performanceData || null,
          actual_duration_minutes: null,
          start_time: null,
          sort_order: null,
          reminder_minutes: null,
        };

        const pseudoTask: GamePlanTask = {
          ...selectedFolderTask,
          customActivityData: {
            template: pseudoTemplate,
            log: pseudoLog as any,
            isRecurring: false,
            isScheduledForToday: true,
          },
        };

        const folderTaskTime = taskTimes[selectedFolderTask.id] || null;
        const folderTaskReminder = taskReminders[selectedFolderTask.id] || null;

        return (
          <>
            <CustomActivityDetailDialog
              open={folderLoggerOpen}
              onOpenChange={handleFolderLoggerClose}
              task={pseudoTask}
              taskTime={folderTaskTime}
              taskReminder={folderTaskReminder}
              categoryLabel={selectedFolderTask.folderItemData.folderName}
              hideEdit={!selectedFolderTask.folderItemData.isOwner}
              onComplete={() => {
                toggleFolderItemCompletion(selectedFolderTask.folderItemData!.itemId);
                toast.success(selectedFolderTask.completed ? t('customActivity.unmarkedComplete') : t('customActivity.markedComplete'));
                handleFolderLoggerClose(false);
              }}
              onDone={async () => {
                const itemId = selectedFolderTask.folderItemData!.itemId;
                await setFolderItemCompletionState(itemId, 'completed', 'done_button');
                triggerCelebration();
                toast.success(t('customActivity.markedComplete', 'Marked complete'));
              }}
              onCheckAll={async () => {
                const itemId = selectedFolderTask.folderItemData!.itemId;
                const allIds = getAllCheckableIds(pseudoTemplate);
                await markFolderItemAllAndComplete(itemId, allIds);
                triggerCelebration();
                toast.success(t('customActivity.allTasksComplete', 'All tasks complete! 🎉'));
              }}
              onReopen={async () => {
                const itemId = selectedFolderTask.folderItemData!.itemId;
                await reopenFolderItem(itemId);
              }}
              onEdit={() => {
                handleFolderLoggerClose(false);
                setFolderItemEditOpen(true);
              }}
              onSaveTime={(time, reminder) => {
                setTaskTimes(prev => ({ ...prev, [selectedFolderTask.id]: time }));
                setTaskReminders(prev => ({ ...prev, [selectedFolderTask.id]: reminder }));
              }}
              onToggleCheckbox={async (fieldId, checked) => {
                const itemId = selectedFolderTask.folderItemData!.itemId;
                const currentPd = performanceData || {};
                const currentStates = (currentPd.checkboxStates as Record<string, boolean>) || {};
                const newStates = { ...currentStates, [fieldId]: checked };

                // Optimistic update so the dialog re-renders immediately
                setSelectedFolderTask(prev => {
                  if (!prev?.customActivityData) return prev;
                  const prevPd = (prev.customActivityData.log?.performance_data as Record<string, any>) || {};
                  return {
                    ...prev,
                    customActivityData: {
                      ...prev.customActivityData,
                      log: {
                        ...(prev.customActivityData.log as any),
                        performance_data: { ...prevPd, checkboxStates: newStates },
                      } as any,
                    },
                  };
                });

                await saveFolderCheckboxState(itemId, newStates);

                // DEMOTE rule: if previously marked complete via check_all and user unchecks → in_progress
                const currentState = (selectedFolderTask as any).completionState as string | undefined;
                const currentMethod = (selectedFolderTask as any).completionMethod as string | undefined;
                if (!checked && currentState === 'completed' && currentMethod === 'check_all') {
                  await setFolderItemCompletionState(itemId, 'in_progress', 'none');
                  setSelectedFolderTask(prev => prev ? { ...prev, completed: false, completionState: 'in_progress', completionMethod: 'none' } as any : null);
                }
              }}
              onSkipTask={() => {
                handleSkipTask(selectedFolderTask.id);
                handleFolderLoggerClose(false);
              }}
            />
            {item && (
              <FolderItemEditDialog
                open={folderItemEditOpen}
                onOpenChange={setFolderItemEditOpen}
                item={item}
                onSaved={() => {
                  setFolderItemEditOpen(false);
                  refetch();
                }}
              />
            )}
          </>
        );
      })()}
      {/* Send to Coach Dialog */}
      <SendCardToCoachDialog
        open={sendToCoachOpen}
        onOpenChange={setSendToCoachOpen}
        folderId=""
        folderName="Custom Activities"
        itemTitle={sendToCoachTitle}
        templateData={sendToCoachTemplateData}
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



      {/* Quick Note Dialog */}
      <QuickNoteDialog open={quickNoteOpen} onOpenChange={setQuickNoteOpen} />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Phase 10.4 — Live Standard Awareness Header
// Sourced entirely from useDailyOutcome via props. No new logic.
// ─────────────────────────────────────────────────────────────────────

const STANDARD_HEADER_META: Record<DailyOutcomeStatus, {
  Icon: typeof CheckCircle2;
  borderClass: string;
  bgClass: string;
  textClass: string;
}> = {
  'STANDARD MET':     { Icon: CheckCircle2,   borderClass: 'border-emerald-500', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-300' },
  'STANDARD NOT MET': { Icon: AlertTriangle,  borderClass: 'border-rose-500',    bgClass: 'bg-rose-500/10',    textClass: 'text-rose-300' },
  'RECOVERY DAY':     { Icon: Moon,           borderClass: 'border-sky-500',     bgClass: 'bg-sky-500/10',     textClass: 'text-sky-300' },
  'SKIP REGISTERED':  { Icon: SkipForward,    borderClass: 'border-zinc-500',    bgClass: 'bg-zinc-500/10',    textClass: 'text-zinc-300' },
};

function StandardAwarenessHeader({
  status,
  remaining,
  showRemaining,
  loading,
}: {
  status: DailyOutcomeStatus;
  remaining: number;
  showRemaining: boolean;
  loading: boolean;
}) {
  if (loading) return null;
  const meta = STANDARD_HEADER_META[status];
  const Icon = meta.Icon;
  return (
    <div
      className={cn(
        'rounded-md border-l-4 px-3 py-2',
        meta.borderClass,
        meta.bgClass,
      )}
    >
      <div className={cn('flex items-center gap-2 text-sm font-bold uppercase tracking-wide', meta.textClass)}>
        <Icon className="h-4 w-4 shrink-0" />
        <span>{status}</span>
      </div>
      {showRemaining && remaining > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {remaining} required action{remaining === 1 ? '' : 's'} remaining
        </p>
      )}
    </div>
  );
}

