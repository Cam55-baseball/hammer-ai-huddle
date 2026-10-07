/**
 * Program retirement (owner plan, 2026-10-07). Behind switch `programs_retired`
 * (wk_feature_switches), OFF until the owner confirms Hammers Today works.
 *
 * When ON for a player the five programs DISAPPEAR: no menu items, links, tiles,
 * cards, pages or routes (a direct URL goes to the dashboard — never a redirect
 * banner), no mention in pricing, plan descriptions, help chat or onboarding, and
 * their Game Plan tasks and calendar entries are hidden. Nothing is deleted:
 * their data stays in the live tables and in the _archive_*_20261007 copies, and
 * their code stays in place (index: src/archive/retired-programs/README.md) so
 * switching OFF brings everything back exactly as before.
 *
 * Shared by the app and the edge functions — keep it dependency-free.
 */
export const PROGRAMS_RETIRED_KEY = "programs_retired";

export interface RetiredProgram {
  name: string;
  aliases: string[];
  routes: string[];
  /** Task / calendar / progress keys that belong to this program. */
  keys: string[];
}

export const RETIRED_PROGRAMS: ReadonlyArray<RetiredProgram> = [
  { name: "Speed Lab", aliases: [], routes: ["/speed-lab"], keys: ["speed-lab", "speed_lab"] },
  { name: "Explosive Conditioning", aliases: [], routes: ["/explosive-conditioning"], keys: ["explosive-conditioning", "explosive_conditioning"] },
  { name: "The Unicorn", aliases: ["The Unicorn Workout System", "Unicorn"], routes: ["/the-unicorn"], keys: ["the-unicorn", "the_unicorn", "unicorn"] },
  { name: "Iron Bambino", aliases: ["Iron Bambino (Upgraded)", "Production Lab"], routes: ["/production-lab"], keys: ["production-lab", "production_lab", "iron_bambino", "iron-bambino", "workout-hitting"] },
  { name: "Heat Factory", aliases: ["Production Studio"], routes: ["/production-studio"], keys: ["production-studio", "production_studio", "heat_factory", "heat-factory", "workout-pitching"] },
];

const ROUTES = new Set(RETIRED_PROGRAMS.flatMap((p) => p.routes));
const KEYS = new Set(RETIRED_PROGRAMS.flatMap((p) => p.keys));
const NAMES = RETIRED_PROGRAMS.flatMap((p) => [p.name, ...p.aliases])
  .sort((a, b) => b.length - a.length)
  .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const NAME_RE = new RegExp(`(${NAMES.join("|")})`, "i");

/** True when a path (with or without query/hash) is one of the five program pages. */
export function isRetiredRoute(path: string | null | undefined): boolean {
  if (!path) return false;
  const p = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return ROUTES.has(p) || [...ROUTES].some((r) => p.startsWith(r + "/"));
}

/** True when a task / calendar / progress key belongs to one of the five programs. */
export function isRetiredKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const k = String(key).toLowerCase();
  if (KEYS.has(k)) return true;
  return [...KEYS].some((x) => k.startsWith(x + ":") || k.startsWith(x + "-day") || k.startsWith(x + "_"));
}

/** True when free text names one of the five programs. */
export function mentionsRetired(text: string | null | undefined): boolean {
  return !!text && NAME_RE.test(text);
}

/**
 * Remove program names from a comma / plus separated description, e.g.
 * "Pitching Analysis, Heat Factory, Ask the Coach" -> "Pitching Analysis, Ask the Coach".
 */
export function scrubRetiredFromList(text: string): string {
  if (!mentionsRetired(text)) return text;
  const parts = text.split(/\s*(,|\s\+\s)\s*/);
  const kept: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const item = parts[i];
    if (!item || mentionsRetired(item)) continue;
    kept.push(item);
  }
  return kept.join(", ");
}

/** Drop every line that names one of the five programs (used for help-chat prompts). */
export function scrubRetiredLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => !mentionsRetired(line))
    .join("\n");
}
