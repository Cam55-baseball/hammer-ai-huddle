import { describe, expect, it } from 'vitest';
import { baserunningSummary } from '../baserunningSummary';

describe('logged steal success evidence', () => {
  it('has no percentage without attempts', () => {
    expect(baserunningSummary([]).stealPct).toBeNull();
    expect(baserunningSummary([{ event_type: 'advance', success: true }]).stealPct).toBeNull();
  });
  it('does not turn unentered results into failures', () => {
    const summary = baserunningSummary([{ event_type: 'steal', success: null }, { event_type: 'steal' }]);
    expect(summary.steals).toBe(2);
    expect(summary.knownResults).toBe(0);
    expect(summary.missingResults).toBe(2);
    expect(summary.stealPct).toBeNull();
  });
  it('uses only entered results as its denominator', () => {
    const summary = baserunningSummary([
      { event_type: 'steal', success: true }, { event_type: 'steal', success: false },
      { event_type: 'steal', success: null }, { event_type: 'tag_up', success: true },
    ]);
    expect(summary.stealPct).toBe(50);
    expect(summary.knownResults).toBe(2);
    expect(summary.missingResults).toBe(1);
  });
  it('preserves a real zero and marks small samples as early', () => {
    const summary = baserunningSummary([{ event_type: 'steal', success: false }]);
    expect(summary.stealPct).toBe(0);
    expect(summary.earlyRead).toBe(true);
  });
  it('ends the early-read label at ten entered results, not ten entries', () => {
    const known = Array.from({ length: 9 }, () => ({ event_type: 'steal', success: true }));
    expect(baserunningSummary([...known, { event_type: 'steal', success: null }]).earlyRead).toBe(true);
    expect(baserunningSummary([...known, { event_type: 'steal', success: false }]).earlyRead).toBe(false);
  });
});