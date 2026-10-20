import type { DrillStep } from './dailyPlan';

export interface SkillSessionOptions {
  skill: 'hitting' | 'defense' | 'baserunning';
  sport: 'baseball' | 'softball';
  owned: ReadonlySet<string>;
  injuryRegions: readonly string[];
  recoveryDay: boolean;
}

/** Structure existing reps only; never add physical work or throwing permission. */
export function structureSkillSession(steps: readonly DrillStep[], options: SkillSessionOptions): DrillStep[] {
  if (!steps.length) return [];
  const rank = { prep: 0, drills: 1, full_go: 2, log: 3 };
  const sort = (rows: DrillStep[]) => rows.map((step, index) => ({ step, index }))
    .sort((a, b) => rank[a.step.stage ?? 'drills'] - rank[b.step.stage ?? 'drills'] || a.index - b.index)
    .map(({ step }) => step);
  if (options.skill === 'hitting') return sort([...steps]);
  const clearSpace = options.owned.has('field') || options.owned.has('open_space');
  const canExecute = clearSpace && !options.recoveryDay && options.injuryRegions.length === 0;
  let executionIndex = -1;
  if (canExecute && options.skill === 'baserunning') {
    executionIndex = steps.findIndex(step => /first-to-third|tag-up scenarios/i.test(step.name));
  } else if (canExecute && options.owned.has('glove') && options.owned.has('ball')) {
    executionIndex = steps.findIndex((step, index) => index > 0 && /glove work|backhand|short-hop|scoop|drop-step|rise-ball tracking|receiving|slow-roller/i.test(step.name) && step.prescriptionOrigin !== 'owner');
  }
  const structured = steps.map((step, index): DrillStep => {
    if (index !== executionIndex) return { ...step, stage: index === 0 ? 'prep' : 'drills' };
    const executionCue = options.skill === 'baserunning'
      ? options.sport === 'softball'
        ? 'Use these same scenario reps at game speed on a safe field. Leave the base only when the pitch is released; read the ball, then commit. No extra sprints or slides.'
        : 'Use these same scenario reps at game speed on a safe field. Read the pitcher and the ball, then commit to your jump or tag-up. No extra sprints or slides.'
      : 'Use these same reps for live reads: a partner rolls or tosses the ball; alone, use self-rolls or self-tosses. Read, move, field and exchange at game speed. Do not add throws; any throw stays inside today’s throwing plan.';
    return { ...step, stage: 'full_go', setup: [step.setup, executionCue].filter(Boolean).join(' '),
      cue: [step.cue, 'Every rep with intent; reset fully between reps.'].filter(Boolean).join(' '),
      stopIf: 'Pain, slipping, slower reactions or loss of control — stop the game-speed round.' };
  });
  // Actuals are entered in the existing session grid, not a fake zero-dose exercise.
  return sort(structured);
}