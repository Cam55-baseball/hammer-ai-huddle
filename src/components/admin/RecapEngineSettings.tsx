import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const INPUT_KEYS = [
  { key: 'mpi', label: 'MPI / Developer Scores' },
  { key: 'scout_grades', label: 'Scout Grades' },
  { key: 'performance_sessions', label: 'Practice & Game Sessions' },
  { key: 'hie_snapshot', label: 'HIE Diagnosis' },
  { key: 'six_week_test', label: '6-Week Test' },
  { key: 'workload', label: 'Workload / CNS Load' },
  { key: 'physical', label: 'Physical Metrics' },
  { key: 'custom_activities', label: 'Custom Activities' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'mental_health', label: 'Mental Health' },
];

const SECTIONS = [
  'context_header',
  'transfer_analysis',
  'physical_impact',
  'system_correlations',
  'elite_suggestions',
];

export function RecapEngineSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [disabled, setDisabled] = useState<string[]>([]);
  const [seasonOverridesText, setSeasonOverridesText] = useState('{}');
  const [rowId, setRowId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('recap_engine_settings').select('*').eq('scope', 'global').maybeSingle();
      if (data) {
        setRowId(data.id);
        setWeights((data.input_weights as Record<string, number>) || {});
        setDisabled((data.disabled_sections as string[]) || []);
        setSeasonOverridesText(JSON.stringify(data.season_overrides || {}, null, 2));
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    let parsedOverrides: any = {};
    try {
      parsedOverrides = JSON.parse(seasonOverridesText);
    } catch {
      toast({ title: 'Invalid JSON', description: 'Season overrides must be valid JSON.', variant: 'destructive' });
      setSaving(false);
      return;
    }

    const payload = {
      scope: 'global',
      input_weights: weights,
      disabled_sections: disabled,
      season_overrides: parsedOverrides,
      updated_by: user?.id,
    };

    const { error } = rowId
      ? await supabase.from('recap_engine_settings').update(payload).eq('id', rowId)
      : await supabase.from('recap_engine_settings').insert(payload);

    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Recap engine settings saved', description: 'Changes apply to the next recap generation.' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Input Weights</CardTitle>
          <CardDescription>Scale how heavily each data source influences the recap (0× = ignore, 2× = double weight).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {INPUT_KEYS.map(({ key, label }) => {
            const val = weights[key] ?? 1.0;
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  <span className="text-xs font-mono text-muted-foreground">{val.toFixed(2)}×</span>
                </div>
                <Slider
                  value={[val]}
                  min={0}
                  max={2}
                  step={0.1}
                  onValueChange={([v]) => setWeights(w => ({ ...w, [key]: v }))}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Output Sections</CardTitle>
          <CardDescription>Toggle which new V2 sections appear in the recap.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SECTIONS.map(s => {
            const isDisabled = disabled.includes(s);
            return (
              <div key={s} className="flex items-center justify-between">
                <Label className="text-sm capitalize">{s.replace(/_/g, ' ')}</Label>
                <Switch
                  checked={!isDisabled}
                  onCheckedChange={(checked) => {
                    setDisabled(prev => checked ? prev.filter(x => x !== s) : [...prev, s]);
                  }}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Season Overrides (JSON)</CardTitle>
          <CardDescription>
            Optionally override emphasize/deEmphasize/toneGuidance per season phase. Empty object = use defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={seasonOverridesText}
            onChange={(e) => setSeasonOverridesText(e.target.value)}
            rows={10}
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Recap Engine Settings
      </Button>
    </div>
  );
}
