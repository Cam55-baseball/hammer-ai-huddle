import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Send, Lock, Users, MessageSquare, Loader2 } from 'lucide-react';
import { CustomActivityTemplate } from '@/types/customActivity';
import { LockableField, LockPreset, LOCKABLE_FIELDS, LOCK_PRESETS, FollowedPlayer } from '@/types/sentActivity';
import { useSentActivities } from '@/hooks/useSentActivities';
import { scheduleSummary, type ScheduleInput } from '@/lib/coachRx/schedule';
import { getActivityIcon } from './IconPicker';
import { hexToRgba } from '@/hooks/useUserColors';
import { CoachExerciseAuthoring } from './CoachExerciseAuthoring';
import type { Exercise } from '@/types/customActivity';

/** Coach prescription categories (owner request Oct 24) — every category a plan can contain. */
const RX_CATEGORIES = [
  { value: 'hitting', label: 'Hitting' },
  { value: 'pitching', label: 'Pitching' },
  { value: 'throwing', label: 'Throwing' },
  { value: 'fielding', label: 'Fielding' },
  { value: 'baserunning', label: 'Baserunning' },
  { value: 'lift', label: 'Lifting' },
  { value: 'speed', label: 'Speed' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'warmup', label: 'Warm-up' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'vision', label: 'Vision / timing tools' },
] as const;

function defaultRxCategory(activityType: string): string {
  switch (activityType) {
    case 'workout': return 'lift';
    case 'running': return 'speed';
    case 'warmup': return 'warmup';
    case 'recovery': return 'recovery';
    case 'practice':
    case 'short_practice': return 'hitting';
    case 'free_session': return 'conditioning';
    default: return 'lift';
  }
}

interface SendToPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: CustomActivityTemplate | null;
  initialPlayerIds?: string[];
}

