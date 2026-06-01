#!/usr/bin/env bun
/**
 * Phase A §2 — Live relational seeder (Node-safe, service-role).
 *
 * Authoritative live-DB seeder for the relational demo athlete. Routes every
 * row through canonical `buildDemoSeed()` (Zod-validated), inserts into
 * `asb_events`, emits `asb_event_lineage` edges for every embedded
 * `payload.lineage_parent_ids`, and verifies replay reconstruction parity
 * against the in-memory projections before exiting.
 *
 * Constitutional guarantees preserved:
 *   • canonical emit semantics (idempotency_key === event_id; 23505 == dedupe)
 *   • additive-only — no row mutation, no payload transformation beyond
 *     fixture-id → stable-UUID projection (`liveize`)
 *   • lineage edges via `asb_event_lineage` use derivation_type=relational_seed
 *   • post-seed projection parity proves replay equivalence end-to-end
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun scripts/seed-relational-demo-node.ts
 *   bun scripts/seed-relational-demo-node.ts --dry-run
 *   bun scripts/seed-relational-demo-node.ts --athlete <uuid>
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { buildDemoSeed, DEMO_ATHLETE_ID, stableStringify } from "../src/lib/runtime/relational/__tests__/_seed";
import type { AsbEventRow } from "../src/hooks/useAsbTimeline";
import { conversationMemoryState } from "../src/lib/runtime/projections/conversationMemoryState";
import { psychState } from "../src/lib/runtime/projections/psychState";
import { developmentalState } from "../src/lib/runtime/projections/developmentalState";
import { trustState } from "../src/lib/runtime/projections/trustState";

interface Args { dryRun: boolean; athleteOverride: string | null }

function parseArgs(argv: string[]): Args {
  const out: Args = { dryRun: false, athleteOverride: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--athlete") out.athleteOverride = argv[++i] ?? null;
  }
  return out;
}

const NS = "relational-demo-seed:";
function stableUuid(id: string): string {
  const h = createHash("sha1").update(NS + id).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function liveize(rows: AsbEventRow[]): AsbEventRow[] {
  return rows.map((r) => {
    const eid = stableUuid(r.event_id);
    const parents = (r.payload as { lineage_parent_ids?: string[] }).lineage_parent_ids;
    const mappedParents = parents?.map((p) => stableUuid(p));
    const payload = mappedParents
      ? { ...r.payload, lineage_parent_ids: mappedParents }
      : r.payload;
    return {
      ...r,
      event_id: eid,
      idempotency_key: eid,
      lineage_refs: mappedParents ?? r.lineage_refs,
      payload,
    };
  });
}

function requireEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) { console.error("FATAL: SUPABASE_URL required."); process.exit(1); }
  if (!key) { console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY required (anon blocked by RLS)."); process.exit(1); }
  return { url, key };
}

interface Report {
  athlete_id: string;
  inserted: number;
  deduped: number;
  total_rows: number;
  lineage_edges_inserted: number;
  lineage_edges_deduped: number;
  projection_parity: "ok" | "FAIL" | "skipped";
  duplicate_run_proof: { rows_in_db: number | null };
  generated_at: string;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const athleteId = args.athleteOverride ?? DEMO_ATHLETE_ID;
  console.log(`[seed-node] athlete=${athleteId} mode=${args.dryRun ? "dry-run" : "LIVE"}`);

  const fixtureRows = buildDemoSeed();
  const scoped: AsbEventRow[] =
    athleteId === DEMO_ATHLETE_ID
      ? fixtureRows
      : fixtureRows.map((r) => ({ ...r, athlete_id: athleteId }));
  const rows = liveize(scoped);

  const embeddedLineage = rows.reduce((n, r) => {
    const parents = (r.payload as { lineage_parent_ids?: string[] }).lineage_parent_ids ?? [];
    return n + parents.length;
  }, 0);
  console.log(`[seed-node] canonical rows: ${rows.length}  embedded-lineage-edges: ${embeddedLineage}`);

  if (args.dryRun) {
    console.log("[seed-node] --dry-run: skipping DB writes");
    return;
  }

  const { url, key } = requireEnv();
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const probe = await sb.from("asb_events").select("event_id").limit(1);
  if (probe.error) { console.error("FATAL: DB probe failed:", probe.error.message); process.exit(1); }
  console.log("[seed-node] DB reachable — beginning idempotent insert");

  let inserted = 0, deduped = 0;
  for (const r of rows) {
    const { error } = await sb.from("asb_events").insert(r as never);
    if (!error) { inserted++; console.log(`  [ok]    ${r.event_id}  ${r.topic_id}`); continue; }
    if ((error as { code?: string }).code === "23505") { deduped++; console.log(`  [dedup] ${r.event_id}  ${r.topic_id}`); continue; }
    console.error(`  [FAIL]  ${r.event_id}: ${error.message}`); process.exit(2);
  }

  // Lineage edges (asb_event_lineage). Idempotent on (parent_event_id, child_event_id).
  let edgeInserted = 0, edgeDeduped = 0;
  for (const r of rows) {
    const parents = (r.payload as { lineage_parent_ids?: string[] }).lineage_parent_ids ?? [];
    for (const p of parents) {
      const { error } = await sb.from("asb_event_lineage").insert({
        parent_event_id: p,
        child_event_id: r.event_id,
        derivation_type: "relational_seed",
        engine_version: "asb-1.0.0",
      } as never);
      if (!error) { edgeInserted++; continue; }
      if ((error as { code?: string }).code === "23505") { edgeDeduped++; continue; }
      console.error(`  [edge FAIL] ${p} -> ${r.event_id}: ${error.message}`);
      // Edge failures are non-fatal in legacy schemas; surface and continue.
    }
  }
  console.log(`[seed-node] lineage edges  inserted=${edgeInserted}  deduped=${edgeDeduped}`);

  // Replay reconstruction parity: fetch rows back, project, compare to fixture projections.
  let parity: Report["projection_parity"] = "skipped";
  const { data: backRaw, error: backErr } = await sb
    .from("asb_events")
    .select("event_id, athlete_id, topic_id, actor_role, actor_id, occurred_at, ingested_at, effective_at, valid_from, valid_to, payload, engine_version, idempotency_key, causality_refs, lineage_refs")
    .eq("athlete_id", athleteId)
    .like("topic_id", "relational.%");
  if (backErr) {
    console.error("WARN: post-write fetch failed:", backErr.message);
  } else {
    const back = (backRaw ?? []) as AsbEventRow[];
    const projFromDb = {
      conv: conversationMemoryState(back, "demo").state,
      psych: psychState(back, "demo").state,
      dev: developmentalState(back, "demo").state,
      trust: trustState(back, "demo").state,
    };
    const projFromFixture = {
      conv: conversationMemoryState(rows, "demo").state,
      psych: psychState(rows, "demo").state,
      dev: developmentalState(rows, "demo").state,
      trust: trustState(rows, "demo").state,
    };
    parity = stableStringify(projFromDb) === stableStringify(projFromFixture) ? "ok" : "FAIL";
    console.log(`[seed-node] projection parity: ${parity}`);
    if (parity === "FAIL") {
      console.error("[seed-node] DIVERGENCE — db-projection vs fixture-projection do not match");
      process.exit(3);
    }
  }

  const { count } = await sb
    .from("asb_events")
    .select("event_id", { count: "exact", head: true })
    .eq("athlete_id", athleteId)
    .like("topic_id", "relational.%");

  const report: Report = {
    athlete_id: athleteId,
    inserted, deduped, total_rows: rows.length,
    lineage_edges_inserted: edgeInserted,
    lineage_edges_deduped: edgeDeduped,
    projection_parity: parity,
    duplicate_run_proof: { rows_in_db: count ?? null },
    generated_at: new Date().toISOString(),
  };
  console.log("[seed-node] REPORT", JSON.stringify(report, null, 2));
  try {
    mkdirSync("/mnt/documents", { recursive: true });
    writeFileSync("/mnt/documents/relational-live-seed-report.json", JSON.stringify(report, null, 2));
    console.log("[seed-node] report → /mnt/documents/relational-live-seed-report.json");
  } catch (e) {
    console.warn("[seed-node] could not write report file:", (e as Error).message);
  }
}

if (import.meta.main) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
