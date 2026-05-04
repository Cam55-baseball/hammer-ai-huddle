// Formal state machine for the demo flow. Invalid transitions throw.
export type DemoState = 'pending' | 'in_progress' | 'skipped' | 'completed';

const TRANSITIONS: Record<DemoState, DemoState[]> = {
  pending: ['in_progress', 'skipped', 'completed'],
  in_progress: ['skipped', 'completed', 'in_progress'],
  skipped: ['in_progress', 'completed'], // allow resume
  completed: ['completed'], // terminal
};

export function canTransition(from: DemoState, to: DemoState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: DemoState, to: DemoState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid demo state transition: ${from} → ${to}`);
  }
}
