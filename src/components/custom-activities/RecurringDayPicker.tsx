import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';

interface RecurringDayPickerProps {
  selectedDays: number[];
  onDaysChange: (days: number[]) => void;
  isActive: boolean;
  onActiveChange: (active: boolean) => void;
}

const DAYS = [
  { value: 0, key: 'sun' },
  { value: 1, key: 'mon' },
  { value: 2, key: 'tue' },
  { value: 3, key: 'wed' },
  { value: 4, key: 'thu' },
  { value: 5, key: 'fri' },
  { value: 6, key: 'sat' },
];

export function RecurringDayPicker({ 
  selectedDays, 
  onDaysChange, 
  isActive, 
  onActiveChange 
}: RecurringDayPickerProps) {
  const { t } = useTranslation();

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      onDaysChange(selectedDays.filter(d => d !== day));
    } else {
      onDaysChange([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" />
          <Label htmlFor="recurring-toggle" className="text-sm font-bold">
            {t('customActivity.recurring.title')}
          </Label>
        </div>
        <Switch
          id="recurring-toggle"
          checked={isActive}
          onCheckedChange={onActiveChange}
        />
      </div>

      {isActive && (
        <div className="flex flex-wrap gap-2">
          {DAYS.map(({ value, key }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleDay(value)}
              className={cn(
                "h-10 w-10 rounded-full font-bold text-sm transition-all duration-200",
                "border-2 hover:scale-105",
                selectedDays.includes(value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {t(`customActivity.recurring.days.${key}`)}
            </button>
          ))}
        </div>
      )}

      {isActive && selectedDays.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('customActivity.recurring.everyWeek', { 
            days: selectedDays
              .map(d => t(`customActivity.recurring.days.${DAYS[d].key}`))
              .join(', ')
          })}
        </p>
      )}
    </div>
  );
}
