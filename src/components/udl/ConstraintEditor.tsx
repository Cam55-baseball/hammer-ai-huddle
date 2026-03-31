import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_CONSTRAINTS } from '@/data/udlDefaults';
import { Save, RotateCcw } from 'lucide-react';

interface Override {
  constraint_key: string;
  threshold_overrides: any;
  enabled: boolean;
}

interface Props {
  overrides: Override[];
  onRefresh: () => void;
}

export function ConstraintEditor({ overrides, onRefresh }: Props) {
  const { toast } = useToast();
  const [edits, setEdits] = useState<Record<string, { threshold: string; enabled: boolean }>>({});

  const getOverride = (key: string) => overrides.find((o) => o.constraint_key === key);

  const getEditState = (key: string) => {
    if (edits[key]) return edits[key];
    const override = getOverride(key);
    const def = DEFAULT_CONSTRAINTS.find((c) => c.key === key)!;
    return {
      threshold: String(override?.threshold_overrides?.threshold ?? def.threshold),
      enabled: override?.enabled ?? true,
    };
  };

  const setEdit = (key: string, field: 'threshold' | 'enabled', value: any) => {
    const current = getEditState(key);
    setEdits((prev) => ({ ...prev, [key]: { ...current, [field]: value } }));
  };

  const handleSave = async (key: string) => {
    const state = getEditState(key);
    const threshold = parseInt(state.threshold);
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      toast({ title: 'Invalid threshold', description: 'Must be 0-100', variant: 'destructive' });
      return;
    }

    const existing = getOverride(key);
    const row = {
      constraint_key: key,
      threshold_overrides: { threshold },
      enabled: state.enabled,
      created_by: (await supabase.auth.getUser()).data.user?.id,
      updated_at: new Date().toISOString(),
    };

    const { error } = existing
      ? await supabase.from('udl_constraint_overrides').update(row).eq('constraint_key', key)
      : await supabase.from('udl_constraint_overrides').insert(row);

    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved' });
      setEdits((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      onRefresh();
    }
  };

  const handleReset = async (key: string) => {
    const existing = getOverride(key);
    if (!existing) return;
    await supabase.from('udl_constraint_overrides').delete().eq('constraint_key', key);
    setEdits((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    onRefresh();
    toast({ title: 'Reset to default' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Constraint Thresholds</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {DEFAULT_CONSTRAINTS.map((c) => {
          const state = getEditState(c.key);
          const hasOverride = !!getOverride(c.key);
          const isEdited = !!edits[c.key];

          return (
            <div key={c.key} className="flex items-center gap-3 border rounded-lg p-3">
              <Switch
                checked={state.enabled}
                onCheckedChange={(v) => setEdit(c.key, 'enabled', v)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  type="number"
                  className="w-16 h-8 text-xs"
                  value={state.threshold}
                  onChange={(e) => setEdit(c.key, 'threshold', e.target.value)}
                  min={0}
                  max={100}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleSave(c.key)}
                  disabled={!isEdited && !hasOverride}
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
                {hasOverride && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleReset(c.key)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
