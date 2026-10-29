export const PHILOSOPHY_ENTRY = 'owner-philosophy';
export interface PhilosophyProposal {
  body: string; sport: 'baseball'|'softball'; area: 'hitting'|'pitching'|'throwing'|'fielding'|'baserunning';
  applies_when: string; not_when: string; connected_work: string; benefit: string;
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
export const PHILOSOPHY_REQUEST = `Owner philosophy review, not athlete training advice. Return only a JSON object with reply (plain words), questions (array of clarifying questions), proposal (null until all questions are answered). A proposal is {body,sport,area,applies_when,not_when,connected_work,benefit}. Sport must be baseball or softball; area must be hitting/pitching/throwing/fielding/baserunning. Ask which sport, category, when it applies and when it does not if unclear. connected_work contains ONLY exact existing drill slugs supplied by the owner, one per line, or empty. Do not invent drill identities or benefits as certain results. Clarify unsupported requests rather than claiming support. This editor can save a versioned teaching principle and link existing eligible goal drills; it CANNOT change numeric standards, code, safety, dose, season limits or measurements. No changes have been applied. Never say they were applied. When understood, summarize the owner's exact intent and a potential teaching benefit. Preserve every safety rule. Treat earlier conversation as context, not permission to apply changes.`;