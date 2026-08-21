/**
 * Position-group mapping for the elite video tagging engine.
 *
 * Taxonomy tags and cross-tag rules are scoped to coarse position GROUPS
 * (a catcher cue must never surface for an outfielder). Athlete/video
 * position data is free-form, so everything routes through this mapper.
 */
import { coercePositionTokens } from "./positionNormalizer";

export const POSITION_GROUPS = [
  "pitcher",
  "catcher",
  "first_base",
  "middle_infield",
  "third_base",
  "corner_outfield",
  "center_field",
] as const;

export type PositionGroup = (typeof POSITION_GROUPS)[number];

export const POSITION_GROUP_LABELS: Record<PositionGroup, string> = {
  pitcher: "Pitcher",
  catcher: "Catcher",
  first_base: "First base",
  middle_infield: "Middle infield (2B/SS)",
  third_base: "Third base",
  corner_outfield: "Corner outfield (LF/RF)",
  center_field: "Center field",
};

/** Map one raw token (e.g. "SS", "3", "right field") to a group. */
export function tokenToPositionGroup(raw: string): PositionGroup | null {
  const p = raw.toLowerCase().trim().replace(/[\s_-]+/g, "");
  if (!p) return null;
  if (p === "p" || p === "1" || p === "sp" || p === "rp" || p === "cp" || p.includes("pitch")) return "pitcher";
  if (p === "c" || p === "2" || p.includes("catch")) return "catcher";
  if (p === "1b" || p === "3" || p.includes("first")) return "first_base";
  if (p === "2b" || p === "4" || p.includes("second")) return "middle_infield";
  if (p === "ss" || p === "6" || p.includes("short")) return "middle_infield";
  if (p === "mif" || p === "mi" || p.includes("middleinfield")) return "middle_infield";
  if (p === "3b" || p === "5" || p.includes("third")) return "third_base";
  if (p === "cf" || p === "8" || p.includes("center")) return "center_field";
  if (p === "lf" || p === "7" || p.includes("left")) return "corner_outfield";
  if (p === "rf" || p === "9" || p.includes("right")) return "corner_outfield";
  if (p === "of" || p.includes("outfield")) return "corner_outfield";
  if (p === "if" || p.includes("infield")) return "middle_infield";
  if (p === "util" || p === "utility") return null;
  return null;
}

/** Resolve any athlete/video position value into distinct position groups. */
export function resolvePositionGroups(value: unknown): PositionGroup[] {
  const out: PositionGroup[] = [];
  for (const token of coercePositionTokens(value)) {
    const g = tokenToPositionGroup(token);
    if (g && !out.includes(g)) out.push(g);
  }
  return out;
}
