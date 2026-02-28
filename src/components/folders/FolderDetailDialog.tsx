import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ActivityFolder, ActivityFolderItem, DAY_LABELS } from '@/types/activityFolder';
import { supabase } from '@/integrations/supabase/client';
import { FolderItemPerformanceLogger } from './FolderItemPerformanceLogger';
import { FolderBuilder } from './FolderBuilder';
import { CustomActivityBuilderDialog } from '@/components/custom-activities/CustomActivityBuilderDialog';
import { ActivityPickerDialog } from './ActivityPickerDialog';
import { CustomActivityTemplate, Exercise } from '@/types/customActivity';
import { FolderOpen, Clock, FileText, Trash2, AlertTriangle, CalendarDays, ChevronDown, Pencil, Plus, Library, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTodayDate } from '@/utils/dateUtils';
import { format } from 'date-fns';
import { toast } from 'sonner';

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

      // Load today's completions
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
      }
      setLoading(false);
    };
    load();
  }, [open, folder]);

  if (!folder) return null;

  const completedCount = Object.values(completions).filter(Boolean).length;
  const totalTrackable = items.filter(i => i.completion_tracking).length;
  const pct = totalTrackable > 0 ? Math.round((completedCount / totalTrackable) * 100) : 0;

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
        .update({
          coach_edit_allowed: allowed,
          coach_edit_user_id: allowed ? coachId : null,
        } as any)
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
        template_snapshot: {
          icon: data.icon,
          color: data.color,
          activity_type: data.activity_type,
          title: data.title,
          description: data.description,
          intensity: data.intensity,
          meals: data.meals,
          custom_fields: data.custom_fields,
          intervals: data.intervals,
          embedded_running_sessions: data.embedded_running_sessions,
          duration_minutes: data.duration_minutes,
          exercises: data.exercises,
          display_nickname: data.display_nickname,
          custom_logo_url: data.custom_logo_url,
        },
      };

      const { error } = await supabase
        .from('activity_folder_items')
        .update(updates)
        .eq('id', editingItem.id);

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

  // Build a template object from folder item for the full builder
  const buildTemplateFromItem = (item: ActivityFolderItem): CustomActivityTemplate | null => {
    const snapshot = (item.template_snapshot || {}) as any;
    return {
      id: item.id,
      user_id: '',
      created_at: '',
      updated_at: '',
      sport: folder.sport || 'baseball',
      title: item.title,
      description: item.description || '',
      activity_type: snapshot.activity_type || item.item_type || 'exercise',
      icon: snapshot.icon || 'dumbbell',
      color: snapshot.color || '#8b5cf6',
      exercises: (snapshot.exercises || item.exercises || []) as Exercise[],
      meals: snapshot.meals || null,
      custom_fields: snapshot.custom_fields || null,
      duration_minutes: item.duration_minutes || snapshot.duration_minutes || undefined,
      intensity: snapshot.intensity || undefined,
      intervals: snapshot.intervals || null,
      embedded_running_sessions: snapshot.embedded_running_sessions || null,
      display_nickname: snapshot.display_nickname || null,
      custom_logo_url: snapshot.custom_logo_url || null,
      is_favorited: false,
      display_days: null,
      display_time: null,
      recurring_active: false,
      recurring_days: null,
      reminder_enabled: false,
      reminder_minutes: null,
      reminder_time: null,
      display_on_game_plan: true,
      distance_value: snapshot.distance_value || undefined,
      distance_unit: snapshot.distance_unit || 'miles',
      pace_value: snapshot.pace_value || undefined,
    } as CustomActivityTemplate;
  };

  const handleConfirmFolderDelete = async () => {
    if (onDeleteFolder) {
      await onDeleteFolder(folder.id);
    }
    setConfirmDeleteOpen(false);
    onOpenChange(false);
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
          {folder.description && (
            <p className="text-sm text-muted-foreground">{folder.description}</p>
          )}

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
            <h4 className="text-sm font-semibold">Items ({items.length})</h4>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet.</p>
            ) : (
              items.map(item => (
                <div key={item.id} className="p-3 rounded-lg border bg-card space-y-1">
                  <div className="flex items-start gap-3">
                    {item.completion_tracking && onToggleCompletion && (
                      <Checkbox
                        checked={completions[item.id] || false}
                        onCheckedChange={() => handleToggle(item.id)}
                        className="mt-0.5"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${completions[item.id] ? 'line-through text-muted-foreground' : ''}`}>
                          {item.title}
                        </span>
                        {item.item_type && (
                          <Badge variant="outline" className="text-[10px]">{item.item_type}</Badge>
                        )}
                        {performanceDataMap[item.id]?.sets?.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">{performanceDataMap[item.id].sets.length} sets</Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
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
                        {item.cycle_week && <span>Wk {item.cycle_week}</span>}
                        {item.notes && (
                          <span className="flex items-center gap-0.5"><FileText className="h-2.5 w-2.5" />Notes</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.completion_tracking && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setExpandedLoggers(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedLoggers[item.id] ? 'rotate-180' : ''}`} />
                        </Button>
                      )}
                      {isOwner && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingItem(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isOwner && onDeleteItem && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteItem(item.id).then(() => setItems(prev => prev.filter(i => i.id !== item.id)))}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Performance Logger */}
                  {item.completion_tracking && expandedLoggers[item.id] && (
                    <FolderItemPerformanceLogger
                      item={item}
                      performanceData={performanceDataMap[item.id]}
                      onSave={async (data) => handleSavePerformanceData(item.id, data)}
                      compact
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Fixed Footer with Action Buttons */}
        {isOwner && (
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
            {onEditFolder && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditFolderOpen(true)}>
                <Edit className="h-3.5 w-3.5" /> Edit Folder
              </Button>
            )}
            {onDeleteFolder && (
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
          onOpenChange={(open) => { if (!open) setEditingItem(null); }}
          selectedSport={(folder.sport as 'baseball' | 'softball') || 'baseball'}
          template={buildTemplateFromItem(editingItem)}
          onSave={handleEditItemSave}
        />
      )}

      {/* Full Activity Builder for creating new folder items */}
      {builderOpen && folder && onAddItem && (
        <CustomActivityBuilderDialog
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          selectedSport={(folder.sport as 'baseball' | 'softball') || 'baseball'}
          onSave={async (data) => {
            const folderItem: Partial<ActivityFolderItem> = {
              title: data.title,
              description: data.description || null,
              item_type: data.activity_type || 'exercise',
              duration_minutes: data.duration_minutes || null,
              exercises: data.exercises as any,
              template_snapshot: {
                icon: data.icon,
                color: data.color,
                activity_type: data.activity_type,
                title: data.title,
                description: data.description,
                intensity: data.intensity,
                meals: data.meals,
                custom_fields: data.custom_fields,
                intervals: data.intervals,
                embedded_running_sessions: data.embedded_running_sessions,
                duration_minutes: data.duration_minutes,
                exercises: data.exercises,
                display_nickname: data.display_nickname,
                custom_logo_url: data.custom_logo_url,
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

      {/* Edit Folder Dialog */}
      {editFolderOpen && onEditFolder && (
        <Dialog open={editFolderOpen} onOpenChange={setEditFolderOpen}>
          <DialogContent>
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
