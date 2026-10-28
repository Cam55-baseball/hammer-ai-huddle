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
      guide: {
        what: 'Gentle mobility and optional foam rolling.',
        setup: 'Choose a comfortable space. A roller is optional.',
        goodRep: ['Move slowly through a comfortable range.', 'If using a roller, use light pressure rather than forcing a sore spot.'],
        badRep: ['Forcing a painful range or pressing hard into an injured area.'],
        feel: 'Comfortable movement, not a hard workout.',
        whyToday: 'Easy movement after your session.',
        nextLink: 'Continue with your evening breathing.',
        stopIf: 'Stop if movement causes sharp pain. Follow your professional’s injury instructions.',
      },
    },
    {
      name: 'Evening down-regulation breath (post-session)',
      dosage: elevated ? '10 min' : '5 min',
      setup: 'Sit or lie comfortably after your session.',
      cue: 'Breathe gently, with a relaxed exhale longer than your inhale. Do not hold your breath.',
      stopIf: 'Return to normal breathing if you feel dizzy or uncomfortable.',
      guide: {
        what: 'Gentle evening breathing.',
        setup: 'Sit or lie comfortably.',
        goodRep: ['Let your shoulders relax.', 'Breathe gently in, then exhale a little longer without forcing it.', 'Keep breathing normally between breaths; do not hold your breath.'],
        badRep: ['Straining, holding your breath or breathing so deeply that you feel dizzy.'],
        feel: 'Easy and relaxed.',
        whyToday: 'A quiet finish to your session.',
        nextLink: 'Finish your evening check-in.',
        stopIf: 'Return to normal breathing if you feel dizzy or uncomfortable.',
      },
    },
  ];
}