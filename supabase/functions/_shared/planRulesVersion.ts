/**
 * Owner Nov 4 r4: plan builder RULES VERSION. Bump whenever a rule change must reach
 * already-saved days. Saved days stamped with an older version (or none) are rebuilt,
 * today and later, through the normal build path; logged/marked work is never touched.
 * 2 = throw-count catch play only (no timed catch play), arm cool-down in Recovery.
 */
export const PLAN_RULES_VERSION = 3;

export function savedRulesVersion(payload: unknown): number {
  const v = Number((payload as { rules_version?: unknown } | null)?.rules_version);
  return Number.isFinite(v) ? v : 0;
}

/** Saved days that must be rebuilt: today or later, older rules (or a newer throwing/pitching
 *  clip than the save, so the arm-strength gate reads it), and not protected by logged work. */
export function staleSavedDates(
  rows: ReadonlyArray<{ plan_date: string; payload: unknown; updated_at: string | null }>,
  o: { today: string; protectedDates: ReadonlySet<string>; latestClipAt: string | null; current?: number },
): string[] {
  const cur = o.current ?? PLAN_RULES_VERSION;
  return [...new Set(rows.filter((r) => {
    const d = String(r.plan_date);
    if (d < o.today || o.protectedDates.has(d)) return false;
    if (savedRulesVersion(r.payload) < cur) return true;
    return !!o.latestClipAt && !!r.updated_at && Date.parse(o.latestClipAt) > Date.parse(r.updated_at);
  }).map((r) => String(r.plan_date)))].sort();
}
