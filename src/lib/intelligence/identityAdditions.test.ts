import {describe,expect,it} from 'vitest';
import {judgePitching,startingStandards,type PitchingCounts} from '../../../supabase/functions/_shared/wic/masteryPitchingStandards';
import {reactionEquivalentMph,weightedPracticeWhiff,whiffWeight} from '../../../supabase/functions/_shared/wic/practiceDifficulty';
import {naturalFirstStrategy,nutritionFocus,isSafeForMinor} from '../../../supabase/functions/_shared/wic/goals/naturalFirst';
const elite:PitchingCounts={battersFaced:100,strikeouts:36,walks:4,hits:15,homeRuns:1,atBatsAgainst:90,outs:81,runs:5,earnedRuns:2,pitches:360,firstPitchStrikes:70,
 twoBallBatters:25,innings:27,scoringPosInnings:5,runnersInScoringPos:6,runnersOn:19,runnersStranded:16,ballsInPlay:60,softContact:20,swings:200,whiffs:60,
 stolenBases:0,stealAttempts:1,pickoffs:1,pickoffAttempts:3,timeToPlateS:[1.25,1.28],pfpChances:10,pfpErrors:0};
describe('pitching starting standards',()=>{
 it('baseball levels differ only in K%/BB%',()=>{
  const v=(l:any)=>Object.fromEntries(startingStandards('baseball',l).map(s=>[s.key,s.value]));
  expect(v('pro').k_pct).toBe(.30);expect(v('college').k_pct).toBe(.32);expect(v('high_school').bb_pct).toBe(.05);expect(v('college').bb_pct).toBe(.055);
  expect(v('college').whip).toBe(1);expect(v('pro').time_to_plate_s).toBe(1.3);
 });
 it('softball is separate: per-7, no time to plate, HS K/7 12',()=>{
  const s=startingStandards('softball','college').map(x=>x.key);expect(s).toContain('k_per_7');expect(s).not.toContain('time_to_plate_s');
  expect(startingStandards('softball','high_school').find(x=>x.key==='k_per_7')?.value).toBe(12);
 });
 it('elite baseball window passes every stat',()=>{expect(judgePitching(elite,'baseball','pro').status).toBe('Elite');});
 it('one failing stat = Building; HS needs 35% K',()=>{expect(judgePitching(elite,'baseball','high_school').status).toBe('Building');});
 it('missing inputs read Need more data and are never zero-filled',()=>{
  const r=judgePitching({...elite,timeToPlateS:null},'baseball','pro');expect(r.status).toBe('Need more data');
  expect(r.parts.find(p=>p.key==='time_to_plate_s')?.status).toBe('Need more data');
 });
 it('owner override edits a starting standard',()=>{expect(judgePitching(elite,'baseball','high_school',{baseball_high_school_k_pct:.36}).parts.find(p=>p.key==='k_pct')?.standard).toBe(.36);});
 it('softball per-7 math',()=>{const r=judgePitching({...elite,strikeouts:40,walks:3},'softball','college');expect(r.stats?.k_per_7).toBeCloseTo(40/27*7);});
 it('unknown level never judged',()=>{expect(judgePitching(elite,'baseball',null).status).toBe('Need more data');});
});
describe('practice whiff difficulty',()=>{
 it('owner weights',()=>{
  const s={sport:'baseball' as const,mph:null,releaseFt:null,mix:null,swings:10,whiffs:1};
  expect(whiffWeight({...s,type:'tee'})).toBe(1);expect(whiffWeight({...s,type:'coach_bp'})).toBe(.8);expect(whiffWeight({...s,type:'live_ab'})).toBe(.3);
  expect(whiffWeight({...s,type:'machine',mix:'mixed'})).toBe(.4);expect(whiffWeight({...s,type:'machine',mix:'fastballs',mph:70,releaseFt:60.5})).toBe(.6);
  expect(whiffWeight({...s,type:'machine',mix:'fastballs',mph:60,releaseFt:40})).toBe(.4);
  expect(whiffWeight({...s,type:'machine',mix:'fastballs'})).toBeNull();
 });
 it('reaction equivalent is labeled an estimate',()=>{const r=reactionEquivalentMph({sport:'softball',mph:60,releaseFt:43});expect(r?.mph).toBe(60);expect(r?.label).toMatch(/estimate/);});
 it('weighted rate never overrides game identity',()=>{const r=weightedPracticeWhiff([{type:'tee',sport:'baseball',mph:null,releaseFt:null,mix:null,swings:10,whiffs:2},{type:'live_bp',sport:'baseball',mph:null,releaseFt:null,mix:null,swings:10,whiffs:5}]);
  expect(r.rate).toBeCloseTo((2+1.5)/20);expect(r.overridesGameIdentity).toBe(false);});
});
describe('secure what is natural first',()=>{
 it('power cusp + speed goal → power primary, speed keeps 30%',()=>{
  const s=naturalFirstStrategy({chosen:'speed',age:20,pillars:[{pillar:'power',grade:60,elite:false},{pillar:'speed',grade:40,elite:false}]});
  expect(s.mode).toBe('secure_natural');expect(s.primary).toBe('power');expect(s.goalShare).toBeGreaterThanOrEqual(.3);expect(s.message).toMatch(/securing your power first/);
 });
 it('nothing close → goal-first',()=>{expect(naturalFirstStrategy({chosen:'speed',age:20,pillars:[{pillar:'power',grade:45,elite:false},{pillar:'speed',grade:40,elite:false}]}).primary).toBe('speed');});
 it('near pillar reaches elite → switch to goal, maintain elite',()=>{
  const s=naturalFirstStrategy({chosen:'speed',age:20,pillars:[{pillar:'power',grade:65,elite:true},{pillar:'speed',grade:40,elite:false}]});
  expect(s.primary).toBe('speed');expect(s.maintain).toContain('power');
 });
 it('heavier slow player on several cusps → power first',()=>{
  expect(naturalFirstStrategy({chosen:'speed',age:20,bodyMassTrend:'heavier',pillars:[{pillar:'defense',grade:60,elite:false},{pillar:'power',grade:55,elite:false},{pillar:'speed',grade:35,elite:false}]}).primary).toBe('power');
 });
 it('unknown pillars are never assumed near',()=>{expect(naturalFirstStrategy({chosen:'speed',age:20,pillars:[{pillar:'power',elite:null}]}).mode).toBe('goal_first');});
 it('minors never get weight loss guidance and get the parent line',()=>{
  for(const p of ['power','speed','contact'] as const){const l=nutritionFocus(p,15);expect(l.every(isSafeForMinor)).toBe(true);expect(l.join(' ')).toMatch(/parent or professional/);}
  expect(nutritionFocus('speed',null).join(' ')).toMatch(/parent/);expect(isSafeForMinor('try a calorie deficit')).toBe(false);
 });
});
