// Locked by owner Nov 6: for anyone who pitches, the day runs
// full-body warm-up → throwing (arm care + catch-play ladder) → pitching → the rest.
// This only moves existing blocks; it never adds, removes or changes work.
const isPitching = (m: string) => m === 'pitching' || m === 'windmill';

export function pitchingAfterThrowing<T extends { modality: string }>(blocks: readonly T[]): T[] {
  const out = [...blocks];
  const throwIdx = out.findIndex(b => b.modality === 'throwing');
  if (throwIdx < 0) return out;
  const early = out.filter((b, i) => i < throwIdx && isPitching(b.modality));
  if (!early.length) return out;
  const rest = out.filter(b => !early.includes(b));
  const t = rest.findIndex(b => b.modality === 'throwing');
  rest.splice(t + 1, 0, ...early);
  return rest;
}

/** Lock-in guard: true when any pitching block comes before the throwing warm-up. */
export function pitchingBeforeThrowing(blocks: readonly { modality: string }[]): boolean {
  const throwIdx = blocks.findIndex(b => b.modality === 'throwing');
  return throwIdx >= 0 && blocks.some((b, i) => i < throwIdx && isPitching(b.modality));
}
