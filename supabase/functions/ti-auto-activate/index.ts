// Step 20 Part A — automatic activation.
//
// There is no per-row human approval any more. Every switched-off exercise is
// put through the same automated safety audit; the ones that pass every check
// are switched on in batches of 20, with a full card check after each batch.
// A batch that moves the card check off 100% is rolled straight back.
//
// Runs nightly, and on demand from the Control Center. Read-only for any row
// that fails a check: it stays off and the failing check is reported.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  MATRIX_CATALOG_COLUMNS,
  type MatrixCatalogRow,
  runGenerationMatrix,
} from "../_shared/wic/matrix/generationMatrix.ts";
import {
  auditActiveRows,
  auditCatalog,
  type AuditCatalogRow,
  intensityClassCoverage,
  SAFETY_AUDIT_VERSION,
} from "../_shared/wic/catalog/safetyAudit.ts";


const BATCH = 20;
/** A regression chain activates a level at a time; a few passes reach the end. */
const MAX_PASSES = 12;

const AUDIT_COLUMNS =
  "id,slug,name,category,cue,bucket,sub_bucket,intensity_class,cns_cost,min_age_years," +
  "min_training_age_years,season_eligibility,equipment_requirements,equipment,regression_slug," +
  "eccentric_overload,deep_flexion,ub_tier,plyo_tier,dosage_unit,default_sets,default_reps," +
  "default_duration_seconds,default_distance_feet,default_total_reps,is_active,superseded_by";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Db = ReturnType<typeof createClient>;

async function page<T>(db: Db, columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("wk_movement_catalog")
      .select(columns)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as unknown as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function matrixNow(db: Db) {
  const rows = (await page<MatrixCatalogRow & { is_active?: boolean }>(db, MATRIX_CATALOG_COLUMNS + ",is_active"))
    .filter((r) => (r as any).is_active === true);
  const m = runGenerationMatrix(rows as MatrixCatalogRow[]);
  return { m, activeRows: rows.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const dryRun = body?.dry_run === true;
  // One batch per invocation by default: a card check is heavy, and an edge
  // worker that runs several in a row runs out of compute. The nightly job and
  // the Control Center simply call again until nothing is left to activate.
  const maxBatches = Math.max(1, Math.min(4, Number(body?.max_batches ?? 1)));

  // A signed-in caller must be the owner or an admin. The nightly job calls
  // with the service key and no user token.
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (token && token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    const { data: userRes } = await db.auth.getUser(token);
    const uid = userRes?.user?.id;
    if (uid) {
      const { data: allowed } = await db.rpc("is_training_intel_owner", { _user_id: uid });
      if (allowed !== true) return json({ error: "not allowed" }, 403);
    }
  }

  try {
    const baseline = dryRun ? await matrixNow(db) : null;
    const activated: string[] = [];
    const rolledBack: string[] = [];
    let passes = 0;
    let lastMatrix: Awaited<ReturnType<typeof matrixNow>> | null = null;
    let batchesRun = 0;

    while (passes < MAX_PASSES) {
      passes++;
      const rows = await page<AuditCatalogRow>(db, AUDIT_COLUMNS);
      const { passing, failing, candidates } = auditCatalog(rows);
      // Step 23 A1 — the same safety laws, run over rows that are already ON.
      // A live row that breaks an age floor or a season law is a critical note,
      // not a silent pass, and it is reported on every run.
      const activeViolations = auditActiveRows(rows);
      const coverage = intensityClassCoverage(rows);
      if (activeViolations.length > 0) {
        await db.from("ti_watch_notes").insert({
          severity: "critical",
          category: "rule_violation",
          title: "A live exercise breaks a safety floor",
          detail: {
            source: "auto_activate_drift_audit",
            version: SAFETY_AUDIT_VERSION,
            rows: activeViolations.map((v) => ({ slug: v.slug, failures: v.failures })),
          },
          auto_action: "The rows are named for the owner; no row is switched on this run",
        });
      }
      if (dryRun) {
        return json({
          ok: true,
          dry_run: true,
          version: SAFETY_AUDIT_VERSION,
          candidates: candidates.length,
          would_activate: passing.length,
          staying_off: failing.map((f) => ({ slug: f.slug, failures: f.failures })),
          active_violations: activeViolations.map((v) => ({ slug: v.slug, failures: v.failures })),
          intensity_class_coverage: coverage,
          baseline_matrix: baseline
            ? { cells: baseline.m.cells, empty: baseline.m.empty_cells, fingerprint: baseline.m.fingerprint }
            : null,
        });
      }
      // A live safety breach blocks activation for the run: nothing new goes on
      // top of a catalog that is already out of law.
      if (activeViolations.length > 0) {
        return json({
          ok: false,
          blocked: "active_safety_violation",
          version: SAFETY_AUDIT_VERSION,
          active_violations: activeViolations.map((v) => ({ slug: v.slug, failures: v.failures })),
          intensity_class_coverage: coverage,
        });
      }

      if (passing.length === 0) break;

      let progressed = false;
      for (let i = 0; i < passing.length && batchesRun < maxBatches; i += BATCH) {
        batchesRun++;
        const batch = passing.slice(i, i + BATCH);
        const ids = batch.map((b) => b.id);
        const { error: upErr } = await db
          .from("wk_movement_catalog")
          .update({ is_active: true })
          .in("id", ids);
        if (upErr) throw new Error(upErr.message);

        let result;
        try {
          result = await matrixNow(db);
        } catch (e) {
          await db.from("wk_movement_catalog").update({ is_active: false }).in("id", ids);
          rolledBack.push(...batch.map((b) => b.slug));
          continue;
        }
        if (!result.m.passed || result.m.empty_cells > 0) {
          await db.from("wk_movement_catalog").update({ is_active: false }).in("id", ids);
          rolledBack.push(...batch.map((b) => b.slug));
          continue;
        }
        activated.push(...batch.map((b) => b.slug));
        lastMatrix = result;
        progressed = true;
        await db.from("wk_card_matrix_runs").insert({
          source: "auto_activate",
          cells: result.m.cells,
          empty_cells: result.m.empty_cells,
          active_rows: result.activeRows,
          fingerprint: result.m.fingerprint,
          status: result.m.passed ? "passed" : "failed",
          notes: { activated: batch.map((b) => b.slug), pass: passes },
        });
      }
      if (!progressed || batchesRun >= maxBatches) break;
    }

    const rows = await page<AuditCatalogRow>(db, AUDIT_COLUMNS);
    const after = auditCatalog(rows);

    return json({
      ok: true,
      version: SAFETY_AUDIT_VERSION,
      passes,
      activated_count: activated.length,
      activated,
      rolled_back: rolledBack,
      still_off: after.failing.map((f) => ({ slug: f.slug, failures: f.failures })),
      remaining_candidates: after.passing.length,
      matrix: lastMatrix
        ? {
          cells: lastMatrix.m.cells,
          empty_cells: lastMatrix.m.empty_cells,
          fingerprint: lastMatrix.m.fingerprint,
          active_rows: lastMatrix.activeRows,
        }
        : null,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
