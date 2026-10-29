import {describe,it,expect} from 'vitest';
import {savedTrendGoals} from './savedTrendGoals';
describe('Saved goals on The General',()=>{
  it('keeps all saved legacy categories rather than only hitting',()=>{
    const rows=savedTrendGoals({version:1,goals:[{category:'speed',intent:'max_velocity',rank:1},{category:'hitting',intent:'contact_hitting',rank:2},{category:'power',rank:3},{category:'throwing',rank:4},{category:'fielding',rank:5}]},'baseball');
    expect(rows.some(r=>r.module==='speed')).toBe(true);
  });
  it('does not inherit goals from the other sport',()=>{
    expect(savedTrendGoals({version:2,baseball:{position:{hitting:[{id:'barrel_control',rank:'primary'}]}},updatedAt:'2026-10-29'},'softball')).toEqual([]);
  });
});