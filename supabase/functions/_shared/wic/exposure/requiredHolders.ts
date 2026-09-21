/**
 * Step 24 item 8 — a load trim may lower a row, it may never remove a row that
 * holds a category its template REQUIRES.
 *
 * Dropping the sprint session's acceleration row is exactly what made cards
 * fail to build on 2026-09-21: the selector had filled the slot, the governor
 * removed it, and the certifier then read the template as unresolved.
 */
export interface TrimLike {
  slug: string;
  action: string;
  to?: { slug: string; tier?: string; sets: number; amount?: number } | null;
}

export interface TrimPlan<T extends TrimLike> {
  /** Slugs the governor may remove from the day. */
  dropped: Set<string>;
  /** Slugs the governor may swap down, by their replacement. */
  stepped: Map<string, NonNullable<T["to"]>>;
  /** Trims refused because the row holds a required category. */
  protectedSlugs: string[];
}

export function planTrims<T extends TrimLike>(
  trims: readonly T[],
  requiredHolders: ReadonlySet<string>,
): TrimPlan<T> {
  const protectedSlugs: string[] = [];
  const dropped = new Set<string>();
  const stepped = new Map<string, NonNullable<T["to"]>>();
  for (const t of trims) {
    const isRequired = requiredHolders.has(t.slug);
    if (t.action === "row_dropped" || t.action === "blocked") {
      if (isRequired) protectedSlugs.push(t.slug);
      else dropped.add(t.slug);
      continue;
    }
    if (t.action === "tier_step_down" && t.to) {
      if (isRequired) protectedSlugs.push(t.slug);
      else stepped.set(t.slug, t.to as NonNullable<T["to"]>);
    }
  }
  return { dropped, stepped, protectedSlugs };
}
