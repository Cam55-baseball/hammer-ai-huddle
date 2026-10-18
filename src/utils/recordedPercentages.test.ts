import { describe, expect, it } from 'vitest';
import { recordedChange, recordedRate } from './recordedPercentages';

describe('recorded percentages preserve missing data', () => {
  it('does not claim 0% completion without activities', () => {
    expect(recordedRate(0, 0)).toBeNull();
  });
  it('keeps genuine completion rates', () => {
    expect(recordedRate(0, 4)).toBe(0);
    expect(recordedRate(3, 4)).toBe(75);
  });
  it('does not claim change against zero or absent baseline', () => {
    expect(recordedChange(0, 0)).toBeNull();
    expect(recordedChange(20, 0)).toBeNull();
    expect(recordedChange(20, null)).toBeNull();
  });
  it('does not interpret an unlogged today as a decrease', () => {
    expect(recordedChange(undefined, 20)).toBeNull();
    expect(recordedChange(null, 20)).toBeNull();
  });
  it('keeps signed changes and genuine recorded zero', () => {
    expect(recordedChange(0, 20)).toBe(-100);
    expect(recordedChange(30, 20)).toBe(50);
    expect(recordedChange(10, 20)).toBe(-50);
    expect(recordedChange(20, 20)).toBe(0);
  });
  it('rejects invalid numbers', () => {
    expect(recordedChange(NaN, 20)).toBeNull();
    expect(recordedChange(20, Infinity)).toBeNull();
    expect(recordedRate(5, 4)).toBeNull();
  });
});