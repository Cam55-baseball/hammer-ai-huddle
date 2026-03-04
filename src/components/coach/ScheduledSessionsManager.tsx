import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Pencil, Trash2, Filter } from 'lucide-react';
import { useScheduledPracticeSessions, ScheduledPracticeSession } from '@/hooks/useScheduledPracticeSessions';
import { format } from 'date-fns';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const statusVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'default';
    case 'cancelled': return 'destructive';
    default: return 'secondary';
  }
};

export function ScheduledSessionsManager() {
  const { fetchCoachSessions, updateSession, updateStatus, deleteSession } = useScheduledPracticeSessions();
  const [sessions, setSessions] = useState<ScheduledPracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');

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
    const data = await fetchCoachSessions();
    setSessions(data);
    setLoading(false);
  }, [fetchCoachSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const filtered = filter === 'upcoming'
    ? sessions.filter(s => s.status === 'scheduled' && s.scheduled_date >= today)
    : sessions;

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Scheduled Sessions
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant={filter === 'upcoming' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading sessions…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No scheduled sessions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell className="capitalize">{s.session_module}</TableCell>
                    <TableCell className="capitalize">{s.session_type.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{s.scheduled_date}</TableCell>
                    <TableCell>
                      {s.start_time ? `${s.start_time}${s.end_time ? ` – ${s.end_time}` : ''}` : '—'}
                    </TableCell>
                    <TableCell className="capitalize">{s.assignment_scope}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {s.status === 'scheduled' && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setCancelId(s.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editSession} onOpenChange={open => !open && setEditSession(null)}>
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
              <Checkbox checked={editRecurring} onCheckedChange={v => setEditRecurring(!!v)} id="edit-recurring" />
              <Label htmlFor="edit-recurring">Recurring Weekly</Label>
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
      <AlertDialog open={!!cancelId} onOpenChange={open => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the session as cancelled. Players will no longer see it on their Game Plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Cancel Session</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
