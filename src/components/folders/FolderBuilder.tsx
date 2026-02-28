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
import { CalendarIcon, FolderPlus } from 'lucide-react';
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
            <Label>Start Date</Label>
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

        {/* Cycle Type */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cycle Type</Label>
            <Select value={cycleType} onValueChange={setCycleType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Repeating Weekly</SelectItem>
                <SelectItem value="custom_rotation">Custom Rotation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {cycleType === 'custom_rotation' && (
            <div className="space-y-2">
              <Label>Cycle Length (Weeks)</Label>
              <Input type="number" min={2} max={12} value={cycleLengthWeeks} onChange={e => setCycleLengthWeeks(Number(e.target.value))} />
            </div>
          )}
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
          <Button onClick={handleSave} disabled={!name.trim() || saving} className="flex-1">
            {saving ? 'Saving...' : (initialData ? 'Update Folder' : 'Create Folder')}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
