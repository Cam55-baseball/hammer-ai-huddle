import { describe, expect, it } from 'vitest';
import { enforceSkillStageOrder } from './planSanity';
import type { PrescribedBlock } from './dailyPlan';
const block={modality:'hitting',status:'ready',drills:[{name:'Execution',stage:'full_go',dosage:'15 swings'},{name:'Prep',stage:'prep',dosage:'10 swings'},{name:'Skill',stage:'drills',dosage:'20 swings'}]} as unknown as PrescribedBlock;
describe('declared skill intensity order',()=>{
  it('orders prep before skill before game-speed without changing any dose',()=>{
    const result=enforceSkillStageOrder([block])[0];
    expect(result.drills.map(d=>d.stage)).toEqual(['prep','drills','full_go']);
    expect(result.drills.map(d=>d.dosage)).toEqual(['10 swings','20 swings','15 swings']);
    expect(result.drills[2]).toBe(block.drills[0]);
  });
  it('never infers missing stage or reorders an owner slot',()=>{
    const unknown={...block,drills:[{name:'Throw',dosage:'8 reps'},...block.drills]};
    const owner={...block,drills:block.drills.map((d,i)=>i===0?{...d,ownerDrillId:'o1'}:d)};
    expect(enforceSkillStageOrder([unknown,owner])).toEqual([unknown,owner]);
    expect(enforceSkillStageOrder([owner])[0]).toBe(owner);
  });
  it('does not reopen suppressed work',()=>expect(enforceSkillStageOrder([{...block,status:'suppressed'}])[0].status).toBe('suppressed'));
});