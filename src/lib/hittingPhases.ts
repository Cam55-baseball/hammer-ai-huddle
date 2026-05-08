// Hitting 1-2-3-4 Doctrine — single source of truth (browser/runtime)
// Mirror of supabase/functions/_shared/hittingPhases.ts so the client can
// attribute symptoms, surface drill suggestions, and render phase chips.

export type HittingPhaseId = 'P1' | 'P2' | 'P3' | 'P4';

export interface HittingPhase {
  id: HittingPhaseId;
  name: string;
  nonNegotiable: boolean;
  scoreCap: number;
  styleVariants: string[];
  failureSymptoms: string[];
  summary: string;
}

export const HITTING_PHASES: Record<HittingPhaseId, HittingPhase> = {
  P1: {
    id: 'P1',
    name: 'Hip Load',
    nonNegotiable: true,
    scoreCap: 80,
    styleVariants: ['toe_tap', 'leg_kick', 'hover', 'coil', 'hinge', 'no_stride'],
    failureSymptoms: [
      'hand_load_before_hip_load',
      'no_balanced_hip_load',
      'head_drift_to_pitcher',
      'no_separation',
      'jammed_elbow',
      'weight_falls_forward',
    ],
    summary:
      'Slow, controlled, balanced back-hip load BEFORE the hand load, timed to the pitcher starting delivery. Bigger hip load = more swing power.',
  },
  P2: {
    id: 'P2',
    name: 'Hand Load',
    nonNegotiable: false,
    scoreCap: 85,
    styleVariants: ['scap_load', 'knob_load', 'bat_tip_back', 'minimal_load'],
    failureSymptoms: [
      'long_stride',
      'over_stride',
      'head_drift_to_pitcher',
      'weight_forward',
      'front_shoulder_pulls_out',
      'chest_not_square_to_plate',
    ],
    summary: 'Bat/scap/knob load behind the head locks the balance Phase 1 created.',
  },
  P3: {
    id: 'P3',
    name: 'Stride / Landing',
    nonNegotiable: false,
    scoreCap: 75,
    styleVariants: ['short_step', 'no_stride', 'high_pickup', 'toe_tap_only', 'slap_running_start'],
    failureSymptoms: [
      'not_sideways_at_landing',
      'shoulders_not_square',
      'stuck_on_back_side',
      'cant_reach_outside_pitch',
      'foot_down_late',
      'late_swing_high_velocity',
      'late_foul_jammed',
      'off_balance_at_contact',
      'elbow_jammed_behind_hands',
    ],
    summary:
      'Short controlled back-hip step; lands SIDEWAYS, chest+shoulders square to plate, both feet down, core max-tensioned.',
  },
  P4: {
    id: 'P4',
    name: "Hitter's Move",
    nonNegotiable: true,
    scoreCap: 50,
    styleVariants: ['line_hands_with_ball', 'catch_with_thumbs', 'catch_with_pinky'],
    failureSymptoms: [
      'hands_lead_elbow',
      'casting',
      'early_barrel_flip',
      'rollover',
      'weak_pop_up_oppo',
      'swing_miss_offspeed_away',
      'foul_oppo',
      'foul_ground_pull',
      'shoulders_open_before_elbow_extends',
    ],
    summary:
      'Knob = fulcrum. Back elbow drives forward first; hands stay back; barrel catapults last.',
  },
};

export const TWO_PLUS_PHASE_VIOLATION_CAP = 65;

// === LOCKED 2026 EXTENSIONS (mirror of edge file) ===
export const P4_HARD_CAP = 50;
export const P4_SOFT_CAP = 70;
export const P4_ELITE_BONUS = 5;

export type P4Severity = 'hard' | 'soft' | 'elite' | null;

const P4_HARD_SYMPTOMS = new Set([
  'casting',
  'early_barrel_flip',
  'rollover',
  'shoulders_open_before_elbow_extends',
  'hands_lead_elbow',
]);
const P4_SOFT_SYMPTOMS = new Set([
  'extension_at_contact',
  'hands_slightly_leading',
  'early_extension_slight',
]);

export interface EliteMoveSignals {
  elbowLeadsForward?: boolean;
  handsStayBack?: boolean;
  contactWithHands?: boolean;
  extensionPostContact?: boolean;
  barrelCatapultsLast?: boolean;
}

export function isEliteMove(signals?: EliteMoveSignals): boolean {
  if (!signals) return false;
  return !!(
    signals.elbowLeadsForward &&
    signals.handsStayBack &&
    signals.contactWithHands &&
    signals.extensionPostContact &&
    signals.barrelCatapultsLast
  );
}

export function gradeP4Severity(symptoms: string[], elite?: EliteMoveSignals): P4Severity {
  if (isEliteMove(elite)) return 'elite';
  const lc = (symptoms || []).map((s) => String(s).toLowerCase().trim());
  if (lc.some((s) => P4_HARD_SYMPTOMS.has(s))) return 'hard';
  if (lc.some((s) => P4_SOFT_SYMPTOMS.has(s))) return 'soft';
  return null;
}

export interface P1TimingSignals {
  hipsLoadedAtPitcherHandsBreak?: boolean;
}
export function evaluateP1HandsBreakTiming(sig?: P1TimingSignals): { violated: boolean } {
  if (!sig || sig.hipsLoadedAtPitcherHandsBreak === undefined) return { violated: false };
  return { violated: sig.hipsLoadedAtPitcherHandsBreak === false };
}

