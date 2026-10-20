import type { EliteDrill } from './eliteDrillCatalog';

/** Owner-approved proposals; existing slot supplies the dose, never these teaching examples. */
export const FIELD_RUNNING_DRILLS: EliteDrill[] = [
  {
    id: 'elite.field.soft_hands_funnel', name: 'Soft-hands ground-ball funnel', category: 'fielding',
    sports: ['baseball', 'softball'], subSkill: 'Glove work', level: 'feel',
    fixes: 'A logged bobble or booted ground ball.',
    setup: 'On a safe field, use a glove and ball. A partner rolls the ball; alone, use a gentle self-roll.',
    steps: ['Start balanced with your glove in front.', 'Move behind the ball and field it in front of your body.', 'Bring the ball smoothly toward your middle, then reset. Do not add throws.'],
    cues: ['See the ball into the glove; soft hands, clean gather.'], dosage: 'Use the existing fielding slot reps',
    equipment: ['field', 'glove', 'ball'], violationKeys: ['bobble', 'booted_ground_ball'], pieV2Signals: [], movementPatterns: [],
    ownerReview: 'pending_owner_review', basis: 'proposed_shape', source: 'Owner-approved standard drill proposal',
  },
  {
    id: 'elite.field.clean_exchange', name: 'Clean glove-to-hand exchange', category: 'fielding',
    sports: ['baseball', 'softball'], subSkill: 'Glove work', level: 'feel',
    fixes: 'A logged late transfer.', setup: 'With a glove and ball, stand balanced in a safe field area.',
    steps: ['Place the ball in your glove in front of your body.', 'Bring the glove toward your middle and take the ball with your throwing hand.', 'Finish with a secure grip and reset; no extra throws.'],
    cues: ['One clean exchange; do not rush the grip.'], dosage: 'Use the existing fielding slot reps',
    equipment: ['field', 'glove', 'ball'], violationKeys: ['late_transfer'], pieV2Signals: [], movementPatterns: [],
    ownerReview: 'pending_owner_review', basis: 'proposed_shape', source: 'Owner-approved standard drill proposal',
  },
  ...(['baseball', 'softball'] as const).map((sport): EliteDrill => ({
    id: `elite.run.read_reset.${sport}`, name: `${sport === 'softball' ? 'Pitch-release' : 'Pitcher-move'} read and reset`, category: 'baserunning',
    sports: [sport], subSkill: 'Reads and reactions', level: 'feel', fixes: 'A logged late jump.',
    setup: 'Use a safe, open field. Have a partner give the pitcher cue; alone, rehearse the read slowly.',
    steps: [sport === 'softball' ? 'Start on the base; stay on it until the pitch is released.' : 'Start in your balanced lead and watch the pitcher.',
      'Read the cue, commit to your first step, then stop under control.', 'Reset fully before the next rep. No additional sprints or slides.'],
    cues: ['Read first, then go; never guess an unmeasured time.'], dosage: 'Use the existing baserunning slot reps',
    equipment: ['field'], violationKeys: ['late_jump'], pieV2Signals: [], movementPatterns: [],
    ownerReview: 'pending_owner_review', basis: 'proposed_shape', source: 'Owner-approved standard drill proposal',
  })),
];