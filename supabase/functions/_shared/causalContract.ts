// Universal Cause→Effect Doctrine — single source of truth (edge runtime)
// Every grading/feedback formula in the app emits a 5-link causal chain
// + a 4-step domain-tuned roadmap, in dual register (athlete + coach_note).
// Hitting's severity model is inherited universally.

export type Domain =
  | 'hitting'
  | 'pitching'
  | 'defense'
  | 'baserunning'
  | 'strength'
  | 'regulation'
  | 'nutrition'
  | 'mental';

export type ChainLinkKey = 'trigger' | 'cause' | 'mechanism' | 'result' | 'fix';

export interface ChainLink {
  athlete: string;
  coach_note: string;
}

export interface CausalChain {
  domain: Domain;
  phaseId: string;       // e.g. "P1", "P2"
  phaseName: string;     // e.g. "Hip Load", "Sleep Debt"
  trigger: ChainLink;
  cause: ChainLink;
  mechanism: ChainLink;
  result: ChainLink;
  fix: ChainLink;
}

export type RoadmapStepKey = string; // domain-tuned (feel|iso|constraint|transfer, activate|load|integrate|express, etc.)

export interface RoadmapStep {
  step: 1 | 2 | 3 | 4;
  key: RoadmapStepKey;
  label: string;
  intent: string;
  drillId: string;
  athleteCue: string;
  coachNote: string;
}

export interface RoadmapLadderDef {
  domain: Domain;
  steps: Array<{ step: 1 | 2 | 3 | 4; key: RoadmapStepKey; label: string }>;
}

// Domain-tuned ladders (user-locked).
export const LADDERS: Record<Domain, RoadmapLadderDef> = {
  hitting:     { domain: 'hitting',     steps: [{step:1,key:'feel',label:'Feel'},{step:2,key:'iso',label:'Isolate'},{step:3,key:'constraint',label:'Constrain'},{step:4,key:'transfer',label:'Transfer'}] },
  pitching:    { domain: 'pitching',    steps: [{step:1,key:'feel',label:'Feel'},{step:2,key:'iso',label:'Isolate'},{step:3,key:'constraint',label:'Constrain'},{step:4,key:'transfer',label:'Transfer'}] },
  defense:     { domain: 'defense',     steps: [{step:1,key:'feel',label:'Feel'},{step:2,key:'iso',label:'Isolate'},{step:3,key:'constraint',label:'Constrain'},{step:4,key:'transfer',label:'Transfer'}] },
  baserunning: { domain: 'baserunning', steps: [{step:1,key:'feel',label:'Feel'},{step:2,key:'iso',label:'Isolate'},{step:3,key:'constraint',label:'Constrain'},{step:4,key:'transfer',label:'Transfer'}] },
  strength:    { domain: 'strength',    steps: [{step:1,key:'activate',label:'Activate'},{step:2,key:'load',label:'Load'},{step:3,key:'integrate',label:'Integrate'},{step:4,key:'express',label:'Express'}] },
  regulation:  { domain: 'regulation',  steps: [{step:1,key:'detect',label:'Detect'},{step:2,key:'downshift',label:'Downshift'},{step:3,key:'restore',label:'Restore'},{step:4,key:'reload',label:'Reload'}] },
  nutrition:   { domain: 'nutrition',   steps: [{step:1,key:'notice',label:'Notice'},{step:2,key:'swap',label:'Swap'},{step:3,key:'lock',label:'Lock'},{step:4,key:'sustain',label:'Sustain'}] },
  mental:      { domain: 'mental',      steps: [{step:1,key:'see',label:'See'},{step:2,key:'name',label:'Name'},{step:3,key:'choose',label:'Choose'},{step:4,key:'repeat',label:'Repeat under pressure'}] },
};

// Universal severity model (inherited from hitting).
export const SEVERITY_CAPS = {
  NN_HARD: 50,
  NN_SOFT: 70,
  STANDARD: 80,
  SECONDARY_HIGH: 85,
  SECONDARY_LOW: 75,
  MULTI_VIOLATION: 65,
  ELITE_BONUS: 5,
  MAX: 100,
} as const;

export type Severity = 'hard' | 'soft' | 'standard' | 'secondary' | 'elite' | null;

export interface PhaseDef {
  id: string;
  domain: Domain;
  name: string;
  nonNegotiable: boolean;
  scoreCap: number;       // standard cap when violated
  softCap?: number;       // optional soft-violation cap (NN only)
  eliteEligible?: boolean;
}

