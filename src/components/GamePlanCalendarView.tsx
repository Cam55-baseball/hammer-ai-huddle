import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday, getDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Clock, Calendar, Lock, Unlock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GamePlanTask } from '@/hooks/useGamePlan';
import { LockedDay, LockedDayScheduleItem } from '@/hooks/useLockedDays';

interface TimelineTaskWithTime extends GamePlanTask {
  startTime?: string | null;
}

interface GamePlanCalendarViewProps {
  tasks: TimelineTaskWithTime[];
  taskTimes: Record<string, string | null>;
  taskReminders: Record<string, number | null>;
  onDaySelect: (date: Date) => void;
  selectedDate: Date;
  lockedDays: Map<number, LockedDay>;
  onLockDay: (dayOfWeek: number, schedule: LockedDayScheduleItem[]) => Promise<boolean>;
  onUnlockDay: (dayOfWeek: number) => Promise<boolean>;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function GamePlanCalendarView({ 
  tasks, 
  taskTimes,
  taskReminders,
  onDaySelect, 
  selectedDate,
  lockedDays,
  onLockDay,
  onUnlockDay
}: GamePlanCalendarViewProps) {
  const { t } = useTranslation();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [isLocking, setIsLocking] = useState(false);

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
  const lockedSchedule = lockedDays.get(selectedDayOfWeek)?.schedule || [];

  // Get tasks to display for the selected day
  const displayTasks = useMemo(() => {
    if (isDayLocked && lockedSchedule.length > 0) {
      // For locked days, show tasks from the locked schedule
      return lockedSchedule
        .map(item => {
          const task = tasks.find(t => t.id === item.taskId);
          if (!task) return null;
          return {
            ...task,
            startTime: item.displayTime,
          };
        })
        .filter((t): t is (TimelineTaskWithTime & { startTime: string | null }) => t !== null)
        .sort((a, b) => {
          if (!a.startTime && !b.startTime) return 0;
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return a.startTime.localeCompare(b.startTime);
        });
    } else {
      // For unlocked days, show tasks scheduled for that day of week
      return tasks
        .map(task => ({
          ...task,
          startTime: taskTimes[task.id] || null,
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
          if (!a.startTime && !b.startTime) return 0;
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return a.startTime.localeCompare(b.startTime);
        });
    }
  }, [tasks, taskTimes, isDayLocked, lockedSchedule, selectedDayOfWeek]);

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
      // Build current schedule from visible tasks
      const schedule: LockedDayScheduleItem[] = tasks.map(task => ({
        taskId: task.id,
        displayTime: taskTimes[task.id] || null,
        reminderEnabled: taskReminders[task.id] !== null && taskReminders[task.id] !== undefined,
        reminderMinutes: taskReminders[task.id] || null,
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

  const selectedDayName = DAY_NAMES[selectedDayOfWeek];

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
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => onDaySelect(day)}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg transition-all relative",
                  "hover:bg-primary/20",
                  isSelected && "bg-primary text-primary-foreground",
                  isTodayDate && !isSelected && "ring-2 ring-primary/50",
                  isLocked && !isSelected && "ring-2 ring-amber-500/50"
                )}
              >
                {isLocked && (
                  <div className="absolute -top-1 -right-1">
                    <Lock className="h-3 w-3 text-amber-500" />
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">
              {format(selectedDate, 'EEEE, MMM d')}
            </span>
            {isDayLocked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold">
                <Lock className="h-3 w-3" />
                {t('gamePlan.calendarView.dayLocked', 'Locked')}
              </span>
            )}
          </div>
          <Button
            variant={isDayLocked ? "outline" : "default"}
            size="sm"
            onClick={isDayLocked ? handleUnlockDay : handleLockDay}
            disabled={isLocking}
            className="h-8 text-xs font-bold"
          >
            {isDayLocked ? (
              <>
                <Unlock className="h-3.5 w-3.5 mr-1.5" />
                {t('gamePlan.calendarView.unlockDay', 'Unlock Day')}
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                {t('gamePlan.calendarView.lockDay', 'Lock Day')}
              </>
            )}
          </Button>
        </div>

        {/* Info banner for locked days */}
        {isDayLocked && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Info className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-500">
              {t('gamePlan.calendarView.lockedScheduleInfo', 'This schedule repeats every {{day}} until unlocked', { day: selectedDayName })}
            </p>
          </div>
        )}

        {/* Activities List */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {isDayLocked 
              ? t('gamePlan.calendarView.scheduledActivities', 'Scheduled Activities')
              : t('gamePlan.calendarView.activitiesForDay', 'Activities for {{day}}', { day: format(selectedDate, 'EEEE') })
            }
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
    </Card>
  );
}
