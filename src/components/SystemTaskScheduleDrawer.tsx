import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Clock, Bell, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemTaskScheduleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  currentDisplayDays: number[];
  currentDisplayTime: string | null;
  currentReminderEnabled: boolean;
  currentReminderMinutes: number;
  onSave: (displayDays: number[], displayTime: string | null, reminderEnabled: boolean, reminderMinutes: number) => void;
  onSkipTask?: () => void;
  showSkipOption?: boolean;
}

const DAYS = [
  { value: 0, key: 'sun', short: 'S' },
  { value: 1, key: 'mon', short: 'M' },
  { value: 2, key: 'tue', short: 'T' },
  { value: 3, key: 'wed', short: 'W' },
  { value: 4, key: 'thu', short: 'T' },
  { value: 5, key: 'fri', short: 'F' },
  { value: 6, key: 'sat', short: 'S' },
];

export function SystemTaskScheduleDrawer({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  currentDisplayDays,
  currentDisplayTime,
  currentReminderEnabled,
  currentReminderMinutes,
  onSave,
  onSkipTask,
  showSkipOption = true,
}: SystemTaskScheduleDrawerProps) {
  const { t } = useTranslation();
  
  const [displayDays, setDisplayDays] = useState<number[]>(currentDisplayDays);
  const [displayTime, setDisplayTime] = useState<string>(currentDisplayTime || '');
  const [reminderEnabled, setReminderEnabled] = useState(currentReminderEnabled);
  const [reminderMinutes, setReminderMinutes] = useState<number>(currentReminderMinutes);

  // Reset state when drawer opens with new values
  useEffect(() => {
    if (open) {
      setDisplayDays(currentDisplayDays);
      setDisplayTime(currentDisplayTime || '');
      setReminderEnabled(currentReminderEnabled);
      setReminderMinutes(currentReminderMinutes);
    }
  }, [open, currentDisplayDays, currentDisplayTime, currentReminderEnabled, currentReminderMinutes]);

  const toggleDay = (day: number) => {
    if (displayDays.includes(day)) {
      setDisplayDays(displayDays.filter(d => d !== day));
    } else {
      setDisplayDays([...displayDays, day].sort((a, b) => a - b));
    }
  };

  const handleSave = () => {
    onSave(displayDays, displayTime || null, reminderEnabled, reminderMinutes);
    onOpenChange(false);
  };

  const getDaysSummary = () => {
    if (displayDays.length === 0) return t('gamePlan.taskSchedule.noDays', 'No days selected');
    if (displayDays.length === 7) return t('gamePlan.taskSchedule.everyDay', 'Every day');
    
    // Check for weekdays only
    const weekdays = [1, 2, 3, 4, 5];
    const weekends = [0, 6];
    if (displayDays.length === 5 && weekdays.every(d => displayDays.includes(d))) {
      return t('gamePlan.taskSchedule.weekdays', 'Weekdays');
    }
    if (displayDays.length === 2 && weekends.every(d => displayDays.includes(d))) {
      return t('gamePlan.taskSchedule.weekends', 'Weekends');
    }
    
    return displayDays
      .map(d => t(`gamePlan.lockOrder.days.${DAYS[d].key}`))
      .join(', ');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-8">
        <DrawerHeader className="text-left px-0">
          <DrawerTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {t('gamePlan.taskSchedule.title', 'Task Schedule')}
          </DrawerTitle>
          <DrawerDescription className="truncate">
            {taskTitle}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-6 mt-2">
          {/* Display Days Picker */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-foreground">
              {t('gamePlan.taskSchedule.displayDays', 'Display Days')}
            </label>
            <p className="text-xs text-muted-foreground">
              {t('gamePlan.taskSchedule.displayDaysDesc', 'Select which days to show this task')}
            </p>
            
            <div className="flex justify-between gap-1">
              {DAYS.map(({ value, key, short }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleDay(value)}
                  className={cn(
                    "flex-1 h-12 rounded-lg font-bold text-sm transition-all duration-200",
                    "border-2 hover:scale-105 active:scale-95",
                    displayDays.includes(value)
                      ? "bg-primary text-primary-foreground border-primary shadow-lg"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {short}
                </button>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground text-center font-medium">
              {getDaysSummary()}
            </p>
          </div>

          {/* Time Input */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t('gamePlan.startTime.time', 'Time')}
            </label>
            <Input
              type="time"
              value={displayTime}
              onChange={(e) => setDisplayTime(e.target.value)}
              className="h-12 text-lg"
            />
          </div>

          {/* Reminder Selection */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {t('gamePlan.reminder.remindMe', 'Remind me')}
            </label>
            <Select
              value={reminderEnabled ? reminderMinutes.toString() : 'none'}
              onValueChange={(v) => {
                if (v === 'none') {
                  setReminderEnabled(false);
                } else {
                  setReminderEnabled(true);
                  setReminderMinutes(parseInt(v));
                }
              }}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder={t('gamePlan.reminder.noReminder', 'No reminder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('gamePlan.reminder.noReminder', 'No reminder')}</SelectItem>
                <SelectItem value="5">{t('gamePlan.reminder.minutesBefore', { minutes: 5 })}</SelectItem>
                <SelectItem value="10">{t('gamePlan.reminder.minutesBefore', { minutes: 10 })}</SelectItem>
                <SelectItem value="15">{t('gamePlan.reminder.minutesBefore', { minutes: 15 })}</SelectItem>
                <SelectItem value="20">{t('gamePlan.reminder.minutesBefore', { minutes: 20 })}</SelectItem>
                <SelectItem value="30">{t('gamePlan.reminder.minutesBefore', { minutes: 30 })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              className="flex-1 h-12 gap-2"
              disabled={displayDays.length === 0}
            >
              <Check className="h-4 w-4" />
              {t('common.save', 'Save')}
            </Button>
          </div>

          {/* Skip for Today Option */}
          {showSkipOption && onSkipTask && (
            <div className="border-t border-white/10 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  onSkipTask();
                  onOpenChange(false);
                }}
                className="w-full justify-start gap-3 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-12"
              >
                <X className="h-5 w-5" />
                <span>{t('gamePlan.skipTask', 'Skip for today')}</span>
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
