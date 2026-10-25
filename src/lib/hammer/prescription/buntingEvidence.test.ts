import {describe,it,expect} from 'vitest';
import {projectBuntingEvidence} from './buntingEvidence';
describe('canonical bunting evidence',()=>{
 it('reads actual Today attempts/successes only for the saved sport, never prescribed or unknown successes',()=>{
  const payload={sport:'baseball',module:'hitting',bunt:{side:'L',type:'drag',attempts:20},log:{rounds:[{attempts:7,successes:0},{attempts:10,successes:null}]}};
  expect(projectBuntingEvidence([],[],[],[{id:'t',payload}],'baseball').outcomes).toEqual([{side:'L',type:'drag',attempts:7,successes:0}]);
  expect(projectBuntingEvidence([],[],[],[{id:'t',payload}],'softball').outcomes).toEqual([]);
 });
 it('does not double-count block outcomes and saved reps',()=>{
  const result=projectBuntingEvidence([{id:'s',module:'bunting',drill_blocks:[{bunt_outcomes:[{side:'R',type:'drag',attempts:7,successes:3}]}],micro_layer_data:[{batter_side:'R',bunt_type:'drag',bunt_success:true}]}],[],[]);
  expect(result.outcomes).toEqual([{side:'R',type:'drag',attempts:7,successes:3}]);
 });
 it('unknown games are excluded instead of counted as hitless and unknown success never scales',()=>{
  const result=projectBuntingEvidence([], [{id:'1',game_id:'a',result:'single'},{id:'2',game_id:'a',result:'K'},{id:'3',game_id:'b',result:null}], [{id:'p',bunt_side:'R',bunt_type:'drag',bunt_success:null}]);
  expect(result.battingGames).toEqual([{hits:1,atBats:2}]);expect(result.outcomes).toEqual([]);
 });
 it('preserves explicit false and excludes another skill session',()=>{
  const result=projectBuntingEvidence([{id:'s',module:'pitching',drill_blocks:[{bunt_outcomes:[{side:'R',type:'drag',attempts:7,successes:3}]}],micro_layer_data:[]}],[],[{id:'p',bunt_side:'L',bunt_type:'drag',bunt_success:false}]);
  expect(result.outcomes).toEqual([{side:'L',type:'drag',attempts:1,successes:0}]);
 });
});