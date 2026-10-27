/** Display-only: partial numeric work keeps its canonical completion outcome. */
export function timerWasCutShort(input: { stopped: boolean; elapsed: number; target?: number; hasEnteredValue: boolean }): boolean {
  return input.stopped && !input.hasEnteredValue && input.target != null && input.target > 0 && input.elapsed > 0 && input.elapsed < input.target;
}