import { isoShift } from '../schedule/timeline.ts';
import { gamePitchLoads } from './gamePitchLoad.ts';

/** Caller is the athlete's JWT client. Unavailable/truncated safety history fails closed. */
export async function readPlanningArmHistory(db:any,userId:string,date:string,sport:string) {
  const complete=(r:any,limit:number)=>{if(r.error)throw r.error;if(!Array.isArray(r.data)||r.data.length>=limit)throw new Error('Complete arm history unavailable');return r.data;};
  const [arm,logs,games,saved]=await Promise.all([
    db.from('arm_ledger_entries').select('entry_date,source,throw_type,count,status,game_id,game_sport').eq('user_id',userId).gte('entry_date',isoShift(date,-730)).lte('entry_date',date).limit(5000),
    db.from('wk_session_logs').select('plan_date,movement_slug,metrics').eq('user_id',userId).gte('plan_date',isoShift(date,-365)).lte('plan_date',date).in('movement_slug',['bullpen_pitching','pitching_outing']).limit(1000),
    db.from('gp_games').select('id,user_id,game_date,sport,pitch_count,status,deleted_at,ignored_for_training,is_starting_pitcher').eq('user_id',userId).eq('sport',sport).is('deleted_at',null).or('ignored_for_training.is.null,ignored_for_training.eq.false').gte('game_date',isoShift(date,-365)).lte('game_date',date).in('status',['completed','final']).limit(1000),
    db.from('athlete_plan_snapshots').select('plan_date,payload').eq('user_id',userId).eq('sport',sport).gte('plan_date',isoShift(date,-6)).lt('plan_date',date).limit(20),
  ]);
  const rows=complete(arm,5000);const gameRows=complete(games,1000);
  // Reconcile exact game identities below, never add their projection twice.
  const result=rows.filter((r:any)=>!r.game_id && r.throw_type !== 'game_pitches_self');
  for(const log of complete(logs,1000)) {
    const rounds=log.metrics?.rounds;
    if(!Array.isArray(rounds))continue;
    const count=rounds.reduce((n:number,r:any)=>n+(typeof r.pitches==='number'&&r.pitches>0?r.pitches:0),0);
    if(count>0)result.push({entry_date:log.plan_date,source:'pitching',throw_type:'mound_pitch',count,status:'done'});
  }
  if(gameRows.length){
    const pitches=complete(await db.from('gp_pitches').select('game_id').eq('user_id',userId).eq('perspective','pitcher').in('game_id',gameRows.map((g:any)=>g.id)).limit(5000),5000);
    for(const game of gamePitchLoads(gameRows,pitches,userId,sport)) result.push({entry_date:game.date,source:'pitching',throw_type:'game_pitches_self',count:game.count,status:'done',game_id:game.game_id,game_sport:sport});
  }
  // Prior planned arm work reserves a budget, but never claims an actual outing.
  for(const snapshot of complete(saved,20)){
    const actual=result.filter(r=>r.entry_date===snapshot.plan_date&&r.status!=='planned');
    const blocks=snapshot.payload?.blocks;
    if(!Array.isArray(blocks))continue;
    for(const block of blocks)for(const drill of block.drills??[]){
      const event=drill.armEvent;
      if(block.status!=='ready'||!event||!(event.count>0))continue;
      const type=event.kind==='pitch'?'mound_pitch':event.kind==='warmup'?'catch_play':event.intent==='high'?'quick_release':'position_throws';
      if(actual.some(r=>r.throw_type===type))continue;
      result.push({entry_date:snapshot.plan_date,source:event.kind==='pitch'?'pitching':'position',throw_type:event.kind==='pitch'?'mound_pitch':event.kind==='warmup'?'catch_play':event.intent==='high'?'quick_release':'position_throws',count:event.count,status:'planned'});
    }
  }
  return {rows:result};
}