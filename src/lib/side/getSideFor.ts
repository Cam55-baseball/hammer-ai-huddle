/**
 * getSideFor — non-React helper for reading the athlete's last-used side
 * outside of the React tree (e.g. plan builders, edge-bound utilities,
 * background jobs). Reads the same localStorage key the SideContext
 * writes on every change.
 *
 * Trust-first: returns null when nothing has been chosen — callers must
 * treat null as "no side context, run combined logic."
 */
export type Side = "L" | "R";
export type Discipline = "hit" | "throw";

const LS_KEY = "asb.sideContext.v1";

export function getSideFor(discipline: Discipline): Side | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<Discipline, Side>>;
    const s = parsed?.[discipline];
    return s === "L" || s === "R" ? s : null;
  } catch {
    return null;
  }
}

/** Convenience for log lines / breadcrumbs. */
export function sideLabel(s: Side | null | undefined): string {
  if (s === "L") return "Left";
  if (s === "R") return "Right";
  return "Both";
}
