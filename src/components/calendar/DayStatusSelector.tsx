import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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

const BODY_REGIONS = [
  { value: 'arm', label: 'Arm' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'elbow', label: 'Elbow' },
  { value: 'back', label: 'Back' },
  { value: 'knee', label: 'Knee' },
  { value: 'ankle', label: 'Ankle' },
  { value: 'hip', label: 'Hip' },
  { value: 'hand_wrist', label: 'Hand/Wrist' },
  { value: 'head', label: 'Head' },
  { value: 'other', label: 'Other' },
];

export function DayStatusSelector({ date }: DayStatusSelectorProps) {
  const { entry, upsert, saving } = useDailyLog(date);
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<DayStatus | null>(null);
  const [injuryRegion, setInjuryRegion] = useState<string | undefined>();
  const [injuryDays, setInjuryDays] = useState<number>(7);

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
    const payload: any = {
      entry_date: date,
      day_status: pendingStatus,
      rest_reason: reason,
      injury_mode: pendingStatus === 'injury_hold',
    };
    if (pendingStatus === 'injury_hold') {
      if (injuryRegion) payload.injury_body_region = injuryRegion;
      payload.injury_expected_days = injuryDays;
    }
    await upsert(payload);
    setShowReasonPicker(false);
    setPendingStatus(null);
    setInjuryRegion(undefined);
    setInjuryDays(7);
  };

  if (showReasonPicker) {
    return (
      <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
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

        {/* Injury metadata fields */}
        {pendingStatus === 'injury_hold' && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Body Region</Label>
              <Select value={injuryRegion} onValueChange={setInjuryRegion}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {BODY_REGIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Expected Recovery: {injuryDays} days
              </Label>
              <Slider
                min={1} max={90} step={1}
                value={[injuryDays]}
                onValueChange={([v]) => setInjuryDays(v)}
              />
            </div>
          </div>
        )}

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
          {entry?.injury_body_region && (
            <Badge variant="outline" className="text-[10px] h-4">
              {BODY_REGIONS.find(r => r.value === entry.injury_body_region)?.label}
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
