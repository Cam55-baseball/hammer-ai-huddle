import { recordedBuntOutcomes } from '../../../../supabase/functions/_shared/wic/buntingOutcomes';
import { validBuntOutcome, type BuntOutcome } from '../../../../supabase/functions/_shared/wic/buntingProgram';
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const HITS = new Set(['1B','2B','3B','HR','single','double','triple','home_run']);
const OUTS = new Set(['K','SO','strikeout','groundout','flyout','lineout','popout','out','GO','FO','LO','PO','FC','fielders_choice','ROE','error']);
const NON_AB = new Set(['BB','walk','HBP','hbp','SF','sac_fly','SAC','sac_bunt','catchers_interference']);
export interface BuntingEvidence { battingGames: {hits:number;atBats:number}[]; outcomes: BuntOutcome[]; sourceIds: string[] }
/** Caller supplies complete self/sport/date-scoped records. Unknown results never become outs. */
export function projectBuntingEvidence(sessions: readonly {id:string;module:string|null;drill_blocks:unknown;micro_layer_data:unknown}[],
  atBats: readonly {id:string;game_id:string;result:string|null}[], pitches: readonly {id:string;bunt_side:string|null;bunt_type:string|null;bunt_success:boolean|null}[], tasks: readonly {id:string;payload:unknown}[] = [], sport?:string): BuntingEvidence {
 const outcomes:BuntOutcome[]=[]; const sourceIds:string[]=[];
 for(const task of tasks){
  const payload=object(task.payload),bunt=object(payload.bunt),log=object(payload.log);
  if(!sport||payload.sport!==sport||payload.module!=='hitting')continue;
  const rounds=Array.isArray(log.rounds)?log.rounds:[];
  const rows=rounds.map(value=>{const row=object(value);return {side:bunt.side,type:bunt.type,attempts:row.attempts,successes:row.successes};});
  const valid=rows.filter((v):v is BuntOutcome=>validBuntOutcome(v as BuntOutcome));
  if(valid.length){outcomes.push(...valid);sourceIds.push(`task:${task.id}`);}
 }
 for(const session of sessions){
  if(!['bunting','hitting'].includes(session.module ?? ''))continue;
  // Blocks are the canonical aggregation; reps are a legacy fallback, never counted twice.
  const blocks=Array.isArray(session.drill_blocks)?session.drill_blocks:[];
  const entries=blocks.flatMap(b=>Array.isArray(object(b).bunt_outcomes)?object(b).bunt_outcomes as unknown[]:[]);
  const valid=entries.filter((v):v is BuntOutcome=>validBuntOutcome(object(v) as BuntOutcome));
  const reps=Array.isArray(session.micro_layer_data)?session.micro_layer_data.map(v=>object(v)):[];
  const recorded=entries.length?valid:recordedBuntOutcomes(reps);
  if(recorded.length){outcomes.push(...recorded);sourceIds.push(`performance:${session.id}`);}
 }
 for(const pitch of pitches){
  const recorded=recordedBuntOutcomes([{batter_side:pitch.bunt_side ?? undefined,bunt_type:pitch.bunt_type ?? undefined,bunt_success:pitch.bunt_success ?? undefined}]);
  if(recorded.length){outcomes.push(...recorded);sourceIds.push(`pitch:${pitch.id}`);}
 }
 const games=new Map<string,{hits:number;atBats:number;unknown:boolean}>();
 for(const ab of atBats){
  const game=games.get(ab.game_id)??{hits:0,atBats:0,unknown:false};const result=ab.result??'';
  if(HITS.has(result)){game.hits++;game.atBats++;}else if(OUTS.has(result))game.atBats++;else if(!NON_AB.has(result))game.unknown=true;
  games.set(ab.game_id,game);sourceIds.push(`ab:${ab.id}`);
 }
 return {outcomes,sourceIds:[...new Set(sourceIds)],battingGames:[...games.values()].filter(g=>!g.unknown&&g.atBats>0).map(({hits,atBats})=>({hits,atBats}))};
}