import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarIcon, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { useScheduledPracticeSessions, ScheduledPracticeSession } from '@/hooks/useScheduledPracticeSessions';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const statusVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'default' as const;
    case 'cancelled': return 'destructive' as const;
    default: return 'secondary' as const;
  }
};

export function PlayerScheduledSessions() {
  const { fetchPlayerSessions, updateSession, updateStatus } = useScheduledPracticeSessions();
  const [sessions, setSessions] = useState<ScheduledPracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');
  const [open, setOpen] = useState(false);

  // Edit state
  const [editSession, setEditSession] = useState<ScheduledPracticeSession | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRecurring, setEditRecurring] = useState(false);
  const [editRecurringDays, setEditRecurringDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  // Cancel state
  const [cancelId, setCancelId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const data = await fetchPlayerSessions();
    setSessions(data);
    setLoading(false);
  }, [fetchPlayerSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const filtered = filter === 'upcoming'
    ? sessions.filter(s => s.status === 'scheduled' && s.scheduled_date >= today)
    : sessions;

  const upcomingCount = sessions.filter(s => s.status === 'scheduled' && s.scheduled_date >= today).length;

  const openEdit = (s: ScheduledPracticeSession) => {
    setEditSession(s);
    setEditDate(s.scheduled_date);
    setEditStartTime(s.start_time || '');
    setEditEndTime(s.end_time || '');
    setEditDescription(s.description || '');
    setEditRecurring(s.recurring_active);
    setEditRecurringDays(s.recurring_days || []);
  };

  const handleSaveEdit = async () => {
    if (!editSession) return;
    setSaving(true);
    await updateSession(editSession.id, {
      scheduled_date: editDate,
      start_time: editStartTime || null,
      end_time: editEndTime || null,
      description: editDescription || null,
      recurring_active: editRecurring,
      recurring_days: editRecurringDays,
    });
    setEditSession(null);
    setSaving(false);
    loadSessions();
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    await updateStatus(cancelId, 'cancelled');
    setCancelId(null);
    loadSessions();
  };

  const toggleRecurringDay = (day: number) => {
    setEditRecurringDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  if (loading && sessions.length === 0) return null;
  if (sessions.length === 0) return null;

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between space-y-0 pb-2 hover:bg-muted/50 transition-colors rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-primary" />
                My Scheduled Sessions
                {upcomingCount > 0 && (
                  <Badge variant="secondary" className="text-xs">{upcomingCount}</Badge>
                )}
              </CardTitle>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="flex gap-1 mb-3">
                <Button
                  variant={filter === 'upcoming' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setFilter('upcoming')}
                >
                  Upcoming
                </Button>
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setFilter('all')}
                >
                  All
                </Button>
              </div>

              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No sessions found.</p>
              ) : (
                <div className="space-y-2">
                  {filtered.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5 bg-card">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{s.title}</span>
                          <Badge variant={statusVariant(s.status)} className="text-[10px] shrink-0">{s.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {s.scheduled_date}
                          {s.start_time && ` at ${s.start_time}`}
                          {s.recurring_active && ' · Recurring'}
                        </div>
                      </div>
                      {s.status === 'scheduled' && (
                        <div className="flex gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCancelId(s.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Edit Dialog */}
      <Dialog open={!!editSession} onOpenChange={o => !o && setEditSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>Update the session details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Date</Label>
              <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={editRecurring} onCheckedChange={v => setEditRecurring(!!v)} id="player-edit-recurring" />
              <Label htmlFor="player-edit-recurring">Recurring Weekly</Label>
            </div>
            {editRecurring && (
              <div className="flex gap-1 flex-wrap">
                {DAY_LABELS.map((label, i) => (
                  <Button
                    key={i}
                    type="button"
                    size="sm"
                    variant={editRecurringDays.includes(i) ? 'default' : 'outline'}
                    onClick={() => toggleRecurringDay(i)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSession(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelId} onOpenChange={o => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the session as cancelled. It will no longer appear on your Game Plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Cancel Session</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
