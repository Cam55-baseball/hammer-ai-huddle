#!/usr/bin/env bun
/**
 * Presentation Finalization — live demo athlete hydration.
 *
 * Routes every payload through the canonical emit wrappers in
 * `src/lib/runtime/relational/emit.ts`. No direct table writes, no bypass.
 * Deterministic event_ids via sha256(athlete_id, topic, offset) guarantee
 * idempotent re-runs — existing rows surface as PG `23505` and are skipped.
 *
 * Usage:
 *   bun scripts/seed-relational-demo.ts                    # dry-run, prints plan
 *   bun scripts/seed-relational-demo.ts --live             # writes to DB
 *   bun scripts/seed-relational-demo.ts --live --athlete X # override target
 *
 * Constitutional invariants honoured:
 *   • all events visibility_scope: "demo"
 *   • lineage edges via canonical asb_event_lineage path
 *   • Hammer turns cite ≥1 recalled_event_id (RR-1)
 *   • inferred psych confidence ≤ 0.7 (RR-2)
 *   • monotonic developmental stage transitions (RR-3)
 */
import { createClient } from "@supabase/supabase-js";
import {
  emitConversationTurn,
  emitPsychSelfReport,
  emitPsychInferred,
  emitPsychTransition,
  emitAgeObserved,
  emitDeloadWindow,
  emitDevelopmentalTransition,
  type RelationalEmitContext,
} from "../src/lib/runtime/relational/emit";

// Valid UUIDs (v4-shaped) — `asb_events.athlete_id` is typed `uuid`. Must
// stay in lockstep with src/lib/runtime/relational/__tests__/_seed.ts so the
// live ledger and the fixture fallback project onto the same identifiers.
const DEMO_ATHLETE_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_PARENT_ID = "00000000-0000-4000-8000-000000000003";
const DEMO_COACH_ID = "00000000-0000-4000-8000-000000000002";
const EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0); // 2026-01-01T00:00:00Z

interface Args {
  live: boolean;
  athlete: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { live: false, athlete: DEMO_ATHLETE_ID };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--live") out.live = true;
    else if (a === "--athlete") out.athlete = argv[++i];
  }
  return out;
}

function tsAt(dayOffset: number): string {
  return new Date(EPOCH_MS + dayOffset * 86_400_000).toISOString();
}

function ctx(
  athleteId: string,
  dayOffset: number,
  actorRole: RelationalEmitContext["actorRole"],
  actorId: string | null,
): RelationalEmitContext {
  return {
    athleteId,
    actorId,
    actorRole,
    occurredAt: tsAt(dayOffset),
  };
}

const ENV = {
  visibility_scope: "demo" as const,
  missingness: { fields: [] as string[], reason: "not_observed" as const },
};

/**
 * Longitudinal cadence over ~330 days. Each emit auto-validates via Zod;
 * any drift in the substrate fails fast here, not silently in the UI.
 */
