import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnlockDayPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedDays: number[]; // Currently locked days (0-6)
  onSave: (daysToUnlock: number[], daysToLock: number[]) => Promise<void>;
}

const DAYS = [
  { value: 1, key: 'mon' },
  { value: 2, key: 'tue' },
  { value: 3, key: 'wed' },
  { value: 4, key: 'thu' },
  { value: 5, key: 'fri' },
  { value: 6, key: 'sat' },
  { value: 0, key: 'sun' },
];

export function UnlockDayPickerDialog({
  open,
  onOpenChange,
  lockedDays,
  onSave,
}: UnlockDayPickerDialogProps) {
  const { t } = useTranslation();
  const [selectedLockedDays, setSelectedLockedDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const prevOpenRef = useRef(false);

  // Initialize with current locked days ONLY when dialog first opens
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Dialog just opened - initialize with current locked days
      setSelectedLockedDays([...lockedDays]);
    }
    prevOpenRef.current = open;
  }, [open, lockedDays]);

  const toggleDay = (day: number) => {
    setSelectedLockedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Calculate which days to unlock (were locked, now not selected)
      const daysToUnlock = lockedDays.filter(d => !selectedLockedDays.includes(d));
      // Calculate which days to lock (not locked before, now selected)
      const daysToLock = selectedLockedDays.filter(d => !lockedDays.includes(d));
      
      await onSave(daysToUnlock, daysToLock);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedLockedDays([...lockedDays]);
    onOpenChange(false);
  };

  // Get display labels
  const lockedDayLabels = selectedLockedDays
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map(d => t(`gamePlan.lockOrder.days.${DAYS.find(day => day.value === d)?.key}`))
    .join(', ');

  const unlockedDays = DAYS.filter(d => !selectedLockedDays.includes(d.value));
  const unlockedDayLabels = unlockedDays
    .map(d => t(`gamePlan.lockOrder.days.${d.key}`))
    .join(', ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            {t('gamePlan.lockOrder.unlockForWeek', 'Unlock Order for Days')}
          </DialogTitle>
          <DialogDescription>
            {t('gamePlan.lockOrder.unlockDescription', 'Toggle days to change their lock status. Locked days preserve your task order.')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Day buttons - circular layout like repeat weekly */}
          <div className="flex flex-wrap justify-center gap-2">
            {DAYS.map(({ value, key }) => {
              const isLocked = selectedLockedDays.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleDay(value)}
                  className={cn(
                    "relative h-12 w-12 rounded-full border-2 font-bold text-sm transition-all duration-200",
                    "flex flex-col items-center justify-center gap-0.5",
                    isLocked
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-background border-muted-foreground/30 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <span className="text-xs uppercase">
                    {t(`gamePlan.lockOrder.days.${key}`).slice(0, 2)}
                  </span>
                  {isLocked && (
                    <Lock className="h-3 w-3" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Status summary */}
          <div className="space-y-2 text-sm">
            {selectedLockedDays.length > 0 && (
              <div className="flex items-center gap-2 text-primary">
                <Lock className="h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>{t('gamePlan.lockOrder.lockedLabel', 'Locked:')}</strong> {lockedDayLabels}
                </span>
              </div>
            )}
            {unlockedDays.length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Unlock className="h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>{t('gamePlan.lockOrder.unlockedLabel', 'Unlocked:')}</strong> {unlockedDayLabels}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
