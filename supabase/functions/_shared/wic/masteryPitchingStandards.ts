/** Owner pitching starting standards (Oct 26). Baseball and softball are judged separately; every
 * value is an owner-editable "starting standard". A stat whose inputs are missing reads "Need more data"
 * and is never filled in. */
import type {MasteryLevel,MasteryStatus} from './masteryStandards.ts';
export type PitchSport='baseball'|'softball';
export type Dir='min'|'max';
export interface Standard {key:StatKey;dir:Dir;value:number}
export type StatKey='k_pct'|'bb_pct'|'k_bb'|'k_minus_bb_pct'|'first_pitch_strike_pct'|'two_ball_pct'|'pitches_per_batter'|'whip'|'opp_avg'|'runs_per_game'|'hr_per_9'|'k_per_7'|'bb_per_7'|'era'|'scoring_pos_inning_pct'|'risp_per_game'|'strand_rate'|'soft_contact_pct'|'whiff_pct'|'sb_per_game'|'opp_sb_success_pct'|'pickoffs'|'time_to_plate_s'|'pfp_clean_pct';
/** Per-window counts. null = not recorded; never assumed to be zero. */
export interface PitchingCounts {
 battersFaced:number;strikeouts:number|null;walks:number|null;hits:number|null;homeRuns:number|null;atBatsAgainst:number|null;
 outs:number|null;runs:number|null;earnedRuns:number|null;pitches:number|null;firstPitchStrikes:number|null;twoBallBatters:number|null;
 innings:number|null;scoringPosInnings:number|null;runnersInScoringPos:number|null;runnersOn:number|null;runnersStranded:number|null;
 ballsInPlay:number|null;softContact:number|null;swings:number|null;whiffs:number|null;
 stolenBases:number|null;stealAttempts:number|null;pickoffs:number|null;pickoffAttempts:number|null;timeToPlateS:readonly number[]|null;
 pfpChances:number|null;pfpErrors:number|null;
}
const div=(a:number|null,b:number|null)=>a==null||b==null||b<=0?null:a/b;
export function pitchingStats(c:PitchingCounts,sport:PitchSport):Partial<Record<StatKey,number|null>>{
 const ip=c.outs==null?null:c.outs/3;const g=sport==='baseball'?9:7;const perG=(n:number|null)=>{const r=div(n,ip);return r==null?null:r*g;};
 const s:Partial<Record<StatKey,number|null>>={
  k_pct:div(c.strikeouts,c.battersFaced),bb_pct:div(c.walks,c.battersFaced),k_bb:div(c.strikeouts,c.walks),
  k_minus_bb_pct:c.strikeouts==null||c.walks==null||c.battersFaced<=0?null:(c.strikeouts-c.walks)/c.battersFaced,
  first_pitch_strike_pct:div(c.firstPitchStrikes,c.battersFaced),two_ball_pct:div(c.twoBallBatters,c.battersFaced),pitches_per_batter:div(c.pitches,c.battersFaced),
  whip:c.walks==null||c.hits==null?null:div(c.walks+c.hits,ip),opp_avg:div(c.hits,c.atBatsAgainst),runs_per_game:perG(c.runs),
  scoring_pos_inning_pct:div(c.scoringPosInnings,c.innings),risp_per_game:perG(c.runnersInScoringPos),strand_rate:div(c.runnersStranded,c.runnersOn),
  soft_contact_pct:div(c.softContact,c.ballsInPlay),whiff_pct:div(c.whiffs,c.swings),sb_per_game:perG(c.stolenBases),pickoffs:c.pickoffs,
  pfp_clean_pct:c.pfpErrors==null?null:div(c.pfpChances==null?null:c.pfpChances-c.pfpErrors,c.pfpChances),
 };
 if(sport==='baseball'){s.hr_per_9=perG(c.homeRuns);s.opp_sb_success_pct=div(c.stolenBases,c.stealAttempts);
  s.time_to_plate_s=c.timeToPlateS&&c.timeToPlateS.length?c.timeToPlateS.reduce((a,b)=>a+b,0)/c.timeToPlateS.length:null;}
 else{s.k_per_7=perG(c.strikeouts);s.bb_per_7=perG(c.walks);s.era=perG(c.earnedRuns);}
 return s;
}
const base:Standard[]=[{key:'k_bb',dir:'min',value:5},{key:'first_pitch_strike_pct',dir:'min',value:.67},{key:'two_ball_pct',dir:'max',value:.30},{key:'whip',dir:'max',value:1.00},
 {key:'opp_avg',dir:'max',value:.200},{key:'soft_contact_pct',dir:'min',value:.25},{key:'scoring_pos_inning_pct',dir:'max',value:.25},{key:'sb_per_game',dir:'max',value:.2},
 {key:'opp_sb_success_pct',dir:'max',value:.60},{key:'time_to_plate_s',dir:'max',value:1.30},{key:'pfp_clean_pct',dir:'min',value:.98}];
const bbKB:Record<MasteryLevel,[number,number]>={pro:[.30,.06],college:[.32,.055],high_school:[.35,.05],youth:[.35,.05]};
const sbBase:Standard[]=[{key:'k_bb',dir:'min',value:6},{key:'whip',dir:'max',value:.85},{key:'opp_avg',dir:'max',value:.170},{key:'era',dir:'max',value:1.25},
 {key:'two_ball_pct',dir:'max',value:.30},{key:'scoring_pos_inning_pct',dir:'max',value:.20},{key:'sb_per_game',dir:'max',value:.3},{key:'pfp_clean_pct',dir:'min',value:.98}];
/** Default starting standards; the Coaching Console overrides any value by `${sport}_${level}_${key}`. */
export function startingStandards(sport:PitchSport,level:MasteryLevel,overrides:Record<string,number|null|undefined>={}):Standard[]{
 let list:Standard[];
 if(sport==='baseball'){const [k,bb]=bbKB[level];list=[{key:'k_pct',dir:'min',value:k},{key:'bb_pct',dir:'max',value:bb},...base];}
 else{const hs=level==='high_school'||level==='youth';list=[{key:'k_per_7',dir:'min',value:hs?12:10},{key:'bb_per_7',dir:'max',value:hs?1.2:1.5},...sbBase];}
 return list.map(s=>{const o=overrides[`${sport}_${level}_${s.key}`];return typeof o==='number'&&Number.isFinite(o)?{...s,value:o}:s;});
}
export interface StatJudgement {key:StatKey;value:number|null;standard:number;dir:Dir;status:MasteryStatus;distancePct:number|null}
export function judgePitching(c:PitchingCounts,sport:PitchSport,level:MasteryLevel|null,overrides:Record<string,number|null|undefined>={}){
 if(!level)return {status:'Need more data' as MasteryStatus,parts:[] as StatJudgement[],reason:'Competition level is unknown.'};
 const stats=pitchingStats(c,sport);
 const parts=startingStandards(sport,level,overrides).map(s=>{const v=stats[s.key]??null;
  const pass=v==null?null:s.dir==='min'?v>=s.value:v<=s.value;
  const distancePct=v==null?null:pass?0:s.dir==='min'?(s.value-v)/s.value:(v-s.value)/s.value;
  return {key:s.key,value:v,standard:s.value,dir:s.dir,status:(pass==null?'Need more data':pass?'Elite':'Building') as MasteryStatus,distancePct};});
 const status:MasteryStatus=parts.some(p=>p.status==='Building')?'Building':parts.every(p=>p.status==='Elite')?'Elite':'Need more data';
 return {status,parts,stats,reason:'Source: completed batters-faced window · starting standard (owner-editable).'};
}
