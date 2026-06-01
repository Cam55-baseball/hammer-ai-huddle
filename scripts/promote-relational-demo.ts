#!/usr/bin/env bun
/**
 * Phase 151–154 — relational demo → production promotion.
 *
 * Additive-only. Original demo events are never mutated or deleted.
 * Each demo event becomes a NEW production-scoped event plus a
 * `asb_event_lineage` edge with `derivation_type = "demo_promotion"`.
 *
 * Usage:
 *   bun scripts/promote-relational-demo.ts --athlete <id> --to self
 *   bun scripts/promote-relational-demo.ts --athlete <id> --to self --apply
 *
 * Constitutional invariants:
 *   - canonical write path only (emitAsbEvent / emitAsbLineage)
 *   - deterministic idempotency: sha256("promote::" + event_id + "::" + scope)
 *   - shape-equivalent projection continuity (see migration test)
 */
import { createClient } from "@supabase/supabase-js";
import {
  emitAsbEvent,
  emitAsbLineage,
  type AsbEmitRow,
} from "../src/lib/asb/emit";
import {
  ENGINE_VERSION,
  computeIdempotencyKey,
} from "../src/lib/asb/engineVersion";

type TargetScope = "self" | "coach" | "parent";

interface Args {
  athlete: string;
  to: TargetScope;
  apply: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--athlete") out.athlete = argv[++i];
    else if (a === "--to") out.to = argv[++i] as TargetScope;
    else if (a === "--apply") out.apply = true;
  }
  if (!out.athlete) throw new Error("--athlete <id> required");
  if (!out.to) throw new Error("--to <self|coach|parent> required");
  if (!["self", "coach", "parent"].includes(out.to))
    throw new Error("--to must be one of self|coach|parent");
  return out as Args;
}

function promotedIdempotencyMaterial(
  originalEventId: string,
  targetScope: TargetScope,
): string {
  return `promote::${originalEventId}::${targetScope}`;
}

async function sha256Hex(s: string): Promise<string> {
  const subtle =
    (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback for jsdom / older runtimes — use node crypto.
  const nodeCrypto = await import("node:crypto");
  return nodeCrypto.createHash("sha256").update(s).digest("hex");
}

interface DemoRow {
  event_id: string;
  athlete_id: string;
  topic_id: string;
  actor_role: AsbEmitRow["actor_role"];
  actor_id: string | null;
  occurred_at: string;
  payload: Record<string, unknown>;
}

export async function planPromotions(
  rows: DemoRow[],
  targetScope: TargetScope,
): Promise<
  Array<{ original: DemoRow; promoted: AsbEmitRow; lineageMaterial: string }>
> {
  const out: Array<{
    original: DemoRow;
    promoted: AsbEmitRow;
    lineageMaterial: string;
  }> = [];
  for (const r of rows) {
    if ((r.payload as { visibility_scope?: string }).visibility_scope !== "demo")
      continue;
    const newPayload: Record<string, unknown> = {
      ...r.payload,
      visibility_scope: targetScope,
    };
    const existingLineage = newPayload.lineage_parent_ids;
    const lineageParents = Array.isArray(existingLineage)
      ? (existingLineage as string[])
      : [];
    newPayload.lineage_parent_ids = [...lineageParents, r.event_id];
    const idMaterial = promotedIdempotencyMaterial(r.event_id, targetScope);
    const newEventId = await sha256Hex(`evt::${idMaterial}`);
    const idempotencyKey = await computeIdempotencyKey({
      athlete_id: r.athlete_id,
      topic_id: r.topic_id,
      occurred_at: r.occurred_at,
      payload: newPayload,
    });
    const promoted: AsbEmitRow = {
      event_id: newEventId.slice(0, 36),
      athlete_id: r.athlete_id,
      topic_id: r.topic_id,
      actor_role: r.actor_role,
      actor_id: r.actor_id,
      occurred_at: r.occurred_at,
      ingested_at: r.occurred_at,
      effective_at: r.occurred_at,
      valid_from: r.occurred_at,
      valid_to: null,
      payload: newPayload,
      engine_version: ENGINE_VERSION,
      idempotency_key: idempotencyKey,
      causality_refs: [],
      lineage_refs: [r.event_id],
    };
    out.push({ original: r, promoted, lineageMaterial: idMaterial });
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  const sb = createClient(url, key);

  const { data, error } = await sb
    .from("asb_events")
    .select(
      "event_id, athlete_id, topic_id, actor_role, actor_id, occurred_at, payload",
    )
    .eq("athlete_id", args.athlete)
    .like("topic_id", "relational.%");
  if (error) throw error;

  const demoRows = (data ?? []).filter(
    (r) =>
      (r.payload as { visibility_scope?: string }).visibility_scope === "demo",
  ) as DemoRow[];

  const plan = await planPromotions(demoRows, args.to);
  console.log(
    `[promote] athlete=${args.athlete} to=${args.to} demo_rows=${demoRows.length} plan=${plan.length} apply=${args.apply}`,
  );
  for (const p of plan) {
    console.log(
      `  ${p.original.event_id} → ${p.promoted.event_id} (${p.original.topic_id})`,
    );
  }
  if (!args.apply) {
    console.log("[promote] dry-run; pass --apply to write");
    return;
  }
  for (const p of plan) {
    const res = await emitAsbEvent(p.promoted);
    if (!res.ok) {
      const fail = res as { ok: false; message: string };
      console.error("[promote] emit_failed", p.promoted.event_id, fail.message);
      continue;
    }
    await emitAsbLineage({
      parent_event_id: p.original.event_id,
      child_event_id: p.promoted.event_id,
      derivation_type: "demo_promotion",
      engine_version: ENGINE_VERSION,
    });
  }
  console.log("[promote] done");
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
