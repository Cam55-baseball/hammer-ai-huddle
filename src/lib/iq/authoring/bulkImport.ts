/**
 * Wave 5 — Owner authoring: bulk JSON import for Game IQ situations.
 *
 * Validates each entry against the canonical schema BEFORE any write.
 * Inserts pass as `status='draft'` so a human still publishes via the
 * publish checklist. Pure validation lives here; the dialog calls
 * `importSituations` after a successful preview.
 */
import { supabase } from "@/integrations/supabase/client";
import { validateThreeBs } from "@/lib/iq/threeBs";
import {
  DEFENSIVE_ROLES,
  type IqActor,
  type IqLens,
  type IqSport,
  type IqDifficulty,
} from "@/lib/iq/types";

export interface BulkSituationInput {
  sport: IqSport;
  slug: string;
  title: string;
  summary: string;
  lens_tags: IqLens[];
  difficulty: IqDifficulty;
  canonical_order?: number;
  sources: { label: string; ref?: string }[];
  actors: Array<Pick<IqActor, "role" | "assignment"> & Partial<IqActor>>;
  variants?: Array<{ label: string; count?: string; outs?: number; runners?: string }>;
}

export interface BulkValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateBulkEntry(entry: unknown, idx: number): BulkValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const e = entry as Partial<BulkSituationInput> | null;
  if (!e || typeof e !== "object") {
    return { ok: false, errors: [`#${idx + 1}: not an object`], warnings };
  }
  if (!e.title?.trim()) errors.push(`#${idx + 1}: title required`);
  if (!e.slug?.trim()) errors.push(`#${idx + 1}: slug required`);
  if (!e.sport || !["baseball", "softball", "both"].includes(e.sport))
    errors.push(`#${idx + 1}: sport must be baseball|softball|both`);
  if (!Array.isArray(e.lens_tags) || e.lens_tags.length === 0)
    errors.push(`#${idx + 1}: at least one lens_tag required`);
  if (!Array.isArray(e.sources) || e.sources.length === 0)
    errors.push(`#${idx + 1}: at least one source required`);
  if (!Array.isArray(e.actors) || e.actors.length === 0) {
    errors.push(`#${idx + 1}: actors[] required`);
  } else {
    const padded = padActors(e.actors);
    const report = validateThreeBs(padded as IqActor[]);
    if (!report.ok) {
      errors.push(
        `#${idx + 1}: Three B's incomplete — missing ${report.missingRoles.join(",") || "—"}; idle w/o reason ${report.ungatedIdle.join(",") || "—"}`,
      );
    }
  }
  if (!e.variants || e.variants.length < 2) {
    warnings.push(`#${idx + 1}: <2 variants — recommended ≥2 for replay coverage`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

function padActors(actors: BulkSituationInput["actors"]): IqActor[] {
  const seen = new Set(actors.map((a) => a.role));
  const padded: IqActor[] = actors.map((a) => ({
    id: "",
    situation_id: "",
    role: a.role,
    assignment: a.assignment,
    primary_path: a.primary_path ?? [],
    secondary_read: a.secondary_read ?? "",
    communication_call: a.communication_call ?? "",
    coaching_note: a.coaching_note ?? "",
    common_mistake: a.common_mistake ?? "",
    elite_cue: a.elite_cue ?? "",
  }));
  for (const role of DEFENSIVE_ROLES) {
    if (!seen.has(role)) {
      padded.push({
        id: "",
        situation_id: "",
        role,
        assignment: "idle",
        primary_path: [],
        secondary_read: "",
        communication_call: "",
        coaching_note: "not involved on this play",
        common_mistake: "",
        elite_cue: "",
      });
    }
  }
  return padded;
}

export interface BulkImportSummary {
  inserted: number;
  failed: Array<{ slug: string; error: string }>;
}

export async function importSituations(
  entries: BulkSituationInput[],
): Promise<BulkImportSummary> {
  const summary: BulkImportSummary = { inserted: 0, failed: [] };
  for (const e of entries) {
    try {
      const { data: sit, error: sErr } = await supabase
        .from("iq_situations")
        .insert({
          sport: e.sport,
          slug: e.slug,
          title: e.title,
          summary: e.summary,
          lens_tags: e.lens_tags,
          difficulty: e.difficulty,
          status: "draft",
          canonical_order: e.canonical_order ?? 999,
          sources: e.sources,
          triple_check_count: 0,
        } as never)
        .select("id")
        .single();
      if (sErr) throw sErr;
      const sitId = (sit as { id: string }).id;

      const padded = padActors(e.actors);
      const { error: aErr } = await supabase
        .from("iq_situation_actors")
        .insert(
          padded.map((a) => ({
            situation_id: sitId,
            role: a.role,
            assignment: a.assignment,
            primary_path: a.primary_path,
            secondary_read: a.secondary_read,
            communication_call: a.communication_call,
            coaching_note: a.coaching_note,
            common_mistake: a.common_mistake,
            elite_cue: a.elite_cue,
          })) as never,
        );
      if (aErr) throw aErr;

      if (e.variants?.length) {
        const { error: vErr } = await supabase
          .from("iq_situation_variants")
          .insert(
            e.variants.map((v, i) => ({
              situation_id: sitId,
              label: v.label,
              count_state: v.count ?? null,
              outs: v.outs ?? null,
              runner_state: v.runners ?? null,
              ordinal: i,
            })) as never,
          );
        if (vErr) throw vErr;
      }
      summary.inserted++;
    } catch (err) {
      summary.failed.push({
        slug: e.slug,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return summary;
}
