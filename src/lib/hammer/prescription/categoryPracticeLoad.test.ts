import { describe, expect, it } from 'vitest';
import { categoryPracticeLoads, type PracticeLoadRecord } from './categoryPracticeLoad';
const row = (id: string, date: string, category = 'hitting', sport = 'baseball'): PracticeLoadRecord => ({ id, date, category, sport, minutes: 40, intensity: 8 });
describe('same-category actual practice load', () => {
  it('3 consecutive practice days ending yesterday is heavy in that category only', () => {
    const result = categoryPracticeLoads([row('1','2026-10-19'),row('2','2026-10-18'),row('3','2026-10-17'),row('4','2026-10-19','fielding')], '2026-10-20','baseball');
    expect(result.map(r => [r.category,r.heavyStretch,r.consecutiveDays])).toEqual([['hitting',true,3],['fielding',false,1]]);
  });
  it('sums only actual minutes and intensity, never supplies missing values', () => {
    const result = categoryPracticeLoads([row('1','2026-10-19'),{...row('2','2026-10-18'),minutes:null,intensity:null}], '2026-10-20','baseball');
    expect(result[0]).toMatchObject({minutes:40,intensityMinutes:320,missingMinutes:1,missingIntensity:1});
  });
  it('never borrows another sport, unknown category, future, deleted or duplicate record', () => {
    const result = categoryPracticeLoads([row('1','2026-10-19'),row('1','2026-10-19'),row('2','2026-10-19','pitching','softball'),row('3','bad'),row('4','2026-10-20'),{...row('5','2026-10-19'),deleted:true},row('6','2026-10-19','strength')], '2026-10-20','baseball');
    expect(result.map(r => [r.category,r.sessions,r.minutes])).toEqual([['hitting',1,40]]);
  });
  it('three sessions on one day are not three consecutive practice days', () => {
    expect(categoryPracticeLoads([row('1','2026-10-19'),row('2','2026-10-19'),row('3','2026-10-19')], '2026-10-20','baseball')[0]?.heavyStretch).toBe(false);
  });
  it('an older three-day stretch expires rather than reducing an unrelated next day', () => {
    expect(categoryPracticeLoads([row('1','2026-10-18'),row('2','2026-10-17'),row('3','2026-10-16')], '2026-10-20','baseball')[0]?.heavyStretch).toBe(false);
  });
});