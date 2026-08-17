// Hitting Cause→Effect Chains + 4-Step Roadmaps (edge runtime)
// Companion to hittingPhases.ts. Single source of truth for the
// 5-link teaching chain (TRIGGER → CAUSE → MECHANISM → RESULT → FIX)
// in two voice registers, plus the 4-step roadmap ladder
// (FEEL → ISO → CONSTRAINT → TRANSFER) for each phase failure.
//
// See mem://features/hitting-analysis/elite-hitting-mechanics-formula

import {
  HittingPhaseId,
  attributePhaseFromSymptoms,
  isSlapContext,
  prioritizePhasesForRoadmap,
  P4Severity,
  EliteMoveSignals,
  SlapEliteSignals,
  evaluateSlapEliteGates,
  isEliteMove,
} from './hittingPhases.ts';

export type RoadmapStepKey = 'feel' | 'iso' | 'constraint' | 'transfer';
export type ChainVoice = 'athlete' | 'coach_note';

export interface ChainLink {
  athlete: string;
  coach_note: string;
}

export interface CausalChain {
  phase: HittingPhaseId;
  trigger: ChainLink;
  cause: ChainLink;
  mechanism: ChainLink;
  result: ChainLink;
  fix: ChainLink;
}

export interface RoadmapStep {
  step: 1 | 2 | 3 | 4;
  key: RoadmapStepKey;
  label: string;
  intent: string;
  drillId: string;
  athleteCue: string;
  coachNote: string;
}

