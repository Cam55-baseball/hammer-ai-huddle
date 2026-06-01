#!/usr/bin/env bun
/**
 * Pre-launch ops: Node-safe live seeder for the relational demo athlete.
 *
 * Why this exists:
 *   The original `scripts/seed-relational-demo.ts` routes through the canonical
 *   `src/lib/runtime/relational/emit.ts` helpers, which in turn import the
 *   browser-singleton supabase client (`src/integrations/supabase/client.ts`).
 *   That client touches `localStorage` at import time → fatal in pure Node / Bun.
 *
 * What this preserves:
 *   • The canonical seed builder (`buildDemoSeed()`) — the SAME function that
 *     feeds the fixture fallback and the replay-reconstruction tests. Every
 *     row is Zod-validated at build time (legality check); we do not invent
 *     any payload here.
 *   • Idempotency: `idempotency_key === event_id` (deterministic). Re-runs
 *     surface as Postgres 23505 → logged as `dedupe`, not failure.
 *   • Lineage: encoded on `lineage_refs` + `payload.lineage_parent_ids`, same
 *     as the live demo path. No separate `asb_event_lineage` writes (the
 *     existing relational emitters don't emit edges to that table either).
 *
 * What this does NOT do:
 *   • No browser APIs. No `localStorage`. No singleton client.
 *   • No payload mutation. No parallel schema. No new ASB topic.
 *   • No use of the anon/publishable key — service-role only (RLS would block
 *     inserts otherwise).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun scripts/seed-relational-demo-node.ts
 *   bun scripts/seed-relational-demo-node.ts --dry-run       # build + validate, no insert
 *   bun scripts/seed-relational-demo-node.ts --athlete <uuid>
 */
import { createClient } from "@supabase/supabase-js";
import { buildDemoSeed, DEMO_ATHLETE_ID } from "../src/lib/runtime/relational/__tests__/_seed";
import type { AsbEventRow } from "../src/hooks/useAsbTimeline";

interface Args {
  dryRun: boolean;
  athleteOverride: string | null;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { dryRun: false, athleteOverride: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--athlete") out.athleteOverride = argv[++i] ?? null;
  }
  return out;
}

function requireEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    console.error("FATAL: SUPABASE_URL (or VITE_SUPABASE_URL) is required.");
    process.exit(1);
  }
  if (!key) {
    console.error(
      "FATAL: SUPABASE_SERVICE_ROLE_KEY is required. The publishable/anon key " +
        "will be blocked by RLS on asb_events inserts.",
    );
    process.exit(1);
  }
  return { url, key };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const athleteId = args.athleteOverride ?? DEMO_ATHLETE_ID;

  console.log(`[seed-node] athlete=${athleteId} mode=${args.dryRun ? "dry-run" : "LIVE"}`);

  // Build canonical rows up-front (Zod validation runs here — fail fast).
  const rowsAll = buildDemoSeed();
  const rows: AsbEventRow[] =
    athleteId === DEMO_ATHLETE_ID
      ? rowsAll
      : rowsAll.map((r) => ({ ...r, athlete_id: athleteId }));

  console.log(`[seed-node] canonical rows built: ${rows.length}`);
  const lineageEdgeCount = rows.reduce((n, r) => {
    const parents = (r.payload as { lineage_parent_ids?: string[] }).lineage_parent_ids ?? [];
    return n + parents.length;
  }, 0);
  console.log(`[seed-node] embedded lineage edges (lineage_refs): ${lineageEdgeCount}`);

  if (args.dryRun) {
    console.log("[seed-node] --dry-run: skipping DB writes");
    return;
  }

  const { url, key } = requireEnv();
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Connectivity probe.
  const probe = await sb.from("asb_events").select("event_id").limit(1);
  if (probe.error) {
    console.error("FATAL: DB connectivity check failed:", probe.error.message);
    process.exit(1);
  }
  console.log("[seed-node] DB reachable — beginning idempotent insert");

  let inserted = 0;
  let deduped = 0;
  for (const r of rows) {
    const { error } = await sb.from("asb_events").insert(r as never);
    if (!error) {
      inserted++;
      console.log(`  [ok]    ${r.event_id}  ${r.topic_id}`);
      continue;
    }
    if ((error as { code?: string }).code === "23505") {
      deduped++;
      console.log(`  [dedup] ${r.event_id}  ${r.topic_id}`);
      continue;
    }
    console.error(`  [FAIL]  ${r.event_id}: ${error.message}`);
    process.exit(2);
  }

  console.log(
    `[seed-node] done. inserted=${inserted} deduped=${deduped} total=${rows.length}`,
  );

  // Post-write verification: count rows back.
  const { count, error: countErr } = await sb
    .from("asb_events")
    .select("event_id", { count: "exact", head: true })
    .eq("athlete_id", athleteId);
  if (countErr) {
    console.error("WARN: post-write count failed:", countErr.message);
  } else {
    console.log(`[seed-node] verified rows for ${athleteId}: ${count}`);
    if ((count ?? 0) < rows.length) {
      console.error(
        `WARN: expected >= ${rows.length} rows, found ${count}. Investigate.`,
      );
      process.exit(3);
    }
  }
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
