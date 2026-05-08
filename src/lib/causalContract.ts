// Browser/runtime mirror of supabase/functions/_shared/causalContract.ts
// Keep both files in sync.

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
  phaseId: string;
  phaseName: string;
  trigger: ChainLink;
  cause: ChainLink;
  mechanism: ChainLink;
  result: ChainLink;
  fix: ChainLink;
}

export type RoadmapStepKey = string;

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
  scoreCap: number;
  softCap?: number;
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
