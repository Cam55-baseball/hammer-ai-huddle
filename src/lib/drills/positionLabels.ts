/**
 * Canonical defensive position codes + display helpers.
 * Legacy strings (`shortstop`, `second_base`, `catcher`, `pitcher_fielding`, ...)
 * are folded onto the short scorecard codes used everywhere else in the app.
 * Used by the Defensive Drill Library filter chips and any UI that renders
 * `drill_positions.position` values so we never show duplicate chips like
 * "2B" and "Second Base" side by side.
 */

export const POSITION_ORDER = [
  "P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF",
  "IF", "MI", "CI", "OF", "PFP", "UTIL",
] as const;

export type CanonicalPosition = (typeof POSITION_ORDER)[number];

const LEGACY_MAP: Record<string, CanonicalPosition> = {
  p: "P", pitcher: "P",
  c: "C", catcher: "C",
  "1b": "1B", first_base: "1B", firstbase: "1B", first: "1B",
  "2b": "2B", second_base: "2B", secondbase: "2B", second: "2B",
  "3b": "3B", third_base: "3B", thirdbase: "3B", third: "3B",
  ss: "SS", shortstop: "SS", short: "SS",
  lf: "LF", left_field: "LF", leftfield: "LF", left: "LF",
  cf: "CF", center_field: "CF", centerfield: "CF", center: "CF",
  rf: "RF", right_field: "RF", rightfield: "RF", right: "RF",
  if: "IF", infield: "IF",
  of: "OF", outfield: "OF",
  mi: "MI", middle_infield: "MI", middleinfield: "MI",
  ci: "CI", corner_infield: "CI", cornerinfield: "CI",
  pfp: "PFP", pitcher_fielding: "PFP", pitcherfielding: "PFP",
  util: "UTIL", utility: "UTIL",
};

const FULL_LABEL: Record<CanonicalPosition, string> = {
  P: "Pitcher",
  C: "Catcher",
  "1B": "First Base",
  "2B": "Second Base",
  SS: "Shortstop",
  "3B": "Third Base",
  LF: "Left Field",
  CF: "Center Field",
  RF: "Right Field",
  IF: "Infield",
  MI: "Middle Infield",
  CI: "Corner Infield",
  OF: "Outfield",
  PFP: "Pitcher Fielding",
  UTIL: "Utility",
};

export function normalizePositionCode(raw: string | null | undefined): CanonicalPosition | null {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!key) return null;
  // Already canonical short code?
  const upper = key.toUpperCase() as CanonicalPosition;
  if ((POSITION_ORDER as readonly string[]).includes(upper)) return upper;
  return LEGACY_MAP[key] ?? null;
}

/** Full display label — "2B — Second Base". Falls back to raw when unknown. */
export function positionLabel(raw: string | null | undefined): string {
  const c = normalizePositionCode(raw);
  if (!c) return (raw ?? "").toString();
  return `${c} — ${FULL_LABEL[c]}`;
}

/** Short display label — "2B". */
export function positionShort(raw: string | null | undefined): string {
  const c = normalizePositionCode(raw);
  return c ?? (raw ?? "").toString();
}

/** Sort canonical codes in scorecard order; unknown values slide to the end alphabetically. */
export function sortPositions<T extends string>(codes: readonly T[]): T[] {
  const order = new Map<string, number>();
  POSITION_ORDER.forEach((c, i) => order.set(c, i));
  return [...codes].sort((a, b) => {
    const na = normalizePositionCode(a);
    const nb = normalizePositionCode(b);
    const ai = na ? order.get(na) ?? 999 : 999;
    const bi = nb ? order.get(nb) ?? 999 : 999;
    if (ai !== bi) return ai - bi;
    return String(a).localeCompare(String(b));
  });
}

/**
 * Collapse a list of raw position strings into a de-duplicated list of
 * canonical codes sorted in scorecard order. Unknown values are dropped.
 */
export function canonicalizePositions(raws: Iterable<string | null | undefined>): CanonicalPosition[] {
  const seen = new Set<CanonicalPosition>();
  for (const r of raws) {
    const c = normalizePositionCode(r);
    if (c) seen.add(c);
  }
  return sortPositions(Array.from(seen)) as CanonicalPosition[];
}
