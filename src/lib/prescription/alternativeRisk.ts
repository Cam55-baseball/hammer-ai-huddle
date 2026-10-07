/**
 * Alternative button (owner 2026-10-07): an alternative must be the same or
 * lower risk than the prescribed exercise. Because the prescribed exercise was
 * already legal for this player (age, growth, injury, season), "never riskier
 * than it" keeps every alternative inside the same rules.
 */
export interface RiskFacts {
  min_age_years?: number | null;
  plyo_tier?: number | null;
  ub_tier?: number | string | null; // stored as "U1"…"U3"
  eccentric_overload?: boolean | null;
  contraindications?: string[] | null;
  equipment_requirements?: string[] | null;
}

const tierNum = (v: unknown) => parseInt(String(v ?? 0).replace(/\D/g, ""), 10) || 0;
const norm = (s: string) => String(s).toLowerCase().replace(/[\s-]+/g, "_");

/** 3 barbell · 2 trap bar · 1 dumbbell/kettlebell/cable/machine · 0 band/bodyweight. */
export function loadTier(eq: string[] | null | undefined): number {
  const e = (eq ?? []).map(norm);
  if (e.some((x) => x.includes("barbell"))) return 3;
  if (e.some((x) => x.includes("trap_bar") || x.includes("hex_bar"))) return 2;
  if (e.some((x) => /^(db|kb)$|dumbbell|kettlebell|cable|machine|sled|landmine/.test(x))) return 1;
  return 0;
}

export function isSameOrLowerRisk(self: RiskFacts, c: RiskFacts): boolean {
  if (Number(c.min_age_years ?? 0) > Number(self.min_age_years ?? 0)) return false;
  if (Number(c.plyo_tier ?? 0) > Number(self.plyo_tier ?? 0)) return false;
  if (tierNum(c.ub_tier) > tierNum(self.ub_tier)) return false;
  if (c.eccentric_overload && !self.eccentric_overload) return false;
  const selfC = new Set((self.contraindications ?? []).map(norm));
  if ((c.contraindications ?? []).some((x) => !selfC.has(norm(x)))) return false;
  if (loadTier(c.equipment_requirements) > loadTier(self.equipment_requirements)) return false;
  return true;
}
