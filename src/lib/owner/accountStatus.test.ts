import { expect,it } from 'vitest';
import { accountStatus } from './accountStatus';
it('active player or staff payment is independent of training start',()=>{
  expect(accountStatus({id:'paid'},[{user_id:'paid',status:'active'}],new Set())).toEqual({paid:true,started:false,onboarded:false});
  expect(accountStatus({id:'paid'},[{user_id:'paid',status:'canceled'}],new Set())).toEqual({paid:false,started:false,onboarded:false});
});
it('explicit training start does not manufacture payment or onboarding',()=>{
  expect(accountStatus({id:'started',hammers_today_started_at:'2026-10-30'},[],new Set())).toEqual({paid:false,started:true,onboarded:false});
});
it('completed onboarding does not mean training has started',()=>{
  expect(accountStatus({id:'setup'},[],new Set(['setup']))).toEqual({paid:false,started:false,onboarded:true});
});