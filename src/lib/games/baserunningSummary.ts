import { recordedRate } from '@/utils/recordedPercentages';
import { MIN_TREND_SAMPLE } from './reportEngine';

export interface BaserunningEvent {
  event_type?: string | null;
  success?: boolean | null;
}

export function baserunningSummary(rows: BaserunningEvent[]) {
  const steals = rows.filter(row => row.event_type === 'steal');
  const known = steals.filter(row => typeof row.success === 'boolean');
  const rate = recordedRate(known.filter(row => row.success === true).length, known.length);
  return {
    total: rows.length,
    steals: steals.length,
    knownResults: known.length,
    missingResults: steals.length - known.length,
    stealPct: rate == null ? null : Math.round(rate),
    earlyRead: known.length > 0 && known.length < MIN_TREND_SAMPLE,
  };
}