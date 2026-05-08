// Per-domain phase doctrine drafts. User will refine each one in follow-ups.
// Drafted from existing memory (softball/baseball pitching, baserunning IQ, etc).
import { Domain, PhaseDef, SEVERITY_CAPS } from './causalContract.ts';

const std = SEVERITY_CAPS.STANDARD;
const sec_lo = SEVERITY_CAPS.SECONDARY_LOW;
const sec_hi = SEVERITY_CAPS.SECONDARY_HIGH;
const nn = SEVERITY_CAPS.NN_HARD;

const mk = (id: string, domain: Domain, name: string, nonNegotiable: boolean, scoreCap: number, eliteEligible = false): PhaseDef => ({
  id, domain, name, nonNegotiable, scoreCap, softCap: nonNegotiable ? SEVERITY_CAPS.NN_SOFT : undefined, eliteEligible,
});

export const PITCHING_PHASES: Record<string, PhaseDef> = {
  P1: mk('P1','pitching','Leg Lift / Balance Point', false, std),
  P2: mk('P2','pitching','Stride + Hip-Shoulder Separation', false, sec_lo),
  P3: mk('P3','pitching','Lateral Shoulders / Late Trunk Rotation', true, nn),
  P4: mk('P4','pitching','Release + Finish', true, nn, true),
};

export const DEFENSE_PHASES: Record<string, PhaseDef> = {
  P1: mk('P1','defense','Pre-pitch Athletic Stance', false, std),
  P2: mk('P2','defense','First Step / Read', false, sec_lo),
  P3: mk('P3','defense','Glove-to-Throw Transfer', false, sec_hi),
  P4: mk('P4','defense','Throw Quality', true, nn, true),
};

export const BASERUNNING_PHASES: Record<string, PhaseDef> = {
  P1: mk('P1','baserunning','Lead / Stance', false, std),
  P2: mk('P2','baserunning','Read / Trigger', true, nn),
  P3: mk('P3','baserunning','First Three Steps', false, sec_lo),
  P4: mk('P4','baserunning','Slide / Touch', true, nn, true),
};

export const STRENGTH_PHASES: Record<string, PhaseDef> = {
  P1: mk('P1','strength','Activation', false, std),
  P2: mk('P2','strength','Loading', false, sec_lo),
  P3: mk('P3','strength','Integration', true, nn),
  P4: mk('P4','strength','Expression', true, nn, true),
};

export const REGULATION_PHASES: Record<string, PhaseDef> = {
  P1: mk('P1','regulation','Sleep Debt', false, std),
  P2: mk('P2','regulation','CNS Readiness', true, nn),
  P3: mk('P3','regulation','Workload Trend', false, sec_lo),
  P4: mk('P4','regulation','Subjective Override', false, sec_hi),
};

export const NUTRITION_PHASES: Record<string, PhaseDef> = {
  P1: mk('P1','nutrition','Macro Floor (Protein)', true, nn),
  P2: mk('P2','nutrition','Micro Coverage', false, sec_lo),
  P3: mk('P3','nutrition','Hydration Quality', false, sec_hi),
  P4: mk('P4','nutrition','Habit Lock-in', false, std, true),
};

export const MENTAL_PHASES: Record<string, PhaseDef> = {
  P1: mk('P1','mental','Anticipation', false, std),
  P2: mk('P2','mental','Read / Trigger', true, nn),
  P3: mk('P3','mental','Decision', false, sec_lo),
  P4: mk('P4','mental','Execution Confidence', true, nn, true),
};

export const DOMAIN_PHASES: Record<Exclude<Domain,'hitting'>, Record<string, PhaseDef>> = {
  pitching: PITCHING_PHASES,
  defense: DEFENSE_PHASES,
  baserunning: BASERUNNING_PHASES,
  strength: STRENGTH_PHASES,
  regulation: REGULATION_PHASES,
  nutrition: NUTRITION_PHASES,
  mental: MENTAL_PHASES,
};

export function summarizePhaseDoctrine(domain: Exclude<Domain,'hitting'>): string {
  const phases = DOMAIN_PHASES[domain];
  return Object.values(phases).map(p =>
    `${p.id} ${p.name}${p.nonNegotiable ? ' (NN, hard cap 50 / soft 70)' : ` (cap ${p.scoreCap})`}${p.eliteEligible ? ' [Elite +5 eligible]' : ''}`
  ).join('\n');
}

export const HITTING_DOCTRINE_SUMMARY = `P1 Hip Load (NN, cap 80, hands-break HARD trigger)
P2 Hand Load (cap 85)
P3 Stride/Landing (cap 75)
P4 Hitter's Move (NN, MOST IMPORTANT, hard cap 50 / soft 70 / Elite +5)
Two-or-more violations: cap 65. Multi-violation chains stack 1→2→3→4.
Softball slap suppresses P2/P3. Elite Slap = P1+P4+running-start+top-down+already-moving-contact.`;

export function summarizeAnyDomain(domain: Domain): string {
  if (domain === 'hitting') return HITTING_DOCTRINE_SUMMARY;
  return summarizePhaseDoctrine(domain);
}
