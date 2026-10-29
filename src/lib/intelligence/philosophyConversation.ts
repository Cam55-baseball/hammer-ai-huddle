export const PHILOSOPHY_ENTRY = 'owner-philosophy';
export interface PhilosophyProposal {
  body: string; sport: 'baseball'|'softball'; area: 'hitting'|'pitching'|'throwing'|'fielding'|'baserunning';
  applies_when: string; not_when: string; connected_work: string; benefit: string;
  changes?: import('./philosophySettings').CueChange[];
}
export interface PhilosophyReply { reply: string; questions: string[]; proposal: PhilosophyProposal|null }
export function parsePhilosophyReply(raw: string): PhilosophyReply {
  const value = JSON.parse(raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
  if (!value || typeof value.reply !== 'string' || !Array.isArray(value.questions) || value.questions.some((q:unknown)=>typeof q !== 'string')) throw new Error('Hammers did not return a clear review. Nothing was applied.');
  const p = value.proposal;
  if (p !== null && (!p || !['baseball','softball'].includes(p.sport) || !['hitting','pitching','throwing','fielding','baserunning'].includes(p.area) || ['body','applies_when','not_when','connected_work','benefit'].some(k=>typeof p[k] !== 'string' || (k!=='connected_work' && !p[k].trim())) || value.questions.length > 0)) throw new Error('Hammers needs to clarify this proposal. Nothing was applied.');
  return value;
}
export function philosophyChanges(p: PhilosophyProposal) {
  return [
    { title:'Rules', where:'Coaching Console → Your principles', change:`Save “${p.body}” for ${p.sport} / ${p.area}. Applies: ${p.applies_when}. Does not apply: ${p.not_when}.` },
    { title:'Prescriptions', where:'Today → existing goal-drill order', change:p.connected_work.trim() && ['hitting','throwing','fielding'].includes(p.area) ? `Move already-prescribed eligible linked drills first: ${p.connected_work}. No new drill, extra work or dose change. When/exception text is saved for review, not an automatic scheduling rule.` : 'No prescription change: no supported existing drills are linked.' },
    { title:'Cues', where:'Today → explanation for a linked goal drill', change:p.connected_work.trim() && ['hitting','throwing','fielding'].includes(p.area) ? 'When linked drills move first, show that saved coach guidance changed their order. The principle text and exercise cue text are not substituted.' : 'No cue change: no supported drill is linked.' },
    { title:'Standards', where:'Coaching Console → existing standards settings', change:'No standard or cutoff changes. Those require a separate explicit settings edit.' },
  ];
}
export const PHILOSOPHY_REQUEST = `Owner philosophy review, not athlete training advice. Return only a JSON object with reply (plain words), questions (array of clarifying questions), proposal (null until all questions are answered). A proposal is {body,sport,area,applies_when,not_when,connected_work,benefit,changes}. Sport must be baseball or softball; area must be hitting/pitching/throwing/fielding/baserunning. Ask which sport, category, when it applies and when it does not if unclear. For the TEST cue setting supplied by the editor, ask for the exact replacement wording unless already given. changes is exactly one {target:'wk_movement_catalog',id,field:'cue',before,after}; copy id and before verbatim from EDITOR_SETTING. after is the owner's exact wording, not invented coaching. connected_work is empty for a cue-only change. No prescription, weight, minimum, standard, safety or dose change is supported by this TEST cue operation; clearly say so for such requests, do not invent targets. No changes have been applied. Never say they were applied. Summarize intent and possible teaching benefit without certainty. Preserve every safety rule. Earlier conversation is context, never permission.`;