/**
 * Player Hammers Today cards show no plan-engine reasoning. Only the short
 * notes the owner approved pass: coach override/edit, allowed or mandatory
 * skip, "Replaced by coach workout", smart stop and the rest-day line.
 * Plan-change explanations live only in the "Why today's plan changed" drawer.
 * Coach and owner views read the raw reasons and never use this filter.
 */
const ALLOWED: RegExp[] = [
  /\bcoach\b/i,
  /\bskip/i,
  /replaced by coach workout/i,
  /smart stop/i,
  /\brest day\b/i,
];

export function playerCardNote(text: string | null | undefined): string | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  return ALLOWED.some((r) => r.test(t)) ? t : null;
}

export function playerCardNotes(lines: readonly string[] | null | undefined): string[] {
  return (lines ?? []).map(playerCardNote).filter((l): l is string => !!l);
}
