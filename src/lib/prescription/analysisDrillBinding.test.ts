import{describe,it,expect}from 'vitest';
import{ELITE_DRILL_CATALOG}from '@/data/drills/eliteDrillCatalog';
import{analysisDrillBinding}from './analysisDrillBinding';
import{practiceCheckDrills}from './practiceCheckDrills';
describe('analysis prescribed drill issue binding',()=>{
 it('every tagged practice-check selection binds to the same exact library issue',()=>{
  for(const category of ['hitting','pitching','throwing'])for(const sport of ['baseball','softball'])for(const drill of ELITE_DRILL_CATALOG.filter(d=>d.category===category&&d.sports.includes(sport as 'baseball'|'softball')))for(const key of drill.violationKeys){
   const checks=[{finding_tags:[key]}];const matches=practiceCheckDrills(checks,{module:category,sport});
   for(const m of matches)expect(analysisDrillBinding(m.drill,{practice_checks:checks},[])?.fault_key).toBe(key);
  }
 });
 it('explicit improvement keys bind without requiring an invented boolean finding',()=>{
  const d=ELITE_DRILL_CATALOG.find(d=>d.violationKeys.includes('early_shoulder_rotation'));if(!d)throw new Error('Missing catalog');
  expect(analysisDrillBinding(d,{improvements:[{fault_key:'early_shoulder_rotation'}]},[])?.issue_key).toBe('fault:early_shoulder_rotation');
  expect(analysisDrillBinding(d,{feedback:'early_shoulder_rotation',violations_detected:{early_shoulder_rotation:false}},[])).toBeNull();
 });
 it('goal picks bind to the saved goal, never a fake clip issue',()=>{
  const entry=ELITE_DRILL_CATALOG.find(d=>d.id==='elite.hit.hands_inside_short_bat');if(!entry)throw new Error('Missing catalog');
  const d={...entry,videoUrl:'https://example.test/existing-library.mp4'};
  expect(analysisDrillBinding(d,{},['Barrel control'])).toEqual({issue_key:'goal:Barrel control',fault_key:null,goal_label:'Barrel control'});
  expect(analysisDrillBinding({...d,sports:['softball']},{},['Barrel control'],[],'baseball')).toBeNull();
  expect(analysisDrillBinding({...d,sports:['softball']},{},['Barrel control'],[],'softball')?.goal_label).toBe('Barrel control');
 });
 it('certifies every fault-prescribable analysis drill binds each of its issues, in every sport it serves',()=>{
  const analysis=ELITE_DRILL_CATALOG.filter(d=>['hitting','pitching','throwing'].includes(d.category));
  let bound=0;
  for(const d of analysis)for(const sport of d.sports)for(const key of d.violationKeys){
   expect(analysisDrillBinding(d,{improvements:[{fault_key:key}]},[],[],sport)?.issue_key).toBe(`fault:${key}`);bound++;
  }
  expect(bound).toBeGreaterThan(0);
  // Drills with no declared issue can only bind to a saved goal, never an invented issue.
  for(const d of analysis.filter(d=>!d.violationKeys.length))expect(analysisDrillBinding(d,{improvements:[{fault_key:'early_shoulder_rotation'}]},[])).toBeNull();
 });
});
