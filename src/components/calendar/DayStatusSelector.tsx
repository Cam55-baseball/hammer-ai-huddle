import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useDailyLog,
  DAY_STATUS_OPTIONS,
  REST_REASON_OPTIONS,
  DayStatus,
  RestReason,
} from '@/hooks/useDailyLog';

interface DayStatusSelectorProps {
  date: string; // YYYY-MM-DD
}

export function DayStatusSelector({ date }: DayStatusSelectorProps) {
  const { entry, upsert, saving } = useDailyLog(date);
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<DayStatus | null>(null);

  const currentStatus = entry?.day_status as DayStatus | undefined;
  const needsReason = (s: DayStatus) =>
    ['voluntary_rest', 'travel_day', 'recovery_only', 'injury_hold'].includes(s);

  const handleStatusSelect = async (status: DayStatus) => {
    if (needsReason(status)) {
      setPendingStatus(status);
      setShowReasonPicker(true);
      return;
    }
    await upsert({ entry_date: date, day_status: status });
  };

  const handleReasonSelect = async (reason: RestReason) => {
    if (!pendingStatus) return;
    await upsert({
      entry_date: date,
      day_status: pendingStatus,
      rest_reason: reason,
      injury_mode: pendingStatus === 'injury_hold',
    });
    setShowReasonPicker(false);
    setPendingStatus(null);
  };

  if (showReasonPicker) {
    return (
      <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground">Why?</p>
        <div className="flex flex-wrap gap-1.5">
          {REST_REASON_OPTIONS.map(r => (
            <Button
              key={r.value}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              disabled={saving}
              onClick={() => handleReasonSelect(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => { setShowReasonPicker(false); setPendingStatus(null); }}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Current status display */}
      {currentStatus && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-sm">
            {DAY_STATUS_OPTIONS.find(o => o.value === currentStatus)?.icon}
          </span>
          <span className="text-xs font-medium">
            {DAY_STATUS_OPTIONS.find(o => o.value === currentStatus)?.label}
          </span>
          {entry?.rest_reason && (
            <Badge variant="outline" className="text-[10px] h-4">
              {REST_REASON_OPTIONS.find(r => r.value === entry.rest_reason)?.label}
            </Badge>
          )}
        </div>
      )}

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-1.5">
        {DAY_STATUS_OPTIONS.map(opt => (
          <Button
            key={opt.value}
            variant={currentStatus === opt.value ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'text-xs h-7 gap-1',
              currentStatus === opt.value && 'pointer-events-none'
            )}
            disabled={saving}
            onClick={() => handleStatusSelect(opt.value)}
          >
            <span>{opt.icon}</span>
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
