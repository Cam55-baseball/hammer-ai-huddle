import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Save, Trash2, Dumbbell, Timer, Footprints } from 'lucide-react';
import { ActivityFolderItem } from '@/types/activityFolder';

interface SetRow {
  set: number;
  weight?: number;
  reps?: number;
  time?: number;
  distance?: number;
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
  const base: SetRow = { set: setNum, unit: 'lbs' };
  if (mode === 'weight_reps') return { ...base, weight: undefined, reps: undefined };
  if (mode === 'duration') return { ...base, time: undefined };
  return { ...base, weight: undefined, reps: undefined, time: undefined, distance: undefined };
}

export function FolderItemPerformanceLogger({ item, performanceData, onSave, compact, exerciseId, exerciseName }: FolderItemPerformanceLoggerProps) {
  const mode = getInputMode(item.item_type);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If scoped to a specific exercise, load from exerciseSets map
    const scopedData = exerciseId
      ? (performanceData as any)?.exerciseSets?.[exerciseId]
      : performanceData;
    
    if (scopedData?.sets && scopedData.sets.length > 0) {
      setSets(scopedData.sets);
    } else {
      setSets([getDefaultSet(mode, 1)]);
    }
  }, [performanceData, mode, exerciseId]);

  const addSet = () => {
    const lastSet = sets[sets.length - 1];
    setSets(prev => [...prev, {
      ...getDefaultSet(mode, prev.length + 1),
      unit: lastSet?.unit || 'lbs',
      weight: lastSet?.weight,
    }]);
  };

  const removeSet = (index: number) => {
    if (sets.length <= 1) return;
    setSets(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, set: i + 1 })));
  };

  const updateSet = (index: number, field: keyof SetRow, value: any) => {
    setSets(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (exerciseId) {
        // Merge into exerciseSets map
        const existing = (performanceData as any) || {};
        const existingSets = existing.exerciseSets || {};
        await onSave({
          ...existing,
          exerciseSets: {
            ...existingSets,
            [exerciseId]: { sets },
          },
        } as any);
      } else {
        await onSave({ sets });
      }
    } finally {
      setSaving(false);
    }
  };

  const hasSomeData = sets.some(s => s.weight || s.reps || s.time || s.distance);

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {mode === 'weight_reps' && <Dumbbell className="h-3 w-3" />}
        {mode === 'duration' && <Timer className="h-3 w-3" />}
        {mode === 'flexible' && <Footprints className="h-3 w-3" />}
        <span>{exerciseName ? `${exerciseName} — Log Sets` : 'Log Sets'}</span>
      </div>

      <div className="space-y-1.5">
        {sets.map((set, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground w-4 text-center shrink-0">{set.set}</span>

            {(mode === 'weight_reps' || mode === 'flexible') && (
              <>
                <Input
                  type="number"
                  placeholder="Wt"
                  value={set.weight ?? ''}
                  onChange={e => updateSet(index, 'weight', e.target.value ? Number(e.target.value) : undefined)}
                  className="h-7 w-16 text-xs px-1.5"
                />
                <Select value={set.unit || 'lbs'} onValueChange={v => updateSet(index, 'unit', v)}>
                  <SelectTrigger className="h-7 w-14 text-[10px] px-1">
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
                  className="h-7 w-14 text-xs px-1.5"
                />
              </>
            )}

            {(mode === 'duration' || mode === 'flexible') && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  placeholder={mode === 'duration' ? 'Min' : 'Time'}
                  value={set.time ?? ''}
                  onChange={e => updateSet(index, 'time', e.target.value ? Number(e.target.value) : undefined)}
                  className="h-7 w-14 text-xs px-1.5"
                />
                <span className="text-[10px] text-muted-foreground">min</span>
              </div>
            )}

            {mode === 'flexible' && (
              <Input
                type="number"
                placeholder="Dist"
                value={set.distance ?? ''}
                onChange={e => updateSet(index, 'distance', e.target.value ? Number(e.target.value) : undefined)}
                className="h-7 w-14 text-xs px-1.5"
              />
            )}

            {sets.length > 1 && (
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeSet(index)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
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
