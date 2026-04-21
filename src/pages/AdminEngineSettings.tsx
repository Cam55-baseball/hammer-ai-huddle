import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, Loader2, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecapEngineSettings } from '@/components/admin/RecapEngineSettings';

interface EngineSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
  updated_at: string;
}

export default function AdminEngineSettings() {
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<EngineSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ownerLoading && !isOwner) {
      navigate('/dashboard');
    }
  }, [isOwner, ownerLoading, navigate]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('engine_settings')
        .select('*')
        .order('setting_key');
      if (error) {
        console.error('Failed to load engine settings:', error);
      } else {
        setSettings(data ?? []);
      }
      setLoading(false);
    };
    if (isOwner) fetchSettings();
  }, [isOwner]);

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
        // Keep as string if not valid JSON
        const num = Number(rawValue);
        if (!isNaN(num) && rawValue.trim() !== '') parsedValue = num;
      }

      const { error } = await supabase
        .from('engine_settings')
        .update({ setting_value: parsedValue, updated_by: user?.id })
        .eq('setting_key', key);

      if (!error) {
        savedCount++;
        // Log to audit
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

    // Refresh
    const { data } = await supabase.from('engine_settings').select('*').order('setting_key');
    if (data) setSettings(data);
    setSaving(false);
  };

  if (ownerLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isOwner) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Engine Settings
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Owner-only — adjust MPI weights, thresholds, and engine behavior
          </p>
        </div>

        <Tabs defaultValue="hie" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hie">HIE Engine</TabsTrigger>
            <TabsTrigger value="recap">Recap Engine</TabsTrigger>
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
