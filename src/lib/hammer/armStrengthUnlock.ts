/** Owner Nov 4: Before-you-start line (Level 2, analysis_prompts) shown only when the player
 *  has no throwing/pitching clip analysis within the catch-play fresh window. */
export const ARM_STRENGTH_UNLOCK_TEXT = "Record one throwing clip to unlock arm-strength days";

export function armStrengthUnlockPrompt(i: { throwingToday: boolean; lastThrowingClipIso: string | null; today: string; freshDays: number }): string | null {
  if (!i.throwingToday) return null;
  if (i.lastThrowingClipIso) {
    const days = (Date.parse(`${i.today}T12:00:00Z`) - Date.parse(i.lastThrowingClipIso.slice(0, 10) + "T12:00:00Z")) / 86_400_000;
    if (days < i.freshDays) return null;
  }
  return ARM_STRENGTH_UNLOCK_TEXT;
}
