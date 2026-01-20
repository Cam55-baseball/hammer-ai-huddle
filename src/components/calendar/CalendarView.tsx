import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addMonths, 
  subMonths, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
} from 'date-fns';
import { useCalendar, CalendarEvent } from '@/hooks/useCalendar';
import { CalendarDaySheet } from './CalendarDaySheet';
import { AddCalendarEventDialog } from './AddCalendarEventDialog';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
  selectedSport: 'baseball' | 'softball';
}

export function CalendarView({ selectedSport }: CalendarViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addEventDate, setAddEventDate] = useState<Date | null>(null);
  
  const { events, loading, fetchEventsForRange, addEvent, deleteEvent, refetch } = useCalendar(selectedSport);

  // Calculate visible range (include days from adjacent months shown in calendar grid)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Fetch events when month changes
  useEffect(() => {
    // Fetch a bit beyond visible range for smoother navigation
    const fetchStart = startOfWeek(startOfMonth(subMonths(currentMonth, 1)), { weekStartsOn: 0 });
    const fetchEnd = endOfWeek(endOfMonth(addMonths(currentMonth, 1)), { weekStartsOn: 0 });
    fetchEventsForRange(fetchStart, fetchEnd);
  }, [currentMonth, fetchEventsForRange]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  // Week day headers
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigatePreviousMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const navigateNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const navigateToToday = () => setCurrentMonth(new Date());

  // Check if we can navigate forward (12 months limit)
  const maxForwardDate = addMonths(new Date(), 12);
  const canNavigateForward = currentMonth < startOfMonth(maxForwardDate);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setDaySheetOpen(true);
  };

  const handleAddEventFromDay = (date: Date) => {
    setAddEventDate(date);
    setAddEventOpen(true);
  };

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return events[dateKey] || [];
  };

  // Event indicators - show dots for each event type present
  const getEventIndicators = (dayEvents: CalendarEvent[]) => {
    const types = new Set(dayEvents.map(e => e.type));
    const indicators: { color: string; type: string }[] = [];
    
    if (types.has('athlete_event')) indicators.push({ color: 'bg-red-500', type: 'athlete' });
    if (types.has('custom_activity')) indicators.push({ color: 'bg-purple-500', type: 'activity' });
    if (types.has('program')) indicators.push({ color: 'bg-amber-500', type: 'program' });
    if (types.has('meal')) indicators.push({ color: 'bg-green-500', type: 'meal' });
    if (types.has('manual')) indicators.push({ color: 'bg-indigo-500', type: 'manual' });
    if (types.has('game_plan')) indicators.push({ color: 'bg-blue-500', type: 'gameplan' });
    
    return indicators.slice(0, 4); // Max 4 indicators
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/30 bg-secondary">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary">
                <CalendarDays className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight uppercase">
                  {t('calendar.title', 'Calendar')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('calendar.subtitle', 'View and manage your schedule')}
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => {
                setAddEventDate(new Date());
                setAddEventOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('calendar.addEvent', 'Add Event')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Month Navigation */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={navigatePreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateToToday}
                className="text-xs"
              >
                {t('calendar.today', 'Today')}
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={navigateNextMonth}
              disabled={!canNavigateForward}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week day headers */}
            {weekDays.map(day => (
              <div
                key={day}
                className="h-10 flex items-center justify-center text-xs font-bold text-muted-foreground uppercase"
              >
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map(day => {
              const dayEvents = getEventsForDay(day);
              const indicators = getEventIndicators(dayEvents);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isDayToday = isToday(day);
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "relative h-16 sm:h-20 p-1 rounded-lg border transition-all",
                    "hover:bg-accent/50 hover:border-primary/50",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50",
                    isCurrentMonth 
                      ? "bg-background border-border/30" 
                      : "bg-muted/30 border-transparent text-muted-foreground",
                    isSelected && "ring-2 ring-primary border-primary",
                    isDayToday && "border-primary/70 bg-primary/5"
                  )}
                >
                  {/* Day number */}
                  <span
                    className={cn(
                      "absolute top-1 left-1.5 text-xs sm:text-sm font-semibold",
                      isDayToday && "text-primary font-black",
                      !isCurrentMonth && "text-muted-foreground/50"
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  
                  {/* Event indicators */}
                  {indicators.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {indicators.map((ind, idx) => (
                        <div
                          key={idx}
                          className={cn("w-1.5 h-1.5 rounded-full", ind.color)}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Event count badge for mobile */}
                  {dayEvents.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="absolute top-1 right-1 h-4 min-w-4 p-0 text-[10px] flex items-center justify-center"
                    >
                      {dayEvents.length}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">{t('calendar.legend.athleteEvent', 'Game/Rest Day')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-muted-foreground">{t('calendar.legend.activity', 'Activity')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">{t('calendar.legend.program', 'Iron Bambino')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-muted-foreground">{t('calendar.legend.heatFactory', 'Heat Factory')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">{t('calendar.legend.meal', 'Meal')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">{t('calendar.legend.gamePlan', 'Game Plan')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-muted-foreground">{t('calendar.legend.event', 'Event')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Sheet */}
      <CalendarDaySheet
        open={daySheetOpen}
        onOpenChange={setDaySheetOpen}
        date={selectedDate}
        events={selectedDate ? getEventsForDay(selectedDate) : []}
        onAddEvent={() => {
          if (selectedDate) {
            handleAddEventFromDay(selectedDate);
          }
        }}
        onDeleteEvent={async (id) => {
          const success = await deleteEvent(id);
          if (success) refetch();
        }}
        sport={selectedSport}
      />

      {/* Add Event Dialog */}
      <AddCalendarEventDialog
        open={addEventOpen}
        onOpenChange={setAddEventOpen}
        date={addEventDate || new Date()}
        onAdd={async (event) => {
          const success = await addEvent(event);
          if (success) {
            setAddEventOpen(false);
            refetch();
          }
          return success;
        }}
        sport={selectedSport}
      />
    </div>
  );
}
