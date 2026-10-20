import type { PrescribedBlock } from './dailyPlan';
import type { CategoryPracticeLoad } from './categoryPracticeLoad';

/** A logged streak informs the legal card. Unknown dose floors never become guessed cuts. */
export function applyPracticePlanContext(blocks: readonly PrescribedBlock[], loads: readonly CategoryPracticeLoad[]): readonly PrescribedBlock[] {
  return blocks.map(block => {
    if (block.status !== 'ready' || block.modality === 'strength' || block.modality === 'recovery') return block;
    const category = block.modality === 'defense' ? 'fielding' : block.modality;
    // Pitching and throwing logs are not interchangeable even when both use the arm.
    const module = new URL(block.route, 'https://local.invalid').searchParams.get('module');
    const exactCategory = category === 'throwing' && module === 'pitching' ? 'pitching' : category;
    const load = loads.find(row => row.category === exactCategory && row.heavyStretch);
    if (!load) return block;
    return { ...block, because: [...(block.because ?? []),
      `Because you logged ${load.consecutiveDays} ${exactCategory} practice days in a row. Today's existing rest and stop rules still apply.`],
      roadmapReason: `${block.roadmapReason} Logged ${exactCategory} practice streak checked; dose unchanged because this row has no declared minimum.` };
  });
}