export interface AppliedCap {
  phaseId: string;
  cap: number;
  severity: Severity;
}

export function applySeverityCaps(
  baseScore: number,
  violations: Array<{ phase: PhaseDef; severity?: Severity }>,
  opts?: { eliteVerified?: boolean }
): { score: number; appliedCaps: AppliedCap[]; multiViolation: boolean; elite: boolean } {
  const elite = !!opts?.eliteVerified;
  const appliedCaps: AppliedCap[] = violations.map(({ phase, severity }) => {
    let cap = phase.scoreCap;
    let sev: Severity = severity ?? (phase.nonNegotiable ? 'hard' : 'standard');
    if (phase.nonNegotiable) {
      if (sev === 'soft') cap = phase.softCap ?? SEVERITY_CAPS.NN_SOFT;
      else if (sev === 'elite') cap = SEVERITY_CAPS.MAX;
      else cap = SEVERITY_CAPS.NN_HARD;
    }
    return { phaseId: phase.id, cap, severity: sev };
  });

  let cap = appliedCaps.reduce((m, c) => Math.min(m, c.cap), SEVERITY_CAPS.MAX);
  const multi = violations.length >= 2;
  if (multi) cap = Math.min(cap, SEVERITY_CAPS.MULTI_VIOLATION);

  let finalScore = Math.min(baseScore, cap);
  if (elite && violations.length <= 1) {
    finalScore = Math.min(SEVERITY_CAPS.MAX, baseScore + SEVERITY_CAPS.ELITE_BONUS);
  }
  return { score: finalScore, appliedCaps, multiViolation: multi, elite };
}

// Validate any AI/engine output before persisting or rendering.
export function assertChainShape(chain: any): chain is CausalChain {
  if (!chain || typeof chain !== 'object') return false;
  const linkOk = (l: any) => l && typeof l.athlete === 'string' && typeof l.coach_note === 'string';
  return (
    typeof chain.domain === 'string' &&
    typeof chain.phaseId === 'string' &&
    typeof chain.phaseName === 'string' &&
    linkOk(chain.trigger) &&
    linkOk(chain.cause) &&
    linkOk(chain.mechanism) &&
    linkOk(chain.result) &&
    linkOk(chain.fix)
  );
}

export function stackChainsByPhaseOrder<T extends { phaseId: string }>(chains: T[], phaseOrder: string[]): T[] {
  const idx = (id: string) => {
    const i = phaseOrder.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...chains].sort((a, b) => idx(a.phaseId) - idx(b.phaseId));
}

// Prompt suffix injected into every AI-emitting edge function.
export function buildCausalContractPromptSuffix(domain: Domain, phaseDoctrineSummary: string): string {
  const ladder = LADDERS[domain];
  const ladderText = ladder.steps.map(s => `${s.step}. ${s.label}`).join(' → ');
  return `\n\n=== UNIVERSAL CAUSE→EFFECT CONTRACT (MANDATORY) ===
Every fault, weakness, or limiter you surface MUST be expressed as a 5-link causal chain plus a 4-step roadmap.

CHAIN (5 links, dual register — athlete voice + coach_note):
1. trigger    — when/under what condition it shows up
2. cause      — the underlying cause
3. mechanism  — why it breaks the system
4. result     — what shows up on the field / in the body / in performance
5. fix        — the actionable lever

ROADMAP (4 steps, ${domain} ladder): ${ladderText}
Each step carries an athlete cue, a coach_note, and a drillId.

SEVERITY MODEL (universal):
- Non-Negotiable hard violation: cap 50
- Non-Negotiable soft violation: cap 70
- Standard violation: cap 80 (or 85/75 secondary)
- Two-or-more violations: cap 65; chains stack in phase order (P1 → P2 → ...)
- Elite execution: +5 cap raise + Elite badge

DOMAIN PHASE DOCTRINE:
${phaseDoctrineSummary}

OUTPUT REQUIREMENTS:
- Always emit causal_chains[] (one per violated phase, in phase order)
- Always emit roadmaps[] (one per chain, same order)
- Each chain link MUST have BOTH athlete and coach_note strings
- Never skip the chain. Never collapse to a single sentence. Never drop the coach voice.
=== END CONTRACT ===`;
}
