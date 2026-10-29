import { describe, it, expect } from 'vitest';
import { applyAnalysisDrillRotation, analysisDrillSlot, analysisOwnerEligible,enrolledDrill, type AnalysisDrillEnrollment } from '../analysisDrillRotation';
import {rowToDrills,type OwnerDrillRow}from '../ownerDrills';
import type { PrescribedBlock } from '@/lib/hammer/prescription/dailyPlan';
import { ELITE_DRILL_CATALOG } from '@/data/drills/eliteDrillCatalog';
import { analysisDrillSafety } from '../../../../supabase/functions/_shared/planSwap/analysisDrillSafety';

const drill = ELITE_DRILL_CATALOG.find(d=>d.category==='hitting' && d.violationKeys.includes('early_shoulder_rotation'));
if (!drill) throw new Error('Canonical hitting drill required');
const enrollment:AnalysisDrillEnrollment={sport:'baseball',category:'hitting',drill_id:drill.id,video_id:'clip1',issue_key:'fault:early_shoulder_rotation',fault_key:'early_shoulder_rotation',goal_label:null,observed_at:'2026-10-28T10:00:00Z',created_at:'2026-10-29T10:00:00Z'};
const block:PrescribedBlock={modality:'hitting',title:'Hitting',why:'Saved work',roadmapReason:'Saved work',phase:'build',status:'ready',durationMin:10,route:'/practice?module=hitting',drills:[{name:'Prep',dosage:'8 swings',stage:'prep'},{name:'Original drill',dosage:'20 swings',stage:'drills'},{name:'Full go',dosage:'15 swings',stage:'full_go'}],steps:[],because:[],gamePlanTemplate:null,cues:[],stopRules:[],ctaLabel:'Open',missing:[],missingContextKeys:[]};
const rotate=(clips: Parameters<typeof applyAnalysisDrillRotation>[0]['clips']=[],blocks=[block])=>applyAnalysisDrillRotation({blocks,enrollments:[enrollment],catalog:[drill],sport:'baseball',equipment:drill.equipment,clips});
describe('analysis Add to Today and exact fix-it rotation',()=>{
 it('retains exact chosen drill in own category with existing 20-swing dose',()=>{const next=rotate()[0];expect(next.drills[1].slug).toBe(drill.id);expect(next.drills[1].dosage).toBe('20 swings');expect(next.drills).toHaveLength(3);expect(next.drills[0]).toEqual(block.drills[0]);expect(next.drills[2]).toEqual(block.drills[2]);});
 it('preserves original stage and stop instruction in an atomic replacement payload',()=>{expect(enrolledDrill({...block.drills[1],stopIf:'Pain — stop'},drill,enrollment)).toMatchObject({stage:'drills',dosage:'20 swings',stopIf:'Pain — stop',routineRole:'fix_it'});});
 it('never replaces owner, prep, full-go or log work',()=>{expect(analysisDrillSlot([{...block.drills[1],ownerDrillId:'owner'},{...block.drills[1],prescriptionOrigin:'owner'},block.drills[0],block.drills[2],{name:'Log',dosage:'5',stage:'log'}])).toBe(-1);});
 it('never replaces catalog execution scenario work',()=>{expect(analysisDrillSlot([{...block.drills[1],executionKind:'fielding_read_rep'}])).toBe(-1);});
 it('does not open a suppressed card',()=>{expect(rotate([],[{...block,status:'suppressed'}])[0]).toEqual({...block,status:'suppressed'});});
 it('does not borrow another sport or category',()=>{expect(applyAnalysisDrillRotation({blocks:[block],enrollments:[{...enrollment,sport:'softball'}],catalog:[drill],sport:'baseball',equipment:drill.equipment,clips:[]})[0]).toEqual(block);});
 it('two genuine newer clean clips move the issue out of the fix-it slot',()=>{expect(rotate([{video_id:'clean1',module:'hitting',created_at:'2026-10-29T10:00:00Z',violations:{early_shoulder_rotation:false}},{video_id:'clean2',module:'hitting',created_at:'2026-10-30T10:00:00Z',violations:{early_shoulder_rotation:false}}])[0]).toEqual(block);});
 it('missing clip answers do not count as learned',()=>{expect(rotate([{video_id:'missing',module:'hitting',created_at:'2026-10-29T10:00:00Z',violations:{}}])[0].drills[1].slug).toBe(drill.id);});
});
describe('analysis owner drill retains existing placement eligibility',()=>{
 const row:OwnerDrillRow={id:'owner',overrides_drill_id:null,placements:['analysis:baseball:hitting','hammers_today:skill'],sports:['baseball'],name:'Owner drill',fault_keys:['early_shoulder_rotation'],phase:null,level:'feel',dosage:'3 x 6',setup:'Stand balanced',steps:[],cue:'Hold balance',feel:null,feel_wrong:null,common_mistake:null,equipment:['tee'],video_url:null,active:true,pinned:false,created_at:'2026-10-29'};
 it('accepts only complete declared placement with actual gear',()=>{const [d]=rowToDrills(row);expect(analysisOwnerEligible(d,[row],'baseball',['tee'],'2026-10-30')).toBe(true);expect(analysisOwnerEligible(d,[row],'baseball',[],'2026-10-30')).toBe(false);expect(analysisOwnerEligible(d,[{...row,placements:['analysis:baseball:hitting']}],'baseball',['tee'],'2026-10-30')).toBe(false);});
});
const safetyFacts={profile:{dob:'2005-03-01',hammers_today_started_at:'2026-10-29'},context:{sport_primary:'baseball',injury_history:null},gear:[{equipment:drill.equipment}],memory:[],settings:{season_status:'off_season'},logs:[],games:[],calendar:[],arm:[],readiness:[]};
describe('existing safety judge for athlete action',()=>{
 it('does not clear an injury on acknowledgement',()=>{expect(()=>analysisDrillSafety({...drill,sport:'baseball'},block,{...safetyFacts,logs:[{injury_mode:true}]},'2026-10-29')).toThrow(/injury/);});
 it('never adds physical training on Sunday',()=>{expect(()=>analysisDrillSafety({...drill,sport:'baseball'},block,safetyFacts,'2026-11-01')).toThrow(/rest day/);});
 it('missing check-in warnings require the exact current dated acknowledgement',()=>{const result=analysisDrillSafety({...drill,sport:'baseball',progression_level:4,intensity:'standard'},block,safetyFacts,'2026-10-29');expect(result.warnings).toHaveLength(1);expect(result.acknowledged([])).toBe(false);expect(result.acknowledged(result.keys)).toBe(true);expect(result.acknowledged(['old warning'])).toBe(false);});
});