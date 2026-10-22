/** Source labels help, but never limit what a player can declare missing. */
export const COMMON_SWAP_GEAR = ["barbell", "dumbbell", "bands", "pitching_machine", "net", "tee", "open_field", "hill", "sled", "foam_roller", "baseballs", "softballs"] as const;

export function swapGearList(known: readonly string[]): string[] {
  return [...new Set([...known, ...COMMON_SWAP_GEAR])];
}

export function missingGearAnswer(checked: readonly string[], note: string | undefined, known: readonly string[]): string[] {
  const allowed = new Set(swapGearList(known));
  const selected = checked.filter(item => allowed.has(item));
  // Preserve the player's words; unknown requirements are never silently discarded.
  const other = note?.trim();
  return [...new Set([...selected, ...(other ? [other] : [])])];
}