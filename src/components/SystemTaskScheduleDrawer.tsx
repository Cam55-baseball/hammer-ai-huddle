import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Clock, Bell, X, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemTaskScheduleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  /** Days this task should repeat (0=Sunday, 6=Saturday) - inverse of skip days */
  currentDisplayDays: number[];
  currentDisplayTime: string | null;
  currentReminderEnabled: boolean;
  currentReminderMinutes: number;
  /** Save function that receives display days (will be converted to skip days internally) */
  onSave: (displayDays: number[], displayTime: string | null, reminderEnabled: boolean, reminderMinutes: number) => Promise<boolean>;
  onSkipTask?: () => void;
  showSkipOption?: boolean;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

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
  const [isSaving, setIsSaving] = useState(false);
  
  // Track which taskId we've initialized for to prevent mid-edit overrides
  const initializedForTaskIdRef = useRef<string | null>(null);

  // Only reset state when drawer opens for a NEW task (or first time)
  useEffect(() => {
    if (open && taskId && taskId !== initializedForTaskIdRef.current) {
      // New task being edited - initialize state
      setDisplayDays(currentDisplayDays);
      setDisplayTime(currentDisplayTime || '');
      setReminderEnabled(currentReminderEnabled);
      setReminderMinutes(currentReminderMinutes);
      initializedForTaskIdRef.current = taskId;
    }
    
    // Clear ref when drawer closes
    if (!open) {
      initializedForTaskIdRef.current = null;
    }
  }, [open, taskId, currentDisplayDays, currentDisplayTime, currentReminderEnabled, currentReminderMinutes]);

  const toggleDay = (day: number) => {
    if (isSaving) return;
    if (displayDays.includes(day)) {
      setDisplayDays(displayDays.filter(d => d !== day));
    } else {
      setDisplayDays([...displayDays, day].sort((a, b) => a - b));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Pass display days to parent - parent will handle conversion to skip days
      const success = await onSave(displayDays, displayTime || null, reminderEnabled, reminderMinutes);
      if (success) {
        onOpenChange(false);
      }
      // If not successful, keep drawer open so user can retry
    } finally {
      setIsSaving(false);
    }
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
      <DrawerContent className="px-4 pb-0 flex flex-col max-h-[85vh]">
        <DrawerHeader className="text-left px-0 flex-shrink-0">
          <DrawerTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {t('gamePlan.taskSchedule.repeatWeekly', 'Repeat Weekly')}
          </DrawerTitle>
          <DrawerDescription className="whitespace-normal break-words line-clamp-3">
            {taskTitle}
          </DrawerDescription>
        </DrawerHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto space-y-6 mt-2 pb-4">
          {/* Repeat Weekly Picker */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-foreground">
              {t('gamePlan.taskSchedule.repeatWeekly', 'Repeat Weekly')}
            </label>
            <p className="text-xs text-muted-foreground">
              {t('gamePlan.taskSchedule.repeatWeeklyDesc', 'Select which days this activity repeats')}
            </p>
            
            <div className="flex justify-between gap-1">
              {DAYS.map(({ value, key, short }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleDay(value)}
                  disabled={isSaving}
                  className={cn(
                    "flex-1 h-12 rounded-lg font-bold text-sm transition-all duration-200",
                    "border-2 hover:scale-105 active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
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
              disabled={isSaving}
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
              disabled={isSaving}
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
        </div>

        {/* Sticky Footer with Action Buttons */}
        <div className="flex-shrink-0 border-t border-border bg-background pt-4 pb-8 space-y-3">
          {/* Save Button */}
          <Button
            onClick={handleSave}
            className="w-full h-12 gap-2"
            disabled={displayDays.length === 0 || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isSaving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </Button>

          {/* Skip for Today Option */}
          {showSkipOption && onSkipTask && (
            <Button
              variant="ghost"
              onClick={() => {
                onSkipTask();
                onOpenChange(false);
              }}
              disabled={isSaving}
              className="w-full justify-center gap-3 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-12"
            >
              <X className="h-5 w-5" />
              <span>{t('gamePlan.skipTask', 'Skip for today')}</span>
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Utility to convert display days (days to show) to skip days (days to hide)
 */
export function displayDaysToSkipDays(displayDays: number[]): number[] {
  return ALL_DAYS.filter(d => !displayDays.includes(d));
}

/**
 * Utility to convert skip days (days to hide) to display days (days to show)
 */
export function skipDaysToDisplayDays(skipDays: number[]): number[] {
  return ALL_DAYS.filter(d => !skipDays.includes(d));
}
