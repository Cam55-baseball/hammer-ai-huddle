import { describe, expect, it } from 'vitest';
import { playerWeekCards, weekDates, type WeekDay } from './playerWeek';
const base = ():WeekDay => ({date:'2026-10-30',plan:{state:'ok',blocks:[]},restDay:false,prescriptions:[],logs:[],tasks:[],coachWorkouts:[]});
const rx = {id:'rx1',slot:'lift',movement_name:'Squat',movement_slug:'squat',sets:3,reps:5,status:'planned',replaced_by_coach_rx:null,dosage_unit:'reps'};
describe('canonical player week',()=>{
  it('shows exactly Monday through Sunday with previous and next weeks',()=>{
    expect(weekDates('2026-10-31')).toEqual(['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
    expect(weekDates('2026-10-31',1)[0]).toBe('2026-11-02');
    expect(weekDates('2026-10-31',-1)[0]).toBe('2026-10-19');
  });
  it('marks a partly logged exercise partial rather than done',()=>{
    const d=base();d.prescriptions=[rx];d.logs=[{id:'l',prescription_id:'rx1',plan_date:d.date,movement_slug:'squat',sets_completed:1,reps_completed:[5],total_reps_completed:5,duration_seconds_precise:null,duration_seconds_completed:null,distance_feet_completed:null}];
    expect(playerWeekCards(d)[0].status).toBe('partial');
    expect(playerWeekCards(d)[0].activities[0].results[0]).toContain('Sets: 1');
  });
  it('does not attribute another prescription log by matching name or slug',()=>{
    const d=base();d.prescriptions=[rx];d.logs=[{id:'l',prescription_id:'other',plan_date:d.date,movement_slug:'squat',sets_completed:3,reps_completed:[5,5,5],total_reps_completed:15,duration_seconds_precise:null,duration_seconds_completed:null,distance_feet_completed:null}];
    expect(playerWeekCards(d)[0].status).toBe('not_done');
  });
  it('preserves explicit skipped activity without calling it missed',()=>{const d=base();d.prescriptions=[{...rx,status:'skipped'}];expect(playerWeekCards(d)[0].status).toBe('skipped');});
  it('keeps replaced coach work removed rather than not done',()=>{const d=base();d.prescriptions=[{...rx,replaced_by_coach_rx:'coach'}];expect(playerWeekCards(d)[0].status).toBe('removed');});
  it('uses the saved partial outcome even when the checklist is complete',()=>{
    const d=base();d.plan.blocks=[{modality:'hitting',title:'Hitting',status:'ready',durationMin:10,because:[],roadmapReason:'',drills:[{name:'Tee work',dosage:'3 × 5',stage:null,cue:null}]}];d.tasks=[{task_id:'hitting:tee-work',side:null,completed:true,outcome:'cut_short',name:'Tee work',dosage:'3 × 5',log:{rounds:[{reps:5}],fields:[{key:'reps',label:'Reps',unit:null}]}}];
    expect(playerWeekCards(d)[0].status).toBe('partial');expect(playerWeekCards(d)[0].activities[0].results).toEqual(['Set 1: Reps: 5']);
  });
  it('missing plan never invents cards or completion',()=>{const d=base();d.plan={state:'unavailable'};expect(playerWeekCards(d)).toEqual([]);});
  it('keeps coach exercises in their original sent card without duplicate slot cards',()=>{const d=base();d.prescriptions=[{...rx,coach_rx:'coach1'}];d.coachWorkouts=[{id:'coach1',title:'Coach strength',category:'lift',status:'added',cancelled_at:null,exercises:[]}];expect(playerWeekCards(d).map(c=>c.title)).toEqual(['Coach strength']);});
  it('joins an unambiguous saved exercise to its prescription and does not duplicate it',()=>{const d=base();d.prescriptions=[rx];d.plan.blocks=[{modality:'strength',title:'Strength',status:'ready',durationMin:10,because:[],roadmapReason:'',drills:[{name:'Squat',slug:'squat',dosage:'3 × 5',stage:null,cue:null}]}];expect(playerWeekCards(d)).toHaveLength(1);expect(playerWeekCards(d)[0].activities[0].id).toBe('rx1');});
});