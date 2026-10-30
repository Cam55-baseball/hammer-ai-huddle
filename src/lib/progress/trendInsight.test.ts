import { describe, it, expect } from 'vitest';
import { trendInsight, plainSeriesTitle, emptyPillars } from './trendInsight';

const pt = (value: number | null, date: string) => ({ label: date, value, date, source: 'Test', sample: 1 });

describe('General trend cards (Item C)', () => {
  it('says Need more data with one record and shows no graph', () => {
    const r = trendInsight({ id: 'speed', title: 'Speed · x', unit: 'grade', points: [pt(40, '2026-01-01')] })!;
    expect(r.howSure).toBe('need_more_data');
    expect(r.showChart).toBe(false);
  });
  it('two records are only a Hunch', () => {
    expect(trendInsight({ id: 'speed', title: 'Speed', unit: 'grade', points: [pt(40, '2026-01-01'), pt(45, '2026-02-01')] })!.howSure).toBe('hunch');
  });
  it('three recorded results are Measured, and higher grade is better', () => {
    const r = trendInsight({ id: 'speed', title: 'Speed', unit: 'grade', points: [pt(40, 'a'), pt(42, 'b'), pt(50, 'c')] })!;
    expect(r.howSure).toBe('measured');
    expect(r.direction).toBe('better');
  });
  it('a lower pop time is better', () => {
    expect(trendInsight({ id: 'arm-x', title: 'Arm · Catcher Pop Time · C', unit: 's', points: [pt(2.1, 'a'), pt(2.0, 'b'), pt(1.95, 'c')] })!.direction).toBe('better');
  });
  it('nothing recorded makes no card, and is listed once', () => {
    const s = { id: 'contact', title: 'Contact', unit: 'batting average', points: [pt(null, 'a')] };
    expect(trendInsight(s)).toBeNull();
    expect(emptyPillars([s, s])).toEqual(['Contact']);
  });
  it('turns raw test keys into plain words', () => {
    expect(plainSeriesTitle('Speed · Entered performance test · hitting · ten_yard_dash')).toBe('Speed · 10-yard dash');
  });
});