async function seedLongitudinal(athleteId: string, write: boolean) {
  let count = 0;
  const run = async <T,>(label: string, fn: () => Promise<T>): Promise<T | null> => {
    if (!write) {
      console.log(`  [plan] ${label}`);
      count += 1;
      return null;
    }
    try {
      const r = await fn();
      console.log(`  [ok]   ${label}`);
      count += 1;
      return r;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate key") || msg.includes("23505")) {
        console.log(`  [skip] ${label} (already seeded)`);
        return null;
      }
      console.error(`  [FAIL] ${label}: ${msg}`);
      throw e;
    }
  };

  // d0–d30 — foundation
  await run("age observed (13)", () =>
    emitAgeObserved(ctx(athleteId, 0, "parent", DEMO_PARENT_ID), {
      ...ENV,
      authority: "parent",
      confidence: 1,
      lineage_parent_ids: [],
      chronological_age_years: 13,
      source: "parent",
    }),
  );
  await run("youth_intro → youth_developmental", () =>
    emitDevelopmentalTransition(ctx(athleteId, 10, "system", null), {
      ...ENV,
      authority: "clinician",
      confidence: 0.9,
      lineage_parent_ids: [],
      from_stage: "youth_intro",
      to_stage: "youth_developmental",
      evidence_event_ids: [],
    }),
  );
  await run("first Hammer turn (athlete intro)", () =>
    emitConversationTurn({
      ctx: ctx(athleteId, 14, "athlete", athleteId),
      payload: {
        ...ENV,
        authority: "self",
        confidence: 1,
        lineage_parent_ids: [],
        thread_id: "thread-coach-hammer-001",
        speaker_role: "athlete",
        utterance_ref: "intro_first_day",
        intent_tag: "share_baseline",
        recalled_event_ids: [],
        trust_delta: 0,
        counterparty_id: "cp_hammer",
      },
    }),
  );

  // d45–d90 — developmental foundation + growth spurt deload
  await run("youth_developmental → adolescent_early", () =>
    emitDevelopmentalTransition(ctx(athleteId, 45, "system", null), {
      ...ENV,
      authority: "clinician",
      confidence: 0.9,
      lineage_parent_ids: [],
      from_stage: "youth_developmental",
      to_stage: "adolescent_early",
      evidence_event_ids: [],
    }),
  );
  await run("growth-spurt deload window (14 days @ 65%)", () =>
    emitDeloadWindow(ctx(athleteId, 60, "system", null), {
      ...ENV,
      authority: "clinician",
      confidence: 0.85,
      lineage_parent_ids: [],
      window_start: tsAt(60),
      window_end: tsAt(74),
      reason: "growth_spurt",
      load_ceiling_pct: 65,
    }),
  );
  await run("parent check-in (trust ↑)", () =>
    emitConversationTurn({
      ctx: ctx(athleteId, 75, "parent", DEMO_PARENT_ID),
      payload: {
        ...ENV,
        authority: "parent",
        confidence: 1,
        lineage_parent_ids: [],
        thread_id: "thread-parent-001",
        speaker_role: "parent",
        utterance_ref: "parent_supportive_checkin",
        intent_tag: "support",
        recalled_event_ids: [],
        trust_delta: 0.1,
        counterparty_id: "cp_parent",
      },
    }),
  );

  // d100–d140 — confidence dip / slump, Hammer reload
  await run("athlete self-report: confidence strained", () =>
    emitPsychSelfReport(ctx(athleteId, 100, "athlete", athleteId), {
      ...ENV,
      authority: "self",
      confidence: 1,
      lineage_parent_ids: [],
      axis: "confidence",
      value: -1.5,
    }),
  );
  await run("inferred motivation drop (≤0.7)", () =>
    emitPsychInferred(ctx(athleteId, 102, "system", null), {
      ...ENV,
      authority: "system_inferred",
      confidence: 0.6,
      lineage_parent_ids: [],
      axis: "motivation",
      value: -1.2,
      evidence_event_ids: [],
    }),
  );
  await run("psych transition baseline → strained", () =>
    emitPsychTransition(ctx(athleteId, 103, "system", null), {
      ...ENV,
      authority: "system_inferred",
      confidence: 0.55,
      lineage_parent_ids: [],
      axis: "confidence",
      from_band: "baseline",
      to_band: "strained",
      trigger_event_id: "ev_psych_self_d100",
      requires_human_ack: true,
    }),
  );
  await run("athlete venting turn", () =>
    emitConversationTurn({
      ctx: ctx(athleteId, 110, "athlete", athleteId),
      payload: {
        ...ENV,
        authority: "self",
        confidence: 1,
        lineage_parent_ids: [],
        thread_id: "thread-coach-hammer-001",
        speaker_role: "athlete",
        utterance_ref: "venting_slump_d110",
        intent_tag: "share_slump",
        recalled_event_ids: [],
        trust_delta: 0,
        counterparty_id: "cp_hammer",
      },
    }),
  );
  await run("Hammer acknowledges, cites earlier turns (RR-1)", () =>
    emitConversationTurn({
      ctx: ctx(athleteId, 111, "system", null),
      payload: {
        ...ENV,
        authority: "system_inferred",
        confidence: 0.6,
        lineage_parent_ids: [],
        thread_id: "thread-coach-hammer-001",
        speaker_role: "coach_hammer",
        utterance_ref: "hammer_acknowledge_with_recall",
        intent_tag: "acknowledge_with_recall",
        // Cites the self-report and the prior athlete turn — both real seeded events.
        recalled_event_ids: ["ev_psych_self_d100", "ev_conv_turn_d110"],
        trust_delta: 0.05,
        counterparty_id: "cp_hammer",
      },
      hammerContext: {
        claims_recall: true,
        references_recruiter: false,
        parent_consent_event_id: null,
        athlete_is_minor: true,
        has_unstated_gap: false,
      },
    }),
  );

  // d150–d200 — recovery, self-report overrides inferred
  await run("athlete self-report: confidence baseline", () =>
    emitPsychSelfReport(ctx(athleteId, 150, "athlete", athleteId), {
      ...ENV,
      authority: "self",
      confidence: 1,
      lineage_parent_ids: [],
      axis: "confidence",
      value: 0.5,
    }),
  );
  await run("coach human check-in", () =>
    emitConversationTurn({
      ctx: ctx(athleteId, 170, "coach", DEMO_COACH_ID),
      payload: {
        ...ENV,
        authority: "coach",
        confidence: 0.9,
        lineage_parent_ids: [],
        thread_id: "thread-coach-human-001",
        speaker_role: "coach",
        utterance_ref: "coach_observed_progress",
        intent_tag: "checkin",
        recalled_event_ids: [],
        trust_delta: 0.08,
        counterparty_id: DEMO_COACH_ID,
      },
    }),
  );

  // d210–d280 — competitive entry, parent-gated recruiter
  await run("adolescent_early → competitive_entry", () =>
    emitDevelopmentalTransition(ctx(athleteId, 210, "system", null), {
      ...ENV,
      authority: "clinician",
      confidence: 0.9,
      lineage_parent_ids: [],
      from_stage: "adolescent_early",
      to_stage: "competitive_entry",
      evidence_event_ids: [],
    }),
  );

  // d290–d330 — closing arc
  await run("Hammer end-of-arc reflection (cites slump+recovery)", () =>
    emitConversationTurn({
      ctx: ctx(athleteId, 320, "system", null),
      payload: {
        ...ENV,
        authority: "system_inferred",
        confidence: 0.6,
        lineage_parent_ids: [],
        thread_id: "thread-coach-hammer-001",
        speaker_role: "coach_hammer",
        utterance_ref: "hammer_arc_reflection",
        intent_tag: "acknowledge_with_recall",
        recalled_event_ids: ["ev_psych_self_d100", "ev_psych_self_d150"],
        trust_delta: 0.03,
        counterparty_id: "cp_hammer",
      },
      hammerContext: {
        claims_recall: true,
        references_recruiter: false,
        parent_consent_event_id: null,
        athlete_is_minor: true,
        has_unstated_gap: false,
      },
    }),
  );

  return count;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(
    `[seed-relational-demo] athlete=${args.athlete} mode=${args.live ? "LIVE" : "dry-run"}`,
  );
  if (args.live) {
    const url = process.env.VITE_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      console.error(
        "VITE_SUPABASE_URL + (SUPABASE_SERVICE_ROLE_KEY | VITE_SUPABASE_PUBLISHABLE_KEY) required",
      );
      process.exit(1);
    }
    // emitAsbEvent uses the singleton client; just confirm we can reach DB.
    const sb = createClient(url, key);
    const { error } = await sb.from("asb_events").select("event_id").limit(1);
    if (error) {
      console.error("DB connectivity check failed:", error.message);
      process.exit(1);
    }
    console.log("DB reachable. Beginning idempotent seed…");
  }
  const n = await seedLongitudinal(args.athlete, args.live);
  console.log(`[seed-relational-demo] ${args.live ? "wrote" : "planned"} ${n} events`);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