export const PHASE_CAUSAL_CHAINS: Record<HittingPhaseId, CausalChain> = {
  P1: {
    phase: 'P1',
    trigger: {
      athlete: 'Pitcher starts to deliver — your back hip should already be loading by the time their hands break apart.',
      coach_note: 'Front-side timing window: back-hip load completes before pitcher hand separation; leg-load size pre-hand-load sets launch angle + power ceiling.',
    },
    cause: {
      athlete: 'Your hands load before — or instead of — your back hip, so nothing coils behind you.',
      coach_note: 'Sequencing fault: upper-body initiation precedes pelvic counter-rotation; no posterior chain pre-tension; midline never establishes.',
    },
    mechanism: {
      athlete: "There's no separation, no midline, and no rubber-band stretch. Your weight stays in the middle or drifts forward.",
      coach_note: 'Without hip-shoulder dissociation the obliques store no elastic energy, midline collapses, and weight transfers anteriorly — vacating the back side and killing the ability to separate later.',
    },
    result: {
      athlete: 'Weak contact even on barreled balls, late swings, swing-and-miss, chasing pitches, jammed elbow, flat launch angle.',
      coach_note: 'Reduced bat-speed ceiling, compressed launch-angle window, late commit, impaired tracking from early visual drift, jammed inner-third contact.',
    },
    fix: {
      athlete: 'Load the back hip slowly and BIG first. A bigger leg load before the hands = more launch angle and more power. Hands are the LAST thing to move.',
      coach_note: 'Initiate with pelvic counter-rotation and generous leg load; delay scap/hand load until hip is fully loaded. Larger pre-hand-load leg action expands launch-angle and power headroom without adding effort.',
    },
  },
  P2: {
    phase: 'P2',
    trigger: {
      athlete: 'Your hip load is complete and the scap-pack / hand load is starting to coil on top of it.',
      coach_note: 'Mid-load window: scap pack + knob load engage while pelvis stays posterior-loaded — scap pack coils on the hip and cements the midline.',
    },
    cause: {
      athlete: 'Your hands never get back, or they drift forward with your body — so the top triangle never forms.',
      coach_note: 'Insufficient scap retraction / knob depth; hands track linearly with COM instead of holding posterior; Oh top-triangle (elbow forward, hands back) fails to set up the back-knee bottom triangle.',
    },
    mechanism: {
      athlete: 'No bat-head depth, no back-elbow-to-back-knee triangle, front shoulder leaks open, chest opens early.',
      coach_note: 'Loss of barrel depth; without the top triangle (back elbow forward with hands staying back) the bottom triangle in the back leg never forms; premature thoracic rotation breaks the kinetic chain before stride lands.',
    },
    result: {
      athlete: 'Long stride, head drifts to the pitcher, you pull off the ball, weak fly balls the other way.',
      coach_note: 'Over-stride compensation, cephalad drift impairs tracking, premature shoulder opening produces opposite-field flares, back knee cannot turn in time.',
    },
    fix: {
      athlete: 'Load your hands BEFORE you step. Feel the scap pack coil onto the loaded hip — hands slightly back as your foot moves forward.',
      coach_note: 'Sequence scap-pack / hand load prior to stride initiation; counter-movement of hands is involuntary when stride is back-hip-driven. Preserve the top-triangle prerequisite (elbow-forward-hands-back) that P4 will exploit.',
    },
  },
  P3: {
    // v3: P3 is the VOLUNTARY power step — coached and cued directly.
    // See `.lovable/p3-power-step-rule.md`.
    phase: 'P3',
    trigger: {
      athlete: "Hip loaded, hands loaded — now you stride at the pitcher's release point while he's getting there.",
      coach_note: 'Stride window: front foot leaves the ground once P1 + P2 are set; stride is directed at the release point and timed so the foot is down at or before release.',
    },
    cause: {
      athlete: 'You start the step too late, step too long, or drift your head and weight forward with the foot.',
      coach_note: 'Late stride initiation relative to pitcher kinematics, excessive stride length, or COM travelling with the stride limb instead of staying posterior.',
    },
    mechanism: {
      athlete: "If the foot isn't down before the ball is released, you're deciding and striding at the same time — there's no time left to strike.",
      coach_note: 'Foot-down after release compresses the decision + launch window; pelvis cannot store torque against a landed front side, and the swing starts from an unstable base.',
    },
    result: {
      athlete: "Late on velocity, jammed, off-balance at contact, can't reach the outside pitch.",
      coach_note: 'Reduced angular velocity capacity, restricted plate coverage, dynamic balance loss, inside-pitch jam.',
    },
    fix: {
      athlete: "Power step: start the stride as the pitcher starts toward release and get the front foot ALL the way down before he lets it go — landed sideways, chest to the plate, weight still back, loaded and ready to strike.",
      coach_note: 'Coach the stride directly: timing count to release, stride length ceiling, sideways landing with closed thorax, no head/COM drift. If the stride is chronically late, start P1/P2 earlier so the step has room — but the stride itself is the trained, voluntary move. See `.lovable/p3-power-step-rule.md`.',
    },
  },

  P4: {
    phase: 'P4',
    trigger: {
      athlete: 'Front foot is down. You decide to swing. Only ONE thing goes forward first — your back elbow (or the front of your bicep).',
      coach_note: 'Launch window: post-stride; swing decision committed. Rule of one: elbow / anterior bicep advances first, hands remain posterior — never both simultaneously.',
    },
    cause: {
      athlete: 'Two things go forward at once — your hands fire with your elbow instead of the elbow leading alone.',
      coach_note: 'Distal-segment co-initiation: hands accelerate before scap protraction and elbow drive complete; violates rule-of-one and destroys the top-triangle geometry established in P2.',
    },
    mechanism: {
      athlete: 'The knob loses position, the barrel casts and flips early, shoulders open before the elbow extends, and the bat drags AROUND your body instead of THROUGH the ball — never getting square to fair or on plane.',
      coach_note: 'Loss of knob fulcrum; early barrel release (casting) widens arc; thoracic rotation precedes elbow extension producing around-the-body path; barrel never rotates behind the ball, so contact is not "square to fair" and never gets on-plane with pitch.',
    },
    result: {
      athlete: 'Rollover, weak pop-up the other way, swing-and-miss on offspeed away, pulled foul grounders, "just late" on velocity even at max effort.',
      coach_note: 'Top-hand rollover, opposite-field weak fly, outer-third offspeed miss profile, pull-side foul grounders; velocity is passed as "late" when the real fault is off-plane path — on-plane hitters catch velocity at low effort.',
    },
    fix: {
      athlete: 'Back elbow (or front of your bicep) leads forward FIRST — hands stay back. That elbow turning your body brings the barrel BEHIND the ball, square to fair, on plane. Low-effort velocity comes from staying on plane, not from swinging harder.',
      coach_note: 'Initiate launch with scap protraction + elbow drive while hands remain posterior; elbow-led rotation orients barrel behind ball (square to fair) and matches pitch plane — widening the contact window and lowering effort required to catch velocity.',
    },
  },
};

