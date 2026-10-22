/**
 * Owner review queue: flagged descriptions, how-to drafts and series lists.
 * An item leaves the queue once the owner approves it or makes an edit live.
 */
export type ReviewReason = "flagged description" | "how-to draft" | "series list" | "warm-up stage" | "lift tag" | "equipment correction";
export interface ReviewItem { slug: string; reasons: ReviewReason[]; notes: string[] }

const SERIES = /series|circuit|complex|full chart|routine/i;

function parseTsv(tsv: string, noteCol: number) {
  return tsv.split("\n").slice(1).map((l) => l.split("\t")).filter((c) => c[0]?.trim()).map((c) => ({ slug: c[0].trim(), note: (c[noteCol] ?? "").trim() }));
}

export function buildReviewQueue(input: {
  flaggedTsv: string; howToTsv: string;
  catalog: Array<{ slug: string; name: string }>;
  cleared: ReadonlySet<string>;
  /** Warm-up movements whose starting stage the owner should confirm. */
  warmupStage?: ReadonlyArray<{ slug: string; note: string }>;
  /** Lifts whose movement tag the owner should decide (Lifting Blueprint). */
  liftTag?: ReadonlyArray<{ slug: string; note: string }>;
  equipmentReview?: ReadonlyArray<{ slug: string; note: string }>;
}): ReviewItem[] {
  const map = new Map<string, ReviewItem>();
  const add = (slug: string, reason: ReviewReason, note: string) => {
    const it = map.get(slug) ?? { slug, reasons: [], notes: [] };
    if (!it.reasons.includes(reason)) it.reasons.push(reason);
    if (note && !it.notes.includes(note)) it.notes.push(note);
    map.set(slug, it);
  };
  for (const r of parseTsv(input.flaggedTsv, 2)) add(r.slug, "flagged description", r.note);
  for (const r of parseTsv(input.howToTsv, 3)) add(r.slug, "how-to draft", r.note);
  for (const c of input.catalog) if (SERIES.test(c.name)) add(c.slug, "series list", "List every movement in the series.");
  for (const w of input.warmupStage ?? []) add(w.slug, "warm-up stage", w.note);
  for (const w of input.liftTag ?? []) add(w.slug, "lift tag", w.note);
  for (const w of input.equipmentReview ?? []) add(w.slug, "equipment correction", w.note);
  const pendingGear = new Set(input.equipmentReview?.map(row => row.slug));
  return [...map.values()].filter((i) => !input.cleared.has(i.slug) || pendingGear.has(i.slug)).sort((a, b) => a.slug.localeCompare(b.slug));
}
