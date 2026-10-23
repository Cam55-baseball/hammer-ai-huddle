import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Save, Trash2, Dumbbell, Timer, Footprints } from 'lucide-react';
import { ActivityFolderItem } from '@/types/activityFolder';
import { useFocusExercise, FocusDurationTimer } from '@/components/hammer/cards/FocusSession';
import type { Exercise } from '@/types/customActivity';

interface SetRow {
  set: number;
  weight?: number;
  reps?: number;
  time?: number; // seconds (new rows). Legacy rows without time_unit may be minutes.
  time_unit?: 'sec' | 'min';
  distance?: number; // feet
  steps?: number;
  force_lbs?: number; // pounds of force produced (concentric/isometric)
  unit?: string;
}

interface PerformanceData {
  sets?: SetRow[];
  notes?: string;
}

interface FolderItemPerformanceLoggerProps {
  item: ActivityFolderItem;
  performanceData?: PerformanceData;
  onSave: (data: PerformanceData) => Promise<void>;
  compact?: boolean;
  exerciseId?: string;
  exerciseName?: string;
  prescription?: Exercise;
}

type InputMode = 'weight_reps' | 'duration' | 'flexible';

function getInputMode(itemType: string | null): InputMode {
  switch (itemType) {
    case 'exercise':
    case 'skill_work':
      return 'weight_reps';
    case 'mobility':
    case 'recovery':
      return 'duration';
    default:
      return 'flexible';
  }
}

function getDefaultSet(mode: InputMode, setNum: number): SetRow {
  const base: SetRow = { set: setNum, unit: 'lbs', time_unit: 'sec' };
  if (mode === 'weight_reps') return { ...base, weight: undefined, reps: undefined };
  if (mode === 'duration') return { ...base, time: undefined };
  return { ...base, weight: undefined, reps: undefined, time: undefined, distance: undefined };
}

