import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { ActivityFolderItem, ITEM_TYPES, DAY_LABELS } from '@/types/activityFolder';
import { Plus, CalendarIcon, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ActivityPickerDialog } from './ActivityPickerDialog';

interface FolderItemEditorProps {
  onAdd: (item: Partial<ActivityFolderItem>) => Promise<ActivityFolderItem | null>;
  cycleType?: string;
  cycleLengthWeeks?: number;
  sport?: string;
}

export function FolderItemEditor({ onAdd, cycleType, cycleLengthWeeks, sport }: FolderItemEditorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState('exercise');
  const [assignedDays, setAssignedDays] = useState<number[]>([]);
  const [cycleWeek, setCycleWeek] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [useSpecificDates, setUseSpecificDates] = useState(false);
  const [specificDates, setSpecificDates] = useState<Date[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggleDay = (day: number) => {
    setAssignedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSpecificDates(prev => {
      const exists = prev.some(d => d.toDateString() === date.toDateString());
      if (exists) return prev.filter(d => d.toDateString() !== date.toDateString());
      return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
    });
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const result = await onAdd({
      title: title.trim(),
      description: description.trim() || null,
      item_type: itemType,
      assigned_days: useSpecificDates ? null : (assignedDays.length > 0 ? assignedDays : null),
      specific_dates: useSpecificDates && specificDates.length > 0
        ? specificDates.map(d => format(d, 'yyyy-MM-dd'))
        : null,
      cycle_week: cycleType === 'custom_rotation' ? cycleWeek : null,
      duration_minutes: durationMinutes ? Number(durationMinutes) : null,
      notes: notes.trim() || null,
    });
    if (result) {
      setTitle('');
      setDescription('');
      setNotes('');
      setDurationMinutes('');
      setAssignedDays([]);
      setSpecificDates([]);
    }
    setSaving(false);
  };

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Band Work" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={itemType} onValueChange={setItemType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={1} className="min-h-[36px]" placeholder="Optional..." />
        </div>

        {/* Schedule Type Toggle */}
        <div className="flex items-center gap-2">
          <Label className="text-xs">Specific Dates</Label>
          <Switch checked={useSpecificDates} onCheckedChange={setUseSpecificDates} />
          <span className="text-[10px] text-muted-foreground">
            {useSpecificDates ? 'Pick calendar dates' : 'Weekly pattern'}
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {useSpecificDates ? (
            <div className="space-y-1">
              <Label className="text-xs">Select Dates</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                    <CalendarIcon className="h-3 w-3" />
                    {specificDates.length > 0
                      ? `${specificDates.length} date${specificDates.length !== 1 ? 's' : ''} selected`
                      : 'Pick dates'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={undefined}
                    onSelect={handleDateSelect}
                    modifiers={{ selected: specificDates }}
                    modifiersClassNames={{ selected: 'bg-primary text-primary-foreground' }}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {specificDates.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {specificDates.map(d => (
                    <span
                      key={d.toISOString()}
                      className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setSpecificDates(prev => prev.filter(pd => pd.toDateString() !== d.toDateString()))}
                    >
                      {format(d, 'MMM d')} ×
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-xs">Assigned Days</Label>
              <div className="flex gap-1">
                {DAY_LABELS.map((l, i) => (
                  <button key={i} onClick={() => toggleDay(i)} className={cn(
                    "w-8 h-8 rounded-full text-[10px] font-semibold border transition-all",
                    assignedDays.includes(i)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                  )}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {cycleType === 'custom_rotation' && cycleLengthWeeks && (
            <div className="space-y-1">
              <Label className="text-xs">Cycle Week</Label>
              <Select value={String(cycleWeek)} onValueChange={v => setCycleWeek(Number(v))}>
                <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: cycleLengthWeeks }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>Wk {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Duration (min)</Label>
            <Input type="number" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} className="h-8 w-20" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Coach Notes</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={1} className="min-h-[36px]" />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleAdd} disabled={!title.trim() || saving} size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            {saving ? 'Adding...' : 'Add Item'}
          </Button>
          {sport && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setPickerOpen(true)}>
              <Library className="h-3.5 w-3.5" />
              Import from Activities
            </Button>
          )}
        </div>

        {sport && (
          <ActivityPickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            sport={sport}
            onImport={async (items) => {
              for (const item of items) {
                await onAdd(item);
              }
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
