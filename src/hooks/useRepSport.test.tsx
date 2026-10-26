import {act,renderHook,cleanup} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({insert:vi.fn(),fail:false}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'evaluator'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{
 const chain:Record<string,unknown>={};
 chain.insert=(row:unknown)=>{mock.insert(row);return chain;};chain.select=()=>chain;chain.in=()=>chain;
 chain.single=async()=>({data:mock.fail?null:{id:'rep'},error:mock.fail?new Error('write failed'):null});
 chain.then=(resolve:(v:unknown)=>void)=>Promise.resolve({data:[]}).then(resolve);return chain;
}}}));
import {useRecordThrowingRep} from './useThrowingReps';
import {useRecordCatchingRep} from './useCatchingReps';
afterEach(()=>{cleanup();vi.clearAllMocks();mock.fail=false;});
describe('measurement record sport provenance',()=>{
 for(const sport of ['baseball','softball'] as const){
  it(`throwing saves explicitly entered ${sport} with the exact measurement`,async()=>{
   const {result}=renderHook(()=>useRecordThrowingRep());
   await act(async()=>{await result.current.record({athleteId:'athlete',sport,positionContext:'infield',metric:'throw_velo_mph',value:95});});
   expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({sport,value:95,unit:'mph',recorded_by:'evaluator'}));
  });
  it(`catching saves explicitly entered ${sport} with the exact measurement`,async()=>{
   const {result}=renderHook(()=>useRecordCatchingRep());
   await act(async()=>{await result.current.record({athleteId:'athlete',sport,metric:'pop_time_sec',value:1.96});});
   expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({sport,value:1.96,unit:'sec'}));
  });
 }
 it('missing sport never writes an inferred sport',async()=>{
  const {result}=renderHook(()=>useRecordThrowingRep());
  await act(async()=>{await expect(result.current.record({athleteId:'athlete',sport:undefined as unknown as 'baseball',positionContext:'infield',metric:'throw_velo_mph',value:95})).rejects.toThrow('Select the sport');});
  expect(mock.insert).not.toHaveBeenCalled();
 });
 it('failed save stays failed and does not claim a record',async()=>{
  mock.fail=true;const {result}=renderHook(()=>useRecordCatchingRep());
  await act(async()=>{await expect(result.current.record({athleteId:'athlete',sport:'softball',metric:'pop_time_sec',value:1.96})).rejects.toThrow('write failed');});
  expect(result.current.saving).toBe(false);
 });
});