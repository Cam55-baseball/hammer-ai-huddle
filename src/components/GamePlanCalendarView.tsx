import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday, getDay } from 'date-fns';
import { Reorder } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Clock, Calendar, Lock, Unlock, Info, Copy, GripVertical, CalendarClock, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GamePlanTask } from '@/hooks/useGamePlan';
import { LockedDay, LockedDayScheduleItem, WeekOverride } from '@/hooks/useLockedDays';

interface TimelineTaskWithTime extends GamePlanTask {
  startTime?: string | null;
  order?: number;
}

interface GamePlanCalendarViewProps {
  tasks: TimelineTaskWithTime[];
  taskTimes: Record<string, string | null>;
  taskReminders: Record<string, number | null>;
  onDaySelect: (date: Date) => void;
  selectedDate: Date;
  lockedDays: Map<number, LockedDay>;
  weekOverrides: Map<string, WeekOverride>;
  onLockDay: (dayOfWeek: number, schedule: LockedDayScheduleItem[]) => Promise<boolean>;
  onUnlockDay: (dayOfWeek: number) => Promise<boolean>;
  onCopyDay: (sourceDayOfWeek: number, targetDays: number[]) => Promise<boolean>;
  onUnlockForWeek: (dayOfWeek: number) => Promise<boolean>;
  onSaveWeekOverride: (dayOfWeek: number, schedule: LockedDayScheduleItem[]) => Promise<boolean>;
  onDiscardWeekOverride: (dayOfWeek: number) => Promise<boolean>;
  hasWeekOverride: (dayOfWeek: number) => boolean;
  timelineTaskOrder?: string[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function GamePlanCalendarView({ 
  tasks, 
  taskTimes,
  taskReminders,
  onDaySelect, 
  selectedDate,
  lockedDays,
  weekOverrides,
  onLockDay,
  onUnlockDay,
  onCopyDay,
  onUnlockForWeek,
  onSaveWeekOverride,
  onDiscardWeekOverride,
  hasWeekOverride,
  timelineTaskOrder,
}: GamePlanCalendarViewProps) {
  const { t } = useTranslation();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [isLocking, setIsLocking] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [selectedCopyDays, setSelectedCopyDays] = useState<number[]>([]);
  const [reorderedTasks, setReorderedTasks] = useState<TimelineTaskWithTime[]>([]);
  const [hasReorderChanges, setHasReorderChanges] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [selectedUnlockDays, setSelectedUnlockDays] = useState<number[]>([]);

  const weekDays = useMemo(() => {
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end });
  }, [currentWeekStart]);

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    onDaySelect(new Date());
  };

  const selectedDayOfWeek = getDay(selectedDate);
  const isDayLocked = lockedDays.has(selectedDayOfWeek);
  const isDayOverridden = hasWeekOverride(selectedDayOfWeek);
  const lockedSchedule = lockedDays.get(selectedDayOfWeek)?.schedule || [];

  // Get effective schedule (week override takes priority)
  const getWeekKey = (dayOfWeek: number) => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return `${dayOfWeek}-${format(weekStart, 'yyyy-MM-dd')}`;
  };
  
  const effectiveSchedule = useMemo(() => {
    if (isDayOverridden) {
      const key = getWeekKey(selectedDayOfWeek);
      return weekOverrides.get(key)?.override_schedule || [];
    }
    return lockedSchedule;
  }, [isDayOverridden, selectedDayOfWeek, weekOverrides, lockedSchedule]);

  // Get tasks to display for the selected day
  const displayTasks = useMemo(() => {
    if (isDayLocked && effectiveSchedule.length > 0) {
      // For locked days, show tasks from the effective schedule (locked or override)
      return effectiveSchedule
        .map((item, index) => {
          const task = tasks.find(t => t.id === item.taskId);
          if (!task) return null;
          return {
            ...task,
            startTime: item.displayTime,
            order: item.order ?? index,
          };
        })
        .filter((t): t is TimelineTaskWithTime & { startTime: string | null; order: number } => t !== null)
        .sort((a, b) => {
          // Sort by order first
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          // Fallback to time
          if (!a.startTime && !b.startTime) return 0;
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return a.startTime.localeCompare(b.startTime);
        });
    } else {
      // For unlocked days, show tasks scheduled for that day of week
      // Use timeline order if available
      const orderedTasks = timelineTaskOrder 
        ? [...tasks].sort((a, b) => {
            const aIdx = timelineTaskOrder.indexOf(a.id);
            const bIdx = timelineTaskOrder.indexOf(b.id);
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          })
        : tasks;

      return orderedTasks
        .map((task, index) => ({
          ...task,
          startTime: taskTimes[task.id] || null,
          order: index,
        }))
        .filter(task => {
          // Check if task is scheduled for this day of week via custom activity display_days
          if (task.customActivityData?.template?.display_days) {
            return task.customActivityData.template.display_days.includes(selectedDayOfWeek);
          }
          // For system tasks, they're available all days unless scheduled otherwise
          return true;
        })
        .sort((a, b) => {
          // Sort by order (from timeline)
          return a.order - b.order;
        });
    }
  }, [tasks, taskTimes, isDayLocked, effectiveSchedule, selectedDayOfWeek, timelineTaskOrder]);

  // Track the key that determines when to reset reordered tasks
  const resetKey = `${selectedDayOfWeek}-${isDayLocked}-${isDayOverridden}-${effectiveSchedule.length}`;
  const prevResetKeyRef = useRef(resetKey);
  const initialLoadRef = useRef(true);

  // Initialize reordered tasks when the underlying data source changes
  useEffect(() => {
    if (prevResetKeyRef.current !== resetKey || initialLoadRef.current) {
      setReorderedTasks(displayTasks);
      setHasReorderChanges(false);
      prevResetKeyRef.current = resetKey;
      initialLoadRef.current = false;
    }
  }, [resetKey, displayTasks]);

  const formatTimeDisplay = (time: string | null): string => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleLockDay = async () => {
    setIsLocking(true);
    try {
      // Build current schedule from visible tasks with order
      const schedule: LockedDayScheduleItem[] = displayTasks.map((task, index) => ({
        taskId: task.id,
        displayTime: taskTimes[task.id] || null,
        reminderEnabled: taskReminders[task.id] !== null && taskReminders[task.id] !== undefined,
        reminderMinutes: taskReminders[task.id] || null,
        order: index,
      }));
      await onLockDay(selectedDayOfWeek, schedule);
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockDay = async () => {
    setIsLocking(true);
    try {
      await onUnlockDay(selectedDayOfWeek);
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockForWeek = async () => {
    setIsLocking(true);
    try {
      await onUnlockForWeek(selectedDayOfWeek);
    } finally {
      setIsLocking(false);
    }
  };

  const handleSaveWeekOverride = async () => {
    setIsLocking(true);
    try {
      const schedule: LockedDayScheduleItem[] = reorderedTasks.map((task, index) => ({
        taskId: task.id,
        displayTime: task.startTime || null,
        reminderEnabled: taskReminders[task.id] !== null && taskReminders[task.id] !== undefined,
        reminderMinutes: taskReminders[task.id] || null,
        order: index,
      }));
      await onSaveWeekOverride(selectedDayOfWeek, schedule);
      setHasReorderChanges(false);
    } finally {
      setIsLocking(false);
    }
  };

  const handleDiscardWeekOverride = async () => {
    setIsLocking(true);
    try {
      await onDiscardWeekOverride(selectedDayOfWeek);
      setHasReorderChanges(false);
    } finally {
      setIsLocking(false);
    }
  };

  const handleOpenCopyDialog = () => {
    setSelectedCopyDays([]);
    setCopyDialogOpen(true);
  };

  const handleCopyDay = async () => {
    if (selectedCopyDays.length === 0) return;
    setIsLocking(true);
    try {
      await onCopyDay(selectedDayOfWeek, selectedCopyDays);
      setCopyDialogOpen(false);
    } finally {
      setIsLocking(false);
    }
  };

  const toggleCopyDay = (day: number) => {
    setSelectedCopyDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleReorder = (newOrder: TimelineTaskWithTime[]) => {
    setReorderedTasks(newOrder);
    setHasReorderChanges(true);
  };

  const handleOpenUnlockDialog = () => {
    setSelectedUnlockDays([selectedDayOfWeek]);
    setUnlockDialogOpen(true);
  };

  const toggleUnlockDay = (day: number) => {
    setSelectedUnlockDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleUnlockMultipleDays = async () => {
    if (selectedUnlockDays.length === 0) return;
    setIsLocking(true);
    try {
      for (const day of selectedUnlockDays) {
        await onUnlockForWeek(day);
      }
      setUnlockDialogOpen(false);
    } finally {
      setIsLocking(false);
    }
  };

  const selectedDayName = DAY_NAMES[selectedDayOfWeek];
  const canReorder = isDayOverridden || !isDayLocked;

  return (
    <Card className="bg-background/50 border-primary/20">
      <CardContent className="p-4 space-y-4">
        {/* Week Navigation Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-white">
              {t('gamePlan.calendarView.title', 'Week Overview')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousWeek}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="text-xs h-7"
            >
              {t('gamePlan.calendarView.today', 'Today')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextWeek}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Week Header */}
        <div className="text-xs text-muted-foreground text-center">
          {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
        </div>

        {/* Day Selector */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const dayOfWeek = getDay(day);
            const isLocked = lockedDays.has(dayOfWeek);
            const isOverridden = hasWeekOverride(dayOfWeek);
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => onDaySelect(day)}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg transition-all relative",
                  "hover:bg-primary/20",
                  isSelected && "bg-primary text-primary-foreground",
                  isTodayDate && !isSelected && "ring-2 ring-primary/50",
                  isLocked && !isSelected && !isOverridden && "ring-2 ring-amber-500/50",
                  isOverridden && !isSelected && "ring-2 ring-blue-500/50"
                )}
              >
                {isLocked && (
                  <div className="absolute -top-1 -right-1">
                    <Lock className={cn(
                      "h-3 w-3",
                      isOverridden ? "text-blue-500" : "text-amber-500"
                    )} />
                  </div>
                )}
                <span className={cn(
                  "text-[10px] font-medium uppercase",
                  isSelected ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                  {format(day, 'EEE')}
                </span>
                <span className={cn(
                  "text-lg font-bold",
                  isSelected ? "text-primary-foreground" : "text-white"
                )}>
                  {format(day, 'd')}
                </span>
                {isTodayDate && (
                  <span className={cn(
                    "text-[8px] font-bold uppercase",
                    isSelected ? "text-primary-foreground/80" : "text-primary"
                  )}>
                    {t('gamePlan.calendarView.today', 'Today')}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Header with Lock/Unlock */}
        <div className="flex items-center justify-between py-2 border-t border-border/30">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">
              {format(selectedDate, 'EEEE, MMM d')}
            </span>
            {isDayLocked && !isDayOverridden && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold">
                <Lock className="h-3 w-3" />
                {t('gamePlan.calendarView.dayLocked', 'Locked')}
              </span>
            )}
            {isDayOverridden && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 text-xs font-bold">
                <CalendarClock className="h-3 w-3" />
                {t('gamePlan.lockedDays.weekOverrideActive', 'Week Override')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isDayOverridden ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDiscardWeekOverride}
                  disabled={isLocking}
                  className="h-8 text-xs font-bold"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  {t('gamePlan.lockedDays.discardWeekChanges', 'Discard')}
                </Button>
                {hasReorderChanges && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveWeekOverride}
                    disabled={isLocking}
                    className="h-8 text-xs font-bold"
                  >
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    {t('gamePlan.lockedDays.saveWeekChanges', 'Save')}
                  </Button>
                )}
              </>
            ) : isDayLocked ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenCopyDialog}
                  disabled={isLocking}
                  className="h-8 text-xs font-bold"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  {t('gamePlan.lockedDays.copyTo', 'Copy to...')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenUnlockDialog}
                  disabled={isLocking}
                  className="h-8 text-xs font-bold"
                >
                  <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                  {t('gamePlan.lockedDays.unlockForWeek', 'Unlock Order for This Week')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlockDay}
                  disabled={isLocking}
                  className="h-8 text-xs font-bold"
                >
                  <Unlock className="h-3.5 w-3.5 mr-1.5" />
                  {t('gamePlan.calendarView.unlockDay', 'Unlock')}
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleLockDay}
                disabled={isLocking}
                className="h-8 text-xs font-bold"
              >
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                {t('gamePlan.calendarView.lockDay', 'Lock Day')}
              </Button>
            )}
          </div>
        </div>

        {/* Info banner for locked days */}
        {isDayLocked && !isDayOverridden && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Info className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-500">
              {t('gamePlan.calendarView.lockedScheduleInfo', 'This schedule repeats every {{day}} until unlocked', { day: selectedDayName })}
            </p>
          </div>
        )}

        {/* Info banner for week override */}
        {isDayOverridden && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-500">
              {t('gamePlan.lockedDays.weekOverrideInfo', 'Custom order for this week only. Drag to reorder.')}
            </p>
          </div>
        )}

        {/* Activities List */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            {isDayLocked 
              ? t('gamePlan.calendarView.scheduledActivities', 'Scheduled Activities')
              : t('gamePlan.calendarView.activitiesForDay', 'Activities for {{day}}', { day: format(selectedDate, 'EEEE') })
            }
            {canReorder && displayTasks.length > 1 && (
              <span className="text-primary/70 font-normal normal-case">
                ({t('gamePlan.lockedDays.reorderHint', 'Drag to reorder')})
              </span>
            )}
          </h4>
          
          {displayTasks.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-muted-foreground">
                {t('gamePlan.calendarView.noActivitiesForDay', 'No activities scheduled for this day')}
              </p>
              {!isDayLocked && (
                <p className="text-xs text-primary/80">
                  {t('gamePlan.calendarView.lockToRepeat', 'Lock this day to repeat this schedule every week')}
                </p>
              )}
            </div>
          ) : (
            <ScrollArea className="h-48">
              {canReorder ? (
                <Reorder.Group
                  axis="y"
                  values={reorderedTasks}
                  onReorder={handleReorder}
                  className="space-y-1.5 pr-4"
                >
                  {reorderedTasks.map((task) => {
                    const Icon = task.icon;
                    return (
                      <Reorder.Item
                        key={task.id}
                        value={task}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-grab active:cursor-grabbing",
                          "bg-background/30 border border-border/30",
                          task.completed && "opacity-50"
                        )}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex items-center gap-1.5 text-primary min-w-[70px]">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs font-bold">
                            {formatTimeDisplay(task.startTime || null)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="p-1.5 rounded bg-primary/20">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className={cn(
                            "text-xs font-medium truncate",
                            task.completed && "line-through text-muted-foreground"
                          )}>
                            {task.taskType === 'custom' ? task.titleKey : t(task.titleKey)}
                          </span>
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              ) : (
                <div className="space-y-1.5 pr-4">
                  {displayTasks.map((task) => {
                    const Icon = task.icon;
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg",
                          "bg-background/30 border border-border/30",
                          task.completed && "opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-1.5 text-primary min-w-[70px]">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs font-bold">
                            {formatTimeDisplay(task.startTime || null)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="p-1.5 rounded bg-primary/20">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className={cn(
                            "text-xs font-medium truncate",
                            task.completed && "line-through text-muted-foreground"
                          )}>
                            {task.taskType === 'custom' ? task.titleKey : t(task.titleKey)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        {/* Lock hint for unlocked days */}
        {!isDayLocked && displayTasks.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
            <Info className="h-4 w-4 text-primary/70 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              {t('gamePlan.calendarView.lockToRepeat', 'Lock this day to repeat this schedule every week')}
            </p>
          </div>
        )}
      </CardContent>

      {/* Copy Day Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('gamePlan.lockedDays.copyDayTitle', "Copy {{day}}'s Schedule", { day: selectedDayName })}
            </DialogTitle>
            <DialogDescription>
              {t('gamePlan.lockedDays.selectTargetDays', 'Select days to apply this schedule:')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {DAY_NAMES.map((day, index) => {
              const isSource = index === selectedDayOfWeek;
              const isSelected = selectedCopyDays.includes(index);
              
              return (
                <div
                  key={day}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    isSource && "opacity-50 cursor-not-allowed bg-muted",
                    !isSource && isSelected && "bg-primary/10 border-primary",
                    !isSource && !isSelected && "hover:bg-muted/50"
                  )}
                  onClick={() => !isSource && toggleCopyDay(index)}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={isSource}
                    onCheckedChange={() => !isSource && toggleCopyDay(index)}
                  />
                  <span className="text-sm font-medium">
                    {day}
                    {isSource && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({t('gamePlan.lockedDays.source', 'source')})
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Info className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-500">
              {t('gamePlan.lockedDays.copyWarning', 'This will override existing locked schedules on selected days')}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleCopyDay}
              disabled={selectedCopyDays.length === 0 || isLocking}
            >
              {t('gamePlan.lockedDays.copyToDays', 'Copy to {{count}} Days', { count: selectedCopyDays.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock for Week Dialog */}
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('gamePlan.lockedDays.unlockForWeekTitle', 'Unlock Order for This Week')}
            </DialogTitle>
            <DialogDescription>
              {t('gamePlan.lockedDays.selectUnlockDays', 'Select days to unlock for this week only:')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {DAY_NAMES.map((day, index) => {
              const isLocked = lockedDays.has(index);
              const isSelected = selectedUnlockDays.includes(index);
              
              return (
                <div
                  key={day}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    !isLocked && "opacity-50 cursor-not-allowed bg-muted",
                    isLocked && isSelected && "bg-blue-500/10 border-blue-500",
                    isLocked && !isSelected && "hover:bg-muted/50"
                  )}
                  onClick={() => isLocked && toggleUnlockDay(index)}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={!isLocked}
                    onCheckedChange={() => isLocked && toggleUnlockDay(index)}
                  />
                  <span className="text-sm font-medium">
                    {day}
                    {!isLocked && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({t('gamePlan.lockedDays.notLocked', 'not locked')})
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-500">
              {t('gamePlan.lockedDays.unlockForWeekInfo', 'This allows you to reorder activities for this week only. The original locked schedule will return next week.')}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setUnlockDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleUnlockMultipleDays}
              disabled={selectedUnlockDays.length === 0 || isLocking}
            >
              {t('gamePlan.lockedDays.unlockDays', 'Unlock {{count}} Days', { count: selectedUnlockDays.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
