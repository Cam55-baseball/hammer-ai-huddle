/** Vault helpers for the warm-up stage tag (starting stages, review items, sample preview). */
import { WARMUP_LIBRARY, buildWarmup } from "@/lib/hammer/prescription/warmupLibrary";
import { STAGE_BY_ROLE, WARMUP_STAGES, WARMUP_STAGE_REVIEW, guessStageFromName, stageFor, orderWithinStage } from "@/lib/hammer/prescription/warmupStages";

const LIB = new Map(WARMUP_LIBRARY.map((d) => [d.slug, d]));

export const isLibraryWarmup = (slug: string) => LIB.has(slug);

/** Starting stage: where the movement sits today (its builder group), else a name-based guess. */
export function defaultWarmupStage(slug: string, name: string): number {
  const d = LIB.get(slug);
  return d ? STAGE_BY_ROLE[d.role] : guessStageFromName(name);
}

export const stageLabel = (n: number | null | undefined) =>
  n == null ? "No stage" : `${n} · ${WARMUP_STAGES[n]?.name ?? "?"}`;

/** Warm-up movements whose starting stage the owner should confirm, with the suggested stage. */
export function warmupStageReviewItems(catalog: ReadonlyArray<{ slug: string; name: string; category: string | null }>): Array<{ slug: string; note: string }> {
  const out = WARMUP_STAGE_REVIEW.map((r) => ({ slug: r.slug, note: `Warm-up stage: starts at ${stageLabel(r.current)}. ${r.note}` }));
  const listed = new Set(out.map((o) => o.slug));
  for (const c of catalog) {
    if (c.category !== "warmup" || LIB.has(c.slug) || listed.has(c.slug)) continue;
    out.push({ slug: c.slug, note: `Warm-up stage: not in the daily warm-up builder yet — suggested ${stageLabel(guessStageFromName(c.name))}.` });
  }
  return out;
}

/** Library movements the catalog doesn't list, as Vault rows, so every warm-up movement can be tagged. */
export function libraryOnlyRows(catalogSlugs: ReadonlySet<string>) {
  return WARMUP_LIBRARY.filter((d) => !catalogSlugs.has(d.slug)).map((d) => ({
    slug: d.slug, name: d.name, category: "warmup", sport_scope: "both", position_scope: null,
    min_age_years: null, season_eligibility: null, equipment: d.equipment ? [...d.equipment] : [],
    is_active: true, dosage_unit: null, default_sets: null, default_reps: null,
  }));
}

/** Sample warm-up (default day) with this movement placed where its stage puts it. */
export function sampleWarmupWith(slug: string, name: string, stage: number | null, order: number | null) {
  const built = buildWarmup({ context: "default", lifecycle: "intermediate", gameDay: false, daySeed: 3, equipment: ["full_gym"] });
  const rows = built.drills
    .filter((d) => d.slug !== slug)
    .map((d, i) => ({ name: d.name, stage: stageFor(d.slug, d.role) ?? 0, ord: orderWithinStage(d.slug), i, self: false }));
  if (stage != null) rows.push({ name: name || "This movement", stage, ord: order, i: rows.length - 0.5, self: true });
  rows.sort((a, b) => a.stage - b.stage || (a.ord ?? Infinity) - (b.ord ?? Infinity) || a.i - b.i);
  return rows;
}
