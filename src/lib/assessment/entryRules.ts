export function assessmentEntryAllowed(input: { paid: boolean; started: boolean; completed: boolean; opened: boolean }): boolean {
  return input.paid && !input.started && !input.completed && !input.opened;
}