import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Clock, 
  Check, 
  Trash2,
  Sun,
  Moon,
  Activity,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { CalendarEvent } from '@/hooks/useCalendar';
import { cn } from '@/lib/utils';

interface CalendarDaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  events: CalendarEvent[];
  onAddEvent: () => void;
  onDeleteEvent: (id: string) => Promise<void>;
  sport: 'baseball' | 'softball';
}

// Group events by time of day
const groupEventsByTimeOfDay = (events: CalendarEvent[]) => {
  const morning: CalendarEvent[] = [];
  const afternoon: CalendarEvent[] = [];
  const evening: CalendarEvent[] = [];
  const allDay: CalendarEvent[] = [];

  events.forEach(event => {
    if (event.allDay || !event.startTime) {
      allDay.push(event);
      return;
    }

    const hour = parseInt(event.startTime.split(':')[0], 10);
    if (hour < 12) {
      morning.push(event);
    } else if (hour < 17) {
      afternoon.push(event);
    } else {
      evening.push(event);
    }
  });

  return { morning, afternoon, evening, allDay };
};

// Format time for display
const formatTime = (time: string | null | undefined): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export function CalendarDaySheet({
  open,
  onOpenChange,
  date,
  events,
  onAddEvent,
  onDeleteEvent,
  sport,
}: CalendarDaySheetProps) {
  const { t } = useTranslation();

  if (!date) return null;

  const { morning, afternoon, evening, allDay } = groupEventsByTimeOfDay(events);
  const hasEvents = events.length > 0;

  const renderEventCard = (event: CalendarEvent) => (
    <div
      key={event.id}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
        "bg-card hover:bg-accent/30",
        event.completed && "opacity-60"
      )}
    >
      {/* Color indicator */}
      <div
        className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0"
        style={{ backgroundColor: event.color }}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {event.completed && (
                <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              )}
              <h4 className={cn(
                "font-semibold text-sm truncate",
                event.completed && "line-through text-muted-foreground"
              )}>
                {event.title}
              </h4>
            </div>
            
            {event.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {event.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-1.5">
              {event.startTime && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(event.startTime)}</span>
                  {event.endTime && (
                    <span>- {formatTime(event.endTime)}</span>
                  )}
                </div>
              )}
              
              <Badge variant="outline" className="text-[10px] h-5">
                {t(`calendar.eventTypes.${event.type}`, event.type)}
              </Badge>
            </div>
          </div>
          
          {event.deletable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteEvent(event.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderTimeSection = (
    title: string, 
    icon: React.ReactNode, 
    sectionEvents: CalendarEvent[]
  ) => {
    if (sectionEvents.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
          {icon}
          <span>{title}</span>
        </div>
        <div className="space-y-2">
          {sectionEvents.map(renderEventCard)}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-bold">
                {format(date, 'EEEE')}
              </SheetTitle>
              <SheetDescription>
                {format(date, 'MMMM d, yyyy')}
              </SheetDescription>
            </div>
            <Button size="sm" onClick={onAddEvent} className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t('calendar.addEvent', 'Add')}
            </Button>
          </div>
        </SheetHeader>
        
        <Separator />
        
        <ScrollArea className="h-[calc(100vh-180px)] mt-4 pr-4">
          {!hasEvents ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {t('calendar.noEvents', 'No events scheduled')}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddEvent}
                className="mt-4 gap-1.5"
              >
                <Plus className="h-4 w-4" />
                {t('calendar.addFirst', 'Add your first event')}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* All Day Events */}
              {allDay.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                    <Activity className="h-3.5 w-3.5" />
                    <span>{t('calendar.allDay', 'All Day')}</span>
                  </div>
                  <div className="space-y-2">
                    {allDay.map(renderEventCard)}
                  </div>
                </div>
              )}
              
              {/* Morning */}
              {renderTimeSection(
                t('calendar.morning', 'Morning'),
                <Sun className="h-3.5 w-3.5" />,
                morning
              )}
              
              {/* Afternoon */}
              {renderTimeSection(
                t('calendar.afternoon', 'Afternoon'),
                <Clock className="h-3.5 w-3.5" />,
                afternoon
              )}
              
              {/* Evening */}
              {renderTimeSection(
                t('calendar.evening', 'Evening'),
                <Moon className="h-3.5 w-3.5" />,
                evening
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
