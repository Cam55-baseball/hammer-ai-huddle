import { describe, it, expect } from 'vitest';
import { weeklyPoints } from './pillarTrends';
describe('Recorded weekly trend projection', () => {
  it('does not turn missing evidence into a zero or an extra sample', () => {
    const rows=weeklyPoints([{label:'A',value:40,date:'2026-10-19',source:'TEST'},{label:'B',value:null,date:'2026-10-20',source:'TEST'},{label:'C',value:60,date:'2026-10-21',source:'TEST'}]);
    expect(rows).toHaveLength(1);expect(rows[0].value).toBe(50);expect(rows[0].sample).toBe(2);
  });
  it('keeps different weeks separate and sorted',()=>{
    const rows=weeklyPoints([{label:'B',value:60,date:'2026-10-27',source:'TEST'},{label:'A',value:40,date:'2026-10-20',source:'TEST'}]);
    expect(rows.map(r=>r.value)).toEqual([40,60]);expect(rows.map(r=>r.date)).toEqual(['Week of 2026-10-19','Week of 2026-10-26']);
  });
  it('places completed opportunity windows in the week they closed',()=>{
    expect(weeklyPoints([{label:'AB 100',value:.3,date:'2026-10-01–2026-10-28',source:'TEST'}])[0].date).toBe('Week of 2026-10-26');
  });
});