export const PHASE_ROADMAPS: Record<HittingPhaseId, RoadmapStep[]> = {
  P1: [
    { step: 1, key: 'feel', label: 'Feel', intent: 'Feel the back hip load before any hand movement.', drillId: 'hip_load_iso', athleteCue: 'Just load the back hip. Hands frozen. Feel balanced.', coachNote: 'Mirror work — pelvis-only counter-rotation; hands inert.' },
    { step: 2, key: 'iso', label: 'Isolate', intent: 'Stanceless reps to prove hip load alone produces power.', drillId: 'no_stride_power', athleteCue: 'No stride. Just load and rip. Power comes from the hip.', coachNote: 'Removes stride variable; exposes true posterior-chain loading quality.' },
    { step: 3, key: 'constraint', label: 'Constrain', intent: 'Pause between hip load and hand load to lock the order.', drillId: 'load_sequence_pause', athleteCue: 'Hip → freeze 1 second → hands → swing.', coachNote: 'Constraint forces correct sequencing; hands cannot fire before hips.' },
    { step: 4, key: 'transfer', label: 'Transfer', intent: 'Hold the hip-first load against live timing.', drillId: 'front_toss', athleteCue: 'Same load, real pitch timing. Trust the hip.', coachNote: 'Transfer iso work to live timing; preserve sequence under tempo.' },
  ],
  P2: [
    { step: 1, key: 'feel', label: 'Feel', intent: 'Feel hands moving back as the stride goes forward.', drillId: 'load_sequence_pause', athleteCue: 'Step forward — hands drift back. Opposite directions.', coachNote: 'Counter-movement awareness drill; no ball.' },
    { step: 2, key: 'iso', label: 'Isolate', intent: 'Tee reps with hand load fully set before stride.', drillId: 'tee_work', athleteCue: 'Hands loaded behind your head BEFORE you step.', coachNote: 'Tee removes timing variable; isolates load sequence.' },
    { step: 3, key: 'constraint', label: 'Constrain', intent: 'Front toss with chest staying square to the plate.', drillId: 'front_toss', athleteCue: 'Eyes level. Chest to the plate. Stay closed.', coachNote: 'Constraint: punish premature thoracic rotation.' },
    { step: 4, key: 'transfer', label: 'Transfer', intent: 'Live BP holding the depth under speed.', drillId: 'machine_bp', athleteCue: 'Don\'t leak. Hands stay back, chest stays in.', coachNote: 'Test sequence integrity at game velocity.' },
  ],
  P3: [
    // v3: P3 is the voluntary power step — cue the stride directly and train its timing.
    { step: 1, key: 'feel', label: 'Feel', intent: 'Feel the power step: stride out and land the front foot fully down, sideways, with the weight still back.', drillId: 'stride_landing_iso', athleteCue: 'Hip loads, hands load, then STEP — front foot all the way down, landed sideways, weight still back.', coachNote: 'Dry-rep stride patterning. Grade landing quality: full foot down, thorax closed, no head drift.' },
    { step: 2, key: 'iso', label: 'Isolate', intent: 'Freeze the landing pose and audit it before any swing.', drillId: 'sideways_landing_check', athleteCue: 'Step and freeze where you land. Foot down, chest to the plate, ready to strike. Photo. Reset.', coachNote: 'Static landing audit; pelvis sideways, front knee not locked, COM still centered/back.' },
    { step: 3, key: 'constraint', label: 'Constrain', intent: 'Time the stride to the pitcher: front foot down before release.', drillId: 'front_toss', athleteCue: "Step as he starts toward release — foot DOWN before he lets it go. Beat the ball with your foot.", coachNote: 'Timing constraint against a live arm/toss. Count it out loud: "start" on the pitcher\'s move, "down" at release.' },
    { step: 4, key: 'transfer', label: 'Transfer', intent: 'Hold the power step on time under velocity.', drillId: 'machine_bp', athleteCue: 'Same every pitch: hip → hands → power step down early → strike.', coachNote: 'Velocity stress test for stride timing. If the foot is chronically late, start P1/P2 earlier so the step has room.' },
  ],
  P4: [
    { step: 1, key: 'feel', label: 'Feel', intent: 'Feel the back elbow lead forward while hands stay back.', drillId: 'elbow_first_fulcrum', athleteCue: 'Elbow first. Hands wait. The elbow turns you.', coachNote: 'Knob-fulcrum awareness; scap protraction precedes hand acceleration.' },
    { step: 2, key: 'iso', label: 'Isolate', intent: 'Tee reps with elbow leading every swing.', drillId: 'elbow_first_fulcrum', athleteCue: 'Tee. Slow. Elbow drives. Barrel last.', coachNote: 'Tee isolates sequencing; reinforces distal-last firing.' },
    { step: 3, key: 'constraint', label: 'Constrain', intent: '"Catch the ball" with the hands — extension comes after.', drillId: 'catch_the_ball', athleteCue: 'Try to catch the ball with your hands. Don\'t reach.', coachNote: 'Intent constraint defeats casting; barrel arrives last.' },
    { step: 4, key: 'transfer', label: 'Transfer', intent: 'Flips and live BP holding elbow-first under speed.', drillId: 'flip_drill', athleteCue: 'Same move, faster pitch. Elbow leads. Catch it.', coachNote: 'Transfer to reactive timing; maintain knob fulcrum at velocity.' },
  ],
};

