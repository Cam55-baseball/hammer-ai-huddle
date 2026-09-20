/**
 * Step 15 item 2 — the mandatory-category ladder.
 *
 * A template-required category may never be left empty. A day's class cap, a
 * spike trim or any other reducer may LOWER INTENSITY; none of them may delete
 * a required category. Before this module the class cap removed every legal
 * core row on a capped day and the whole session failed validation, so the
 * athlete was served the fallback day instead of the session they had earned.
 *
 * Pure: the callers hand in already-gated pickers, so season legality, injury
 * contraindications, training age, scope and catalog integrity are enforced
 * upstream and are never relaxed here.
 */

export type MandatoryPick<M> = {
  movement: M;
  /** The day-adaptation gate was relaxed to fill the category. */
  relaxed: boolean;
  /** The allowed-class gate was relaxed — the row must be dosed down. */
  classRelaxed: boolean;
};

export type MandatoryPickers<M> = {
  /** Fully gated pick from an explicit slug pool. */
  strict: (slugs: string[]) => M | undefined;
  /** Same gates with ONLY the day-adaptation gate relaxed. */
  adaptationRelaxed: (slugs: string[]) => M | undefined;
  /** Adaptation AND allowed-class relaxed. Never relaxes safety or the ceiling. */
  classRelaxed: (slugs: string[]) => M | undefined;
  /** Canonical category of a candidate. */
  categoryOf: (m: M) => string | null | undefined;
};

/**
 * Ladder, in order:
 *   1. preferred pool, fully gated
 *   2. preferred pool, day-adaptation relaxed
 *   3. anything of that category, day-adaptation relaxed
 *   4. preferred pool then anything of that category, class relaxed and dosed down
 */
export function pickMandatory<M>(
  catalogSlugsOfCategory: string[],
  preferred: string[],
  category: string,
  p: MandatoryPickers<M>,
): MandatoryPick<M> | undefined {
  for (const slug of preferred) {
    const c = p.strict([slug]);
    if (c && p.categoryOf(c) === category) return { movement: c, relaxed: false, classRelaxed: false };
  }
  for (const slug of preferred) {
    const c = p.adaptationRelaxed([slug]);
    if (c && p.categoryOf(c) === category) return { movement: c, relaxed: true, classRelaxed: false };
  }
  for (const slug of catalogSlugsOfCategory) {
    const c = p.adaptationRelaxed([slug]);
    if (c) return { movement: c, relaxed: true, classRelaxed: false };
  }
  for (const slug of [...preferred, ...catalogSlugsOfCategory]) {
    const c = p.classRelaxed([slug]);
    if (c && p.categoryOf(c) === category) return { movement: c, relaxed: true, classRelaxed: true };
  }
  return undefined;
}

/** The lightest legal dose a class-relaxed rescue is allowed to carry. */
export const MANDATORY_RESCUE_SETS = 2;
