import {describe,it,expect} from 'vitest';
import {gamePitchLoads, type ArmGame} from '../../supabase/functions/_shared/wic/pitching/gamePitchLoad';
import {resolveOutingFacts} from '../../supabase/functions/_shared/wic/pitching/outingFacts';
import {equivalentsByDay} from '../../supabase/functions/_shared/wic/phases/nextThrowDate';
const g:ArmGame={id:'game',user_id:'test',sport:'baseball',game_date:'2026-11-17',status:'final',pitch_count:40};
describe('saved outing arm lineage',()=>{
 it('40 entered pitches count once even with 10 detailed pitches and duplicate game rows',()=>expect(gamePitchLoads([g,g],Array.from({length:10},()=>({game_id:g.id})),'test','baseball')).toEqual([{game_id:'game',date:'2026-11-17',count:40,isStart:false}]));
 it('more detailed throws cannot disappear under a smaller aggregate',()=>expect(gamePitchLoads([g],Array.from({length:41},()=>({game_id:g.id})),'test','baseball')[0]?.count).toBe(41));
 it('ignores foreign athlete, sport, deleted, ignored and unplayed games',()=>{
  const variants=[{...g,user_id:'other'},{...g,sport:'softball'},{...g,deleted_at:'2026-11-18'},{...g,ignored_for_training:true},{...g,status:'scheduled'}];
  for(const row of variants)expect(gamePitchLoads([row],[],'test','baseball')).toEqual([]);
 });
 it('the saved game triggers next-day recovery without inventing a start',()=>{
  const facts=resolveOutingFacts({planDate:'2026-11-18',settings:null,outings:[],availability:[],games:gamePitchLoads([g],[],'test','baseball')});
  expect(facts.pitchedYesterday).toBe(true);expect(facts.thrownDates).toEqual(['2026-11-17']);expect(facts.startsToday).toBe(false);
 });
 it('two-way pitches and position throws consume one shared total',()=>expect(equivalentsByDay([{entry_date:g.game_date,source:'pitching',throw_type:'game_pitches_self',count:40,status:'done'},{entry_date:g.game_date,source:'position',throw_type:'position_throws',count:10,status:'done'}]).get(g.game_date)).toBe(46));
});