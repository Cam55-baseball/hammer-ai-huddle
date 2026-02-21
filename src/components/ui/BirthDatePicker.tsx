import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BirthDatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function BirthDatePicker({ value, onChange, disabled, readOnly, placeholder = 'Select your date of birth', className }: BirthDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const currentYear = new Date().getFullYear();
  const years = React.useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear; y >= 1920; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  const [viewMonth, setViewMonth] = React.useState<Date>(
    value ?? new Date(currentYear - 20, 0, 1)
  );

  // Sync viewMonth when value changes externally
  React.useEffect(() => {
    if (value) setViewMonth(value);
  }, [value]);

  if (readOnly) {
    return (
      <div className={cn('flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border', className)}>
        <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm">
          {value ? format(value, 'MMMM d, yyyy') : 'Not set'}
        </span>
        <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">Cannot be changed</span>
      </div>
    );
  }

  const handleYearChange = (yearStr: string) => {
    const y = parseInt(yearStr);
    setViewMonth(new Date(y, viewMonth.getMonth(), 1));
  };

  const handleMonthChange = (monthStr: string) => {
    const m = parseInt(monthStr);
    setViewMonth(new Date(viewMonth.getFullYear(), m, 1));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'MMMM d, yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Year + Month dropdowns */}
        <div className="flex gap-2 p-3 pb-0">
          <Select value={viewMonth.getMonth().toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="flex-1 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={viewMonth.getFullYear().toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[90px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => { onChange(d); setOpen(false); }}
          month={viewMonth}
          onMonthChange={setViewMonth}
          disabled={(date) => date > new Date() || date < new Date('1920-01-01')}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}
