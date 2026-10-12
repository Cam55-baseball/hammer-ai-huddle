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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';



const MODULES = [
  { value: 'hitting', label: 'Hitting' },
  { value: 'pitching', label: 'Pitching' },
  { value: 'fielding', label: 'Fielding' },
  
  { value: 'baserunning', label: 'Baserunning' },
  { value: 'conditioning', label: 'Conditioning' },
];

const SESSION_TYPES = [
  { value: 'team_session', label: 'Team Session' },
  { value: 'lesson', label: 'Lesson' },
  { value: 'solo_work', label: 'Solo Work' },
  { value: 'live_abs', label: 'Live ABs' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CheckRow {
  player_id: string; name: string; ok: boolean; reasons: string[];
  alternative: { intensity?: 'light' | 'standard' | 'high'; throwing?: boolean; date?: string; text: string } | null;
}

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
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [intensity, setIntensity] = useState<'light' | 'standard' | 'high'>('standard');
  const [throwing, setThrowing] = useState(false);
  const [minutes, setMinutes] = useState('60');
  const [teamId, setTeamId] = useState<string>('');
  const [check, setCheck] = useState<{ results: CheckRow[]; refused: { player_id: string; reason: string }[] } | null>(null);

  const teams = useQuery({
    queryKey: ['coach-schedule-teams', user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase.from('org_teams').select('id, name, organization_id').is('archived_at', null).order('created_at');
      return (data ?? []) as { id: string; name: string; organization_id: string }[];
    },
  });
  const teamRoster = useQuery({
    queryKey: ['coach-schedule-roster', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data } = await supabase.from('org_team_members').select('user_id').eq('team_id', teamId).eq('seat', 'player').is('removed_at', null);
      return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
    },
  });

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
  const [teamName, setTeamName] = useState('');

  const activeOrg = myOrgs.data?.[0];
  const orgMembers = members.data ?? [];

  useEffect(() => {
    if (sessionType === 'team_session' && activeOrg?.name) {
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
    if (scope === 'team') return teamRoster.data ?? [];
    if (scope === 'organization' && activeOrg) {
      return orgMembers
        .filter(m => m.organization_id === activeOrg.id)
        .map(m => m.user_id);
    }
    return [];
  };

  const buildSession = () => {
    const team = teams.data?.find((t) => t.id === teamId);
    return {
      session_module: module, session_type: sessionType, title,
      description: description || undefined,
      scheduled_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      start_time: startTime || undefined, end_time: endTime || undefined, sport,
      intensity, throwing, duration_minutes: Number(minutes) || undefined,
      team_id: scope === 'team' ? teamId : undefined,
      organization_id: scope === 'organization' ? activeOrg?.id : scope === 'team' ? team?.organization_id : undefined,
      team_name: scope === 'team' ? team?.name : sessionType === 'team_session' ? teamName || undefined : undefined,
    };
  };

  const call = async (mode: 'check' | 'schedule') => {
    const playerIds = getTargetPlayerIds();
    if (!user || !selectedDate || playerIds.length === 0) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('coach-practice-check', { body: { mode, player_ids: playerIds, session: buildSession() } });
      if (error || (data as any)?.error) { toast.error((data as any)?.error ?? 'Could not check this practice'); return null; }
      return data as any;
    } finally { setLoading(false); }
  };

  const handleCheck = async () => { const d = await call('check'); if (d) setCheck(d); };

  const handleSubmit = async () => {
    const d = await call('schedule');
    if (!d) return;
    const n = (d.scheduled ?? []).length;
    const blocked = (d.results ?? []).filter((r: CheckRow) => !r.ok).length + (d.refused ?? []).length;
    toast.success(`Practice sent to ${n} player(s)${blocked ? ` · ${blocked} not sent (see reasons)` : ''}`);
    qc.invalidateQueries({ queryKey: ['scheduled-sessions'] });
    setCheck(d);
    if (blocked === 0) { onOpenChange(false); onCreated?.(); setCheck(null); setSelectedPlayerIds([]); setDescription(''); }
  };

  const applyAlternative = (alt: CheckRow['alternative']) => {
    if (!alt) return;
    if (alt.intensity) setIntensity(alt.intensity);
    if (alt.throwing === false) setThrowing(false);
    if (alt.date) setSelectedDate(new Date(`${alt.date}T12:00:00`));
    setCheck(null);
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
              {(teams.data ?? []).length > 0 && (
                <Button type="button" size="sm" variant={scope === 'team' ? 'default' : 'outline'} onClick={() => setScope('team')} className="gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Whole team
                </Button>
              )}
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

          {scope === 'team' && (
            <div className="space-y-1.5">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={(v) => { setTeamId(v); setCheck(null); }}>
                <SelectTrigger><SelectValue placeholder="Pick a team" /></SelectTrigger>
                <SelectContent>{(teams.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
              {teamId && <p className="text-xs text-muted-foreground">{(teamRoster.data ?? []).length} player(s) on this team</p>}
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

          {/* Practice load — counts toward each player's workload */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>How hard</Label>
              <Select value={intensity} onValueChange={(v) => { setIntensity(v as any); setCheck(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Minutes</Label>
              <Input type="number" min={15} max={240} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={throwing} onCheckedChange={(c) => { setThrowing(!!c); setCheck(null); }} />
            <span className="text-sm">Includes throwing</span>
          </label>
          <p className="text-xs text-muted-foreground">Practices count toward each player's workload, so their next plan adjusts.</p>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add notes for players..." rows={2} />
          </div>

          {check && (
            <div className="space-y-2 rounded-md border p-3" aria-label="Safety check results">
              <p className="text-sm font-medium">Safety check</p>
              {check.results.map((r) => (
                <div key={r.player_id} className="text-sm">
                  <p><span className="font-medium">{r.name}:</span> {r.ok ? 'OK to schedule' : 'Not allowed'}</p>
                  {r.reasons.map((x, i) => <p key={i} className="text-xs text-muted-foreground">Why: {x}</p>)}
                  {r.alternative && (
                    <Button type="button" size="sm" variant="outline" className="mt-1 h-auto whitespace-normal text-left" onClick={() => applyAlternative(r.alternative)}>
                      {r.alternative.text}
                    </Button>
                  )}
                </div>
              ))}
              {check.refused.map((r) => <p key={r.player_id} className="text-xs text-muted-foreground">One player: {r.reason}</p>)}
            </div>
          )}

          {/* Submit */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleCheck} disabled={loading || targetCount === 0 || !selectedDate}>
              Check safety
            </Button>
            <Button onClick={handleSubmit} disabled={loading || targetCount === 0 || !selectedDate}>
              {loading ? 'Working...' : `Schedule for ${targetCount}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
