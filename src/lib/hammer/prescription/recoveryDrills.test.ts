import { describe, expect, it } from 'vitest';
import { recoveryDrills } from './recoveryDrills';

describe('recovery work, not untracked reminders', () => {
  it('contains only two timed activities rather than hydration/wake or injury-note check-offs', () => {
    expect(recoveryDrills(false).map(row => row.dosage)).toEqual(['10 min focus areas', '5 min']);
    expect(recoveryDrills(false)).toHaveLength(2);
  });
  it('preserves the existing elevated recovery targets', () => {
    expect(recoveryDrills(true).map(row => row.dosage)).toEqual(['15 min full body', '10 min']);
  });
  it('keeps each existing safety stop in its expanded instructions', () => {
    for (const elevated of [false, true]) {
      for (const row of recoveryDrills(elevated)) {
        expect(row.guide?.stopIf).toBe(row.stopIf);
        expect(row.guide?.stopIf?.length).toBeGreaterThan(0);
      }
    }
  });
});