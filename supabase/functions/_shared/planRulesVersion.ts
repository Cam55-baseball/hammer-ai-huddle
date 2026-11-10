/**
 * Owner Nov 4 r4: plan builder RULES VERSION. Bump whenever a rule change must reach
 * already-saved days. Saved days stamped with an older version (or none) are rebuilt,
 * today and later, through the normal build path; logged/marked work is never touched.
 * 2 = throw-count catch play only (no timed catch play), arm cool-down in Recovery.
 * 3 = owner throwing drills can take the built-in catch-play steps' place (Nov 5 round 2).
 * 7 = skill reps (e.g. double-play / quick-release) never sit in the warm-up (Nov 5 round 5).
 * 11 = pitching (incl. windmill) always follows the throwing card (owner Nov 6).
 * 12 = planner check-ins: soreness = recovery 4 or below, blank sleep/recovery = unknown,
 *      a day's check-ins never erase each other's sleep/recovery (owner Nov 9 r4 / Nov 10).
 */
export const PLAN_RULES_VERSION = 12;

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
