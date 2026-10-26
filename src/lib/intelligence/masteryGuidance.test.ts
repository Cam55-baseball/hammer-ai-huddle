import {describe,it,expect} from 'vitest';
import {masteryGuidance} from '../../../supabase/functions/_shared/wic/masteryGuidance';
const missing={contactStatus:'Need more data',contactSourceIds:[],speedStatus:'Need more data',powerStatus:'Need more data',leftPower:false,leftPowerGoal:false};
describe('academy guidance evidence boundaries',()=>{
 it('missing pillars cannot invent an overall weakest or attainable path',()=>{const r=masteryGuidance(missing);expect(r.observedFocus).toBeNull();expect(r.fullWeakestPillarKnown).toBe(false);expect(r.speedOrPower).toBe('Need more data');});
 it('below-standard contact requires actual window sources',()=>{expect(masteryGuidance({...missing,contactStatus:'Building'}).observedFocus).toBeNull();expect(masteryGuidance({...missing,contactStatus:'Building',contactSourceIds:['ab1']}).observedFocus).toBe('contact');});
 it.each(['speedStatus','powerStatus'] as const)('either elite %s satisfies the disjunction',(key)=>expect(masteryGuidance({...missing,[key]:'Elite'}).speedOrPower).toBe('Satisfied'));
 it('left power data or explicit starting power goal asks for steal mastery without authoring a session',()=>{expect(masteryGuidance({...missing,leftPower:true}).leftPowerStealEmphasis).toBe(true);expect(masteryGuidance({...missing,leftPowerGoal:true}).leftPowerStealEmphasis).toBe(true);expect(masteryGuidance(missing).leftPowerStealEmphasis).toBe(false);expect(masteryGuidance({...missing,leftPower:true})).not.toHaveProperty('dose');});
});