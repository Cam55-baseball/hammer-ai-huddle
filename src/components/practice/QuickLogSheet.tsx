import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSessionDefaults } from '@/hooks/useSessionDefaults';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  suggestedModule?: string;
}

const MODULE_CHIPS = [
  { id: 'practice', label: 'Practice' },
  { id: 'strength', label: 'Strength' },
  { id: 'speed', label: 'Speed' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'mobility', label: 'Mobility' },
  { id: 'mental', label: 'Mental' },
];

export function QuickLogSheet({ open, onOpenChange, suggestedModule }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getDefaults, saveDefaults } = useSessionDefaults('quick_log');

  const [module, setModule] = useState<string>(suggestedModule || 'practice');
  const [duration, setDuration] = useState<number>(30);
  const [rpe, setRpe] = useState<number>(6);
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const d = getDefaults();
      if (d.duration_minutes) setDuration(d.duration_minutes);
      if (d.rpe) setRpe(d.rpe);
      if (suggestedModule) setModule(suggestedModule);
      else if (d.module) setModule(d.module);
      setNote('');
      setSavedId(null);
    }
  }, [open, suggestedModule, getDefaults]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { data, error } = await (supabase as any)
      .from('custom_activity_logs')
      .insert({
        user_id: user.id,
        entry_date: new Date().toISOString().slice(0, 10),
        completed: true,
        completed_at: new Date().toISOString(),
        completion_state: 'completed',
        completion_method: 'done_button',
        actual_duration_minutes: duration,
        notes: note || null,
        performance_data: { module, rpe, source: 'quick_log' },
      })
      .select('id')
      .single();
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    saveDefaults({ module, duration_minutes: duration, rpe });
    setSavedId(data?.id ?? null);
    toast({ title: 'Logged', description: `${MODULE_CHIPS.find((m) => m.id === module)?.label ?? module} · ${duration}m · RPE ${rpe}` });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Quick Log</SheetTitle>
          <SheetDescription>Save in 2 taps. Add detail after if you want.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Activity</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MODULE_CHIPS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModule(m.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    module === m.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-muted/30 hover:bg-accent'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Duration</Label>
              <Badge variant="secondary">{duration} min</Badge>
            </div>
            <Slider value={[duration]} min={5} max={180} step={5} onValueChange={(v) => setDuration(v[0])} className="mt-2" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">RPE</Label>
              <Badge variant="secondary">{rpe} / 10</Badge>
            </div>
            <Slider value={[rpe]} min={1} max={10} step={1} onValueChange={(v) => setRpe(v[0])} className="mt-2" />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="One-line note…"
              rows={2}
              className="mt-2"
            />
          </div>

          {savedId ? (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Saved. You can add more detail in My Activities anytime.
            </div>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? 'Saving…' : 'Save Log'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
