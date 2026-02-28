import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ActivityFolder, FOLDER_LABELS, PLACEMENT_OPTIONS, DAY_LABELS } from '@/types/activityFolder';
import { CalendarIcon, FolderPlus, Repeat, RefreshCw, Minus, Plus, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FolderBuilderProps {
  onSave: (folder: Partial<ActivityFolder>) => Promise<ActivityFolder | null>;
  onCancel: () => void;
  initialData?: Partial<ActivityFolder>;
}

export function FolderBuilder({ onSave, onCancel, initialData }: FolderBuilderProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [label, setLabel] = useState(initialData?.label || 'general');
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData?.start_date ? new Date(initialData.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialData?.end_date ? new Date(initialData.end_date) : undefined
  );
  const [frequencyDays, setFrequencyDays] = useState<number[]>(initialData?.frequency_days || []);
  const [cycleType, setCycleType] = useState(initialData?.cycle_type || 'weekly');
  const [cycleLengthWeeks, setCycleLengthWeeks] = useState(initialData?.cycle_length_weeks || 4);
  const [placement, setPlacement] = useState<string>(initialData?.placement || 'after');
  const [color, setColor] = useState(initialData?.color || '#3b82f6');
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: number) => {
    setFrequencyDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      description: description.trim() || null,
      label,
      start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
      end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      frequency_days: null,
      cycle_type: cycleType,
      cycle_length_weeks: cycleType === 'custom_rotation' ? cycleLengthWeeks : null,
      placement: placement as any,
      color,
    });
    setSaving(false);
  };

  const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderPlus className="h-5 w-5" />
          {initialData ? 'Edit Folder' : 'Create Folder'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label>Folder Name *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Off-Season Development" />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." rows={2} />
        </div>

        {/* Label & Color */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Select value={label} onValueChange={setLabel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FOLDER_LABELS.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-1.5 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-transform",
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{cycleType === 'custom_rotation' ? 'When does Week 1 begin?' : 'Start Date'}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'MMM d, yyyy') : 'Starts immediately'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'MMM d, yyyy') : 'Ongoing'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Frequency Days removed - scheduling is at activity level only */}

        {/* How should activities repeat? */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Cycle Plan: How should activities repeat?</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Same Every Week card */}
            <button
              type="button"
              onClick={() => setCycleType('weekly')}
              className={cn(
                "p-4 rounded-lg border-2 text-left transition-all space-y-2",
                cycleType === 'weekly'
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-muted-foreground/40"
              )}
            >
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Same Every Week</span>
              </div>
              <p className="text-xs text-muted-foreground">Your activities show up every week, same routine.</p>
              <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/70 pt-1">
                <span className="px-1.5 py-0.5 rounded bg-muted">Mon Tue Wed</span>
                <span>→</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Mon Tue Wed</span>
                <span>→</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Mon Tue Wed</span>
              </div>
            </button>

            {/* Rotating Program card */}
            <button
              type="button"
              onClick={() => setCycleType('custom_rotation')}
              className={cn(
                "p-4 rounded-lg border-2 text-left transition-all space-y-2",
                cycleType === 'custom_rotation'
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-muted-foreground/40"
              )}
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Rotating Program</span>
              </div>
              <p className="text-xs text-muted-foreground">Activities change each week in a cycle, then repeat.</p>
              <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/70 pt-1 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-muted">Wk1</span>
                <span>→</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Wk2</span>
                <span>→</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Wk3</span>
                <span>→</span>
                <span className="text-primary font-semibold">back to Wk1</span>
              </div>
            </button>
          </div>

          {/* Rotating Program explainer */}
          {cycleType === 'custom_rotation' && (
            <div className="space-y-4">
              {/* Tip callout */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">How it works:</p>
                    <p>Pick a start date and how many weeks your cycle lasts. Each activity you add will be assigned to a specific week. The system automatically knows which week you're in and only shows those activities on your Game Plan.</p>
                    <div className="rounded bg-muted/50 p-2 font-mono text-[10px] space-y-0.5">
                      <p className="font-semibold text-foreground">Example: 3-week cycle starting Jan 6</p>
                      <p>Jan 6–12 = Week 1</p>
                      <p>Jan 13–19 = Week 2</p>
                      <p>Jan 20–26 = Week 3</p>
                      <p className="text-primary">Jan 27+ = back to Week 1 ↻</p>
                    </div>
                    <p className="text-xs font-medium text-foreground/80 mt-1">The cycle loops forever until you set an end date or archive the folder.</p>
                  </div>
                </div>
              </div>

              {/* Cycle length stepper */}
              <div className="space-y-2">
                <Label className="text-sm">How many weeks before it repeats?</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setCycleLengthWeeks(Math.max(2, cycleLengthWeeks - 1))}
                    disabled={cycleLengthWeeks <= 2}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1.5 min-w-[80px] justify-center">
                    <span className="text-2xl font-bold">{cycleLengthWeeks}</span>
                    <span className="text-sm text-muted-foreground">weeks</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setCycleLengthWeeks(Math.min(12, cycleLengthWeeks + 1))}
                    disabled={cycleLengthWeeks >= 12}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Start date warning */}
              {!startDate && (
                <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                  ⚠ Pick a start date so the system knows which week you're in!
                </p>
              )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/70 italic">Each folder runs its own schedule independently.</p>
        </div>

        {/* Placement */}
        <div className="space-y-2">
          <Label>Placement (relative to Hammers workouts)</Label>
          <Select value={placement} onValueChange={setPlacement}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLACEMENT_OPTIONS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={!name.trim() || saving || (cycleType === 'custom_rotation' && !startDate)} className="flex-1">
            {saving ? 'Saving...' : (initialData ? 'Update Folder' : 'Create Folder')}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