export function FolderItemPerformanceLogger({ item, performanceData, onSave, compact, exerciseId, exerciseName, prescription }: FolderItemPerformanceLoggerProps) {
  const mode = prescription?.duration != null ? 'duration' : prescription ? 'weight_reps' : getInputMode(item.item_type);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prescribedRows = Math.max(1, prescription?.sets ?? 1);
  const rowsRef = useRef<SetRow[]>([]);
  const dirty = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeChain = useRef<Promise<void>>(Promise.resolve());
  const saveRef = useRef(onSave);
  const dataRef = useRef(performanceData);
  saveRef.current = onSave;
  dataRef.current = performanceData;

  useEffect(() => {
    if (dirty.current) return;
    // If scoped to a specific exercise, load from exerciseSets map
    const scopedData = exerciseId
      ? (performanceData as any)?.exerciseSets?.[exerciseId]
      : performanceData;
    
    if (scopedData?.sets && scopedData.sets.length > 0) {
      rowsRef.current = scopedData.sets;
      setSets(scopedData.sets);
    } else {
      const initial = Array.from({ length: prescribedRows }, (_, index) => getDefaultSet(mode, index + 1));
      rowsRef.current = initial;
      setSets(initial);
    }
  }, [performanceData, mode, exerciseId, prescribedRows]);

  const addSet = () => {
    const lastSet = sets[sets.length - 1];
    const next = [...rowsRef.current, {
      ...getDefaultSet(mode, rowsRef.current.length + 1),
      unit: lastSet?.unit || 'lbs',
      weight: lastSet?.weight,
    }];
    rowsRef.current = next;
    dirty.current = true;
    setSets(next);
  };

  const removeSet = (index: number) => {
    if (sets.length <= 1) return;
    const next = rowsRef.current.filter((_, i) => i !== index).map((s, i) => ({ ...s, set: i + 1 }));
    rowsRef.current = next;
    dirty.current = true;
    setSets(next);
  };

  const persist = async () => {
    if (debounce.current) { clearTimeout(debounce.current); debounce.current = null; }
    const snapshot = rowsRef.current;
    const write = writeChain.current.catch(() => {}).then(async () => {
      setSaving(true);
      try {
      if (exerciseId) {
        // Merge into exerciseSets map
        const existing = (dataRef.current as any) || {};
        const existingSets = existing.exerciseSets || {};
        await saveRef.current({
          ...existing,
          exerciseSets: {
            ...existingSets,
            [exerciseId]: { sets: snapshot },
          },
        } as any);
      } else {
        await saveRef.current({ ...(dataRef.current || {}), sets: snapshot });
      }
      if (rowsRef.current === snapshot) dirty.current = false;
      setError(null);
    } finally {
      setSaving(false);
    }
    });
    writeChain.current = write;
    await write;
  };

  const updateSet = (index: number, field: keyof SetRow, value: any) => {
    const next = rowsRef.current.map((s, i) => i === index ? { ...s, [field]: value, ...(field === 'time' ? { time_unit: 'sec' as const } : {}) } : s);
    rowsRef.current = next;
    dirty.current = true;
    setSets(next);
    if (prescription) {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => { void persist().catch(() => setError("Couldn't save your sets. Your entries are still here; try again.")); }, 600);
    }
  };

  const flushRef = useRef(persist);
  flushRef.current = persist;
  useEffect(() => {
    const flush = () => { if (dirty.current && prescription) void flushRef.current().catch(() => setError("Couldn't save your sets. Your entries are still here; try again.")); };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', flush);
      if (debounce.current) clearTimeout(debounce.current);
      flush();
    };
  }, [prescription]);

  const handleSave = async () => {
    setError(null);
    try { await persist(); }
    catch { setError("Couldn't save your sets. Your entries are still here; try again."); }
  };
  const focus = useFocusExercise({ id: `coach:${item.id}:${exerciseId ?? 'item'}`, name: exerciseName ?? item.title,
    rows: prescribedRows, ready: Array.from({ length: prescribedRows }, (_, index) => {
      const row = sets[index];
      return row != null && [row.reps, row.time, row.distance, row.steps, row.force_lbs].some(value => value != null && value > 0);
    }), restSeconds: prescription?.rest ?? null, save: persist });

  const hasSomeData = sets.some(s => s.weight || s.reps || s.time || s.distance || s.steps || s.force_lbs);

  return (
    <div className={focus.visible ? 'space-y-2 mt-2' : 'hidden'}>
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {mode === 'weight_reps' && <Dumbbell className="h-3 w-3" />}
        {mode === 'duration' && <Timer className="h-3 w-3" />}
        {mode === 'flexible' && <Footprints className="h-3 w-3" />}
        <span>{exerciseName ? `${exerciseName} — Log Sets (instructions below)` : 'Log Sets'}</span>
      </div>

      {focus.active && prescription?.duration != null && prescription.duration > 0 && <FocusDurationTimer key={focus.row} target={prescription.duration} onDone={seconds => updateSet(focus.row, 'time', seconds)} />}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="space-y-1.5">
        {sets.map((set, index) => (
          <div key={index} data-entry-row={index < prescribedRows ? 'prescribed' : 'added'} className={focus.active && index !== focus.row ? 'hidden' : 'space-y-1'}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground w-4 text-center shrink-0">{set.set}</span>

              {(mode === 'weight_reps' || mode === 'flexible') && (
                <>
                  <Input
                    type="number"
                    placeholder="Wt"
                    value={set.weight ?? ''}
                    onChange={e => updateSet(index, 'weight', e.target.value ? Number(e.target.value) : undefined)}
                    className="h-7 w-16 text-xs px-1.5 min-w-0"
                  />
                  <Select value={set.unit || 'lbs'} onValueChange={v => updateSet(index, 'unit', v)}>
                    <SelectTrigger className="h-7 w-14 text-[10px] px-1 min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lbs">lbs</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Reps"
                    value={set.reps ?? ''}
                    onChange={e => updateSet(index, 'reps', e.target.value ? Number(e.target.value) : undefined)}
                    className="h-7 w-14 text-xs px-1.5 min-w-0"
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      placeholder="Force"
                      value={set.force_lbs ?? ''}
                      onChange={e => updateSet(index, 'force_lbs', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="h-7 w-16 text-xs px-1.5 min-w-0"
                    />
                    <span className="text-[10px] text-muted-foreground">lbs force</span>
                  </div>
                </>
              )}

              {(mode === 'duration' || mode === 'flexible') && (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="Sec"
                    value={set.time != null && set.time_unit !== 'sec' ? Number((set.time * 60).toFixed(2)) : set.time ?? ''}
                    onChange={e => updateSet(index, 'time', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="h-7 w-16 text-xs px-1.5 min-w-0"
                  />
                  <span className="text-[10px] text-muted-foreground">sec</span>
                </div>
              )}

              {!focus.active && sets.length > 1 && (
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeSet(index)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>

            {mode === 'flexible' && (
              <div className="flex items-center gap-1.5 flex-wrap pl-5">
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="Dist"
                    value={set.distance ?? ''}
                    onChange={e => updateSet(index, 'distance', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="h-7 w-16 text-xs px-1.5 min-w-0"
                  />
                  <span className="text-[10px] text-muted-foreground">ft</span>
                </div>
                <Input
                  type="number"
                  placeholder="Steps"
                  value={set.steps ?? ''}
                  onChange={e => updateSet(index, 'steps', e.target.value ? Number(e.target.value) : undefined)}
                  className="h-7 w-14 text-xs px-1.5 min-w-0"
                />
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    inputMode="decimal"
                    placeholder="Force"
                    value={set.force_lbs ?? ''}
                    onChange={e => updateSet(index, 'force_lbs', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="h-7 w-16 text-xs px-1.5 min-w-0"
                  />
                  <span className="text-[10px] text-muted-foreground">lbs force</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {focus.active && prescription && <div className="text-sm text-muted-foreground space-y-1">
        {prescription.duration != null && <p>Time target: {prescription.duration.toFixed(2)} sec</p>}
        {prescription.reps != null && <p>Reps target: {prescription.reps}</p>}
        {prescription.notes && <p>{prescription.notes}</p>}
      </div>}
      <div className={focus.active ? 'hidden' : 'flex items-center gap-2'}>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addSet}>
          <Plus className="h-3 w-3" /> Set
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs gap-1 ml-auto"
          onClick={handleSave}
          disabled={saving || !hasSomeData}
        >
          <Save className="h-3 w-3" /> {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
