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
 });
});