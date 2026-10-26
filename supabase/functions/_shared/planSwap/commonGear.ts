/** Source labels help, but never limit what a player can declare missing. */
export const COMMON_SWAP_GEAR = ["barbell", "dumbbell", "bands", "pitching_machine", "net", "tee", "open_field", "hill", "sled", "foam_roller", "baseballs", "softballs", "gamer_bat"] as const;

const SAME_GEAR: Record<string, readonly string[]> = {
  bands: ["band", "resistance_band", "mini_band", "light_band", "sprint_band"],
  dumbbell: ["dumbbells", "db"], open_field: ["field", "open_space", "space"],
  baseballs: ["baseball", "ball"], softballs: ["softball", "ball"], pitching_machine: ["machine"],
  gamer_bat: ["bat", "game_bat"],
};

export function swapGearList(known: readonly string[]): string[] {
  return [...new Set([...known, ...COMMON_SWAP_GEAR])];
}

export function missingGearAnswer(checked: readonly string[], note: string | undefined, known: readonly string[]): string[] {
  const allowed = new Set(swapGearList(known));
  const selected = checked.filter(item => allowed.has(item));
  // A common answer covers the item's own label for the same gear (e.g. "bands" → "band").
  for (const item of [...selected]) for (const k of known) if (SAME_GEAR[item]?.includes(k)) selected.push(k);
  // Preserve the player's words; unknown requirements are never silently discarded.
  const other = note?.trim();
  return [...new Set([...selected, ...(other ? [other] : [])])];
}