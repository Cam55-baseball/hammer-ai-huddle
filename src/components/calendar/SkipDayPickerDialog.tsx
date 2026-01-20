import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

interface SkipDayPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemTitle: string;
  currentSkipDays: number[];
  onSave: (skipDays: number[]) => Promise<boolean>;
}

const DAYS = [
  { value: 0, labelKey: 'Sun' },
  { value: 1, labelKey: 'Mon' },
  { value: 2, labelKey: 'Tue' },
  { value: 3, labelKey: 'Wed' },
  { value: 4, labelKey: 'Thu' },
  { value: 5, labelKey: 'Fri' },
  { value: 6, labelKey: 'Sat' },
];

export function SkipDayPickerDialog({
  open,
  onOpenChange,
  itemTitle,
  currentSkipDays,
  onSave,
}: SkipDayPickerDialogProps) {
  const { t } = useTranslation();
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  // Initialize selected days when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDays([...currentSkipDays]);
    }
  }, [open, currentSkipDays]);

  const toggleDay = (dayValue: number) => {
    setSelectedDays(prev => 
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue].sort((a, b) => a - b)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await onSave(selectedDays);
    setSaving(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedDays([...currentSkipDays]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {t('calendar.skip.title', 'Skip Activity')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{itemTitle}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('calendar.skip.selectDays', 'Select days to skip:')}
          </p>
          
          <div className="flex flex-wrap gap-2 justify-center">
            {DAYS.map(day => (
              <Toggle
                key={day.value}
                pressed={selectedDays.includes(day.value)}
                onPressedChange={() => toggleDay(day.value)}
                className={cn(
                  "w-12 h-12 text-sm font-medium rounded-lg transition-all",
                  "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                  "data-[state=off]:bg-muted data-[state=off]:text-muted-foreground",
                  "hover:bg-accent"
                )}
                aria-label={t(`calendar.days.${day.labelKey.toLowerCase()}`, day.labelKey)}
              >
                {t(`calendar.days.${day.labelKey.toLowerCase()}Short`, day.labelKey.slice(0, 2))}
              </Toggle>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            {t('calendar.skip.description', 'This will hide the item on selected days until you change it.')}
          </p>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving 
              ? t('common.saving', 'Saving...') 
              : t('calendar.skip.save', 'Save Skip')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
