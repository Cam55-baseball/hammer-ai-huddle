import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Bell } from 'lucide-react';
import { CustomActivityTemplate } from '@/types/customActivity';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface ScheduleSettings {
  display_on_game_plan: boolean;
  display_days: number[];
  display_time: string | null;
  reminder_enabled: boolean;
  reminder_time: string | null;
  reminder_minutes?: number;
  // Recurrence fields - key for Game Plan & Calendar visibility
  recurring_days: number[];
  recurring_active: boolean;
}

interface TemplateScheduleSettingsDrawerProps {
  template: CustomActivityTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (templateId: string, settings: ScheduleSettings) => Promise<boolean>;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TemplateScheduleSettingsDrawer({
  template,
  open,
  onOpenChange,
  onSave,
}: TemplateScheduleSettingsDrawerProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [displayOnGamePlan, setDisplayOnGamePlan] = useState(true);
  const [displayDays, setDisplayDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [displayTime, setDisplayTime] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(15);

  // Initialize form when template changes
  useEffect(() => {
    if (template) {
      setDisplayOnGamePlan(template.display_on_game_plan !== false);
      setDisplayDays((template.display_days as number[]) || [0, 1, 2, 3, 4, 5, 6]);
      setDisplayTime(template.display_time || '');
      setReminderEnabled(template.reminder_enabled || false);
      // Parse reminder time to get minutes (stored as minutes before display_time)
      setReminderMinutes(15);
    }
  }, [template]);

  const toggleDay = (day: number) => {
    setDisplayDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    if (!template) return;
    
    setSaving(true);
    try {
      // Determine recurrence based on display settings
      // If showing on game plan with specific days, sync recurring_days to display_days
      const shouldRecur = displayOnGamePlan && displayDays.length > 0;
      
      const success = await onSave(template.id, {
        display_on_game_plan: displayOnGamePlan,
        display_days: displayDays,
        display_time: displayTime || null,
        reminder_enabled: reminderEnabled,
        reminder_time: template.reminder_time || null,
        reminder_minutes: reminderMinutes,
        // Sync recurrence to display settings for E2E visibility
        recurring_days: shouldRecur ? displayDays : [],
        recurring_active: shouldRecur,
      });
      
      if (success) {
        toast.success(t('customActivity.scheduleSettingsSaved', 'Schedule settings saved'));
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-8 max-h-[90vh]">
        <DrawerHeader className="text-left px-0">
          <DrawerTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {t('customActivity.repeatWeeklyTitle', 'Repeat Weekly')}
          </DrawerTitle>
          <DrawerDescription>{template?.title}</DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-6 py-4">
            {/* Show on Game Plan Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium">{t('customActivity.showOnGamePlan', 'Show on Game Plan')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('customActivity.showOnGamePlanDesc', 'Display this activity in your daily game plan')}
                </p>
              </div>
              <Switch 
                checked={displayOnGamePlan} 
                onCheckedChange={setDisplayOnGamePlan}
                className="h-6 w-11"
              />
            </div>

            {displayOnGamePlan && (
              <>
                {/* Day Picker - Mobile optimized grid */}
                <div className="space-y-3">
                  <label className="font-medium">{t('customActivity.repeatWeekly', 'Repeat Weekly')}</label>
                  <p className="text-sm text-muted-foreground">
                    {t('customActivity.repeatWeeklyDesc', 'Select which days this activity repeats')}
                  </p>
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_LABELS.map((day, i) => (
                      <Button
                        key={i}
                        variant={displayDays.includes(i) ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-11 w-full font-bold text-sm",
                          displayDays.includes(i) && "bg-primary hover:bg-primary/90"
                        )}
                        onClick={() => toggleDay(i)}
                        title={DAY_NAMES[i]}
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {displayDays.length === 7 
                      ? t('customActivity.everyDay', 'Every day')
                      : displayDays.length === 0 
                        ? t('customActivity.noDays', 'No days selected')
                        : displayDays.map(d => DAY_NAMES[d].slice(0, 3)).join(', ')}
                  </p>
                </div>

                {/* Display Time - Large touch target */}
                <div className="space-y-2">
                  <label className="font-medium">{t('customActivity.displayTime', 'Display Time')}</label>
                  <p className="text-sm text-muted-foreground">
                    {t('customActivity.displayTimeDesc', 'When to show in timeline view (optional)')}
                  </p>
                  <Input
                    type="time"
                    value={displayTime}
                    onChange={(e) => setDisplayTime(e.target.value)}
                    className="h-12 text-lg"
                    placeholder="--:--"
                  />
                </div>

                {/* Notification Settings */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <span className="font-medium">{t('customActivity.enableReminder', 'Enable Reminder')}</span>
                    </div>
                    <Switch 
                      checked={reminderEnabled} 
                      onCheckedChange={setReminderEnabled}
                      className="h-6 w-11"
                    />
                  </div>
                  
                  {reminderEnabled && (
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">
                        {t('customActivity.reminderBefore', 'Remind me')}
                      </label>
                      <Select 
                        value={reminderMinutes.toString()} 
                        onValueChange={v => setReminderMinutes(parseInt(v))}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">{t('customActivity.reminder5min', '5 minutes before')}</SelectItem>
                          <SelectItem value="10">{t('customActivity.reminder10min', '10 minutes before')}</SelectItem>
                          <SelectItem value="15">{t('customActivity.reminder15min', '15 minutes before')}</SelectItem>
                          <SelectItem value="30">{t('customActivity.reminder30min', '30 minutes before')}</SelectItem>
                          <SelectItem value="60">{t('customActivity.reminder1hour', '1 hour before')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons - Large touch targets */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="flex-1 h-12"
            disabled={saving}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleSave} 
            className="flex-1 h-12"
            disabled={saving}
          >
            {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
