import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Plus } from 'lucide-react';
import { useScheduledPracticeSessions } from '@/hooks/useScheduledPracticeSessions';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { usePlayerOrganization } from '@/hooks/usePlayerOrganization';
import { CoachSelector, CoachSelection } from '@/components/practice/CoachSelector';
import { cn } from '@/lib/utils';
import { formatTime12h } from '@/lib/formatTime';

const MODULES = [
  { value: 'hitting', label: 'Hitting' },
  { value: 'pitching', label: 'Pitching' },
  { value: 'throwing', label: 'Throwing' },
  { value: 'fielding', label: 'Fielding' },
  { value: 'catching', label: 'Catching' },
  { value: 'baserunning', label: 'Baserunning' },
  
];

const SESSION_TYPES = [
  { value: 'solo_work', label: 'Solo Work' },
  { value: 'team_session', label: 'Team Session' },
  { value: 'lesson', label: 'Lesson' },
  { value: 'live_abs', label: 'Live At-Bats' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface SchedulePracticeDialogProps {
  defaultModule?: string;
  onScheduled?: () => void;
}

export function SchedulePracticeDialog({ defaultModule, onScheduled }: SchedulePracticeDialogProps) {
  const { sport } = useSportTheme();
  const { createSession, loading } = useScheduledPracticeSessions();
  const { organizationId, orgName } = usePlayerOrganization();
  const [open, setOpen] = useState(false);

  const [module, setModule] = useState(defaultModule || 'hitting');
  const [sessionType, setSessionType] = useState('solo_work');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:00');
  const [recurring, setRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);

  // Contextual fields
  const [coachSelection, setCoachSelection] = useState<CoachSelection>({ type: 'none' });
  const [teamName, setTeamName] = useState('');

  // Auto-populate team name from org when session type changes
  useEffect(() => {
    if (sessionType === 'team_session' && orgName) {
      setTeamName(orgName);
    }
  }, [sessionType, orgName]);

  const generateTitle = () => {
    const modLabel = MODULES.find(m => m.value === module)?.label || module;
    const typeLabel = SESSION_TYPES.find(t => t.value === sessionType)?.label || sessionType;
    return `${modLabel} ${typeLabel}`;
  };

  const toggleDay = (day: number) => {
    setRecurringDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    // Build description for external coach
    let description: string | undefined;
    if (sessionType === 'lesson' && coachSelection.type === 'external' && coachSelection.external_name) {
      description = `Coach: ${coachSelection.external_name}`;
    }

    const result = await createSession({
      session_module: module,
      session_type: sessionType,
      title: generateTitle(),
      description,
      scheduled_date: date,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      recurring_active: recurring,
      recurring_days: recurring ? recurringDays : [],
      sport: sport || 'baseball',
      coach_id: sessionType === 'lesson' && coachSelection.type === 'assigned' ? coachSelection.coach_id : undefined,
      organization_id: sessionType === 'team_session' && organizationId ? organizationId : undefined,
      team_name: sessionType === 'team_session' ? teamName || undefined : undefined,
    });

    if (result) {
      setOpen(false);
      onScheduled?.();
    }
  };

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
          <DialogTitle>Schedule Practice Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Module */}
          <div className="space-y-1.5">
            <Label className="text-xs">Module</Label>
            <Select value={module} onValueChange={setModule}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODULES.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Session Type</Label>
            <Select value={sessionType} onValueChange={setSessionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional: Lesson → Coach Selector */}
          {sessionType === 'lesson' && (
            <CoachSelector value={coachSelection} onChange={setCoachSelection} />
          )}

          {/* Conditional: Team Session → Team/Org field */}
          {sessionType === 'team_session' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Team / Organization</Label>
              <Input
                placeholder={organizationId ? orgName : 'Enter your team name'}
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
              />
              {organizationId && (
                <p className="text-[10px] text-muted-foreground">Auto-populated from your organization</p>
              )}
            </div>
          )}


          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Time</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Time</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
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
            <span className="font-medium">{generateTitle()}</span>
            <span className="text-muted-foreground"> · {date} {startTime && `at ${formatTime12h(startTime)}`}</span>
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Schedule Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
