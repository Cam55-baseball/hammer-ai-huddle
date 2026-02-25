import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Clock, Search, Library } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityFolderItem } from '@/types/activityFolder';

interface Template {
  id: string;
  title: string;
  activity_type: string;
  description: string | null;
  duration_minutes: number | null;
  exercises: any;
  icon: string;
  color: string;
}

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

export function ActivityPickerDialog({ open, onOpenChange, sport, onImport }: ActivityPickerDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelected(new Set());
      return;
    }
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { setLoading(false); return; }

      const { data } = await supabase
        .from('custom_activity_templates')
        .select('id, title, activity_type, description, duration_minutes, exercises, icon, color')
        .eq('user_id', userData.user.id)
        .eq('sport', sport)
        .is('deleted_at', null)
        .order('title');

      setTemplates((data || []) as Template[]);
      setLoading(false);
    };
    load();
  }, [open, sport]);

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

  const handleImport = () => {
    const items: Partial<ActivityFolderItem>[] = templates
      .filter(t => selected.has(t.id))
      .map(t => ({
        title: t.title,
        description: t.description,
        item_type: mapActivityType(t.activity_type),
        duration_minutes: t.duration_minutes,
        exercises: t.exercises,
      }));
    onImport(items);
    onOpenChange(false);
  };

  return (
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
            filtered.map(t => (
              <label
                key={t.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
              >
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
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                  )}
                  {t.duration_minutes && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-1">
                      <Clock className="h-2.5 w-2.5" />{t.duration_minutes}m
                    </span>
                  )}
                </div>
              </label>
            ))
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
  );
}
