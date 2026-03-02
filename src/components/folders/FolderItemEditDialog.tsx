import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ActivityFolderItem, ITEM_TYPES, DAY_LABELS } from '@/types/activityFolder';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Save, CalendarIcon, History, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CardVersionHistory } from './CardVersionHistory';

interface FolderItemEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ActivityFolderItem;
  onSaved: (updated: ActivityFolderItem) => void;
  cycleType?: string;
  cycleLengthWeeks?: number;
}

export function FolderItemEditDialog({ open, onOpenChange, item, onSaved, cycleType, cycleLengthWeeks }: FolderItemEditDialogProps) {
  const { user } = useAuth();
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
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [lockedByName, setLockedByName] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Acquire lock + load fields
  useEffect(() => {
    if (!open || !item || !user) return;
    setTitle(item.title);
    setDescription(item.description || '');
    setItemType(item.item_type || 'exercise');
    setDurationMinutes(item.duration_minutes ? String(item.duration_minutes) : '');
    setNotes(item.notes || '');
    setAssignedDays(item.assigned_days || []);
    setCycleWeek(item.cycle_week || 1);
    const hasDates = item.specific_dates && item.specific_dates.length > 0;
    setUseSpecificDates(!!hasDates);
    setSpecificDates(hasDates ? item.specific_dates!.map(d => new Date(d + 'T00:00:00')) : []);
    setIsReadOnly(false);
    setLockedByName(null);

    // Try to acquire lock
    const acquireLock = async () => {
      // Check current lock
      const { data: current } = await supabase
        .from('activity_folder_items')
        .select('locked_by, locked_at')
        .eq('id', item.id)
        .single();

      if (current?.locked_by && current.locked_by !== user.id) {
        const lockAge = current.locked_at ? (Date.now() - new Date(current.locked_at).getTime()) / 60000 : 999;
        if (lockAge < 5) {
          // Locked by someone else
          const { data: lockProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', current.locked_by)
            .single();
          setLockedByName(lockProfile?.full_name || 'Another user');
          setIsReadOnly(true);
          return;
        }
      }

      // Acquire lock
      await supabase
        .from('activity_folder_items')
        .update({ locked_by: user.id, locked_at: new Date().toISOString() })
        .eq('id', item.id);
    };

    acquireLock();

    // Release lock on unmount
    return () => {
      if (item && user) {
        supabase
          .from('activity_folder_items')
          .update({ locked_by: null, locked_at: null })
          .eq('id', item.id)
          .eq('locked_by', user.id)
          .then(() => {});
      }
    };
  }, [open, item, user]);

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

  const handleSave = async () => {
    if (!title.trim() || isReadOnly) return;
    setSaving(true);
    try {
      const updates: any = {
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
      };

      const { error } = await supabase
        .from('activity_folder_items')
        .update(updates)
        .eq('id', item.id);

      if (error) throw error;

      // Release lock
      await supabase
        .from('activity_folder_items')
        .update({ locked_by: null, locked_at: null })
        .eq('id', item.id);

      toast.success('Item updated');
      onSaved({ ...item, ...updates });
      onOpenChange(false);
    } catch (err) {
      console.error('Error updating folder item:', err);
      toast.error('Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (snapshot: any) => {
    if (!item) return;
    const updates: any = {
      title: snapshot.title || item.title,
      description: snapshot.description || null,
      item_type: snapshot.item_type || item.item_type,
      duration_minutes: snapshot.duration_minutes || null,
      exercises: snapshot.exercises || null,
      assigned_days: snapshot.assigned_days || null,
      specific_dates: snapshot.specific_dates || null,
      cycle_week: snapshot.cycle_week ?? item.cycle_week,
      template_snapshot: snapshot.template_snapshot || null,
      notes: snapshot.notes || null,
    };
    const { error } = await supabase
      .from('activity_folder_items')
      .update(updates)
      .eq('id', item.id);
    if (error) throw error;

    // Log restore
    if (user) {
      await supabase.from('activity_edit_logs').insert({
        folder_item_id: item.id,
        user_id: user.id,
        action_type: 'restored_version',
        metadata: { restored_title: snapshot.title },
      });
    }

    onSaved({ ...item, ...updates });
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">Edit Item</DialogTitle>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setVersionHistoryOpen(true)}>
              <History className="h-3 w-3" />
              History
            </Button>
          </div>
          {isReadOnly && lockedByName && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 mt-2">
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-amber-600">Currently being edited by {lockedByName}</span>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="h-9" disabled={isReadOnly} />
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
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="min-h-[36px]" />
          </div>

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
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="min-h-[36px]" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!title.trim() || saving || isReadOnly} className="gap-1">
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <CardVersionHistory
      open={versionHistoryOpen}
      onOpenChange={setVersionHistoryOpen}
      folderItemId={item?.id || ''}
      itemTitle={item?.title || ''}
      onRestore={handleRestore}
    />
    </>
  );
}
