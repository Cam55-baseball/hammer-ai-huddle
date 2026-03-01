import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarClock, ArrowRight, Trash2, ChevronRight } from 'lucide-react';

interface RestDaySchedulerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string; // YYYY-MM-DD
  events: Array<{ id: string; title: string; event_type: string }>;
}

export function RestDayScheduler({ open, onOpenChange, date, events }: RestDaySchedulerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);

  const mandatoryTypes = ['game', 'coach_assigned', 'tryout'];
  const movableEvents = events.filter(e => !mandatoryTypes.includes(e.event_type));
  const mandatoryEvents = events.filter(e => mandatoryTypes.includes(e.event_type));

  const findNextOpenDay = async (): Promise<string> => {
    const d = new Date(date);
    for (let i = 1; i <= 14; i++) {
      d.setDate(d.getDate() + 1);
      const nextDate = d.toISOString().split('T')[0];
      const { data } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('user_id', user!.id)
        .eq('event_date', nextDate);
      if (!data || data.length === 0) return nextDate;
    }
    // Fallback: tomorrow
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const handleMoveToNext = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      const nextDay = await findNextOpenDay();
      for (const evt of movableEvents) {
        await supabase.from('calendar_events')
          .update({ event_date: nextDay })
          .eq('id', evt.id);
      }
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast({ title: 'Events moved', description: `${movableEvents.length} events moved to ${nextDay}` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handlePushForward = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      // Get all future non-mandatory events and shift by 1 day
      const { data: futureEvents } = await supabase
        .from('calendar_events')
        .select('id, event_date, event_type')
        .eq('user_id', user.id)
        .gte('event_date', date)
        .order('event_date', { ascending: false });

      if (futureEvents) {
        for (const evt of futureEvents) {
          if (mandatoryTypes.includes(evt.event_type)) continue;
          const nextDate = new Date(evt.event_date);
          nextDate.setDate(nextDate.getDate() + 1);
          await supabase.from('calendar_events')
            .update({ event_date: nextDate.toISOString().split('T')[0] })
            .eq('id', evt.id);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast({ title: 'Schedule pushed', description: 'Non-mandatory events shifted forward 1 day' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDropSessions = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      for (const evt of movableEvents) {
        await supabase.from('calendar_events').delete().eq('id', evt.id);
      }
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast({ title: 'Sessions dropped', description: `${movableEvents.length} sessions removed` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Rest Day Scheduling
          </DialogTitle>
          <DialogDescription>
            You have {movableEvents.length} planned activit{movableEvents.length === 1 ? 'y' : 'ies'} on this day.
          </DialogDescription>
        </DialogHeader>

        {mandatoryEvents.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Cannot be moved:</p>
            {mandatoryEvents.map(e => (
              <Badge key={e.id} variant="destructive" className="text-xs mr-1">
                {e.title}
              </Badge>
            ))}
          </div>
        )}

        {movableEvents.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Can be rescheduled:</p>
            {movableEvents.map(e => (
              <Badge key={e.id} variant="secondary" className="text-xs mr-1">
                {e.title}
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-2 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-sm"
            disabled={processing || movableEvents.length === 0}
            onClick={handleMoveToNext}
          >
            <ArrowRight className="h-4 w-4" />
            Move to next open day
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-sm"
            disabled={processing}
            onClick={handlePushForward}
          >
            <ChevronRight className="h-4 w-4" />
            Push everything forward 1 day
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-sm text-destructive hover:text-destructive"
            disabled={processing || movableEvents.length === 0}
            onClick={handleDropSessions}
          >
            <Trash2 className="h-4 w-4" />
            Drop these sessions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
