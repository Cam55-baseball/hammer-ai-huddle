import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ActivityFolder, ActivityFolderItem, DAY_LABELS, getCurrentCycleWeek } from '@/types/activityFolder';
import { supabase } from '@/integrations/supabase/client';
import { FolderItemPerformanceLogger } from './FolderItemPerformanceLogger';
import { FolderBuilder } from './FolderBuilder';
import { CustomActivityBuilderDialog } from '@/components/custom-activities/CustomActivityBuilderDialog';
import { ActivityPickerDialog } from './ActivityPickerDialog';
import { CustomActivityTemplate, Exercise } from '@/types/customActivity';
import { FolderOpen, Clock, FileText, Trash2, CalendarDays, ChevronDown, ChevronRight, ChevronUp, Pencil, Plus, Library, Edit, GripVertical, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTodayDate } from '@/utils/dateUtils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable item wrapper
function SortableFolderItem({ id, children }: { id: string; children: (props: { dragHandleProps: React.HTMLAttributes<HTMLDivElement>; style: React.CSSProperties }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners }, style: {} })}
    </div>
  );
}

interface FolderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: ActivityFolder | null;
  isOwner: boolean;
  assignmentId?: string;
  onAddItem?: (folderId: string, item: Partial<ActivityFolderItem>) => Promise<ActivityFolderItem | null>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onToggleCompletion?: (itemId: string, entryDate: string, assignmentId?: string) => Promise<void>;
  onEditFolder?: (folder: ActivityFolder, updates: Partial<ActivityFolder>) => Promise<void>;
  onDeleteFolder?: (folderId: string) => Promise<void>;
}

