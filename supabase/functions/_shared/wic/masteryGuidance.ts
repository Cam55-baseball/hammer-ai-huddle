/** Observations only. No synthetic grades, attainability scores or prescription authority. */
export interface MasteryGuidanceFacts {
 contactStatus:string; contactSourceIds:readonly string[];
 speedStatus:string; powerStatus:string;
 leftPower:boolean; leftPowerGoal:boolean;
}
export function masteryGuidance(facts:MasteryGuidanceFacts){
 const contactNeedsWork=facts.contactStatus==='Building'&&facts.contactSourceIds.length>0;
 const speedOrPower=facts.speedStatus==='Elite'||facts.powerStatus==='Elite'?'Satisfied':'Need more data';
 return {
  observedFocus:contactNeedsWork?'contact':null,
  sourceIds:contactNeedsWork?[...facts.contactSourceIds]:[],
  speedOrPower,
  fullWeakestPillarKnown:false,
  leftPowerStealEmphasis:facts.leftPower||facts.leftPowerGoal,
  reason:contactNeedsWork?'Your completed batting window is below the owner’s balls-in-play standard. Contact needs work; the overall weakest pillar is not yet known.':'The overall weakest required pillar needs more evidence.',
  alternativeReason:speedOrPower==='Satisfied'?'The elite speed-or-power requirement has supporting evidence.':'No data-backed comparison yet identifies whether elite speed or home-run power is more attainable.',
 };
}