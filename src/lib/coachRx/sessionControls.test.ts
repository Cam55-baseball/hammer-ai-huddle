import { describe,it,expect } from 'vitest';
import { activityControl, sessionExempt, type SessionControl } from './sessionControls';
import { dayFullyDone } from '@/components/hammer/cards/dayCompletion';
const c:SessionControl={id:'decision',athlete_id:'player',actor_id:'coach',actor_name:'Jordan',plan_date:'2026-10-31',sport:'baseball',task_id:'hitting:tee',side:'L',source:'block_drill',source_ref:'hitting',target_name:'Tee',card_title:'Hitting',mode:'allow',reason:'',created_at:'2026-10-31T14:00:00Z',skipped_at:null};
describe('dated coach skip decisions',()=>{
 it('permission alone does not exempt or complete work',()=>expect(sessionExempt(c)).toBe(false));
 it('the player choosing an allowed skip exempts it',()=>expect(sessionExempt({...c,skipped_at:'2026-10-31T14:10:00Z'})).toBe(true));
 it('mandatory removal exempts work without a player action',()=>expect(sessionExempt({...c,mode:'remove'})).toBe(true));
 it('left permission never authorizes right or an unrelated activity',()=>{expect(activityControl([c],c.task_id,'R')).toBeUndefined();expect(activityControl([c],'hitting:other','L')).toBeUndefined();});
 it('remaining completed work and exempt cards count as a fully completed day',()=>expect(dayFullyDone([{done:2,total:2},{done:0,total:0}],{morning:true,night:true,preLift:true,requiresPreLift:true})).toBe(true));
 it('exempt work never bypasses remaining work or check-ins',()=>{expect(dayFullyDone([{done:1,total:2},{done:0,total:0}],{morning:true,night:true,preLift:true,requiresPreLift:true})).toBe(false);expect(dayFullyDone([{done:0,total:0}],{morning:false,night:true,preLift:true,requiresPreLift:true})).toBe(false);});
});