export function FolderDetailDialog({
  open, onOpenChange, folder, isOwner, assignmentId,
  onAddItem, onDeleteItem, onToggleCompletion, onEditFolder, onDeleteFolder,
}: FolderDetailDialogProps) {
  const [items, setItems] = useState<ActivityFolderItem[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [performanceDataMap, setPerformanceDataMap] = useState<Record<string, any>>({});
  const [expandedLoggers, setExpandedLoggers] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [coachEditAllowed, setCoachEditAllowed] = useState(false);
  const [editingItem, setEditingItem] = useState<ActivityFolderItem | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [importPickerOpen, setImportPickerOpen] = useState(false);
  const [editFolderOpen, setEditFolderOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [showCurrentWeekOnly, setShowCurrentWeekOnly] = useState(true);
  const [pendingCycleWeek, setPendingCycleWeek] = useState<number | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [isGrantedCoach, setIsGrantedCoach] = useState(false);

  const canEdit = isOwner || isGrantedCoach;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex(i => i.id === active.id);
    const newIdx = items.findIndex(i => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove([...items], oldIdx, newIdx);
    setItems(reordered);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('activity_folder_items')
        .update({ order_index: i })
        .eq('id', reordered[i].id);
    }
  };

  useEffect(() => {
    if (!open || !folder) return;
    setCoachEditAllowed(folder.coach_edit_allowed || false);
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('activity_folder_items')
        .select('*')
        .eq('folder_id', folder.id)
        .order('order_index');
      setItems((data || []) as unknown as ActivityFolderItem[]);

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const today = getTodayDate();
        const { data: compData } = await supabase
          .from('folder_item_completions')
          .select('folder_item_id, completed, performance_data')
          .eq('user_id', userData.user.id)
          .eq('entry_date', today);
        
        const map: Record<string, boolean> = {};
        const perfMap: Record<string, any> = {};
        (compData || []).forEach((c: any) => {
          map[c.folder_item_id] = c.completed || false;
          if (c.performance_data) perfMap[c.folder_item_id] = c.performance_data;
        });
        setCompletions(map);
        setPerformanceDataMap(perfMap);

        // Check coach permissions
        if (!isOwner && folder) {
          const userId = userData.user.id;
          const isHeadCoach = folder.coach_edit_allowed && folder.coach_edit_user_id === userId;
          if (isHeadCoach) {
            setIsGrantedCoach(true);
          } else {
            const { data: permData } = await supabase
              .from('folder_coach_permissions')
              .select('id')
              .eq('folder_id', folder.id)
              .eq('coach_user_id', userId)
              .is('revoked_at', null)
              .maybeSingle();
            setIsGrantedCoach(!!permData);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [open, folder]);

  const isRotating = folder ? (folder.cycle_type === 'custom_rotation' && folder.start_date && folder.cycle_length_weeks) : false;
  const currentCycleWeek = isRotating && folder ? getCurrentCycleWeek(folder.start_date!, folder.cycle_length_weeks!) : null;

  const groupedItems = useMemo(() => {
    if (!folder || !isRotating || showCurrentWeekOnly) return null;
    const groups: Record<string, ActivityFolderItem[]> = {};
    groups['__every_week__'] = [];
    for (let w = 1; w <= (folder.cycle_length_weeks || 4); w++) {
      groups[String(w)] = [];
    }
    items.forEach(item => {
      if (item.cycle_week == null) {
        groups['__every_week__'].push(item);
      } else {
        const key = String(item.cycle_week);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
    });
    Object.values(groups).forEach(arr => arr.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
    return groups;
  }, [items, isRotating, showCurrentWeekOnly, folder?.cycle_length_weeks]);

  useEffect(() => {
    if (groupedItems && currentCycleWeek !== null) {
      const defaults: Record<string, boolean> = { '__every_week__': true };
      Object.keys(groupedItems).forEach(key => {
        defaults[key] = key === '__every_week__' || key === String(currentCycleWeek);
      });
      setOpenSections(defaults);
    }
  }, [!!groupedItems, currentCycleWeek]);

  if (!folder) return null;

  const displayItems = isRotating && showCurrentWeekOnly
    ? items.filter(i => i.cycle_week === null || i.cycle_week === undefined || i.cycle_week === currentCycleWeek)
    : !isRotating ? items : [];

  const completedCount = Object.values(completions).filter(Boolean).length;
  const allDisplayItems = groupedItems ? Object.values(groupedItems).flat() : displayItems;
  const totalTrackable = allDisplayItems.filter(i => i.completion_tracking).length;
  const pct = totalTrackable > 0 ? Math.round((completedCount / totalTrackable) * 100) : 0;
  const totalItemCount = groupedItems ? Object.values(groupedItems).flat().length : displayItems.length;

  const handleToggle = async (itemId: string) => {
    if (!onToggleCompletion) return;
    const today = getTodayDate();
    await onToggleCompletion(itemId, today, assignmentId);
    setCompletions(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleSavePerformanceData = async (itemId: string, data: any) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const today = getTodayDate();
    const { data: existing } = await supabase
      .from('folder_item_completions')
      .select('id')
      .eq('folder_item_id', itemId)
      .eq('user_id', userData.user.id)
      .eq('entry_date', today)
      .maybeSingle();
    if (existing) {
      await supabase.from('folder_item_completions')
        .update({ performance_data: data, completed: true, completed_at: new Date().toISOString() } as any)
        .eq('id', existing.id);
    } else {
      await supabase.from('folder_item_completions')
        .insert({ folder_item_id: itemId, user_id: userData.user.id, entry_date: today, completed: true, completed_at: new Date().toISOString(), performance_data: data } as any);
    }
    setCompletions(prev => ({ ...prev, [itemId]: true }));
    setPerformanceDataMap(prev => ({ ...prev, [itemId]: data }));
    toast.success('Performance data saved');
  };

  const handleCoachEditToggle = async (allowed: boolean) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: mpi } = await supabase
        .from('athlete_mpi_settings')
        .select('primary_coach_id')
        .eq('user_id', userData.user.id)
        .single();
      const coachId = mpi?.primary_coach_id || null;
      if (allowed && !coachId) {
        toast.error('No primary coach set. Go to settings to assign a coach first.');
        return;
      }
      const { error } = await supabase
        .from('activity_folders')
        .update({ coach_edit_allowed: allowed, coach_edit_user_id: allowed ? coachId : null } as any)
        .eq('id', folder.id);
      if (error) throw error;
      setCoachEditAllowed(allowed);
      toast.success(allowed ? 'Coach can now edit this folder' : 'Coach edit access removed');
    } catch (err) {
      console.error('Error toggling coach edit:', err);
      toast.error('Failed to update permission');
    }
  };

  const handleEditItemSave = async (data: any) => {
    if (!editingItem) return null;
    try {
      const updates: any = {
        title: data.title,
        description: data.description || null,
        item_type: data.activity_type || editingItem.item_type,
        duration_minutes: data.duration_minutes || null,
        exercises: data.exercises || null,
        assigned_days: data.recurring_active ? (data.recurring_days || []) : null,
        specific_dates: (data as any).specific_dates?.length > 0 ? (data as any).specific_dates : null,
        cycle_week: pendingCycleWeek !== undefined ? pendingCycleWeek : editingItem.cycle_week,
        template_snapshot: {
          icon: data.icon, color: data.color, activity_type: data.activity_type,
          title: data.title, description: data.description, intensity: data.intensity,
          meals: data.meals, custom_fields: data.custom_fields, intervals: data.intervals,
          embedded_running_sessions: data.embedded_running_sessions, duration_minutes: data.duration_minutes,
          exercises: data.exercises, display_nickname: data.display_nickname, custom_logo_url: data.custom_logo_url,
        },
      };
      const { error } = await supabase.from('activity_folder_items').update(updates).eq('id', editingItem.id);
      if (error) throw error;
      setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...updates } : i));
      setEditingItem(null);
      toast.success('Item updated');
      return editingItem;
    } catch (err) {
      console.error('Error updating folder item:', err);
      toast.error('Failed to update item');
      return null;
    }
  };

  const buildTemplateFromItem = (item: ActivityFolderItem): CustomActivityTemplate | null => {
    const snapshot = (item.template_snapshot || {}) as any;
    return {
      id: item.id, user_id: '', created_at: '', updated_at: '',
      sport: folder.sport || 'baseball', title: item.title, description: item.description || '',
      activity_type: snapshot.activity_type || item.item_type || 'exercise',
      icon: snapshot.icon || 'dumbbell', color: snapshot.color || '#8b5cf6',
      exercises: (snapshot.exercises || item.exercises || []) as Exercise[],
      meals: snapshot.meals || null, custom_fields: snapshot.custom_fields || null,
      duration_minutes: item.duration_minutes || snapshot.duration_minutes || undefined,
      intensity: snapshot.intensity || undefined, intervals: snapshot.intervals || null,
      embedded_running_sessions: snapshot.embedded_running_sessions || null,
      display_nickname: snapshot.display_nickname || null, custom_logo_url: snapshot.custom_logo_url || null,
      is_favorited: false, display_days: item.assigned_days || null, display_time: null,
      recurring_active: !!(item.assigned_days && item.assigned_days.length > 0),
      recurring_days: item.assigned_days || null, specific_dates: item.specific_dates || undefined,
      reminder_enabled: false, reminder_minutes: null, reminder_time: null, display_on_game_plan: true,
      distance_value: snapshot.distance_value || undefined, distance_unit: snapshot.distance_unit || 'miles',
      pace_value: snapshot.pace_value || undefined,
    } as CustomActivityTemplate;
  };

  const handleConfirmFolderDelete = async () => {
    if (onDeleteFolder) await onDeleteFolder(folder.id);
    setConfirmDeleteOpen(false);
    onOpenChange(false);
  };

  const handleQuickCycleWeekChange = async (itemId: string, newWeek: number | null) => {
    try {
      const { error } = await supabase
        .from('activity_folder_items')
        .update({ cycle_week: newWeek } as any)
        .eq('id', itemId);
      if (error) throw error;
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, cycle_week: newWeek } : i));
      toast.success(`Tagged to ${newWeek == null ? 'Every Week' : `Week ${newWeek}`}`);
    } catch (err) {
      console.error('Error updating cycle week:', err);
      toast.error('Failed to update week tag');
    }
  };

  const handleGroupDragEnd = async (weekKey: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !groupedItems) return;
    const group = groupedItems[weekKey];
    if (!group) return;
    const oldIdx = group.findIndex(i => i.id === active.id);
    const newIdx = group.findIndex(i => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove([...group], oldIdx, newIdx);
    const reorderedIds = new Set(reordered.map(i => i.id));
    setItems(prev => {
      const others = prev.filter(i => !reorderedIds.has(i.id));
      return [...others, ...reordered.map((item, idx) => ({ ...item, order_index: idx }))];
    });
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('activity_folder_items').update({ order_index: i }).eq('id', reordered[i].id);
    }
  };

  // Arrow reordering handler
  const handleMoveItem = async (itemId: string, direction: 'up' | 'down', weekKey?: string) => {
    const list = weekKey && groupedItems ? (groupedItems[weekKey] || []) : displayItems;
    const idx = list.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;

    const itemA = list[idx];
    const itemB = list[swapIdx];
    const orderA = itemA.order_index ?? idx;
    const orderB = itemB.order_index ?? swapIdx;

    // Update local state immediately
    setItems(prev => prev.map(i => {
      if (i.id === itemA.id) return { ...i, order_index: orderB };
      if (i.id === itemB.id) return { ...i, order_index: orderA };
      return i;
    }));

    // Persist
    await Promise.all([
      supabase.from('activity_folder_items').update({ order_index: orderB }).eq('id', itemA.id),
      supabase.from('activity_folder_items').update({ order_index: orderA }).eq('id', itemB.id),
    ]);
  };

  // Duplicate item handler
  const handleDuplicateItem = async (item: ActivityFolderItem) => {
    if (!onAddItem) return;
    const duplicate: Partial<ActivityFolderItem> = {
      title: `${item.title} (copy)`,
      description: item.description,
      item_type: item.item_type,
      duration_minutes: item.duration_minutes,
      exercises: item.exercises,
      assigned_days: item.assigned_days,
      specific_dates: item.specific_dates,
      cycle_week: item.cycle_week,
      template_snapshot: item.template_snapshot,
      completion_tracking: item.completion_tracking,
      notes: item.notes,
    };
    const result = await onAddItem(folder.id, duplicate);
    if (result) {
      setItems(prev => [...prev, result]);
      toast.success('Item duplicated');
    }
  };

  // Get the list context for an item to determine arrow availability
  const getItemListContext = (item: ActivityFolderItem, weekKey?: string) => {
    const list = weekKey && groupedItems ? (groupedItems[weekKey] || []) : displayItems;
    const idx = list.findIndex(i => i.id === item.id);
    return { isFirst: idx === 0, isLast: idx === list.length - 1 };
  };

  const renderItemCard = (item: ActivityFolderItem, weekKey?: string) => {
    const { isFirst, isLast } = getItemListContext(item, weekKey);
    return (
      <SortableFolderItem id={item.id} key={item.id}>
        {({ dragHandleProps }) => (
          <div className="p-3 rounded-lg border bg-card space-y-1">
            <div className="flex items-start gap-2">
              {canEdit && (
                <div className="flex flex-col items-center gap-0.5 mt-0.5">
                  <Button
                    variant="ghost" size="icon"
                    className="h-5 w-5 p-0"
                    disabled={isFirst}
                    onClick={() => handleMoveItem(item.id, 'up', weekKey)}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <div {...dragHandleProps} className="cursor-grab touch-none">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-5 w-5 p-0"
                    disabled={isLast}
                    onClick={() => handleMoveItem(item.id, 'down', weekKey)}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {item.completion_tracking && onToggleCompletion && (
                <Checkbox checked={completions[item.id] || false} onCheckedChange={() => handleToggle(item.id)} className="mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${completions[item.id] ? 'line-through text-muted-foreground' : ''}`}>
                    {item.title}
                  </span>
                  {item.item_type && <Badge variant="outline" className="text-[10px]">{item.item_type}</Badge>}
                  {performanceDataMap[item.id]?.sets?.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">{performanceDataMap[item.id].sets.length} sets</Badge>
                  )}
                  {/* Inline cycle-week quick tag */}
                  {isRotating && canEdit && (
                    <Select
                      value={item.cycle_week == null ? 'every' : String(item.cycle_week)}
                      onValueChange={(val) => handleQuickCycleWeekChange(item.id, val === 'every' ? null : parseInt(val))}
                    >
                      <SelectTrigger className="h-5 w-auto min-w-[70px] text-[10px] px-1.5 py-0 border-dashed gap-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="every" className="text-xs">Every Week</SelectItem>
                        {Array.from({ length: folder.cycle_length_weeks || 4 }, (_, i) => i + 1).map(w => (
                          <SelectItem key={w} value={String(w)} className="text-xs">
                            Wk {w}{w === currentCycleWeek ? ' (current)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                  {item.specific_dates && item.specific_dates.length > 0 ? (
                    <span className="flex items-center gap-0.5">
                      <CalendarDays className="h-2.5 w-2.5" />
                      {item.specific_dates.map(d => format(new Date(d + 'T00:00:00'), 'MMM d')).join(', ')}
                    </span>
                  ) : item.assigned_days && item.assigned_days.length > 0 ? (
                    <span>{item.assigned_days.map(d => DAY_LABELS[d]).join(', ')}</span>
                  ) : null}
                  {item.duration_minutes && (
                    <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{item.duration_minutes}m</span>
                  )}
                  {item.notes && (
                    <span className="flex items-center gap-0.5"><FileText className="h-2.5 w-2.5" />Notes</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {item.completion_tracking && (
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => setExpandedLoggers(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedLoggers[item.id] ? 'rotate-180' : ''}`} />
                  </Button>
                )}
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicateItem(item)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingItem(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canEdit && onDeleteItem && (
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => onDeleteItem(item.id).then(() => setItems(prev => prev.filter(i => i.id !== item.id)))}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
            {item.completion_tracking && expandedLoggers[item.id] && (
              <FolderItemPerformanceLogger
                item={item}
                performanceData={performanceDataMap[item.id]}
                onSave={async (data) => handleSavePerformanceData(item.id, data)}
                compact
              />
            )}
          </div>
        )}
      </SortableFolderItem>
    );
  };

  const handleAddToWeek = (weekNum: number | null) => {
    setPendingCycleWeek(weekNum);
    setBuilderOpen(true);
  };

  const renderCollapsibleWeekSection = (weekKey: string, weekItems: ActivityFolderItem[]) => {
    const label = weekKey === '__every_week__' ? 'Every Week' : `Week ${weekKey}`;
    const isCurrent = weekKey === String(currentCycleWeek);
    const isOpen = openSections[weekKey] ?? (weekKey === '__every_week__' || isCurrent);
    const weekNum = weekKey === '__every_week__' ? null : parseInt(weekKey);

    return (
      <Collapsible key={weekKey} open={isOpen} onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [weekKey]: open }))}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-1 hover:bg-muted/50 rounded-md transition-colors">
          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          {isCurrent && <Badge variant="default" className="text-[9px] h-4 px-1.5">current</Badge>}
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 ml-auto">{weekItems.length}</Badge>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pl-1">
          {weekItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 pl-6">No activities in this week yet.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleGroupDragEnd(weekKey, e)}>
              <SortableContext items={weekItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {weekItems.map(item => renderItemCard(item, weekKey))}
              </SortableContext>
            </DndContext>
          )}
          {canEdit && onAddItem && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={() => handleAddToWeek(weekNum)}
            >
              <Plus className="h-3.5 w-3.5" /> Add to {label}
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" style={{ color: folder.color }} />
            {folder.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 px-6 pb-2" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {folder.description && <p className="text-sm text-muted-foreground">{folder.description}</p>}

          {/* Coach Edit Toggle (player-owned folders only) */}
          {isOwner && folder.owner_type === 'player' && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <div>
                <Label className="text-xs font-medium">Allow Coach to Edit</Label>
                <p className="text-[10px] text-muted-foreground">Your primary coach can add/modify items</p>
              </div>
              <Switch checked={coachEditAllowed} onCheckedChange={handleCoachEditToggle} />
            </div>
          )}

          {/* Cycle Week Info Card */}
          {isRotating && currentCycleWeek !== null && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  You're in <span className="text-primary">Week {currentCycleWeek}</span> of your {folder.cycle_length_weeks}-week cycle
                </p>
                <p className="text-xs text-muted-foreground">
                  Activities tagged "Week {currentCycleWeek}" are showing.{' '}
                  {currentCycleWeek! < folder.cycle_length_weeks!
                    ? `After this week, Week ${currentCycleWeek! + 1} activities will appear.`
                    : `After this week, it cycles back to Week 1.`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={showCurrentWeekOnly} onCheckedChange={setShowCurrentWeekOnly} id="cycle-toggle" />
                <Label htmlFor="cycle-toggle" className="text-xs cursor-pointer">Show only this week's activities</Label>
              </div>
            </div>
          )}

          {/* Progress */}
          {totalTrackable > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Today's Progress</span>
                <span>{completedCount}/{totalTrackable} ({pct}%)</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          )}

          {/* Items */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Items ({totalItemCount}{isRotating && !showCurrentWeekOnly ? ` / ${items.length} total` : ''})</h4>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : totalItemCount === 0 ? (
              <p className="text-sm text-muted-foreground">{isRotating && showCurrentWeekOnly ? 'No items for the current rotation week.' : 'No items yet.'}</p>
            ) : groupedItems ? (
              <div className="space-y-1">
                {renderCollapsibleWeekSection('__every_week__', groupedItems['__every_week__'] || [])}
                {Array.from({ length: folder.cycle_length_weeks || 4 }, (_, i) => String(i + 1)).map(weekKey =>
                  renderCollapsibleWeekSection(weekKey, groupedItems[weekKey] || [])
                )}
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={displayItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {displayItems.map(item => renderItemCard(item))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Fixed Footer with Action Buttons */}
        {canEdit && (
          <div className="flex-shrink-0 flex gap-2 px-6 py-3 border-t bg-background flex-wrap">
            {onAddItem && (
              <>
                <Button size="sm" className="gap-1" onClick={() => setBuilderOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Create
                </Button>
                {folder.sport && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setImportPickerOpen(true)}>
                    <Library className="h-3.5 w-3.5" /> Import
                  </Button>
                )}
              </>
            )}
            {onEditFolder && isOwner && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditFolderOpen(true)}>
                <Edit className="h-3.5 w-3.5" /> Edit Folder
              </Button>
            )}
            {onDeleteFolder && isOwner && (
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </div>
        )}
      </DialogContent>

      {/* Full Activity Builder for editing existing folder items */}
      {editingItem && (
        <CustomActivityBuilderDialog
          open={!!editingItem}
          onOpenChange={(open) => { if (!open) { setEditingItem(null); setPendingCycleWeek(null); } }}
          selectedSport={(folder.sport as 'baseball' | 'softball') || 'baseball'}
          template={buildTemplateFromItem(editingItem)}
          onSave={handleEditItemSave}
          folderCycleType={folder.cycle_type}
          folderCycleLengthWeeks={folder.cycle_length_weeks}
          initialCycleWeek={editingItem.cycle_week}
          onCycleWeekChange={setPendingCycleWeek}
        />
      )}

      {/* Full Activity Builder for creating new folder items */}
      {builderOpen && folder && onAddItem && (
        <CustomActivityBuilderDialog
          open={builderOpen}
          onOpenChange={(open) => { setBuilderOpen(open); if (!open) setPendingCycleWeek(null); }}
          selectedSport={(folder.sport as 'baseball' | 'softball') || 'baseball'}
          folderCycleType={folder.cycle_type}
          folderCycleLengthWeeks={folder.cycle_length_weeks}
          onCycleWeekChange={setPendingCycleWeek}
          initialCycleWeek={pendingCycleWeek}
          onSave={async (data) => {
            const folderItem: Partial<ActivityFolderItem> = {
              title: data.title,
              description: data.description || null,
              item_type: data.activity_type || 'exercise',
              duration_minutes: data.duration_minutes || null,
              exercises: data.exercises as any,
              assigned_days: data.recurring_active ? (data.recurring_days || []) : null,
              specific_dates: (data as any).specific_dates?.length > 0 ? (data as any).specific_dates : null,
              cycle_week: pendingCycleWeek,
              template_snapshot: {
                icon: data.icon, color: data.color, activity_type: data.activity_type,
                title: data.title, description: data.description, intensity: data.intensity,
                meals: data.meals, custom_fields: data.custom_fields, intervals: data.intervals,
                embedded_running_sessions: data.embedded_running_sessions, duration_minutes: data.duration_minutes,
                exercises: data.exercises, display_nickname: data.display_nickname, custom_logo_url: data.custom_logo_url,
              } as any,
            };
            const result = await onAddItem(folder.id, folderItem);
            if (result) {
              setItems(prev => [...prev, result]);
              setBuilderOpen(false);
            }
            return result;
          }}
        />
      )}

      {/* Import from existing activities */}
      {importPickerOpen && folder && folder.sport && onAddItem && (
        <ActivityPickerDialog
          open={importPickerOpen}
          onOpenChange={setImportPickerOpen}
          sport={folder.sport}
          onImport={async (importedItems) => {
            for (const item of importedItems) {
              const result = await onAddItem(folder.id, item);
              if (result) setItems(prev => [...prev, result]);
            }
            toast.success(`${importedItems.length} activit${importedItems.length === 1 ? 'y' : 'ies'} imported`);
          }}
        />
      )}

      {/* Inline Folder Edit */}
      {editFolderOpen && onEditFolder && (
        <Dialog open={editFolderOpen} onOpenChange={(open) => { if (!open) setEditFolderOpen(false); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <FolderBuilder
              initialData={folder}
              onSave={async (updates) => {
                await onEditFolder(folder, updates);
                setEditFolderOpen(false);
                return folder;
              }}
              onCancel={() => setEditFolderOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Folder Confirmation */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{folder.name}"? This action cannot be undone and all items inside will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFolderDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
