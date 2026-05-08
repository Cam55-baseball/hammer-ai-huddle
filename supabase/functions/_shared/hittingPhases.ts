// Hitting 1-2-3-4 Doctrine — single source of truth (edge runtime)
// See mem://features/hitting-analysis/elite-hitting-mechanics-formula

export type HittingPhaseId = 'P1' | 'P2' | 'P3' | 'P4';

export interface HittingPhase {
  id: HittingPhaseId;
  name: string;
  nonNegotiable: boolean;
  scoreCap: number; // applied when this phase is violated
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
      'Slow, controlled, balanced back-hip load BEFORE the hand load, timed to the pitcher starting his/her delivery. Bigger hip load = more swing power regardless of stride style.',
  },
  P2: {
    id: 'P2',
    name: 'Hand Load',
    nonNegotiable: false, // style-permitted; flagged when consequences appear
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
    summary:
      'Bat/scap/knob load behind the head; locks the balance Phase 1 created. Only graded when its absence causes consequences.',
  },
  P3: {
    id: 'P3',
    name: 'Stride / Landing',
    nonNegotiable: false, // style-permitted; flagged when consequences appear
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
      'Short controlled back-hip step; lands SIDEWAYS, chest+shoulders square to plate, both feet down, core max-tensioned. Hips do NOT turn shoulders.',
  },
  P4: {
    id: 'P4',
    name: "Hitter's Move",
    nonNegotiable: true,
    scoreCap: 50, // most important phase
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
      'Knob = fulcrum. Back elbow drives forward FIRST while hands stay back and shoulders stay closed; barrel catapults last. Try to make contact with the hands; extension comes naturally after contact.',
  },
};

export const TWO_PLUS_PHASE_VIOLATION_CAP = 65;

// === LOCKED 2026 EXTENSIONS ===
// P4 severity grading (additive — original cap 50 = 'hard').
export const P4_HARD_CAP = 50;
export const P4_SOFT_CAP = 70;
export const P4_ELITE_BONUS = 5; // raises final score ceiling when elite move verified.

export type P4Severity = 'hard' | 'soft' | 'elite' | null;

// Hard-P4 symptoms = full violation (cap 50).
const P4_HARD_SYMPTOMS = new Set([
  'casting',
  'early_barrel_flip',
  'rollover',
  'shoulders_open_before_elbow_extends',
  'hands_lead_elbow',
]);

// Soft-P4 symptoms = elbow lead present but extension shown AT contact (cap 70).
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

// P1 hands-break HARD timing rule. Pitcher tempo NEVER relaxes this.
export interface P1TimingSignals {
  hipsLoadedAtPitcherHandsBreak?: boolean; // explicit observation from analyzer/coach
}
export function evaluateP1HandsBreakTiming(sig?: P1TimingSignals): { violated: boolean } {
  if (!sig || sig.hipsLoadedAtPitcherHandsBreak === undefined) return { violated: false };
  return { violated: sig.hipsLoadedAtPitcherHandsBreak === false };
}

// Slap-elite gates (softball slap-progression only).
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

// Roadmap surface order:
// - If P4 is the SOLE violation, lead with P4 alone.
// - Otherwise (any of P1/P2/P3 violated), stack ALL violations in 1→2→3→4 kinetic order.
export function prioritizePhasesForRoadmap(violated: HittingPhaseId[]): HittingPhaseId[] {
  const set = new Set(violated);
  if (set.size === 1 && set.has('P4')) return ['P4'];
  const order: HittingPhaseId[] = ['P1', 'P2', 'P3', 'P4'];
  return order.filter((p) => set.has(p));
}

// Slap-progression at-bats (softball): relax P2 + P3 only.
export function isSlapContext(ctx?: { sport?: string; drillId?: string; tags?: string[] }): boolean {
  if (!ctx) return false;
  const sport = (ctx.sport || '').toLowerCase();
  if (sport !== 'softball') return false;
  if (ctx.drillId === 'slap_progression') return true;
  return !!ctx.tags?.some((t) => /slap/i.test(t));
}

