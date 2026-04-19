import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Plus, Brain } from 'lucide-react';
import { useScheduledPracticeSessions } from '@/hooks/useScheduledPracticeSessions';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { usePlayerOrganization } from '@/hooks/usePlayerOrganization';
import { useCoachPlayerPool } from '@/hooks/useCoachPlayerPool';
import { useBaserunningProgress } from '@/hooks/useBaserunningProgress';
import { cn } from '@/lib/utils';
import { formatTime12h } from '@/lib/formatTime';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type AssignTarget = 'self' | 'players' | 'team';

export function ScheduleBaserunningIQDialog() {
  const { sport } = useSportTheme();
  const selectedSport = sport || localStorage.getItem('selectedSport') || 'baseball';
  const { createSession, createBulkSessions, loading } = useScheduledPracticeSessions();
  const { organizationId, orgName } = usePlayerOrganization();
  const { data: playerPool = [] } = useCoachPlayerPool();
  const { lessons } = useBaserunningProgress(selectedSport);

  const [open, setOpen] = useState(false);
  const hasCoachAbilities = playerPool.length > 0 || !!organizationId;

  const [assignTo, setAssignTo] = useState<AssignTarget>('self');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [lessonFocusId, setLessonFocusId] = useState<string>('none');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('16:30');
  const [recurring, setRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);

  const lessonFocus = useMemo(
    () => lessons.find((l) => l.id === lessonFocusId),
    [lessons, lessonFocusId]
  );

  const sessionType = assignTo === 'team' ? 'team_session' : 'solo_work';
  const title = lessonFocus
    ? `Baserunning IQ: ${lessonFocus.title}`
    : assignTo === 'team'
    ? 'Baserunning IQ Team Session'
    : 'Baserunning IQ Solo Work';
  const description = lessonFocus ? `Focus: ${lessonFocus.title}` : undefined;

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const toggleDay = (day: number) => {
    setRecurringDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleSubmit = async () => {
    const base = {
      session_module: 'baserunning_iq',
      session_type: sessionType,
      title,
      description,
      scheduled_date: date,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      recurring_active: recurring,
      recurring_days: recurring ? recurringDays : [],
      sport: selectedSport,
    };

    let ok = false;
    if (assignTo === 'self') {
      const result = await createSession(base);
      ok = !!result;
    } else if (assignTo === 'players') {
      if (selectedPlayerIds.length === 0) return;
      ok = await createBulkSessions(selectedPlayerIds, base);
    } else if (assignTo === 'team') {
      if (!organizationId) return;
      const result = await createSession({
        ...base,
        organization_id: organizationId,
        assignment_scope: 'team',
        team_name: orgName,
      });
      ok = !!result;
    }

    if (ok) {
      setOpen(false);
      setSelectedPlayerIds([]);
    }
  };

  const canSubmit =
    !loading &&
    !!date &&
    (assignTo !== 'players' || selectedPlayerIds.length > 0) &&
    (assignTo !== 'team' || !!organizationId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <CalendarIcon className="h-4 w-4" />
          Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Schedule Baserunning IQ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Assign To */}
          {hasCoachAbilities && (
            <div className="space-y-1.5">
              <Label className="text-xs">Assign To</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['self', 'players', 'team'] as AssignTarget[]).map((opt) => {
                  const disabled = (opt === 'players' && playerPool.length === 0) || (opt === 'team' && !organizationId);
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={disabled}
                      onClick={() => setAssignTo(opt)}
                      className={cn(
                        'px-2 py-2 rounded-md text-xs font-medium border transition-colors capitalize',
                        assignTo === opt
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-accent',
                        disabled && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      {opt === 'self' ? 'Myself' : opt === 'players' ? 'Player(s)' : 'Team'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Player picker */}
          {assignTo === 'players' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Select Players ({selectedPlayerIds.length})</Label>
              <div className="max-h-44 overflow-y-auto rounded-md border border-border divide-y divide-border">
                {playerPool.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent"
                  >
                    <Checkbox
                      checked={selectedPlayerIds.includes(p.id)}
                      onCheckedChange={() => togglePlayer(p.id)}
                    />
                    <span className="text-sm flex-1">{p.name}</span>
                    {p.position && (
                      <span className="text-[10px] text-muted-foreground">{p.position}</span>
                    )}
                  </label>
                ))}
                {playerPool.length === 0 && (
                  <p className="p-3 text-xs text-muted-foreground text-center">No linked players</p>
                )}
              </div>
            </div>
          )}

          {/* Team display */}
          {assignTo === 'team' && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Team:</span>{' '}
              <span className="font-medium">{orgName ?? '—'}</span>
            </div>
          )}

          {/* Lesson focus */}
          <div className="space-y-1.5">
            <Label className="text-xs">Lesson Focus (optional)</Label>
            <Select value={lessonFocusId} onValueChange={setLessonFocusId}>
              <SelectTrigger>
                <SelectValue placeholder="General session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General session</SelectItem>
                {lessons.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Recurring */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Recurring Weekly</Label>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>

          {recurring && (
            <div className="flex gap-1.5 flex-wrap">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                    recurringDays.includes(i)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Preview */}
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <span className="font-medium">{title}</span>
            <span className="text-muted-foreground">
              {' '}
              · {date} {startTime && `at ${formatTime12h(startTime)}`}
            </span>
          </div>

          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            {assignTo === 'players'
              ? `Assign to ${selectedPlayerIds.length} Player${selectedPlayerIds.length === 1 ? '' : 's'}`
              : 'Schedule Session'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