export interface ChainBuildResult {
  phaseId: HittingPhaseId | null;
  chain: CausalChain | null;
  roadmap: RoadmapStep[] | null;
  slapRelaxed: boolean;
}

export function buildChainForSymptoms(
  symptoms: string[],
  ctx?: { sport?: string; drillId?: string; tags?: string[] }
): ChainBuildResult {
  const slap = isSlapContext(ctx);
  const { dominant } = attributePhaseFromSymptoms(symptoms);
  if (!dominant) {
    return { phaseId: null, chain: null, roadmap: null, slapRelaxed: slap };
  }
  // In slap context, P2/P3 chains are intentionally suppressed.
  if (slap && (dominant === 'P2' || dominant === 'P3')) {
    return { phaseId: null, chain: null, roadmap: null, slapRelaxed: true };
  }
  return {
    phaseId: dominant,
    chain: PHASE_CAUSAL_CHAINS[dominant],
    roadmap: PHASE_ROADMAPS[dominant],
    slapRelaxed: slap,
  };
}

export function formatChainText(chain: CausalChain, voice: ChainVoice = 'athlete'): string {
  const link = (k: keyof Omit<CausalChain, 'phase'>) => chain[k][voice];
  return [
    `TRIGGER: ${link('trigger')}`,
    `CAUSE: ${link('cause')}`,
    `MECHANISM: ${link('mechanism')}`,
    `RESULT: ${link('result')}`,
    `FIX: ${link('fix')}`,
  ].join('\n');
}

export function formatRoadmapText(roadmap: RoadmapStep[], voice: ChainVoice = 'athlete'): string {
  return roadmap
    .map((s) => `${s.step}. ${s.label.toUpperCase()} — ${voice === 'athlete' ? s.athleteCue : s.coachNote} [drill: ${s.drillId}]`)
    .join('\n');
}

// Prompt block injectable into any system prompt. Forces Hammer + analyze-video
// to teach in the canonical 5-link chain + 4-step roadmap, two voice registers.
export const HITTING_CAUSAL_CHAIN_PROMPT = `
HITTING CAUSE→EFFECT TEACHING FORMAT (CANONICAL — pair with the 1-2-3-4 doctrine):

When you diagnose any hitting fault, you MUST teach using this exact 5-link causal chain
followed by the 4-step roadmap. Never give fragments. Never separate cause from effect.

5-LINK CAUSAL CHAIN (in order):
  TRIGGER    — when in the swing this happens
  CAUSE      — what mechanically fails
  MECHANISM  — why the body / bat fails as a result
  RESULT     — what shows up in real games (rollover, late swing, jammed, weak oppo, etc.)
  FIX        — the corrective intent in one sentence

4-STEP ROADMAP LADDER (always, after the chain):
  1. FEEL       — body cue, no bat
  2. ISO        — drill with no ball or tee, isolating the fix
  3. CONSTRAINT — tee/front toss with a constraint that forces the fix
  4. TRANSFER   — front toss → machine → live BP, fix held under speed

VOICE REGISTERS (always pair both):
  athlete    — plain English, kid-friendly, one sentence per link.
  coach_note — technical biomechanical precision, one sentence.

CANONICAL P4 RULE (most important):
  "The back elbow leading forward IS what turns your body and brings the barrel to the ball."
  Never separate cause from effect. Always teach why elbow-first creates the bat path.

P1 RULE: "Bigger back-hip load = more swing power, regardless of stride style."

SLAP EXCEPTION (softball slap-progression at-bats):
  Do NOT surface P2 or P3 chains. Only P1 and P4 chains apply.
`.trim();

// === LOCKED 2026 EXTENSIONS ===

