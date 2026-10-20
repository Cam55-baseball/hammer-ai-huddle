import type { DrillStep, PrescribedBlock } from './dailyPlan';
import type { CategoryPracticeLoad } from './categoryPracticeLoad';

/**
 * Owner rule (Oct 20): after a heavy practice stretch, the next day's
 * same-category skill volume drops about 30%, never below the drill's floor —
 * half the prescribed sets, whole sets only, reps unchanged. Full-go execution,
 * prep and log stages are never cut. Lifting and recovery are never touched.
 * Unparseable dosages stay unchanged rather than being guessed.
 */
export function reduceDosageForPractice(dosage: string): string {
  const m = /^(\d+)\s*(?:x|×)\s*(\d+)/i.exec(dosage);
  if (!m) return dosage;
  const sets = parseInt(m[1], 10);
  const reduced = Math.max(Math.ceil(sets * 0.5), Math.round(sets * 0.7));
  if (reduced >= sets) return dosage;
  return dosage.replace(/^(\d+)/, String(reduced));
}

function reduceDrill(step: DrillStep): DrillStep {
  const stage = step.stage ?? 'drills';
  if (stage !== 'drills') return step; // prep, full-go execution and log are never cut
  const dosage = reduceDosageForPractice(step.dosage);
  return dosage === step.dosage ? step : { ...step, dosage };
}

/** A logged streak informs the legal card; a heavy stretch lightens same-category drills within their floors. */
export function applyPracticePlanContext(blocks: readonly PrescribedBlock[], loads: readonly CategoryPracticeLoad[]): readonly PrescribedBlock[] {
  return blocks.map(block => {
    if (block.status !== 'ready' || block.modality === 'strength' || block.modality === 'recovery') return block;
    const category = block.modality === 'defense' ? 'fielding' : block.modality;
    // Pitching and throwing logs are not interchangeable even when both use the arm.
    const module = new URL(block.route, 'https://local.invalid').searchParams.get('module');
    const exactCategory = category === 'throwing' && module === 'pitching' ? 'pitching' : category;
    const load = loads.find(row => row.category === exactCategory);
    if (!load) return block;
    if (!load.heavyStretch) {
      return { ...block, practiceContext: {
        category: load.category, sourceIds: [...load.sourceIds], sessions: load.sessions,
        minutes: load.minutes, intensityMinutes: load.intensityMinutes,
        missingMinutes: load.missingMinutes, missingIntensity: load.missingIntensity,
        consecutiveDays: load.consecutiveDays, doseChanged: false,
      } };
    }
    const drills = block.drills.map(reduceDrill);
    const doseChanged = drills.some((drill, i) => drill.dosage !== block.drills[i]?.dosage);
    return { ...block, drills,
      practiceContext: {
        category: load.category, sourceIds: [...load.sourceIds], sessions: load.sessions,
        minutes: load.minutes, intensityMinutes: load.intensityMinutes,
        missingMinutes: load.missingMinutes, missingIntensity: load.missingIntensity,
        consecutiveDays: load.consecutiveDays, doseChanged,
      },
      because: [...(block.because ?? []), doseChanged
        ? `Because you logged ${load.consecutiveDays} ${exactCategory} practice days in a row, today's ${exactCategory} drills are lighter — never below half the prescribed sets. Full-go work and today's rest and stop rules still apply.`
        : `Because you logged ${load.consecutiveDays} ${exactCategory} practice days in a row. Today's existing rest and stop rules still apply.`],
      roadmapReason: doseChanged
        ? `${block.roadmapReason} Logged ${exactCategory} practice streak; drill sets cut about 30% within their floors.`
        : `${block.roadmapReason} Logged ${exactCategory} practice streak checked; dose unchanged because this row has no declared minimum.`,
    };
  });
}
