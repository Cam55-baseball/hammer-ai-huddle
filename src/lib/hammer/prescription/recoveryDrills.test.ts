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
});