// Soft-P4 chain: dialogue-tone, "you're 90% there".
export const P4_SOFT_CHAIN: CausalChain = {
  phase: 'P4',
  trigger: {
    athlete: 'Front foot is down. You decide to swing — and the elbow IS leading.',
    coach_note: 'Launch window: scap protraction precedes hand acceleration as designed.',
  },
  cause: {
    athlete: 'But your hands sneak forward and arms extend AT contact instead of after it.',
    coach_note: 'Sub-optimal: terminal elbow extension synchronizes with ball-bat impact rather than post-impact.',
  },
  mechanism: {
    athlete: 'You lose a touch of bat speed because the whip happens early, and the barrel can flatten just before the ball.',
    coach_note: 'Premature distal release reduces angular bat velocity at impact and shallows the attack angle.',
  },
  result: {
    athlete: 'Solid contact but not your best — line drives that should be barrels, oppo balls that lack carry.',
    coach_note: 'Exit velocity ceiling clipped; opposite-field carry depressed; pull contact margin slightly compromised.',
  },
  fix: {
    athlete: "You're 90% there — the elbow IS leading. Now keep the hands back THROUGH contact so extension shows up AFTER the ball, not at it.",
    coach_note: 'Dialogue cue: maintain hand depth through impact; let extension occur as a post-contact byproduct of residual core tension.',
  },
};

// Elite Move recognition (positive — used in recap/vault).
export interface EliteRecognition {
  badge: 'elite_move' | 'elite_slap';
  athlete: string;
  coach_note: string;
}
export const P4_ELITE_RECOGNITION: EliteRecognition = {
  badge: 'elite_move',
  athlete: 'ELITE MOVE — elbow led, hands stayed back, you caught the ball with your hands and let extension happen AFTER contact. This is the move.',
  coach_note: 'Elite kinetic sequence verified: scap-elbow drive precedes hand acceleration; impact occurs with knob fulcrum intact; terminal extension is a post-impact byproduct of residual core tension. Award +5 cap raise and feed differentiation engine.',
};

export const SLAP_ELITE_RECOGNITION: EliteRecognition = {
  badge: 'elite_slap',
  athlete: 'ELITE SLAP — running-start landed with the pitch, barrel came down on the ball, and your body was already moving to first at contact. Textbook.',
  coach_note: 'Elite slap pattern verified: timed running-start landing, top-down attack angle (no uppercut), no contact-stall (COM continues toward 1B). Award +5 cap raise and feed differentiation engine.',
};

// Multi-phase chain builder. Returns ALL violated chains in 1→4 order.
export interface MultiChainBuildResult {
  ordered: HittingPhaseId[];
  chains: Array<{ phaseId: HittingPhaseId; chain: CausalChain; roadmap: RoadmapStep[]; isP4Important: boolean; severity?: P4Severity }>;
  slapRelaxed: boolean;
  p4Severity: P4Severity;
  eliteMove?: EliteRecognition;
  slapElite?: EliteRecognition;
}

export function buildChainsForViolations(
  violatedPhases: HittingPhaseId[],
  ctx?: { sport?: string; drillId?: string; tags?: string[] },
  opts?: {
    p4Severity?: P4Severity;
    eliteMove?: EliteMoveSignals;
    slapElite?: SlapEliteSignals;
  }
): MultiChainBuildResult {
  const slap = isSlapContext(ctx);
  const filtered = violatedPhases.filter((p) => !(slap && (p === 'P2' || p === 'P3')));
  const ordered = prioritizePhasesForRoadmap(filtered);

  const eliteVerified = isEliteMove(opts?.eliteMove);
  let p4Sev: P4Severity = opts?.p4Severity ?? null;
  if (eliteVerified) p4Sev = 'elite';
  if (filtered.includes('P4') && !p4Sev) p4Sev = 'hard';

  const chains = ordered.map((phaseId) => {
    let chain = PHASE_CAUSAL_CHAINS[phaseId];
    if (phaseId === 'P4' && p4Sev === 'soft') chain = P4_SOFT_CHAIN;
    return {
      phaseId,
      chain,
      roadmap: PHASE_ROADMAPS[phaseId],
      isP4Important: phaseId === 'P4',
      severity: phaseId === 'P4' ? p4Sev : undefined,
    };
  });

  const slapElite = evaluateSlapEliteGates(opts?.slapElite);

  return {
    ordered,
    chains,
    slapRelaxed: slap,
    p4Severity: p4Sev,
    eliteMove: eliteVerified ? P4_ELITE_RECOGNITION : undefined,
    slapElite: slap && slapElite.isElite ? SLAP_ELITE_RECOGNITION : undefined,
  };
}
