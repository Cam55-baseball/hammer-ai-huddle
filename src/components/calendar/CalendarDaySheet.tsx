import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Reorder, useDragControls } from 'framer-motion';
import { 
  Plus, 
  Clock, 
  Check, 
  Trash2,
  Sun,
  Moon,
  Activity,
  Calendar,
  SkipForward,
  ChevronDown,
  RotateCcw,
  Lock,
  Unlock,
  GripVertical,
  ArrowUpDown,
} from 'lucide-react';
import { format, getDay } from 'date-fns';
import { CalendarEvent } from '@/hooks/useCalendar';
import { cn } from '@/lib/utils';
import { SkipDayPickerDialog } from './SkipDayPickerDialog';
import { useCalendarSkips } from '@/hooks/useCalendarSkips';
import { useCalendarDayOrders, getOrderKey } from '@/hooks/useCalendarDayOrders';
import { useGamePlanLock } from '@/hooks/useGamePlanLock';
import { toast } from 'sonner';

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

// Draggable event item component
function DraggableEventCard({
  event,
  isSkipped,
  isReorderMode,
  onSkipClick,
  onUnskipClick,
  onDeleteClick,
  t,
}: {
  event: CalendarEvent;
  isSkipped: boolean;
  isReorderMode: boolean;
  onSkipClick: (e: CalendarEvent) => void;
  onUnskipClick: (e: CalendarEvent) => void;
  onDeleteClick: (id: string) => void;
  t: (key: string, fallback: string) => string;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={event}
      id={event.id}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
        isSkipped ? "bg-muted/50 opacity-60" : "bg-card hover:bg-accent/30",
        event.completed && "opacity-60",
        isReorderMode && "cursor-move"
      )}
    >
      {/* Drag handle - only in reorder mode */}
      {isReorderMode && !isSkipped && (
        <div
          className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-1"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      
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
                <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              )}
              <h4 className={cn(
                "font-semibold text-sm truncate",
                event.completed && "line-through text-muted-foreground",
                isSkipped && "line-through text-muted-foreground"
              )}>
                {event.title}
              </h4>
            </div>
            
            {event.description && !isSkipped && (
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
          
          {/* Actions - hidden in reorder mode */}
          {!isReorderMode && (
            <div className="flex items-center gap-1">
              {isSkipped ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnskipClick(event);
                  }}
                  title={t('calendar.skip.unskip', 'Un-skip')}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkipClick(event);
                  }}
                  title={t('calendar.skip.skipButton', 'Skip')}
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </Button>
              )}
              
              {!isSkipped && event.deletable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(event.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
}

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
  const { isSkippedForDay, getSkipDays, updateSkipDays, unskipForDay } = useCalendarSkips();
  const { isDateLocked, saveDayOrder, unlockDate, getOrderKeysForDate, fetchDayOrdersForRange, refetch: refetchDayOrders } = useCalendarDayOrders();
  const { getDaySchedule, unlockDays } = useGamePlanLock();
  
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [selectedEventForSkip, setSelectedEventForSkip] = useState<CalendarEvent | null>(null);
  const [showSkippedSection, setShowSkippedSection] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [orderedEvents, setOrderedEvents] = useState<CalendarEvent[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch day orders when sheet opens with a date
  useEffect(() => {
    if (open && date) {
      fetchDayOrdersForRange(date, date);
    }
  }, [open, date, fetchDayOrdersForRange]);

  // Update ordered events when events or date changes
  useEffect(() => {
    if (date && events.length > 0) {
      // Filter to active events only for reordering
      const active = events.filter(event => 
        !isSkippedForDay(event.source || event.id, event.type, date)
      );
      setOrderedEvents(active);
    }
  }, [events, date, isSkippedForDay]);

  if (!date) return null;

  const dayOfWeek = getDay(date);
  
  // Check BOTH lock sources: date-specific takes priority, then weekly template
  const isDateLockedOrder = isDateLocked(date);
  const weeklySchedule = getDaySchedule(dayOfWeek);
  const isWeeklyLocked = weeklySchedule && weeklySchedule.length > 0;
  
  // Combined: locked if EITHER source is locked
  const isLockedOrder = isDateLockedOrder || isWeeklyLocked;
  
  // Track which lock source is active (for badge display)
  const lockSource: 'day' | 'weekly' | null = isDateLockedOrder ? 'day' : (isWeeklyLocked ? 'weekly' : null);
  
  // Helper to get unique item ID for skip tracking
  const getSkipItemId = (event: CalendarEvent): string => {
    return event.source || event.id;
  };
  
  // Separate events into active and skipped based on day of week
  const activeEvents = events.filter(event => 
    !isSkippedForDay(getSkipItemId(event), event.type, date)
  );
  const skippedEvents = events.filter(event => 
    isSkippedForDay(getSkipItemId(event), event.type, date)
  );

  // Only group by time of day if NOT using locked order and NOT in reorder mode
  const { morning, afternoon, evening, allDay } = (isLockedOrder || isReorderMode)
    ? { morning: [], afternoon: [], evening: [], allDay: [] } 
    : groupEventsByTimeOfDay(activeEvents);
  const hasActiveEvents = activeEvents.length > 0;

  const handleOpenSkipDialog = (event: CalendarEvent) => {
    setSelectedEventForSkip(event);
    setSkipDialogOpen(true);
  };

  const handleSaveSkip = async (skipDays: number[]): Promise<boolean> => {
    if (!selectedEventForSkip) return false;
    
    const itemId = getSkipItemId(selectedEventForSkip);
    const success = await updateSkipDays(itemId, selectedEventForSkip.type, skipDays);
    
    if (success) {
      toast.success(t('calendar.skip.skipSuccess', 'Item skip settings saved'));
    } else {
      toast.error(t('calendar.skip.skipFailed', 'Failed to skip item'));
    }
    
    return success;
  };

  const handleUnskip = async (event: CalendarEvent) => {
    const itemId = getSkipItemId(event);
    const success = await unskipForDay(itemId, event.type, dayOfWeek);
    
    if (success) {
      toast.success(t('calendar.skip.unskipSuccess', 'Item un-skipped'));
    } else {
      toast.error(t('calendar.skip.unskipFailed', 'Failed to un-skip item'));
    }
  };

  const handleEnterReorderMode = () => {
    setOrderedEvents([...activeEvents]);
    setIsReorderMode(true);
  };

  const handleCancelReorder = () => {
    setIsReorderMode(false);
    setOrderedEvents([...activeEvents]);
  };

  const handleLockOrder = async () => {
    if (!date) return;
    
    setIsSaving(true);
    try {
      // Generate order keys from current ordered events
      const orderKeys = orderedEvents.map(event => {
        // Use the event's orderKey if available, otherwise generate one
        return event.orderKey || getOrderKey(event);
      });
      
      const success = await saveDayOrder(date, orderKeys, true);
      
      if (success) {
        toast.success(t('calendar.lock.lockSuccess', 'Day order locked'));
        setIsReorderMode(false);
        // Refetch to get updated state
        await refetchDayOrders();
      } else {
        toast.error(t('calendar.lock.lockFailed', 'Failed to lock day order'));
      }
    } catch (err) {
      console.error('Error locking day order:', err);
      toast.error(t('calendar.lock.lockFailed', 'Failed to lock day order'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlock = async () => {
    if (!date) return;
    
    setIsSaving(true);
    try {
      // Unlock date-specific lock
      const dateUnlockSuccess = await unlockDate(date);
      
      // Also clear weekly template lock for this day of week if it exists
      const weeklyScheduleForDay = getDaySchedule(dayOfWeek);
      if (weeklyScheduleForDay && weeklyScheduleForDay.length > 0) {
        await unlockDays([dayOfWeek]);
      }
      
      if (dateUnlockSuccess || weeklyScheduleForDay) {
        toast.success(t('calendar.lock.unlockSuccess', 'Day order unlocked'));
        await refetchDayOrders();
      } else {
        toast.error(t('calendar.lock.unlockFailed', 'Failed to unlock day order'));
      }
    } catch (err) {
      console.error('Error unlocking day order:', err);
      toast.error(t('calendar.lock.unlockFailed', 'Failed to unlock day order'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderEventCard = (event: CalendarEvent, isSkipped = false) => (
    <div
      key={event.id}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
        isSkipped ? "bg-muted/50 opacity-60" : "bg-card hover:bg-accent/30",
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
                <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              )}
              <h4 className={cn(
                "font-semibold text-sm truncate",
                event.completed && "line-through text-muted-foreground",
                isSkipped && "line-through text-muted-foreground"
              )}>
                {event.title}
              </h4>
            </div>
            
            {event.description && !isSkipped && (
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
          
          <div className="flex items-center gap-1">
            {isSkipped ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnskip(event);
                }}
                title={t('calendar.skip.unskip', 'Un-skip')}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenSkipDialog(event);
                }}
                title={t('calendar.skip.skipButton', 'Skip')}
              >
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            )}
            
            {!isSkipped && event.deletable && (
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
          {sectionEvents.map(e => renderEventCard(e, false))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-lg font-bold flex items-center gap-2">
                  {format(date, 'EEEE')}
                  {lockSource === 'day' && !isReorderMode && (
                    <Badge variant="outline" className="text-xs gap-1 text-wellness-coral-foreground border-wellness-coral/50 bg-wellness-coral/10">
                      <Lock className="h-3 w-3" />
                      {t('calendar.dayLocked', 'Day Locked')}
                    </Badge>
                  )}
                  {lockSource === 'weekly' && !isReorderMode && (
                    <Badge variant="outline" className="text-xs gap-1 text-primary/80 border-primary/50 bg-primary/10">
                      <Lock className="h-3 w-3" />
                      {t('calendar.weeklyLocked', 'Weekly')}
                    </Badge>
                  )}
                  {isReorderMode && (
                    <Badge variant="outline" className="text-xs gap-1 border-primary/50 bg-primary/10">
                      <ArrowUpDown className="h-3 w-3" />
                      {t('calendar.reorderMode', 'Reordering')}
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription>
                  {format(date, 'MMMM d, yyyy')}
                </SheetDescription>
              </div>
              
              {/* Action buttons */}
              {!isReorderMode ? (
                <div className="flex items-center gap-2">
                  {isLockedOrder ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUnlock}
                      disabled={isSaving}
                      className="gap-1.5"
                    >
                      <Unlock className="h-4 w-4" />
                      {t('calendar.unlock', 'Unlock')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEnterReorderMode}
                      className="gap-1.5"
                      disabled={activeEvents.length < 2}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      {t('calendar.reorder', 'Reorder')}
                    </Button>
                  )}
                  <Button size="sm" onClick={onAddEvent} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    {t('calendar.addEvent', 'Add')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelReorder}
                    disabled={isSaving}
                  >
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleLockOrder}
                    disabled={isSaving}
                    className="gap-1.5"
                  >
                    <Lock className="h-4 w-4" />
                    {t('calendar.lock.lockDay', 'Lock Order')}
                  </Button>
                </div>
              )}
            </div>
          </SheetHeader>
          
          <Separator />
          
          <ScrollArea className="h-[calc(100vh-180px)] mt-4 pr-4">
            {!hasActiveEvents && skippedEvents.length === 0 ? (
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
                {/* Reorder Mode: Draggable list */}
                {isReorderMode ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                      <GripVertical className="h-3.5 w-3.5" />
                      <span>{t('calendar.dragToReorder', 'Drag to reorder')}</span>
                    </div>
                    <Reorder.Group
                      axis="y"
                      values={orderedEvents}
                      onReorder={setOrderedEvents}
                      className="space-y-2"
                    >
                      {orderedEvents.map(event => (
                        <DraggableEventCard
                          key={event.id}
                          event={event}
                          isSkipped={false}
                          isReorderMode={true}
                          onSkipClick={handleOpenSkipDialog}
                          onUnskipClick={handleUnskip}
                          onDeleteClick={onDeleteEvent}
                          t={t}
                        />
                      ))}
                    </Reorder.Group>
                  </div>
                ) : isLockedOrder ? (
                  /* Locked Order: Single ordered list */
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                      <Lock className="h-3.5 w-3.5 text-wellness-coral" />
                      <span>{t('calendar.lockedOrderSection', 'Locked Order')}</span>
                    </div>
                    <div className="space-y-2">
                      {activeEvents.map(e => renderEventCard(e, false))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* All Day Events */}
                    {allDay.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                          <Activity className="h-3.5 w-3.5" />
                          <span>{t('calendar.allDay', 'All Day')}</span>
                        </div>
                        <div className="space-y-2">
                          {allDay.map(e => renderEventCard(e, false))}
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
                  </>
                )}

                {/* Skipped Section - shown when not in reorder mode */}
                {!isReorderMode && skippedEvents.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <Collapsible open={showSkippedSection} onOpenChange={setShowSkippedSection}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        <div className="flex items-center gap-2">
                          <SkipForward className="h-4 w-4" />
                          <span>
                            {t('calendar.skip.skippedSection', 'Skipped')} ({skippedEvents.length})
                          </span>
                        </div>
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform",
                          showSkippedSection && "rotate-180"
                        )} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pt-2">
                        {skippedEvents.map(e => renderEventCard(e, true))}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Skip Day Picker Dialog */}
      <SkipDayPickerDialog
        open={skipDialogOpen}
        onOpenChange={setSkipDialogOpen}
        itemTitle={selectedEventForSkip?.title || ''}
        currentSkipDays={
          selectedEventForSkip 
            ? getSkipDays(
                selectedEventForSkip.source || selectedEventForSkip.id, 
                selectedEventForSkip.type
              )
            : []
        }
        onSave={handleSaveSkip}
      />
    </>
  );
}
