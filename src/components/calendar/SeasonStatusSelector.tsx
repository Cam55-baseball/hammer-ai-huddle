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

const PHASE_CONFIG: {
  value: SeasonStatus;
  label: string;
  startKey: 'preseason_start_date' | 'in_season_start_date' | 'post_season_start_date';
  endKey: 'preseason_end_date' | 'in_season_end_date' | 'post_season_end_date';
}[] = [
  { value: 'preseason', label: 'Pre-Season', startKey: 'preseason_start_date', endKey: 'preseason_end_date' },
  { value: 'in_season', label: 'In-Season', startKey: 'in_season_start_date', endKey: 'in_season_end_date' },
  { value: 'post_season', label: 'Post-Season', startKey: 'post_season_start_date', endKey: 'post_season_end_date' },
];

export function SeasonStatusSelector() {
  const {
    seasonStatus, isLoading, updateSeasonStatus,
    preseasonStartDate, preseasonEndDate,
    inSeasonStartDate, inSeasonEndDate,
    postSeasonStartDate, postSeasonEndDate,
  } = useSeasonStatus();
  const [showDates, setShowDates] = useState(false);

  if (isLoading) return null;

  const dateMap: Record<string, string | null> = {
    preseason_start_date: preseasonStartDate,
    preseason_end_date: preseasonEndDate,
    in_season_start_date: inSeasonStartDate,
    in_season_end_date: inSeasonEndDate,
    post_season_start_date: postSeasonStartDate,
    post_season_end_date: postSeasonEndDate,
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

        <div className="flex rounded-lg border border-border overflow-hidden">
          {SEASON_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateSeasonStatus({ season_status: opt.value })}
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

        {showDates && (
          <div className="space-y-3">
            {PHASE_CONFIG.map(phase => {
              const isActive = seasonStatus === phase.value;
              const startVal = dateMap[phase.startKey];
              const endVal = dateMap[phase.endKey];
              const startDate = startVal ? new Date(startVal + 'T00:00:00') : undefined;
              const endDate = endVal ? new Date(endVal + 'T00:00:00') : undefined;

              return (
                <div
                  key={phase.value}
                  className={cn(
                    'rounded-lg border p-3 space-y-2',
                    isActive ? 'border-primary/50 bg-primary/5' : 'border-border/30'
                  )}
                >
                  <span className={cn('text-xs font-semibold', isActive ? 'text-primary' : 'text-muted-foreground')}>
                    {phase.label}
                    {isActive && <span className="ml-1.5 text-[10px] font-normal">(active)</span>}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <DateField
                      label="Start"
                      value={startDate}
                      onChange={(d) => updateSeasonStatus({ [phase.startKey]: d ? format(d, 'yyyy-MM-dd') : null })}
                    />
                    <DateField
                      label="End"
                      value={endDate}
                      onChange={(d) => updateSeasonStatus({ [phase.endKey]: d ? format(d, 'yyyy-MM-dd') : null })}
                    />
                  </div>
                </div>
              );
            })}
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
