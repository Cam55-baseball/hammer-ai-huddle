/** Exposure tier is not session intent: resisted work cannot become a second acceleration. */
export function preservesSpeedIntent(
  slot: string | undefined,
  sourceCategory: string | null | undefined,
  targetCategory: string | null | undefined,
): boolean {
  if (slot !== 'speed') return true;
  return Boolean(sourceCategory) && sourceCategory === targetCategory;
}