import type { SubGoalPick } from './categoryGoals';

/** Selection and priority are separate: selecting a chosen goal removes it. */
export function toggleGoalPick(slot: readonly SubGoalPick[], id: string): SubGoalPick[] {
  if (slot.some(p => p.id === id)) {
    return slot.filter(p => p.id !== id).map(p => ({ ...p, rank: 'primary' }));
  }
  if (slot.length >= 2) return [...slot];
  return [...slot, { id, rank: slot.length ? 'secondary' : 'primary' }];
}

export function prioritizeGoalPick(slot: readonly SubGoalPick[], id: string): SubGoalPick[] {
  if (!slot.some(p => p.id === id)) return [...slot];
  return [...slot].sort((a, b) => Number(b.id === id) - Number(a.id === id))
    .map((p, i) => ({ ...p, rank: i === 0 ? 'primary' : 'secondary' }));
}