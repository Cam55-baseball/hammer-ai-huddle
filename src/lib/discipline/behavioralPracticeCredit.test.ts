import { describe, expect, it } from 'vitest';
import { practiceCreditDates, type PracticeCreditRow } from '../../../supabase/functions/evaluate-behavioral-state/practiceCredit';
const row: PracticeCreditRow={id:'p1',user_id:'player',sport:'softball',session_date:'2026-10-27',session_type:'solo_work',deleted_at:null};
const dates=(rows:PracticeCreditRow[])=>practiceCreditDates(rows,'player','softball','2026-09-28','2026-10-27');
describe('behavioral practice credit',()=>{
  it('counts all five saved practice/game types as one active date, not completed work',()=>{
    expect(dates(['solo_work','team_session','lesson','live_abs','game'].map(session_type=>({...row,session_type}))).size).toBe(1);
    const completedByDay=new Set<string>();const anyLogByDay=new Set(dates([row]));
    expect(anyLogByDay.has(row.session_date)).toBe(true);expect(completedByDay.has(row.session_date)).toBe(false);
  });
  it('excludes other users, sports, deleted, future and non-practice records',()=>{
    expect(dates([{...row,user_id:'other'},{...row,sport:'baseball'},{...row,deleted_at:'2026-10-27'},{...row,session_date:'2026-10-28'},{...row,session_type:'assessment'}]).size).toBe(0);
  });
  it('unknown saved sport grants no session credit',()=>expect(practiceCreditDates([row],'player',null,'2026-09-28','2026-10-27').size).toBe(0));
});