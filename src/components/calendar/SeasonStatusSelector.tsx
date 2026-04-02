import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSeasonStatus, SeasonStatus } from '@/hooks/useSeasonStatus';
import { cn } from '@/lib/utils';

const SEASON_OPTIONS: { value: SeasonStatus; label: string }[] = [
  { value: 'preseason', label: 'Pre-Season' },
  { value: 'in_season', label: 'In-Season' },
  { value: 'post_season', label: 'Post-Season' },
];

export function SeasonStatusSelector() {
  const { seasonStatus, seasonStartDate, seasonEndDate, isLoading, updateSeasonStatus } = useSeasonStatus();
  const [showDates, setShowDates] = useState(!!(seasonStartDate || seasonEndDate));

  if (isLoading) return null;

  const startDate = seasonStartDate ? new Date(seasonStartDate + 'T00:00:00') : undefined;
  const endDate = seasonEndDate ? new Date(seasonEndDate + 'T00:00:00') : undefined;

  const handleStatusChange = (status: SeasonStatus) => {
    updateSeasonStatus({ season_status: status });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    updateSeasonStatus({
      season_start_date: date ? format(date, 'yyyy-MM-dd') : null,
    });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    updateSeasonStatus({
      season_end_date: date ? format(date, 'yyyy-MM-dd') : null,
    });
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Season Phase</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setShowDates(prev => !prev)}
          >
            Dates {showDates ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
          </Button>
        </div>

        {/* Toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {SEASON_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleStatusChange(opt.value)}
              className={cn(
                'flex-1 px-3 py-2 text-xs font-medium transition-all',
                seasonStatus === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/20 hover:bg-muted text-muted-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Date pickers */}
        {showDates && (
          <div className="grid grid-cols-2 gap-2">
            <DateField label="Start" value={startDate} onChange={handleStartDateChange} />
            <DateField label="End" value={endDate} onChange={handleEndDateChange} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DateField({ label, value, onChange }: { label: string; value?: Date; onChange: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left text-xs font-normal h-9',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
          {value ? format(value, 'MMM d, yyyy') : `${label} Date`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}
