export function assessmentEntryAllowed(input: { paid: boolean; started: boolean; completed: boolean; opened: boolean; explicitResume?: boolean }): boolean {
  return input.paid && !input.started && !input.completed && (!input.opened || input.explicitResume === true);
}

/** A bare entry uses saved sport, never a guessed baseball default. */
export function assessmentEntrySport(saved: unknown, requested: string | null): 'baseball' | 'softball' | null {
  if (saved !== 'baseball' && saved !== 'softball') return null;
  return requested === null || requested === saved ? saved : null;
}