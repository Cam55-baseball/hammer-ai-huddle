/**
 * Owner review queue: flagged descriptions, how-to drafts and series lists.
 * An item leaves the queue once the owner approves it or makes an edit live.
 */
export type ReviewReason = "flagged description" | "how-to draft" | "series list" | "warm-up stage" | "lift tag" | "equipment correction" | "swap difficulty jump";
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
  /** Swap pairs crossing more than one difficulty level (Swap never offers them). */
  difficultyJumps?: ReadonlyArray<{ slug: string; note: string }>;
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
  for (const w of input.difficultyJumps ?? []) add(w.slug, "swap difficulty jump", w.note);
  const pendingGear = new Set(input.equipmentReview?.map(row => row.slug));
  return [...map.values()].filter((i) => !input.cleared.has(i.slug) || pendingGear.has(i.slug)).sort((a, b) => a.slug.localeCompare(b.slug));
}

import { isDifficultyJump } from "../../../supabase/functions/_shared/planSwap/simpleSwap";

/** Every same-family Swap pair whose difficulty differs by more than one level. */
export function swapDifficultyJumps(catalog: ReadonlyArray<Record<string, any>>): Array<{ slug: string; note: string }> {
  const groups = new Map<string, Record<string, any>[]>();
  for (const r of catalog) {
    if (!r.substitution_family || !r.movement_category || r.is_active === false) continue;
    const k = `${r.movement_category}|${r.substitution_family}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const partners = new Map<string, { name: string; others: string[] }>();
  const note = (r: Record<string, any>, other: string) => {
    const e = partners.get(r.slug) ?? { name: r.name, others: [] };
    e.others.push(other); partners.set(r.slug, e);
  };
  for (const rows of groups.values()) for (const a of rows) for (const b of rows) {
    if (a.slug < b.slug && isDifficultyJump(a, b)) { note(a, b.name); note(b, a.name); }
  }
  const out = [...partners.entries()].map(([slug, e]) => ({ slug,
    note: `Swap won't offer ${e.others.length} partner${e.others.length === 1 ? "" : "s"} more than one difficulty level away (e.g. ${e.others.slice(0, 3).join(", ")}) until reviewed.` }));
  return out;
}