export interface SlapEliteSignals {
  runningStartTiming?: boolean;
  topDownBarrel?: boolean;
  alreadyMovingContact?: boolean;
}
export interface SlapEliteResult extends SlapEliteSignals {
  isElite: boolean;
}
export function evaluateSlapEliteGates(sig?: SlapEliteSignals): SlapEliteResult {
  const r = sig || {};
  return {
    runningStartTiming: !!r.runningStartTiming,
    topDownBarrel: !!r.topDownBarrel,
    alreadyMovingContact: !!r.alreadyMovingContact,
    isElite: !!(r.runningStartTiming && r.topDownBarrel && r.alreadyMovingContact),
  };
}

export function prioritizePhasesForRoadmap(violated: HittingPhaseId[]): HittingPhaseId[] {
  const set = new Set(violated);
  if (set.size === 1 && set.has('P4')) return ['P4'];
  const order: HittingPhaseId[] = ['P1', 'P2', 'P3', 'P4'];
  return order.filter((p) => set.has(p));
}

export function isSlapContext(ctx?: { sport?: string; drillId?: string; tags?: string[] }): boolean {
  if (!ctx) return false;
  const sport = (ctx.sport || '').toLowerCase();
  if (sport !== 'softball') return false;
  if (ctx.drillId === 'slap_progression') return true;
  return !!ctx.tags?.some((t) => /slap/i.test(t));
}

const SYMPTOM_TO_PHASE: Record<string, HittingPhaseId> = {
  hand_load_before_hip_load: 'P1',
  no_balanced_hip_load: 'P1',
  no_separation: 'P1',
  jammed_elbow: 'P1',
  long_stride: 'P2',
  over_stride: 'P2',
  front_shoulder_pulls_out: 'P2',
  chest_not_square_to_plate: 'P2',
  pull_off_ball: 'P2',
  weight_forward: 'P2',
  head_drift_to_pitcher: 'P2',
  not_sideways_at_landing: 'P3',
  shoulders_not_square: 'P3',
  stuck_on_back_side: 'P3',
  cant_reach_outside_pitch: 'P3',
  foot_down_late: 'P3',
  late_swing_high_velocity: 'P3',
  late_foul_jammed: 'P3',
  off_balance_at_contact: 'P3',
  late: 'P3',
  jammed: 'P3',
  hands_lead_elbow: 'P4',
  casting: 'P4',
  early_barrel_flip: 'P4',
  rollover: 'P4',
  weak_pop_up_oppo: 'P4',
  swing_miss_offspeed_away: 'P4',
  foul_oppo: 'P4',
  foul_ground_pull: 'P4',
  shoulders_open_before_elbow_extends: 'P4',
};

export function attributePhaseFromSymptoms(symptoms: string[]): {
  dominant: HittingPhaseId | null;
  counts: Record<HittingPhaseId, number>;
} {
  const counts: Record<HittingPhaseId, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  for (const raw of symptoms || []) {
    const s = String(raw).toLowerCase().trim();
    const phase = SYMPTOM_TO_PHASE[s];
    if (phase) counts[phase] += 1;
  }
  const order: HittingPhaseId[] = ['P4', 'P1', 'P3', 'P2'];
  let dominant: HittingPhaseId | null = null;
  let best = 0;
  for (const id of order) {
    if (counts[id] > best) {
      best = counts[id];
      dominant = id;
    }
  }
  return { dominant, counts };
}

export function applyPhaseCaps(
  baseScore: number,
  violatedPhases: HittingPhaseId[],
  ctx?: { sport?: string; drillId?: string; tags?: string[] },
  opts?: {
    p4Severity?: P4Severity;
    eliteMove?: EliteMoveSignals;
    slapElite?: SlapEliteSignals;
  }
): {
  score: number;
  appliedCaps: Array<{ phase: HittingPhaseId; cap: number }>;
  twoPlus: boolean;
  p4Severity: P4Severity;
  eliteMove: boolean;
  slapElite: SlapEliteResult;
} {
  const slap = isSlapContext(ctx);
  const effective = violatedPhases.filter((p) => !(slap && (p === 'P2' || p === 'P3')));

  let p4Sev: P4Severity = opts?.p4Severity ?? null;
  if (effective.includes('P4') && !p4Sev) p4Sev = 'hard';
  const elite = isEliteMove(opts?.eliteMove);
  if (elite) p4Sev = 'elite';

  const appliedCaps = effective.map((p) => {
    if (p === 'P4') {
      const cap = p4Sev === 'soft' ? P4_SOFT_CAP : p4Sev === 'elite' ? 100 : P4_HARD_CAP;
      return { phase: p, cap };
    }
    return { phase: p, cap: HITTING_PHASES[p].scoreCap };
  });

  let cap = appliedCaps.reduce((min, c) => Math.min(min, c.cap), 100);
  const twoPlus = effective.length >= 2;
  if (twoPlus) cap = Math.min(cap, TWO_PLUS_PHASE_VIOLATION_CAP);

  let finalScore = Math.min(baseScore, cap);
  if (elite && effective.length <= 1) {
    finalScore = Math.min(100, baseScore + P4_ELITE_BONUS);
  }

  const slapEliteResult = evaluateSlapEliteGates(opts?.slapElite);

  return {
    score: finalScore,
    appliedCaps,
    twoPlus,
    p4Severity: p4Sev,
    eliteMove: elite,
    slapElite: slapEliteResult,
  };
}

// Drill ids tagged with each phase (must match drillDefinitions.ts).
export const PHASE_DRILL_RECOMMENDATIONS: Record<HittingPhaseId, string[]> = {
  P1: ['hip_load_iso', 'no_stride_power', 'load_sequence_pause', 'tee_work'],
  P2: ['load_sequence_pause', 'tee_work', 'front_toss'],
  P3: ['sideways_landing_check', 'front_toss', 'machine_bp'],
  P4: ['elbow_first_fulcrum', 'catch_the_ball', 'tee_work', 'flip_drill'],
};
