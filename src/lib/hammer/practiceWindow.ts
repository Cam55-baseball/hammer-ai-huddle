export const PRACTICE_WINDOW_SAVED = "hammers.practice-window.saved";
export const PRACTICE_MODULES = ["hitting", "pitching", "throwing", "fielding", "baserunning", "bunting"] as const;
export const PRACTICE_TYPES = ["solo_work", "team_session", "lesson", "live_abs"] as const;

/** A message is only a refetch hint. Counts come from the successfully saved self-owned session. */
export function savedPracticeCount(session: {
  user_id: string; sport: string; module: string | null; deleted_at?: string | null;
  fatigue_state_at_session: unknown; micro_layer_data: unknown;
}, expected: { userId: string; sport: string; module: string; token: string }): number | null {
  if (session.user_id !== expected.userId || session.sport !== expected.sport || session.module !== expected.module || session.deleted_at) return null;
  const fatigue = session.fatigue_state_at_session;
  if (!fatigue || typeof fatigue !== "object" || !("today_exercise" in fatigue)) return null;
  const context = fatigue.today_exercise;
  if (!context || typeof context !== "object" || !("token" in context) || context.token !== expected.token) return null;
  return Array.isArray(session.micro_layer_data) && session.micro_layer_data.length > 0 ? session.micro_layer_data.length : null;
}

export function practiceWindowRoute(route: string, token: string) {
  const url = new URL(route, "https://hammersmodality.org");
  if (url.pathname !== "/practice") return route;
  url.searchParams.set("today_window", token);
  return `${url.pathname}${url.search}`;
}
/** Card categories → the practice log that owns them (Defense cards log as Fielding; bat speed logs as hitting). */
const MODULE_ALIASES: Record<string, (typeof PRACTICE_MODULES)[number]> = {
  hitting: "hitting", bat_speed: "hitting", "bat-speed": "hitting", "practice-hub": "hitting", "tex-vision": "hitting",
  bunting: "bunting", pitching: "pitching", throwing: "throwing",
  defense: "fielding", fielding: "fielding", catching: "fielding",
  baserunning: "baserunning", "speed-lab": "baserunning",
};

export function practiceModuleFor(value: string | null | undefined) {
  return value ? MODULE_ALIASES[value] ?? null : null;
}

/**
 * Every Today-card practice button opens the right log, ready to fill in for today:
 * the card's category, a solo session type, the card's activity and today's date.
 * Non-practice routes pass through unchanged.
 */
export function cardPracticeRoute(route: string, card?: { modality?: string | null; activity?: string | null }, today?: string) {
  const url = new URL(route, "https://hammersmodality.org");
  if (url.pathname !== "/practice") return route;
  const fromCard = card?.modality === "bunting" || card?.modality === "bat_speed" ? practiceModuleFor(card.modality) : null;
  const module = fromCard ?? practiceModuleFor(url.searchParams.get("module")) ?? practiceModuleFor(card?.modality) ?? "hitting";
  url.searchParams.set("module", module);
  if (!url.searchParams.get("type")) url.searchParams.set("type", "solo_work");
  if (card?.activity && !url.searchParams.get("drill_type")) url.searchParams.set("drill_type", card.activity);
  if (today) url.searchParams.set("date", today);
  return `${url.pathname}${url.search}`;
}

/** A throwing item's prescribed throws, by distance when the dose names one (e.g. "60ft x 10 throws"). */
export function throwsByDistance(dosage: string): { feet: number | null; throws: number }[] {
  const text = dosage.replace(/×/g, "x");
  const pairs = [...text.matchAll(/(\d+)\s*(?:ft|feet)\s*x\s*(\d+)\s*throws?/gi)].map((m) => ({ feet: Number(m[1]), throws: Number(m[2]) }));
  if (pairs.length) return pairs;
  const sets = text.match(/(\d+)\s*x\s*(\d+)\s*throws?/i);
  if (sets) return [{ feet: null, throws: Number(sets[1]) * Number(sets[2]) }];
  const one = text.match(/(\d+)\s*throws?/i);
  return one ? [{ feet: null, throws: Number(one[1]) }] : [];
}

/** Plain line shown on the practice log, e.g. "Throws: 45 ft × 10 · 60 ft × 10 (20 total)". */
export function throwPlanLine(dosage: string): string | null {
  const rows = throwsByDistance(dosage);
  if (!rows.length) return null;
  const total = rows.reduce((sum, r) => sum + r.throws, 0);
  const parts = rows.map((r) => (r.feet ? `${r.feet} ft × ${r.throws}` : `${r.throws}`));
  return rows.length > 1 || rows[0].feet ? `Throws: ${parts.join(" · ")} (${total} total)` : `Throws: ${total}`;
}

/**
 * Owner Nov 5 round 5: a throwing item's practice button opens the EXISTING throwing practice log
 * (the same page every other card's practice button opens) for today, with the item and its throws
 * by distance. No separate throwing logger.
 */
export function throwPracticeRoute(name: string, dosage: string, today: string): string {
  const base = cardPracticeRoute("/practice?module=throwing", { modality: "throwing", activity: name }, today);
  const line = throwPlanLine(dosage);
  if (!line) return base;
  const url = new URL(base, "https://hammersmodality.org");
  url.searchParams.set("constraints", line);
  return `${url.pathname}${url.search}`;
}
