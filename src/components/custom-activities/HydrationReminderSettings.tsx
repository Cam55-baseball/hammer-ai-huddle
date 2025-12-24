import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Droplets, Bell, Clock, Target, Save } from 'lucide-react';
import { useHydrationReminders } from '@/hooks/useHydrationReminders';

interface HydrationSettings {
  enabled: boolean;
  daily_goal_oz: number;
  reminder_interval_minutes: number;
  start_time: string;
  end_time: string;
}

export function HydrationReminderSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { requestPermission, hasPermission } = useHydrationReminders();
  const [settings, setSettings] = useState<HydrationSettings>({
    enabled: true,
    daily_goal_oz: 100,
    reminder_interval_minutes: 60,
    start_time: '07:00',
    end_time: '21:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('hydration_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          enabled: data.enabled ?? true,
          daily_goal_oz: data.daily_goal_oz ?? 100,
          reminder_interval_minutes: data.reminder_interval_minutes ?? 60,
          start_time: data.start_time?.slice(0, 5) ?? '07:00',
          end_time: data.end_time?.slice(0, 5) ?? '21:00',
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('hydration_settings')
        .upsert({
          user_id: user.id,
          enabled: settings.enabled,
          daily_goal_oz: settings.daily_goal_oz,
          reminder_interval_minutes: settings.reminder_interval_minutes,
          start_time: settings.start_time + ':00',
          end_time: settings.end_time + ':00',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      toast.success(t('hydration.saved', 'Hydration settings saved!'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t('hydration.saveError', 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const handleEnableToggle = async (enabled: boolean) => {
    if (enabled && !hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        toast.error(t('hydration.permissionDenied', 'Notification permission denied'));
        return;
      }
    }
    setSettings({ ...settings, enabled });
  };

  if (loading) {
    return <Card className="animate-pulse"><CardContent className="h-64" /></Card>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            {t('hydration.title', 'Hydration Reminders')}
          </CardTitle>
          <CardDescription>
            {t('hydration.description', 'Stay hydrated throughout the day with automatic reminders')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="font-medium">{t('hydration.enableReminders', 'Enable Reminders')}</Label>
                <p className="text-xs text-muted-foreground">
                  {settings.enabled 
                    ? t('hydration.reminderOn', 'You will receive hydration reminders')
                    : t('hydration.reminderOff', 'Reminders are disabled')}
                </p>
              </div>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={handleEnableToggle} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                {t('hydration.dailyGoal', 'Daily Goal')}
              </Label>
              <Badge variant="secondary">{settings.daily_goal_oz} oz</Badge>
            </div>
            <Slider
              value={[settings.daily_goal_oz]}
              onValueChange={([val]) => setSettings({ ...settings, daily_goal_oz: val })}
              min={32}
              max={200}
              step={8}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>32 oz</span>
              <span>200 oz</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('hydration.reminderInterval', 'Reminder Interval')}
              </Label>
              <Badge variant="secondary">Every {settings.reminder_interval_minutes} min</Badge>
            </div>
            <Slider
              value={[settings.reminder_interval_minutes]}
              onValueChange={([val]) => setSettings({ ...settings, reminder_interval_minutes: val })}
              min={15}
              max={120}
              step={15}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>15 min</span>
              <span>2 hours</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('hydration.startTime', 'Start Time')}</Label>
              <Input
                type="time"
                value={settings.start_time}
                onChange={(e) => setSettings({ ...settings, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('hydration.endTime', 'End Time')}</Label>
              <Input
                type="time"
                value={settings.end_time}
                onChange={(e) => setSettings({ ...settings, end_time: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={saveSettings} disabled={saving} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {saving ? t('hydration.saving', 'Saving...') : t('hydration.save', 'Save Settings')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('hydration.tips.title', 'Hydration Tips')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { title: t('hydration.tips.morning', 'Start Your Day Right'), desc: t('hydration.tips.morningDesc', 'Drink 16-20 oz of water first thing in the morning') },
            { title: t('hydration.tips.before', 'Before Training'), desc: t('hydration.tips.beforeDesc', 'Drink 16-20 oz 2 hours before activity') },
            { title: t('hydration.tips.during', 'During Training'), desc: t('hydration.tips.duringDesc', 'Drink 7-10 oz every 10-20 minutes') },
            { title: t('hydration.tips.after', 'After Training'), desc: t('hydration.tips.afterDesc', 'Drink 16-24 oz for every pound lost during exercise') },
            { title: t('hydration.tips.electrolytes', 'Electrolytes'), desc: t('hydration.tips.electrolytesDesc', 'Consider electrolyte drinks for sessions over 60 minutes') },
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Droplets className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">{tip.title}</p>
                <p className="text-xs text-muted-foreground">{tip.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
