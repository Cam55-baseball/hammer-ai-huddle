import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, ShieldOff, FlaskConical } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecapEngineSettings } from '@/components/admin/RecapEngineSettings';

interface EngineSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
  updated_at: string;
}

export function OwnerEngineSettingsPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<EngineSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('engine_settings')
        .select('*')
        .order('setting_key');
      if (error) console.error('Failed to load engine settings:', error);
      else setSettings(data ?? []);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleValueChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const getDisplayValue = (setting: EngineSetting) => {
    if (editedValues[setting.setting_key] !== undefined) return editedValues[setting.setting_key];
    const val = setting.setting_value;
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const handleSave = async () => {
    setSaving(true);
    const edits = Object.entries(editedValues);
    let savedCount = 0;

    for (const [key, rawValue] of edits) {
      let parsedValue: any = rawValue;
      try {
        parsedValue = JSON.parse(rawValue);
      } catch {
        const num = Number(rawValue);
        if (!isNaN(num) && rawValue.trim() !== '') parsedValue = num;
      }

      const { error } = await supabase
        .from('engine_settings')
        .update({ setting_value: parsedValue, updated_by: user?.id })
        .eq('setting_key', key);

      if (!error) {
        savedCount++;
        await supabase.from('audit_log').insert({
          user_id: user?.id ?? '00000000-0000-0000-0000-000000000000',
          action: 'engine_setting_updated',
          table_name: 'engine_settings',
          metadata: { setting_key: key, new_value: parsedValue },
        });
      }
    }

    toast({
      title: `${savedCount} setting${savedCount !== 1 ? 's' : ''} saved`,
      description: 'Changes take effect on next analysis cycle.',
    });
    setEditedValues({});

    const { data } = await supabase.from('engine_settings').select('*').order('setting_key');
    if (data) setSettings(data);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="hie" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="hie">HIE Engine</TabsTrigger>
        <TabsTrigger value="recap">Recap Engine</TabsTrigger>
        <TabsTrigger value="recovery">Recovery</TabsTrigger>
      </TabsList>

      <TabsContent value="hie" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuration</CardTitle>
            <CardDescription>
              Changes are logged and take effect on the next nightly processing cycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No engine settings found. Seed defaults to get started.
              </p>
            ) : (
              settings.map(setting => (
                <div key={setting.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={setting.setting_key} className="text-sm font-medium">
                      {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                    {editedValues[setting.setting_key] !== undefined && (
                      <Badge variant="outline" className="text-xs">Modified</Badge>
                    )}
                  </div>
                  {setting.description && (
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  )}
                  <Input
                    id={setting.setting_key}
                    value={getDisplayValue(setting)}
                    onChange={(e) => handleValueChange(setting.setting_key, e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              ))
            )}

            {Object.keys(editedValues).length > 0 && (
              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save {Object.keys(editedValues).length} Change{Object.keys(editedValues).length !== 1 ? 's' : ''}
              </Button>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="recap" className="mt-4">
        <RecapEngineSettings />
      </TabsContent>

      <TabsContent value="recovery" className="mt-4">
        <RecoveryControls />
      </TabsContent>
    </Tabs>
  );
}

// =============================================================
// Recovery & Stress Testing — Phase 6 Owner Controls
// =============================================================
function RecoveryControls() {
  const { toast } = useToast();
  const [safeOpen, setSafeOpen] = useState(false);
  const [resetProfiles, setResetProfiles] = useState(false);
  const [safeBusy, setSafeBusy] = useState(false);

  const [chaosOpen, setChaosOpen] = useState(false);
  const [chaosBusy, setChaosBusy] = useState(false);
  const [chaosResult, setChaosResult] = useState<any | null>(null);

  const runSafeMode = async () => {
    setSafeBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('engine-reset-safe-mode', {
        body: { reset_profiles: resetProfiles },
      });
      if (error) throw error;
      toast({
        title: 'Safe Mode applied',
        description: `Cleared ${data?.weights_cleared ?? 0} weights${data?.profiles_reset ? ' + reset profiles' : ''}.`,
      });
      setSafeOpen(false);
      setResetProfiles(false);
    } catch (e: any) {
      toast({ title: 'Safe Mode failed', description: e.message ?? String(e), variant: 'destructive' });
    } finally {
      setSafeBusy(false);
    }
  };

  const runChaosTest = async () => {
    setChaosBusy(true);
    setChaosResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('engine-chaos-test');
      if (error) throw error;
      setChaosResult(data);
      toast({
        title: 'Chaos test complete',
        description: `Restored: ${data?.restored ? 'yes' : 'no'} · Sentinel drifts: ${data?.sentinel_drifts ?? 0} · Adversarial fails: ${data?.adversarial_fails ?? 0}`,
      });
    } catch (e: any) {
      toast({ title: 'Chaos test failed', description: e.message ?? String(e), variant: 'destructive' });
    } finally {
      setChaosBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recovery & Stress Testing</CardTitle>
        <CardDescription>
          Owner-only emergency controls. Safe Mode is destructive and instant. Chaos Test is bounded (~30s) and auto-restores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SAFE MODE */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldOff className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Engine Safe Mode (Instant Reset)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Deletes all dynamic engine weights. The engine reverts to deterministic baseline behavior on the next compute.
              </p>
            </div>
          </div>
          <AlertDialog open={safeOpen} onOpenChange={setSafeOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <ShieldOff className="h-4 w-4" />
                Activate Safe Mode
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Activate Engine Safe Mode?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all dynamic weights and revert the engine to baseline. Cannot be undone (but is non-destructive — engine continues running with default weights).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-center gap-2 py-2">
                <Checkbox id="reset-profiles" checked={resetProfiles} onCheckedChange={(v) => setResetProfiles(v === true)} />
                <Label htmlFor="reset-profiles" className="text-sm cursor-pointer">
                  Also reset all user engine profiles
                </Label>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={safeBusy}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); runSafeMode(); }}
                  disabled={safeBusy}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {safeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Reset'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* CHAOS TEST */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <FlaskConical className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Run Chaos Test</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Temporarily perturbs engine weights for 30s, runs sentinel + adversarial checks, then restores. Real users may briefly see slightly different states.
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={chaosBusy} className="gap-2 border-amber-500/40">
                {chaosBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                {chaosBusy ? 'Running… (~30s)' : 'Run Chaos Test'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Run Chaos Test?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will randomly perturb each engine weight axis by ±0.10 for ~30 seconds, run sentinel + adversarial validation against the perturbed state, then restore the original weights. The full operation is auto-reversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={chaosBusy}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); runChaosTest(); }}
                  disabled={chaosBusy}
                >
                  Start Test
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>

      {/* Chaos result dialog */}
      <Dialog open={chaosResult !== null} onOpenChange={(o) => !o && setChaosResult(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chaos Test Results</DialogTitle>
            <DialogDescription>
              Sentinel drifts: <strong>{chaosResult?.sentinel_drifts ?? 0}</strong> · Adversarial fails: <strong>{chaosResult?.adversarial_fails ?? 0}</strong> · Restored: <strong>{String(chaosResult?.restored ?? false)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <div className="font-medium mb-1">Baseline Weights</div>
              <pre className="bg-muted rounded p-2 overflow-x-auto">{JSON.stringify(chaosResult?.baseline_weights ?? {}, null, 2)}</pre>
            </div>
            <div>
              <div className="font-medium mb-1">Chaos Weights (during test)</div>
              <pre className="bg-muted rounded p-2 overflow-x-auto">{JSON.stringify(chaosResult?.chaos_weights ?? {}, null, 2)}</pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
