import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ActivityFolder, ActivityFolderItem, DAY_LABELS } from '@/types/activityFolder';
import { supabase } from '@/integrations/supabase/client';
import { FolderItemEditor } from './FolderItemEditor';
import { FolderOpen, Clock, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTodayDate } from '@/utils/dateUtils';

interface FolderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: ActivityFolder | null;
  isOwner: boolean;
  assignmentId?: string;
  onAddItem?: (folderId: string, item: Partial<ActivityFolderItem>) => Promise<ActivityFolderItem | null>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onToggleCompletion?: (itemId: string, entryDate: string, assignmentId?: string) => Promise<void>;
}

export function FolderDetailDialog({
  open, onOpenChange, folder, isOwner, assignmentId,
  onAddItem, onDeleteItem, onToggleCompletion,
}: FolderDetailDialogProps) {
  const [items, setItems] = useState<ActivityFolderItem[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !folder) return;
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
          .select('folder_item_id, completed')
          .eq('user_id', userData.user.id)
          .eq('entry_date', today);
        
        const map: Record<string, boolean> = {};
        (compData || []).forEach(c => { map[c.folder_item_id] = c.completed || false; });
        setCompletions(map);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" style={{ color: folder.color }} />
            {folder.name}
          </DialogTitle>
        </DialogHeader>

        {folder.description && (
          <p className="text-sm text-muted-foreground">{folder.description}</p>
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
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
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
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                    {item.assigned_days && item.assigned_days.length > 0 && (
                      <span>{item.assigned_days.map(d => DAY_LABELS[d]).join(', ')}</span>
                    )}
                    {item.duration_minutes && (
                      <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{item.duration_minutes}m</span>
                    )}
                    {item.cycle_week && <span>Wk {item.cycle_week}</span>}
                    {item.notes && (
                      <span className="flex items-center gap-0.5"><FileText className="h-2.5 w-2.5" />Notes</span>
                    )}
                  </div>
                </div>
                {isOwner && onDeleteItem && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => onDeleteItem(item.id).then(() => setItems(prev => prev.filter(i => i.id !== item.id)))}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add Item (owner only) */}
        {isOwner && onAddItem && (
          <FolderItemEditor
            onAdd={async (item) => {
              const result = await onAddItem(folder.id, item);
              if (result) setItems(prev => [...prev, result]);
              return result;
            }}
            cycleType={folder.cycle_type || undefined}
            cycleLengthWeeks={folder.cycle_length_weeks || undefined}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