// Symptom → most-likely failed phase. Used for practice + game log inferences.
const SYMPTOM_TO_PHASE: Record<string, HittingPhaseId> = {
  // P1
  hand_load_before_hip_load: 'P1',
  no_balanced_hip_load: 'P1',
  no_separation: 'P1',
  jammed_elbow: 'P1',
  // P2
  long_stride: 'P2',
  over_stride: 'P2',
  front_shoulder_pulls_out: 'P2',
  chest_not_square_to_plate: 'P2',
  pull_off_ball: 'P2',
  weight_forward: 'P2',
  head_drift_to_pitcher: 'P2',
  // P3
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
  // P4
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
  // P4 wins ties (most important phase), then P1, then P3, then P2.
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

// Cap calculator. Pass the violated phase ids; returns the lowest applicable cap.
// LOCKED EXTENSION: optional opts let callers pass P4 severity + elite-move signals
// + slap-elite gates so the cap reflects soft (70) / hard (50) / elite (+5) outcomes.
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

  // Resolve P4 severity (passed-in or fall back to symptom-based hard).
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

  // Elite reward: +5 to the final cap (max 100), only if no other violations drag it down.
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

// Prompt block injectable into any system prompt that discusses hitting.
export const HITTING_DOCTRINE_PROMPT = `
HITTING 1-2-3-4 DOCTRINE (CANONICAL — applies to baseball AND softball):

Phase 1 — HIP LOAD (NON-NEGOTIABLE)
  Slow, controlled, balanced BACK-HIP load executed BEFORE the hand load.
  Timed early to the pitcher starting his/her delivery — quiet, calm, balanced.
  Bigger hip load = more swing power, regardless of stride style
  (no-stride, toe tap, leg kick, hover, coil, hinge are equivalent valid expressions).
  Failures: hand load fires before hip load, head drifts toward pitcher, no separation, jammed elbow.

Phase 2 — HAND LOAD (style-permitted; FLAG when consequences appear)
  Bat/scap/knob load behind the head locks the balance Phase 1 created.
  Only mention as a problem when consequences are visible: long over-stride, head drift,
  weight forward, front shoulder pulling out, chest/shoulders not staying square to home plate.
  Use a DIALOGUE tone — invite the hitter to discuss what they feel.

Phase 3 — STRIDE / LANDING (style-permitted; FLAG when consequences appear)
  Short controlled back-hip step that lands SIDEWAYS with chest + shoulders square to plate,
  both feet on the ground, core max-tensioned. Hips do NOT turn shoulders.
  Only mention as a problem when consequences are visible: stuck on back side, can't reach
  outside pitch, late on velocity, foot down late, off balance at contact, elbow jammed behind hands.
  Use DIALOGUE tone here too.

Phase 4 — HITTER'S MOVE (NON-NEGOTIABLE — MOST IMPORTANT PHASE)
  Knob = fulcrum. Back elbow drives forward FIRST. Hands stay back, shoulders stay closed,
  barrel catapults last. Hitter "lines hands up with the ball" and tries to make contact
  with the hands — extension is a natural after-contact result of leftover core tension.
  Failures: hands lead elbow, casting, early barrel flip, rollover, weak oppo pop-ups,
  swing-and-miss on offspeed away, foul oppo, foul ground-ball pull-side.

SCORE CAPS (lowest applicable cap wins; existing caps still apply):
  P1 violation → max 80
  P2 violation (with consequences) → max 85
  P3 violation (not sideways at landing) → max 75
  P4 violation → MAX 50  (this is the most important phase)
  Two or more phase violations → max 65

SLAP EXCEPTION (softball slap-progression at-bats only):
  P2 and P3 are RELAXED (lack of hand load and front-foot drift allowed).
  P1 and P4 are unchanged.

STYLE NEUTRALITY:
  Never criticize a hitter for choosing toe-tap vs leg-kick vs hover vs coil vs no-stride.
  Grade the OUTCOME of the phase, not the cosmetic style.
`.trim();
