import { CATEGORY_LABELS, modalityToCategory, rankedCategories } from '../goals/categoryGoals';
import type { AthleteContextProjection } from '../context/decisionFilters';
import { SKILL_MODALITIES, resolveSkillDaysTarget, type SkillModality } from '../roadmap/skillFrequencyLadder';
import { resolveSkillDays, type SkillDayTargets, type WeeklyTemplate } from './weeklyMicrocycle';

/** Reuses existing legal template slots; never creates minutes, throwing doses or a rest-day slot. */
export function weeklyGoalBlocks(
  template: WeeklyTemplate,
  baseline: SkillDayTargets,
  proj: AthleteContextProjection,
  position: unknown,
  included: ReadonlySet<string>,
) {
  const targets = { ...baseline };
  const ranks = rankedCategories(proj.categoryGoals);
  const top = ranks[0];
  const modality = SKILL_MODALITIES.find(m => modalityToCategory(m) === top && included.has(m));
  if (!top) return { template, targets, modality: null, reason: null };
  const label = CATEGORY_LABELS[top];
  if (!modality) return { template, targets, modality: null,
    reason: `${label} is your top goal. No extra skill block fits this category; lifting stays unchanged.` };
  const current = baseline[modality];
  if (current === undefined) return { template, targets, modality, reason: null };
  const ceiling = resolveSkillDaysTarget('sustain', modality, position, proj.injuryRegions, proj.lifecycleBand, proj.liftingAgeYears);
  const existing = resolveSkillDays(template, modality, current).days;
  // New effort must fit an existing training day AND the modality's phase template.
  // Recovery/rest days and earned overflow are not an extra-goal entitlement.
  const trainingDays = new Set(SKILL_MODALITIES.filter(m => included.has(m))
    .flatMap(m => resolveSkillDays(template, m, baseline[m] ?? 0).days));
  const availability = proj.weeklyAvailabilityDays;
  const extra = template.perModality[modality].find(d => !existing.includes(d) && trainingDays.has(d));
  const protectedContext = proj.workloadHigh || (proj.readinessScore !== null && proj.readinessScore < 0.5)
    || proj.parentSupremacyActive || proj.injuryRegions.length > 0;
  const allowed = current < ceiling && extra !== undefined && !protectedContext
    && availability !== null && trainingDays.size <= availability && proj.seasonPhase !== 'post';
  if (!allowed) return { template, targets, modality,
    reason: `${label} is your top goal. An extra weekly skill block cannot fit the current phase, rest or day limits; your baseline stays.` };
  targets[modality] = current + 1;
  const next: WeeklyTemplate = {
    ...template,
    priorityDayOrder: { ...template.priorityDayOrder, [modality]: [...existing, extra] },
    intensityOverrides: { ...template.intensityOverrides,
      [modality]: { ...template.intensityOverrides?.[modality], [extra]: 'activation' } },
  };
  return { template: next, targets, modality,
    reason: `${label} is your top goal: one extra light skill block this week, inside your existing training days. Rest and throwing limits still win.` };
}

/** Second goal leads shared skill days; anchors and lifting positions never move. */
export function secondGoalFirst<T extends { modality: string; status: string }>(blocks: readonly T[], proj: AthleteContextProjection): readonly T[] {
  const second = rankedCategories(proj.categoryGoals)[1];
  if (!second) return blocks;
  const skillSet = new Set<string>(SKILL_MODALITIES);
  const slots = blocks.map((b, i) => b.status === 'ready' && skillSet.has(b.modality) ? i : -1).filter(i => i >= 0);
  const shared = slots.map(i => blocks[i]);
  if (shared.length < 2 || !shared.some(b => modalityToCategory(b.modality) === second)) return blocks;
  shared.sort((a, b) => Number(modalityToCategory(b.modality) === second) - Number(modalityToCategory(a.modality) === second));
  const out = [...blocks];
  slots.forEach((slot, i) => { out[slot] = shared[i]; });
  return out;
}