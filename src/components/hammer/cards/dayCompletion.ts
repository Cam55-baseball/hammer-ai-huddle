/** Completion is a projection of saved work and saved check-ins, never a new ledger. */
export function dayFullyDone(work: readonly { done: number; total: number }[], checkIns: { morning: boolean; night: boolean; preLift: boolean; requiresPreLift: boolean }): boolean {
  return work.length > 0 && work.every(row => row.total >= 0 && row.done >= row.total)
    && checkIns.morning && checkIns.night && (!checkIns.requiresPreLift || checkIns.preLift);
}