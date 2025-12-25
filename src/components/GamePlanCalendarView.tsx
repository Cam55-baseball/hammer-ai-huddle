import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GamePlanTask } from '@/hooks/useGamePlan';

interface TimelineTaskWithTime extends GamePlanTask {
  startTime?: string | null;
}

interface GamePlanCalendarViewProps {
  tasks: TimelineTaskWithTime[];
  taskTimes: Record<string, string | null>;
  onDaySelect: (date: Date) => void;
  selectedDate: Date;
}

export function GamePlanCalendarView({ 
  tasks, 
  taskTimes, 
  onDaySelect, 
  selectedDate 
}: GamePlanCalendarViewProps) {
  const { t } = useTranslation();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

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

  // Group tasks by their start time for the selected date
  const tasksWithTimes = useMemo(() => {
    return tasks
      .map(task => ({
        ...task,
        startTime: taskTimes[task.id] || null,
      }))
      .filter(task => task.startTime)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [tasks, taskTimes]);

  const formatTimeDisplay = (time: string | null): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

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
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => onDaySelect(day)}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg transition-all",
                  "hover:bg-primary/20",
                  isSelected && "bg-primary text-primary-foreground",
                  isTodayDate && !isSelected && "ring-2 ring-primary/50"
                )}
              >
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

        {/* Activities with Times */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('gamePlan.calendarView.scheduledActivities', 'Scheduled Activities')}
          </h4>
          
          {tasksWithTimes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {t('gamePlan.calendarView.noActivities', 'No activities scheduled with times')}
            </p>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-1.5 pr-4">
                {tasksWithTimes.map((task) => {
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
      </CardContent>
    </Card>
  );
}
