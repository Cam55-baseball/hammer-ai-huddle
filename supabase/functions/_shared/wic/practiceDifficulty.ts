/** Owner practice swing-and-miss weights (Oct 26). Practice never overrides game identity windows. */
export type PracticeType='tee'|'soft_toss'|'front_toss'|'coach_bp'|'machine'|'live_bp'|'live_ab';
export interface PracticeSession {type:PracticeType;sport:'baseball'|'softball';mph:number|null;releaseFt:number|null;mix:'fastballs'|'mixed'|null;swings:number;whiffs:number}
export const STANDARD_DISTANCE_FT={baseball:60.5,softball:43} as const;
/** Machine speed at or above this reaction-equivalent mph counts as high velocity (starting standard). */
export const HIGH_VELO_MPH={baseball:85,softball:65} as const;
/** mph × standard distance ÷ actual release distance — a difficulty ESTIMATE, not a measurement. */
export function reactionEquivalentMph(s:Pick<PracticeSession,'mph'|'releaseFt'|'sport'>){
 if(s.mph==null||s.releaseFt==null||s.releaseFt<=0||s.mph<=0)return null;
 return {mph:s.mph*STANDARD_DISTANCE_FT[s.sport]/s.releaseFt,label:'Difficulty estimate, not a measurement'};
}
export function whiffWeight(s:PracticeSession):number|null{
 if(s.type==='tee'||s.type==='soft_toss')return 1.0;
 if(s.type==='front_toss'||s.type==='coach_bp')return .8;
 if(s.type==='live_bp'||s.type==='live_ab')return .3;
 if(s.mix==null)return null;
 if(s.mix==='mixed')return .4;
 const eq=reactionEquivalentMph(s);if(!eq)return null;
 return eq.mph>=HIGH_VELO_MPH[s.sport]?.4:.6;
}
/** Weighted practice whiff rate for reports/learning/plan focus. Unknown sessions are skipped and counted. */
export function weightedPracticeWhiff(sessions:readonly PracticeSession[]){
 let w=0,swings=0,skipped=0;
 for(const s of sessions){const k=whiffWeight(s);if(k==null||s.swings<=0){skipped++;continue;}w+=s.whiffs*k;swings+=s.swings;}
 return {rate:swings?w/swings:null,swings,skipped,overridesGameIdentity:false as const};
}
