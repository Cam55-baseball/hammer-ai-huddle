import {BUNT_TYPES,BUNT_WORDING,type BuntSide,type BuntType} from '../../supabase/functions/_shared/wic/buntingProgram';
import type {RecommendResult} from './videoRecommendationEngine';
export const buntVideoKey=(side:BuntSide,type:BuntType)=>`bunt_${side.toLowerCase()}_${type}`;
export const buntingVideoTags=()=>[
 {key:'bunt_fundamentals',label:'Bunting fundamentals'},
 ...(['R','L'] as const).flatMap(side=>BUNT_TYPES.map(type=>({key:buntVideoKey(side,type),label:`${side==='R'?'Right-handed':'Left-handed'}: ${BUNT_WORDING[side][type]}`}))),
];
/** Suggest study only for explicit unsuccessful same-side/type outcomes, not missing data. */
export function buntStudyKeys(bunt:{side:BuntSide;type:BuntType;sourceAttempts:number;sourceSuccesses:number}){
 return Number.isInteger(bunt.sourceAttempts)&&bunt.sourceAttempts>0&&Number.isInteger(bunt.sourceSuccesses)&&bunt.sourceSuccesses>=0&&bunt.sourceSuccesses<bunt.sourceAttempts
  ?[buntVideoKey(bunt.side,bunt.type),'bunt_fundamentals']:[];
}
/** Existing engine may rank many videos; show only an exact requested tag/fundamentals match. */
export function exactBuntVideos(results:readonly RecommendResult[], keys:readonly string[], tagIds:ReadonlyMap<string,string>){
 const ids=new Set(keys.map(k=>tagIds.get(k)).filter((id):id is string=>!!id));
 return results.filter(r=>r.video.distribution_tier!=='blocked'&&r.video.assignments.some(a=>ids.has(a.tag_id))).slice(0,1);
}