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
      athlete: 'Pitcher starts to deliver — your legs should already be loaded by the time their hands break apart.',
      coach_note: 'Front-side timing window: hip load must complete before pitcher hand separation.',
    },
    cause: {
      athlete: 'Your hands load before — or instead of — your back hip.',
      coach_note: 'Sequencing fault: upper-body initiation precedes pelvic counter-rotation; no posterior chain pre-tension.',
    },
    mechanism: {
      athlete: "There's no separation, your weight stays in the middle (or drifts forward), and you lose the rubber-band stretch in your core.",
      coach_note: 'Without hip-shoulder dissociation, obliques never store elastic energy; weight transfers anteriorly, vacating the back side.',
    },
    result: {
      athlete: 'Weak contact even on barreled balls, late swings, swing-and-miss, chasing pitches, jammed elbow.',
      coach_note: 'Reduced bat-speed ceiling, late commit window, impaired pitch recognition due to early visual drift, jammed contact on inner third.',
    },
    fix: {
      athlete: 'Load the back hip slowly first. Hands are the LAST thing to move.',
      coach_note: 'Initiate with pelvic counter-rotation; delay scap/hand load until hip is fully loaded — bigger early hip load = more swing power.',
    },
  },
  P2: {
    phase: 'P2',
    trigger: {
      athlete: 'Your hip load is complete and the hand load is starting.',
      coach_note: 'Mid-load window: scap/knob load engages while pelvis remains posterior-loaded.',
    },
    cause: {
      athlete: 'Your hands never get back, or they drift forward with your body.',
      coach_note: 'Insufficient scap retraction / knob depth; hands track linearly with COM instead of holding posterior.',
    },
    mechanism: {
      athlete: 'No bat-head depth, your front shoulder leaks open, and your chest opens too early.',
      coach_note: 'Loss of barrel depth; premature thoracic rotation breaks the kinetic chain before stride lands.',
    },
    result: {
      athlete: 'Long stride, head drifts to the pitcher, you pull off the ball, and weak fly balls to the opposite field.',
      coach_note: 'Over-stride compensation, cephalad drift impairs pitch tracking, premature shoulder opening produces opposite-field flares.',
    },
    fix: {
      athlete: 'Load your hands BEFORE you step. As your foot moves forward, your hands move slightly back on their own.',
      coach_note: 'Sequence hand load prior to stride initiation; counter-movement of the hands is involuntary when stride is back-hip-driven.',
    },
  },
  P3: {
    phase: 'P3',
    trigger: {
      athlete: 'Hip load and hand load are done. Now the stride is happening.',
      coach_note: 'Stride window: front foot in flight after hip + hand load are set.',
    },
    cause: {
      athlete: 'You land open — toes and chest pointing at the pitcher — instead of sideways.',
      coach_note: 'Front-foot lands externally rotated with thorax pre-opened; pelvis cannot store rotational torque.',
    },
    mechanism: {
      athlete: "Your hips can't store torque, your core can't tension, and your back side either collapses or gets stuck.",
      coach_note: 'Loss of pelvis-shoulder separation at landing; core fails to reach max tensional state; posterior chain either yields or locks.',
    },
    result: {
      athlete: "Late on velocity, can't reach the outside pitch, off-balance at contact, jammed.",
      coach_note: 'Reduced angular velocity capacity, restricted plate coverage, dynamic balance loss, inside-pitch jam.',
    },
    fix: {
      athlete: 'Land sideways with both feet down, chest still toward the plate, back hip controlling the step, core max-tensioned.',
      coach_note: 'Land with closed thorax + sideways pelvis; back hip dictates stride length; achieve max core tension at front-foot strike.',
    },
  },
  P4: {
    phase: 'P4',
    trigger: {
      athlete: 'Front foot is down. You decide to swing.',
      coach_note: 'Launch window: post-stride; swing decision committed.',
    },
    cause: {
      athlete: 'Your hands fire before your back elbow drives forward.',
      coach_note: 'Distal-segment initiation: hands accelerate before scap protraction and elbow drive.',
    },
    mechanism: {
      athlete: 'The knob loses its position. The barrel casts and flips early. Your shoulders open before your elbow extends, so the bat drags around your body instead of through the ball.',
      coach_note: 'Loss of knob fulcrum; early barrel release (casting) widens the swing arc; thoracic rotation precedes elbow extension, creating an around-the-body bat path rather than into-the-zone.',
    },
    result: {
      athlete: 'Rollover, weak pop-up the other way, swing-and-miss on offspeed away, pulled foul ground balls.',
      coach_note: 'Top-hand rollover at contact, opposite-field weak fly, miss profile on outer-third offspeed, pull-side foul grounders.',
    },
    fix: {
      athlete: 'Back elbow leads forward FIRST. Hands stay back. The elbow turning your body IS what brings the barrel to the ball.',
      coach_note: 'Initiate launch with scap protraction + elbow drive while keeping hands posterior; rotation generated by elbow drive delivers the barrel through the contact zone.',
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
    { step: 1, key: 'feel', label: 'Feel', intent: 'Feel a sideways landing with both feet down.', drillId: 'sideways_landing_check', athleteCue: 'Stride and freeze. Chest still toward the plate.', coachNote: 'Static landing audit; thorax closed, pelvis sideways.' },
    { step: 2, key: 'iso', label: 'Isolate', intent: 'Repeat the landing pose with no swing.', drillId: 'sideways_landing_check', athleteCue: 'Land. Hold. Photo. Reset.', coachNote: 'Pattern engrains landing geometry without launch noise.' },
    { step: 3, key: 'constraint', label: 'Constrain', intent: 'Front toss only outside-third pitches.', drillId: 'front_toss', athleteCue: 'Outside pitch only. Stay sideways or you can\'t reach it.', coachNote: 'Outside-third constraint exposes premature opening.' },
    { step: 4, key: 'transfer', label: 'Transfer', intent: 'Live machine to hold landing under velocity.', drillId: 'machine_bp', athleteCue: 'Land sideways every pitch. No exceptions.', coachNote: 'Velocity stress test for landing integrity.' },
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
