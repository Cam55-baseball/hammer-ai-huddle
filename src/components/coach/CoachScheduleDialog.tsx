import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Users, User, Building2 } from 'lucide-react';
import { useScheduledPracticeSessions, CreateScheduledSession } from '@/hooks/useScheduledPracticeSessions';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { CoachSelector, CoachSelection } from '@/components/practice/CoachSelector';
import { GameSessionFields } from '@/components/practice/GameSessionFields';

const MODULES = [
  { value: 'hitting', label: 'Hitting' },
  { value: 'pitching', label: 'Pitching' },
  { value: 'fielding', label: 'Fielding' },
  { value: 'catching', label: 'Catching' },
  { value: 'baserunning', label: 'Baserunning' },
  { value: 'conditioning', label: 'Conditioning' },
];

const SESSION_TYPES = [
  { value: 'team_session', label: 'Team Session' },
  { value: 'lesson', label: 'Lesson' },
  { value: 'game', label: 'Game' },
  { value: 'solo_work', label: 'Solo Work' },
  { value: 'live_abs', label: 'Live ABs' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface LinkedPlayer {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface CoachScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedPlayers: LinkedPlayer[];
  onCreated?: () => void;
}

export function CoachScheduleDialog({ open, onOpenChange, linkedPlayers, onCreated }: CoachScheduleDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { myOrgs, members } = useOrganization();
  const { createBulkSessions, loading } = useScheduledPracticeSessions();

  const [module, setModule] = useState('hitting');
  const [sessionType, setSessionType] = useState('team_session');
  const [scope, setScope] = useState<'individual' | 'team' | 'organization'>('individual');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:00');
  const [description, setDescription] = useState('');
  const [recurringActive, setRecurringActive] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [sport, setSport] = useState('baseball');
  const [coachSelection, setCoachSelection] = useState<CoachSelection>({ type: 'none' });
  const [teamName, setTeamName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [opponentLevel, setOpponentLevel] = useState('');

  const activeOrg = myOrgs.data?.[0];
  const orgMembers = members.data ?? [];

  useEffect(() => {
    if ((sessionType === 'team_session' || sessionType === 'game') && activeOrg?.name) {
      setTeamName(activeOrg.name);
    }
  }, [sessionType, activeOrg?.name]);

  const title = `${MODULES.find(m => m.value === module)?.label ?? module} ${SESSION_TYPES.find(s => s.value === sessionType)?.label ?? sessionType}`;

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleDay = (day: number) => {
    setRecurringDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const getTargetPlayerIds = (): string[] => {
    if (scope === 'individual') return selectedPlayerIds;
    if (scope === 'organization' && activeOrg) {
      return orgMembers
        .filter(m => m.organization_id === activeOrg.id)
        .map(m => m.user_id);
    }
    return [];
  };

  const handleSubmit = async () => {
    if (!user || !selectedDate) return;

    const playerIds = getTargetPlayerIds();
    if (playerIds.length === 0) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const resolvedCoachId = sessionType === 'lesson' && coachSelection.type === 'assigned'
      ? coachSelection.coach_id
      : user.id;

    const resolvedDescription = sessionType === 'lesson' && coachSelection.type === 'external' && coachSelection.external_name
      ? [description, `Coach: ${coachSelection.external_name}`].filter(Boolean).join(' — ')
      : description;

    const baseSession: Omit<CreateScheduledSession, 'user_id'> = {
      session_module: module,
      session_type: sessionType,
      title,
      description: resolvedDescription || undefined,
      scheduled_date: dateStr,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      recurring_active: recurringActive,
      recurring_days: recurringDays,
      sport,
      coach_id: resolvedCoachId,
      assignment_scope: scope,
      organization_id: scope === 'organization' ? activeOrg?.id : undefined,
      team_name: (sessionType === 'team_session' || sessionType === 'game') ? teamName || undefined : undefined,
      opponent_name: sessionType === 'game' ? opponentName || undefined : undefined,
      opponent_level: sessionType === 'game' ? opponentLevel || undefined : undefined,
    };

    const result = await createBulkSessions(playerIds, baseSession);
    if (result) {
      onOpenChange(false);
      onCreated?.();
      // Reset form
      setSelectedPlayerIds([]);
      setDescription('');
      setRecurringActive(false);
      setRecurringDays([]);
      setCoachSelection({ type: 'none' });
      setTeamName('');
      setOpponentName('');
      setOpponentLevel('');
    }
  };

  const targetCount = getTargetPlayerIds().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Practice Session</DialogTitle>
          <DialogDescription>Schedule a session for your players</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Module */}
          <div className="space-y-1.5">
            <Label>Module</Label>
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
            <Label>Session Type</Label>
            <Select value={sessionType} onValueChange={setSessionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contextual Fields */}
          {sessionType === 'lesson' && (
            <CoachSelector value={coachSelection} onChange={setCoachSelection} />
          )}

          {sessionType === 'team_session' && (
            <div className="space-y-1.5">
              <Label>Team / Organization</Label>
              <Input
                placeholder="Enter team name"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
              />
            </div>
          )}

          {sessionType === 'game' && (
            <>
              <GameSessionFields
                opponentName={opponentName}
                opponentLevel={opponentLevel}
                onNameChange={setOpponentName}
                onLevelChange={setOpponentLevel}
              />
              <div className="space-y-1.5">
                <Label>Team You Are Playing For</Label>
                <Input
                  placeholder="Enter team name"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Sport</Label>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baseball">Baseball</SelectItem>
                <SelectItem value="softball">Softball</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Scope */}
          <div className="space-y-1.5">
            <Label>Assign To</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={scope === 'individual' ? 'default' : 'outline'}
                onClick={() => setScope('individual')}
                className="gap-1.5"
              >
                <User className="h-3.5 w-3.5" /> Individual
              </Button>
              {activeOrg && (
                <Button
                  type="button"
                  size="sm"
                  variant={scope === 'organization' ? 'default' : 'outline'}
                  onClick={() => setScope('organization')}
                  className="gap-1.5"
                >
                  <Building2 className="h-3.5 w-3.5" /> {activeOrg.name}
                </Button>
              )}
            </div>
          </div>

          {/* Player Picker (individual scope) */}
          {scope === 'individual' && (
            <div className="space-y-1.5">
              <Label>Select Players</Label>
              <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                {linkedPlayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 text-center">No linked players</p>
                ) : (
                  linkedPlayers.map(p => (
                    <label key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/50 cursor-pointer">
                      <Checkbox
                        checked={selectedPlayerIds.includes(p.id)}
                        onCheckedChange={() => togglePlayer(p.id)}
                      />
                      <span className="text-sm">{p.full_name}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedPlayerIds.length > 0 && (
                <p className="text-xs text-muted-foreground">{selectedPlayerIds.length} player(s) selected</p>
              )}
            </div>
          )}

          {scope === 'organization' && (
            <p className="text-sm text-muted-foreground">
              This session will be assigned to all {orgMembers.filter(m => m.organization_id === activeOrg?.id).length} member(s) in {activeOrg?.name}.
            </p>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Recurring */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={recurringActive} onCheckedChange={(c) => setRecurringActive(!!c)} />
              <span className="text-sm font-medium">Repeat Weekly</span>
            </label>
            {recurringActive && (
              <div className="flex gap-1.5 flex-wrap">
                {DAY_LABELS.map((label, i) => (
                  <Button
                    key={i}
                    type="button"
                    size="sm"
                    variant={recurringDays.includes(i) ? 'default' : 'outline'}
                    className="h-8 w-10 text-xs"
                    onClick={() => toggleDay(i)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add notes for players..." rows={2} />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading || targetCount === 0 || !selectedDate}
            className="w-full"
          >
            {loading ? 'Scheduling...' : `Schedule for ${targetCount} player(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
