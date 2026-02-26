import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Clock, Search, Library, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityFolderItem } from '@/types/activityFolder';
import { CustomActivityTemplate, Exercise } from '@/types/customActivity';
import { CustomActivityBuilderDialog } from '@/components/custom-activities';
import { toast } from 'sonner';

interface ActivityPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sport: string;
  onImport: (items: Partial<ActivityFolderItem>[]) => void;
}

const mapActivityType = (activityType: string): string => {
  switch (activityType) {
    case 'workout': return 'exercise';
    case 'mobility': return 'mobility';
    case 'nutrition': return 'nutrition';
    case 'mental': return 'mental';
    case 'recovery': return 'recovery';
    default: return activityType;
  }
};

const formatDuration = (seconds: number): string => {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${seconds}s`;
};

export function ActivityPickerDialog({ open, onOpenChange, sport, onImport }: ActivityPickerDialogProps) {
  const [templates, setTemplates] = useState<CustomActivityTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<CustomActivityTemplate | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return; }

    const { data } = await supabase
      .from('custom_activity_templates')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('sport', sport)
      .is('deleted_at', null)
      .order('title');

    if (data) {
      setTemplates(data.map(d => ({
        ...d,
        exercises: (d.exercises as unknown as Exercise[]) ?? [],
        meals: (d.meals as any) ?? { items: [], vitamins: [], supplements: [] },
        custom_fields: (d.custom_fields as any) ?? [],
        intervals: (d.intervals as any) ?? [],
        recurring_days: (d.recurring_days as any) ?? [],
        recurring_active: d.recurring_active ?? false,
        is_favorited: d.is_favorited ?? false,
        sport: d.sport as 'baseball' | 'softball',
        activity_type: d.activity_type as any,
        intensity: d.intensity as any,
        distance_unit: d.distance_unit as any,
        embedded_running_sessions: (d.embedded_running_sessions as any) ?? [],
      } as CustomActivityTemplate)));
    }
    setLoading(false);
  }, [sport]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelected(new Set());
      setExpandedId(null);
      setEditingTemplate(null);
      return;
    }
    loadTemplates();
  }, [open, loadTemplates]);

  const filtered = templates.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleEdit = (t: CustomActivityTemplate, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingTemplate(t);
  };

  const handleEditSave = async (data: Omit<CustomActivityTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!editingTemplate) return;
    const { error } = await supabase
      .from('custom_activity_templates')
      .update({
        title: data.title,
        description: data.description,
        activity_type: data.activity_type,
        icon: data.icon,
        color: data.color,
        exercises: data.exercises as any,
        meals: data.meals as any,
        custom_fields: data.custom_fields as any,
        duration_minutes: data.duration_minutes,
        intensity: data.intensity,
        distance_value: data.distance_value,
        distance_unit: data.distance_unit,
        pace_value: data.pace_value,
        intervals: data.intervals as any,
        is_favorited: data.is_favorited,
        recurring_days: data.recurring_days as any,
        recurring_active: data.recurring_active,
        embedded_running_sessions: data.embedded_running_sessions as any,
        display_nickname: data.display_nickname,
        custom_logo_url: data.custom_logo_url,
        reminder_enabled: data.reminder_enabled,
        reminder_time: data.reminder_time,
        reminder_minutes: data.reminder_minutes,
        display_on_game_plan: data.display_on_game_plan,
        display_days: data.display_days,
        display_time: data.display_time,
      })
      .eq('id', editingTemplate.id);

    if (error) {
      toast.error('Failed to save changes');
      return;
    }

    toast.success('Activity updated');
    setEditingTemplate(null);
    await loadTemplates();
  };

  const handleImport = () => {
    const items: Partial<ActivityFolderItem>[] = templates
      .filter(t => selected.has(t.id))
      .map(t => ({
        title: t.title,
        description: t.description,
        item_type: mapActivityType(t.activity_type),
        duration_minutes: t.duration_minutes,
        exercises: t.exercises as any,
        template_snapshot: {
          icon: t.icon,
          color: t.color,
          activity_type: t.activity_type,
          intensity: t.intensity,
          meals: t.meals,
          custom_fields: t.custom_fields,
          intervals: t.intervals,
          embedded_running_sessions: t.embedded_running_sessions,
          duration_minutes: t.duration_minutes,
          exercises: t.exercises,
          display_nickname: t.display_nickname,
          custom_logo_url: t.custom_logo_url,
        },
      }));
    onImport(items);
    onOpenChange(false);
  };

  const exercises = (t: CustomActivityTemplate): Exercise[] => {
    if (!t.exercises || !Array.isArray(t.exercises)) return [];
    return t.exercises as Exercise[];
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Import from Activities
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[40vh]">
            {loading ? (
              <p className="text-sm text-muted-foreground p-4 text-center">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                {templates.length === 0 ? 'No custom activities found for this sport.' : 'No results.'}
              </p>
            ) : (
              filtered.map(t => {
                const isExpanded = expandedId === t.id;
                const exerciseList = exercises(t);

                return (
                  <div key={t.id} className="rounded-lg border bg-card">
                    <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                      <Checkbox
                        checked={selected.has(t.id)}
                        onCheckedChange={() => toggleSelect(t.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{t.title}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{t.activity_type}</Badge>
                        </div>
                        {t.description && (
                          <p className={`text-xs text-muted-foreground mt-0.5 ${isExpanded ? '' : 'line-clamp-1'}`}>
                            {t.description}
                          </p>
                        )}
                        {t.duration_minutes && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-1">
                            <Clock className="h-2.5 w-2.5" />{t.duration_minutes}m
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => handleEdit(t, e)}
                          title="Edit activity"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => toggleExpand(t.id, e)}
                          title={isExpanded ? 'Collapse' : 'Show details'}
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </label>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 ml-9 border-t border-border/50">
                        {exerciseList.length > 0 ? (
                          <ul className="mt-2 space-y-1.5">
                            {exerciseList.map((ex, i) => (
                              <li key={ex.id || i} className="text-xs">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-muted-foreground">{i + 1}.</span>
                                  <span className="font-medium">{ex.name}</span>
                                  {ex.sets && ex.reps && (
                                    <span className="text-muted-foreground">— {ex.sets} × {ex.reps}</span>
                                  )}
                                  {ex.weight && (
                                    <span className="text-muted-foreground">@ {ex.weight}{ex.weightUnit || 'lbs'}</span>
                                  )}
                                </div>
                                <div className="ml-4 flex flex-wrap gap-2 text-muted-foreground">
                                  {ex.duration && <span>{formatDuration(ex.duration)}</span>}
                                  {ex.rest && <span>Rest: {formatDuration(ex.rest)}</span>}
                                </div>
                                {ex.notes && (
                                  <p className="ml-4 text-muted-foreground italic">{ex.notes}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-2">No exercises defined</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={handleImport} disabled={selected.size === 0}>
              Import {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingTemplate && (
        <CustomActivityBuilderDialog
          open={!!editingTemplate}
          onOpenChange={(o) => { if (!o) setEditingTemplate(null); }}
          template={editingTemplate}
          onSave={handleEditSave}
          selectedSport={sport as 'baseball' | 'softball'}
        />
      )}
    </>
  );
}
