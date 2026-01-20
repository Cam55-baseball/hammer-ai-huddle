import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toggle } from '@/components/ui/toggle';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react';
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

interface CalendarFilters {
  meals: boolean;
  workouts: boolean;
  activities: boolean;
  events: boolean;
  gamePlan: boolean;
  athleteEvents: boolean;
}

const FILTER_STORAGE_KEY = 'calendarFilters';

const getInitialFilters = (): CalendarFilters => {
  try {
    const stored = localStorage.getItem(FILTER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return {
    meals: true,
    workouts: true,
    activities: true,
    events: true,
    gamePlan: true,
    athleteEvents: true,
  };
};

export function CalendarView({ selectedSport }: CalendarViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addEventDate, setAddEventDate] = useState<Date | null>(null);
  const [filters, setFilters] = useState<CalendarFilters>(getInitialFilters);
  
  const { events, loading, fetchEventsForRange, addEvent, deleteEvent, refetch } = useCalendar(selectedSport);
  
  // Persist filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [filters]);
  
  const toggleFilter = useCallback((key: keyof CalendarFilters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);
  
  // Filter events based on current filter state
  const filterEvents = useCallback((dayEvents: CalendarEvent[]): CalendarEvent[] => {
    return dayEvents.filter(event => {
      if (event.type === 'meal' && !filters.meals) return false;
      if (event.type === 'program' && !filters.workouts) return false;
      if (event.type === 'custom_activity' && !filters.activities) return false;
      if (event.type === 'manual' && !filters.events) return false;
      if (event.type === 'game_plan' && !filters.gamePlan) return false;
      if (event.type === 'athlete_event' && !filters.athleteEvents) return false;
      return true;
    });
  }, [filters]);

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
  
  // Get filtered events for a day (applies user's filter preferences)
  const getFilteredEventsForDay = useCallback((day: Date): CalendarEvent[] => {
    return filterEvents(getEventsForDay(day));
  }, [events, filterEvents]);

  // Event indicators - show unique colored dots for each distinct event
  const getEventIndicators = (dayEvents: CalendarEvent[]) => {
    // Apply filters first
    const filteredEvents = filterEvents(dayEvents);
    
    // Collect unique colors from all events (each event has its own color)
    const uniqueColors = new Map<string, string>();
    
    filteredEvents.forEach(event => {
      // Use the event's assigned color, or fall back to type-based defaults
      const eventColor = event.color || getDefaultColorForType(event.type);
      // Create a unique key based on color to avoid duplicate dots of the same color
      if (!uniqueColors.has(eventColor)) {
        uniqueColors.set(eventColor, eventColor);
      }
    });
    
    // Convert to array and limit to 4 dots
    return Array.from(uniqueColors.values())
      .slice(0, 4)
      .map(color => ({ color }));
  };

  // Helper for default colors by event type
  const getDefaultColorForType = (type: string): string => {
    const defaults: Record<string, string> = {
      'athlete_event': '#ef4444', // red
      'custom_activity': '#8b5cf6', // purple
      'program': '#f59e0b', // amber (Iron Bambino default, Heat Factory uses #f97316)
      'meal': '#22c55e', // green
      'game_plan': '#3b82f6', // blue
      'manual': '#6366f1', // indigo
    };
    return defaults[type] || '#6b7280';
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
              const filteredDayEvents = getFilteredEventsForDay(day);
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
                  
                  {/* Event indicators - unique colored dots */}
                  {indicators.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {indicators.map((ind, idx) => (
                        <div
                          key={idx}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: ind.color }}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Event count badge for mobile (shows filtered count) */}
                  {filteredDayEvents.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="absolute top-1 right-1 h-4 min-w-4 p-0 text-[10px] flex items-center justify-center"
                    >
                      {filteredDayEvents.length}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filter Toggles */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 mr-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {t('calendar.filter.title', 'Filter:')}
              </span>
            </div>
            
            <Toggle
              pressed={filters.meals}
              onPressedChange={() => toggleFilter('meals')}
              size="sm"
              className="h-7 px-2 gap-1.5 data-[state=on]:bg-green-500/20 data-[state=on]:text-green-700 dark:data-[state=on]:text-green-400"
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs">{t('calendar.filter.meals', 'Meals')}</span>
            </Toggle>
            
            <Toggle
              pressed={filters.workouts}
              onPressedChange={() => toggleFilter('workouts')}
              size="sm"
              className="h-7 px-2 gap-1.5 data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-700 dark:data-[state=on]:text-amber-400"
            >
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs">{t('calendar.filter.workouts', 'Workouts')}</span>
            </Toggle>
            
            <Toggle
              pressed={filters.activities}
              onPressedChange={() => toggleFilter('activities')}
              size="sm"
              className="h-7 px-2 gap-1.5 data-[state=on]:bg-purple-500/20 data-[state=on]:text-purple-700 dark:data-[state=on]:text-purple-400"
            >
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-xs">{t('calendar.filter.activities', 'Activities')}</span>
            </Toggle>
            
            <Toggle
              pressed={filters.gamePlan}
              onPressedChange={() => toggleFilter('gamePlan')}
              size="sm"
              className="h-7 px-2 gap-1.5 data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-700 dark:data-[state=on]:text-blue-400"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs">{t('calendar.filter.gamePlan', 'Game Plan')}</span>
            </Toggle>
            
            <Toggle
              pressed={filters.athleteEvents}
              onPressedChange={() => toggleFilter('athleteEvents')}
              size="sm"
              className="h-7 px-2 gap-1.5 data-[state=on]:bg-red-500/20 data-[state=on]:text-red-700 dark:data-[state=on]:text-red-400"
            >
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs">{t('calendar.filter.athleteEvents', 'Events')}</span>
            </Toggle>
            
            <Toggle
              pressed={filters.events}
              onPressedChange={() => toggleFilter('events')}
              size="sm"
              className="h-7 px-2 gap-1.5 data-[state=on]:bg-indigo-500/20 data-[state=on]:text-indigo-700 dark:data-[state=on]:text-indigo-400"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-xs">{t('calendar.filter.manual', 'Manual')}</span>
            </Toggle>
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
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f97316' }} />
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
