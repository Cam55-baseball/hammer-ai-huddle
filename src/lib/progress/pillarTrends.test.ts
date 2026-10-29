import { describe, it, expect } from 'vitest';
import { weeklyPoints,pillarTrends } from './pillarTrends';
import {projectMasterySources}from '@/lib/intelligence/masteryProjection';
describe('Recorded weekly trend projection', () => {
  it('plots all dated arm measurements separately by position, unit and source, without a combined Latest point',()=>{
    const p=projectMasterySources({throwing:[{id:'a',date:'2026-10-01',sport:'baseball',position:'infield',metric:'throw_velo_mph',value:80,unit:'mph',source:'Radar'},{id:'b',date:'2026-10-22',sport:'baseball',position:'infield',metric:'throw_velo_mph',value:84,unit:'mph',source:'Radar'},{id:'c',date:'2026-10-23',sport:'baseball',position:'outfield',metric:'throw_velo_mph',value:85,unit:'mph',source:'Radar'}],catching:[{id:'p',date:'2026-10-02',sport:'baseball',metric:'pop_time',value:2.1,unit:'seconds',source:'Timer'}],humanGrades:[{id:'g',date:'2026-09-04',sport:'baseball',position:'SS',source:'coach_evaluated',evaluator:'coach',arm:65}]},'baseball',null);
    const arm=pillarTrends(p).filter(s=>s.id==='arm'||s.id.startsWith('arm-'));
    expect(arm).toHaveLength(4);expect(arm.map(s=>s.unit).sort()).toEqual(['grade','mph','mph','seconds']);
    const velocity=arm.find(s=>s.title.includes('infield'));expect(velocity?.points.map(p=>[p.date,p.value])).toEqual([['2026-10-01',80],['2026-10-22',84]]);
    expect(arm.flatMap(s=>s.points).map(p=>p.date).sort()).toEqual(['2026-09-04','2026-10-01','2026-10-02','2026-10-22','2026-10-23']);
  });
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