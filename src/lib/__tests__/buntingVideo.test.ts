import {describe,it,expect} from 'vitest';
import {buntStudyKeys,buntingVideoTags,exactBuntVideos} from '../buntingVideo';
import type {RecommendResult} from '../videoRecommendationEngine';
describe('bunt study from entered outcomes',()=>{
 it('unknown/clean outcomes never become a struggle signal',()=>{
  expect(buntStudyKeys({side:'R',type:'drag',sourceAttempts:0,sourceSuccesses:0})).toEqual([]);
  expect(buntStudyKeys({side:'R',type:'drag',sourceAttempts:7,sourceSuccesses:7})).toEqual([]);
  expect(buntStudyKeys({side:'L',type:'drag',sourceAttempts:7,sourceSuccesses:3})).toEqual(['bunt_l_drag','bunt_fundamentals']);
 });
 it('includes all twelve exact side/type identities plus fundamentals',()=>{expect(buntingVideoTags()).toHaveLength(13);expect(new Set(buntingVideoTags().map(t=>t.key)).size).toBe(13);});
 it('rejects other-side and unrelated assigned videos even if ranked highly',()=>{
  const row=(id:string,tag:string,tier='normal')=>({video:{id,assignments:[{tag_id:tag,weight:1}],distribution_tier:tier}} as RecommendResult);
  const exact=row('match','right');
  expect(exactBuntVideos([row('other','left'),row('blocked','right','blocked'),exact],['bunt_r_drag'],new Map([['bunt_r_drag','right'],['bunt_l_drag','left']]))).toEqual([exact]);
 });
});