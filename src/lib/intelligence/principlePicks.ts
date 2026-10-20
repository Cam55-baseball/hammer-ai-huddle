/**
 * Owner answers as structured picks (owner decision, Oct 20): a saved answer's
 * connected_work lists linked drill slugs, one per line. Picks guide drill
 * choice and Because text; they never change a dose directly.
 */
export interface PrinciplePick {
  readonly id: string;
  readonly sport: string;
  readonly area: string;
  readonly situation: string | null;
  readonly applies_when: string | null;
  readonly not_when: string | null;
  readonly connected_work: string | null;
}

/** One drill slug per line; blank lines and surrounding space ignored. */
export function parseConnectedWork(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[a-z0-9][a-z0-9-_]*$/i.test(line));
}

export function formatConnectedWork(slugs: readonly string[]): string {
  return slugs.map((s) => s.trim()).filter(Boolean).join("\n");
}

/**
 * The picks that link a drill, scoped to the exact sport and category (area).
 * A pick for another sport or category never influences this drill.
 */
export function principleDrillBoosts(
  picks: readonly PrinciplePick[],
  drillSlug: string,
  sport: string,
  category: string,
): PrinciplePick[] {
  return picks.filter(
    (p) =>
      p.sport === sport &&
      p.area === category &&
      parseConnectedWork(p.connected_work).includes(drillSlug),
  );
}
