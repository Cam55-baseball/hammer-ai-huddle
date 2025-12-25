import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Bell, Trash2 } from 'lucide-react';

interface TimeSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  currentTime: string | null;
  currentReminder: number | null;
  onSave: (time: string | null, reminder: number | null) => void;
  onRemove: () => void;
}

export function TimeSettingsDrawer({
  open,
  onOpenChange,
  taskTitle,
  currentTime,
  currentReminder,
  onSave,
  onRemove,
}: TimeSettingsDrawerProps) {
  const { t } = useTranslation();
  const [tempTime, setTempTime] = useState(currentTime || '');
  const [tempReminder, setTempReminder] = useState<number | null>(currentReminder);

  // Reset state when drawer opens with new values
  useEffect(() => {
    if (open) {
      setTempTime(currentTime || '');
      setTempReminder(currentReminder);
    }
  }, [open, currentTime, currentReminder]);

  const handleSave = () => {
    onSave(tempTime || null, tempReminder);
    onOpenChange(false);
  };

  const handleRemove = () => {
    onRemove();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-8">
        <DrawerHeader className="text-left px-0">
          <DrawerTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t('gamePlan.startTime.setTime')}
          </DrawerTitle>
          <DrawerDescription className="truncate">
            {taskTitle}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 mt-2">
          {/* Time Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t('gamePlan.startTime.time')}
            </label>
            <Input
              type="time"
              value={tempTime}
              onChange={(e) => setTempTime(e.target.value)}
              className="h-12 text-lg"
            />
          </div>

          {/* Reminder Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {t('gamePlan.reminder.remindMe')}
            </label>
            <Select
              value={tempReminder?.toString() || 'none'}
              onValueChange={(v) => setTempReminder(v === 'none' ? null : parseInt(v))}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder={t('gamePlan.reminder.noReminder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('gamePlan.reminder.noReminder')}</SelectItem>
                <SelectItem value="5">{t('gamePlan.reminder.minutesBefore', { minutes: 5 })}</SelectItem>
                <SelectItem value="10">{t('gamePlan.reminder.minutesBefore', { minutes: 10 })}</SelectItem>
                <SelectItem value="15">{t('gamePlan.reminder.minutesBefore', { minutes: 15 })}</SelectItem>
                <SelectItem value="20">{t('gamePlan.reminder.minutesBefore', { minutes: 20 })}</SelectItem>
                <SelectItem value="30">{t('gamePlan.reminder.minutesBefore', { minutes: 30 })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {currentTime && (
              <Button
                variant="outline"
                onClick={handleRemove}
                className="flex-1 gap-2 text-destructive border-destructive/50 hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                {t('gamePlan.startTime.removeTime')}
              </Button>
            )}
            <Button
              onClick={handleSave}
              className="flex-1 h-12"
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
