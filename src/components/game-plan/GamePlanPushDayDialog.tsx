import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowRight, ChevronRight, Replace, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRescheduleEngine } from '@/hooks/useRescheduleEngine';
import { getTodayDate } from '@/utils/dateUtils';
import { toast } from 'sonner';

interface GamePlanPushDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskIds: string[];
  onPushComplete?: () => void;
}

export function GamePlanPushDayDialog({ open, onOpenChange, taskIds, onPushComplete }: GamePlanPushDayDialogProps) {
  const { pushForwardOneDay, pushToDate, replaceDay, skipDay, undoLastAction } = useRescheduleEngine();
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<'push' | 'date' | 'replace' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [sourceDate, setSourceDate] = useState<Date>();
  const today = getTodayDate();

  const showUndoToast = () => {
    toast.success('Schedule updated', {
      action: {
        label: 'Undo',
        onClick: async () => {
          const result = await undoLastAction();
          if (!result) toast.error('Unable to undo');
        },
      },
      duration: 15000,
    });
  };

  const handlePushForward = async () => {
    setProcessing(true);
    try {
      await skipDay(today, taskIds);
      await pushForwardOneDay(today);
      onOpenChange(false);
      onPushComplete?.();
      showUndoToast();
    } finally {
      setProcessing(false);
    }
  };

  const handlePushToDate = async () => {
    if (!selectedDate) return;
    setProcessing(true);
    try {
      const target = format(selectedDate, 'yyyy-MM-dd');
      await skipDay(today, taskIds);
      await pushToDate(today, target);
      onOpenChange(false);
      onPushComplete?.();
      showUndoToast();
    } finally {
      setProcessing(false);
    }
  };

  const handleReplaceDay = async () => {
    if (!sourceDate) return;
    setProcessing(true);
    try {
      const source = format(sourceDate, 'yyyy-MM-dd');
      await replaceDay(today, source);
      onOpenChange(false);
      showUndoToast();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ChevronRight className="h-5 w-5 text-primary" />
            Push Day
          </DialogTitle>
          <DialogDescription>
            Choose how to reschedule today's activities.
          </DialogDescription>
        </DialogHeader>

        {!mode && (
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-sm"
              disabled={processing}
              onClick={() => handlePushForward()}
            >
              <ArrowRight className="h-4 w-4" />
              Push Everything Forward 1 Day
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-sm"
              disabled={processing}
              onClick={() => setMode('date')}
            >
              <CalendarIcon className="h-4 w-4" />
              Push to Specific Date
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-sm"
              disabled={processing}
              onClick={() => setMode('replace')}
            >
              <Replace className="h-4 w-4" />
              Replace This Day
            </Button>
          </div>
        )}

        {mode === 'date' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select a target date. All sessions from today onward will shift.</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date <= new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMode(null)}>Back</Button>
              <Button size="sm" disabled={!selectedDate || processing} onClick={handlePushToDate}>
                Confirm Push
              </Button>
            </div>
          </div>
        )}

        {mode === 'replace' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select a source day to copy its schedule onto today.</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left", !sourceDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {sourceDate ? format(sourceDate, 'PPP') : 'Pick source day'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={sourceDate}
                  onSelect={setSourceDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMode(null)}>Back</Button>
              <Button size="sm" disabled={!sourceDate || processing} onClick={handleReplaceDay}>
                Replace Day
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
