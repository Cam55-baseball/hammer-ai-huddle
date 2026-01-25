import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockDayPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedDays: number[]; // Currently locked days (0-6)
  onSave: (daysToLock: number[]) => Promise<void>;
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

export function LockDayPickerDialog({
  open,
  onOpenChange,
  lockedDays,
  onSave,
}: LockDayPickerDialogProps) {
  const { t } = useTranslation();
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const prevOpenRef = useRef(false);

  // Initialize with EMPTY array when dialog opens - only new days can be selected
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Dialog just opened - start with empty selection (locked days are disabled)
      setSelectedDays([]);
    }
    prevOpenRef.current = open;
  }, [open, lockedDays]);

  const toggleDay = (day: number) => {
    // Prevent toggling already-locked days
    if (lockedDays.includes(day)) return;
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      onOpenChange(false);
      return;
    }
    
    setSaving(true);
    try {
      await onSave(selectedDays);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedDays([]);
    onOpenChange(false);
  };

  // Get display labels for selected days (new locks only)
  const selectedDayLabels = selectedDays
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map(d => t(`gamePlan.lockOrder.days.${DAYS.find(day => day.value === d)?.key}`))
    .join(', ');

  // Get display labels for already locked days
  const lockedDayLabels = lockedDays
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map(d => t(`gamePlan.lockOrder.days.${DAYS.find(day => day.value === d)?.key}`))
    .join(', ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t('gamePlan.lockOrder.lockForDays', 'Lock Order for Days')}
          </DialogTitle>
          <DialogDescription>
            {t('gamePlan.lockOrder.lockForDaysDescription', 'Select which days should use your current schedule. This will save your task order, times, and reminders.')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Day buttons - circular layout like repeat weekly */}
          <div className="flex flex-wrap justify-center gap-2">
            {DAYS.map(({ value, key }) => {
              const isSelected = selectedDays.includes(value);
              const isAlreadyLocked = lockedDays.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleDay(value)}
                  disabled={isAlreadyLocked}
                  className={cn(
                    "relative h-12 w-12 rounded-full border-2 font-bold text-sm transition-all duration-200",
                    "flex flex-col items-center justify-center gap-0.5",
                    isAlreadyLocked
                      ? "bg-muted/50 border-muted-foreground/20 text-muted-foreground cursor-not-allowed opacity-60"
                      : isSelected
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-background border-muted-foreground/30 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <span className="text-xs uppercase">
                    {t(`gamePlan.lockOrder.days.${key}`).slice(0, 2)}
                  </span>
                  {(isAlreadyLocked || isSelected) && (
                    <Lock className="h-3 w-3" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Status summary - Two sections */}
          <div className="space-y-2 text-sm">
            {/* Section 1: Currently Locked (read-only) */}
            {lockedDays.length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>{t('gamePlan.lockOrder.currentlyLocked', 'Currently Locked:')}</strong> {lockedDayLabels}
                </span>
              </div>
            )}
            
            {/* Section 2: Will Lock (user selection) */}
            {selectedDays.length > 0 ? (
              <div className="flex items-center gap-2 text-primary">
                <Lock className="h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>{t('gamePlan.lockOrder.willLock', 'Will Lock:')}</strong> {selectedDayLabels}
                </span>
              </div>
            ) : (
              <div className="text-muted-foreground text-center">
                {t('gamePlan.lockOrder.selectDaysToLock', 'Select days to lock your current schedule')}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving || selectedDays.length === 0}>
            {saving ? t('common.saving', 'Saving...') : t('gamePlan.lockOrder.lockDays', 'Lock Days')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
