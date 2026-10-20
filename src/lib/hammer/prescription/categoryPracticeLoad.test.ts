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
  for (const sport of ['baseball', 'softball']) {
    it(`${sport}: conflicting copies cannot invent load, a streak, or restore a deleted session in either order`, () => {
      const original = row('conflict', '2026-10-19', 'hitting', sport);
      const alternatives = [
        { ...original, minutes: 80 }, { ...original, intensity: 10 },
        { ...original, date: '2026-10-18' }, { ...original, category: 'fielding' },
        { ...original, sport: sport === 'baseball' ? 'softball' : 'baseball' },
        { ...original, deleted: true },
      ];
      for (const alternative of alternatives) for (const copies of [[original, alternative], [alternative, original]]) {
        const result = categoryPracticeLoads([...copies, row('known', '2026-10-18', 'hitting', sport)], '2026-10-20', sport);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ sessions: 1, minutes: 40, intensityMinutes: 320, consecutiveDays: 0, heavyStretch: false, sourceIds: ['known'] });
      }
    });
  }
  it('blank identities cannot supply load and identical repeated reads count once', () => {
    const original = row('known', '2026-10-19');
    expect(categoryPracticeLoads([row(' ', '2026-10-19'), original, { ...original }], '2026-10-20', 'baseball')[0])
      .toMatchObject({ sessions: 1, minutes: 40, intensityMinutes: 320, sourceIds: ['known'] });
  });
  it('an older three-day stretch expires rather than reducing an unrelated next day', () => {
    expect(categoryPracticeLoads([row('1','2026-10-18'),row('2','2026-10-17'),row('3','2026-10-16')], '2026-10-20','baseball')[0]?.heavyStretch).toBe(false);
  });
  for (const sport of ['baseball','softball']) {
    it(`${sport}: eight weeks keep category totals isolated and clear the streak after a rest day`, () => {
      const records: PracticeLoadRecord[] = [];
      for (let n=0;n<56;n++) {
        const date = new Date('2026-06-01T12:00:00Z'); date.setUTCDate(date.getUTCDate()+n);
        const today = date.toISOString().slice(0,10);
        const load = categoryPracticeLoads(records,today,sport);
        if (n % 7 === 3) {
          expect(load.find(r=>r.category==='hitting')?.heavyStretch).toBe(true);
          expect(load.some(r=>r.category==='throwing')).toBe(false);
        }
        if (n % 7 === 4) expect(load.find(r=>r.category==='hitting')?.heavyStretch).toBe(false);
        if (n % 7 < 3) records.push(row(String(n),today,'hitting',sport));
      }
    });
  }
});