export function SendToPlayerDialog({ open, onOpenChange, template, initialPlayerIds }: SendToPlayerDialogProps) {
  const { t } = useTranslation();
  const { loading, loadingPlayers, followedPlayers, fetchFollowedPlayers, sendActivityToPlayers } = useSentActivities();
  
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [lockPreset, setLockPreset] = useState<LockPreset>('none');
  const [customLocks, setCustomLocks] = useState<LockableField[]>([]);
  const [message, setMessage] = useState('');
  const [rxCategory, setRxCategory] = useState<string>('lift');
  const [rxDate, setRxDate] = useState<string>('');
  // Scheduling (owner request Oct 24, run 6): any day / specific date(s) / recurring.
  const [schedType, setSchedType] = useState<'any_day' | 'date' | 'dates' | 'recurring'>('date');
  const [extraDates, setExtraDates] = useState<string[]>([]);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [everyWeeks, setEveryWeeks] = useState<number>(1);
  const [monthly, setMonthly] = useState<boolean>(false);
  const [monthlyOrdinal, setMonthlyOrdinal] = useState<number>(1);
  const [monthlyWeekday, setMonthlyWeekday] = useState<number>(2);
  const [endMode, setEndMode] = useState<'count' | 'end'>('count');
  const [recurCount, setRecurCount] = useState<number>(4);
  const [recurEnd, setRecurEnd] = useState<string>('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFollowedPlayers();
      setSelectedPlayers(initialPlayerIds ?? []);
      setPreview(false);
      setLockPreset('none');
      setCustomLocks([]);
      setMessage('');
      setExercises(template?.exercises ?? []);
      setRxCategory(template ? ((template as CustomActivityTemplate & {coach_card_category?:string}).coach_card_category ?? defaultRxCategory(template.activity_type)) : 'lift');
      setRxDate(new Date().toLocaleDateString('en-CA'));
      setSchedType('date');
      setExtraDates([]);
      setWeekdays([]);
      setEveryWeeks(1);
      setMonthly(false);
      setMonthlyOrdinal(1);
      setMonthlyWeekday(2);
      setEndMode('count');
      setRecurCount(4);
      setRecurEnd('');
    }
  }, [open, fetchFollowedPlayers, template]);

  const buildSchedule = (): ScheduleInput => ({
    type: schedType,
    startDate: rxDate,
    dates: schedType === 'dates' ? extraDates : undefined,
    weekdays: schedType === 'recurring' && !monthly ? weekdays : undefined,
    everyWeeks: schedType === 'recurring' && !monthly ? everyWeeks : undefined,
    monthlyOrdinal: schedType === 'recurring' && monthly ? monthlyOrdinal : undefined,
    monthlyWeekday: schedType === 'recurring' && monthly ? monthlyWeekday : undefined,
    endDate: schedType === 'recurring' && endMode === 'end' && recurEnd ? recurEnd : undefined,
    count: schedType === 'recurring' && endMode === 'count' ? recurCount : undefined,
  });

  const scheduleValid =
    schedType === 'any_day' ||
    schedType === 'date' ||
    (schedType === 'dates') ||
    (schedType === 'recurring' && (monthly ? true : weekdays.length > 0) && (endMode === 'count' ? recurCount > 0 : !!recurEnd));

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleLockToggle = (field: LockableField) => {
    setCustomLocks(prev => 
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
    setLockPreset('custom');
  };

  const getLockedFields = (): LockableField[] => {
    if (lockPreset === 'custom') return customLocks;
    const preset = LOCK_PRESETS.find(p => p.key === lockPreset);
    return preset?.fields || [];
  };

  const handleSend = async () => {
    if (!template) return;

    const success = await sendActivityToPlayers(
      { ...template, exercises },
      selectedPlayers,
      getLockedFields(),
      message.trim() || undefined,
      { category: rxCategory, planDate: rxDate, schedule: buildSchedule(), sourceTemplateId: (template as CustomActivityTemplate & { source_template_id?: string | null }).source_template_id }
    );

    if (success) {
      onOpenChange(false);
    }
  };

  if (!template) return null;

  const Icon = getActivityIcon(template.icon);
  const lockedFields = getLockedFields();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send workouts
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] px-6">
          {preview ? <section aria-label="Player workout preview" className="space-y-4 py-4">
            <h3 className="font-bold">From Coach · {template.title}</h3>
            <p className="text-sm">{scheduleSummary(buildSchedule())}</p>
            {message && <p className="text-sm">{message}</p>}
            <ul className="space-y-3">{exercises.map(exercise => <li key={exercise.id} className="border-b border-border pb-2 text-sm"><p className="font-semibold">{exercise.name}</p><p>{exercise.sets ? `${exercise.sets} sets · ` : ''}{exercise.dosage_unit === 'seconds' ? exercise.duration : exercise.dosage_unit === 'feet' ? exercise.distance_feet : exercise.reps} {exercise.dosage_unit}{exercise.rest != null ? ` · Rest: ${exercise.rest} seconds` : ''}</p>{exercise.gear && <p>Gear: {exercise.gear}</p>}{exercise.notes && <p>{exercise.notes}</p>}</li>)}</ul>
            <div className="flex flex-wrap gap-2"><Button disabled size="sm">Use instead of my {rxCategory} card</Button><Button disabled size="sm" variant="outline">Add alongside</Button><Button disabled size="sm" variant="ghost">Save for later</Button></div>
            <p className="text-xs text-muted-foreground">{selectedPlayers.length} player(s) · {lockedFields.length ? `Locked: ${lockedFields.join(', ')}` : 'No locked fields'}</p>
          </section> : <div className="space-y-6 py-4">
            {/* Activity Preview */}
            <Card className="border-primary/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    className="bg-primary/10 p-2 rounded-lg"
                  >
                    {template.custom_logo_url ? (
                      <img src={template.custom_logo_url} alt="" className="h-6 w-6 object-contain" />
                    ) : (
                      <Icon className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate">{template.title}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {t(`customActivity.types.${template.activity_type}`)}
                    </Badge>
                  </div>
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {template.description}
                  </p>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Lock Settings */}
            <CoachExerciseAuthoring exercises={exercises} onChange={setExercises} />
            <Separator />
            <div className="space-y-4">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {t('sentActivity.lockSettings', 'Lock Settings')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('sentActivity.lockDescription', 'Choose which fields the player cannot edit when they accept this activity.')}
              </p>

              <RadioGroup value={lockPreset} onValueChange={(v) => setLockPreset(v as LockPreset)}>
                <div className="grid grid-cols-2 gap-2">
                  {LOCK_PRESETS.filter(p => p.key !== 'custom').map(preset => (
                    <div key={preset.key} className="flex items-center space-x-2">
                      <RadioGroupItem value={preset.key} id={preset.key} />
                      <Label htmlFor={preset.key} className="text-sm cursor-pointer">
                        {t(preset.labelKey)}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              {lockPreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border bg-muted/30">
                  {LOCKABLE_FIELDS.map(field => (
                    <div key={field.key} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`lock-${field.key}`}
                        checked={customLocks.includes(field.key)}
                        onCheckedChange={() => handleLockToggle(field.key)}
                      />
                      <Label htmlFor={`lock-${field.key}`} className="text-sm cursor-pointer">
                        {t(field.labelKey)}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {lockedFields.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lockedFields.map(field => (
                    <Badge key={field} variant="secondary" className="text-xs gap-1">
                      <Lock className="h-3 w-3" />
                      {t(`sentActivity.locks.${field}`)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Coach prescription: category + day (owner request Oct 24) */}
            <div className="space-y-3">
              <Label className="text-sm font-bold">
                {t('sentActivity.rxTitle', 'Plan card it can replace')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('sentActivity.rxHint', 'The player chooses: use it instead of their card for this category, add it alongside, or save it for later.')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="rx-category" className="text-xs">Category</Label>
                  <select
                    id="rx-category"
                    value={rxCategory}
                    onChange={(e) => setRxCategory(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  >
                    {RX_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rx-date" className="text-xs">{schedType === 'recurring' ? 'Starts on/after' : schedType === 'any_day' ? 'Sent on' : 'Day'}</Label>
                  <input
                    id="rx-date"
                    type="date"
                    value={rxDate}
                    min={new Date().toLocaleDateString('en-CA')}
                    onChange={(e) => setRxDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              {/* Schedule shape */}
              <div className="space-y-2" data-rx-schedule>
                <Label className="text-xs font-bold">When</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    ['date', 'One day'],
                    ['dates', 'Picked dates'],
                    ['recurring', 'Repeating'],
                    ['any_day', 'Any day — player picks'],
                  ] as const).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      data-sched-type={v}
                      onClick={() => setSchedType(v)}
                      className={`rounded-md border px-2 py-1.5 text-xs ${schedType === v ? 'border-primary bg-primary/10 font-semibold' : 'border-input'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {schedType === 'dates' && (
                  <div className="space-y-1">
                    {extraDates.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="date"
                          value={d}
                          min={new Date().toLocaleDateString('en-CA')}
                          onChange={(e) => setExtraDates((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => setExtraDates((prev) => prev.filter((_, j) => j !== i))}>Remove</Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" data-add-date onClick={() => setExtraDates((prev) => [...prev, rxDate])}>
                      + Add another date
                    </Button>
                  </div>
                )}

                {schedType === 'recurring' && (
                  <div className="space-y-2 rounded-md border border-border p-2">
                    <div className="flex items-center gap-2 text-xs">
                      <button type="button" data-recur-kind="weekly" onClick={() => setMonthly(false)} className={`rounded px-2 py-1 ${!monthly ? 'bg-primary/10 font-semibold' : ''}`}>Weekly</button>
                      <button type="button" data-recur-kind="monthly" onClick={() => setMonthly(true)} className={`rounded px-2 py-1 ${monthly ? 'bg-primary/10 font-semibold' : ''}`}>Monthly</button>
                    </div>
                    {!monthly ? (
                      <>
                        <div className="flex flex-wrap gap-1">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                            <button
                              key={d}
                              type="button"
                              data-weekday={i}
                              onClick={() => setWeekdays((prev) => prev.includes(i) ? prev.filter((w) => w !== i) : [...prev, i])}
                              className={`rounded-md border px-2 py-1 text-xs ${weekdays.includes(i) ? 'border-primary bg-primary/10 font-semibold' : 'border-input'}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Label htmlFor="rx-every" className="text-xs">Every</Label>
                          <input
                            id="rx-every"
                            type="number" min={1} max={8} value={everyWeeks}
                            onChange={(e) => setEveryWeeks(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
                            className="w-14 rounded-md border border-input bg-background px-2 py-1 text-sm"
                          />
                          <span>week(s)</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-xs">
                        <select value={monthlyOrdinal} onChange={(e) => setMonthlyOrdinal(Number(e.target.value))} className="rounded-md border border-input bg-background px-2 py-1 text-sm" data-monthly-ordinal>
                          <option value={1}>First</option><option value={2}>Second</option><option value={3}>Third</option><option value={4}>Fourth</option><option value={5}>Last</option>
                        </select>
                        <select value={monthlyWeekday} onChange={(e) => setMonthlyWeekday(Number(e.target.value))} className="rounded-md border border-input bg-background px-2 py-1 text-sm" data-monthly-weekday>
                          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => <option key={d} value={i}>{d}</option>)}
                        </select>
                        <span>of the month</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button type="button" data-end-mode="count" onClick={() => setEndMode('count')} className={`rounded px-2 py-1 ${endMode === 'count' ? 'bg-primary/10 font-semibold' : ''}`}>Number of times</button>
                      <button type="button" data-end-mode="end" onClick={() => setEndMode('end')} className={`rounded px-2 py-1 ${endMode === 'end' ? 'bg-primary/10 font-semibold' : ''}`}>End date</button>
                      {endMode === 'count' ? (
                        <input
                          type="number" min={1} max={60} value={recurCount}
                          onChange={(e) => setRecurCount(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                          className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
                          data-recur-count
                        />
                      ) : (
                        <input
                          type="date" value={recurEnd} min={rxDate}
                          onChange={(e) => setRecurEnd(e.target.value)}
                          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                          data-recur-end
                        />
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground" data-sched-summary>{scheduleSummary(buildSchedule())}</p>
              </div>
            </div>

            <Separator />

            {/* Player Selection */}
            <div className="space-y-4">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('sentActivity.selectPlayers', 'Select Players')}
                {selectedPlayers.length > 0 && (
                  <Badge variant="default" className="ml-auto">
                    {selectedPlayers.length}
                  </Badge>
                )}
              </Label>

              {loadingPlayers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : followedPlayers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('sentActivity.noPlayers', 'No followed players found')}</p>
                  <p className="text-xs">{t('sentActivity.noPlayersHint', 'Follow players to send them activities')}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {followedPlayers.map(player => (
                    <div 
                      key={player.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPlayers.includes(player.id) 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handlePlayerToggle(player.id)}
                    >
                      <Checkbox 
                        checked={selectedPlayers.includes(player.id)}
                        onCheckedChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback>
                          {player.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{player.full_name || 'Unknown Player'}</p>
                        {player.position && (
                          <p className="text-xs text-muted-foreground">{player.position}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Message */}
            <div className="space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('sentActivity.message', 'Message (Optional)')}
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('sentActivity.messagePlaceholder', 'Add a note for the player...')}
                rows={3}
              />
            </div>
          </div>}
        </ScrollArea>

        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t">
          <Button variant="outline" disabled={loading} onClick={() => preview ? setPreview(false) : onOpenChange(false)}>
            {preview ? 'Back to edit' : t('common.cancel')}
          </Button>
          <Button
            onClick={() => preview ? void handleSend() : setPreview(true)}
            disabled={loading || selectedPlayers.length === 0 || !scheduleValid || !exercises.length || exercises.some(e => !e.name.trim() || !e.dosage_unit)}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {preview ? 'Send workout' : 'Preview player card'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
