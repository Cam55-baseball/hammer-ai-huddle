import type { DrillStep } from './dailyPlan';

/** Only performed, timed recovery work belongs in the exercise logger. */
export function recoveryDrills(elevated: boolean): DrillStep[] {
  return [
    {
      name: 'Mobility + foam roll',
      dosage: elevated ? '15 min full body' : '10 min focus areas',
      setup: 'Use gentle mobility in a comfortable range. Foam roll only if you have a roller.',
      cue: 'Use light pressure and breathe slowly.',
      stopIf: 'Stop if movement causes sharp pain. Follow your professional’s injury instructions.',
    },
    {
      name: 'Evening down-regulation breath (post-session)',
      dosage: elevated ? '10 min' : '5 min',
      setup: 'Sit or lie comfortably after your session.',
      cue: 'Breathe gently, with a relaxed exhale longer than your inhale. Do not hold your breath.',
      stopIf: 'Return to normal breathing if you feel dizzy or uncomfortable.',
    },
  ];
}