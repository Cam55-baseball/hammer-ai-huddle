# Foundations — Intelligence, Observability & Lifecycle Hardening (Phases 8–19)

**Status:** Wave A ✅ shipped. Wave B ✅ shipped. Wave C ✅ shipped (effectiveness aggregator + nightly cron + scorer trust gate). Next: Wave D (Content Health + Admin Diagnostics).


This plan turns the Foundations system from "feature-complete + hardened" into an **observable, self-healing, lifecycle-aware developmental brain**. Work is grouped into 6 shippable waves so each wave is independently deployable, testable, and reversible behind feature flags.

---

## Wave A — Observability Backbone (Phases 8 + 18 partial)

**Goal:** Every recommendation is traceable, replayable, and explainable.

1. **`foundation_recommendation_traces` table** (one row per surfaced video):
   - `trace_id` (uuid PK), `user_id`, `video_id`, `surface_origin` (enum: library/hammer/today_tip/onboarding/recovery_flow), `created_at`
   - `active_triggers[]`, `matched_triggers[]`
   - `raw_score`, `final_score`, `score_breakdown` (jsonb: base/audience/length/effectiveness/penalty/tierMultiplier)
   - `recommendation_version`, `engine_version`, `snapshot_version`, `foundation_meta_version`
   - `suppressed` (bool) + `suppression_reason` (enum)
   - GIN index on `active_triggers`, btree on `(user_id, created_at desc)`, partial index on `suppressed=true`
   - 90-day retention via existing cleanup pattern.
2. **Tracing instrumentation** in `useFoundationVideos` + `scoreFoundationCandidates`: scorer returns a structured `breakdown` object instead of opaque number; hook batch-inserts traces (fire-and-forget, debounced).
3. **`replayRecommendation(traceId)`** util (`src/lib/foundationReplay.ts`) — pulls trace + frozen snapshot + meta version, re-runs scorer, asserts deterministic equality.
4. **Admin Trace Inspector** (route `/owner/foundations/traces`): table + drill-down JSON view + "Replay" button.

---

## Wave B — Trigger State Machine + Fatigue (Phases 10 + 11)

**Goal:** Athlete state is temporally stable; foundations never spam.

1. **`athlete_foundation_state` table**: `user_id` PK, `current_state` (healthy_foundation/fragile/active_recovery/lost_feel/post_recovery/chronic_decline/post_layoff_rebuild), `state_entered_at`, `confidence`, `last_transition_reason`, `prev_state`.
2. **`foundation_trigger_events` table**: `user_id`, `trigger`, `fired_at`, `confidence`, `resolved_at` — drives decay + persistence windows.
3. **State machine** (`src/lib/foundationStateMachine.ts`):
   - Transition rules with **min-dwell time** (e.g., 48h) to prevent flapping
   - Trigger **cooldowns** (per-trigger map, default 72h)
   - **Decay**: confidence -= 0.1/day until removed
   - **Resolution**: trigger auto-resolves when underlying signal disappears for N days
4. **Fatigue layer** (`src/lib/foundationFatigue.ts`):
   - `exposureScore[videoId]` from traces (last 30d, exponential decay)
   - **Per-domain quota**: max 2 foundations/week surfaced
   - **Semantic dedupe**: hash(domain+scope+top-2 triggers) — suppress duplicates within 14d
   - **"Too much philosophy" cap**: ≤1 foundation in any single feed render when active drill recs exist
5. Wire both into `useFoundationVideos`; emit `suppression_reason` to traces.

---

## Wave C — Effectiveness Learning Loop (Phase 9)

**Goal:** Bounded learning; deterministic triggers stay primary.

1. Extend `foundation_video_outcomes` with: `completion_pct`, `rewatched`, `saved`, `shared`, `helpful_vote` (-1/0/1), `post_watch_bqi_delta_7d`, `post_watch_pei_delta_7d`, `trigger_resolved_within_7d` (bool), `recovery_correlation` (numeric).
2. **`recompute-foundation-effectiveness`** edge function (cron, nightly):
   - Aggregates 90d outcomes per (video_id, trigger) pair
   - Writes to `library_videos.foundation_effectiveness` jsonb: `{ byTrigger: { [t]: { resolveRate, rewatchRate, helpRate, sample_n } } }`
   - Bounded modifier: ±15 max in scorer (never overrides deterministic match)
3. Scorer reads `effectiveness.byTrigger[matchedTrigger]` → small bonus only when `sample_n ≥ 20`.

---

## Wave D — Content Health + Admin Diagnostics (Phases 12 + 13)

1. **`foundation_health_score`** (computed nightly, stored on `library_videos`):
   - Penalties: zero-engagement 30d, broken URL, malformed meta, ultra-low completion, semantic duplicate, contradictory chips, orphaned domain
   - 0–100 scale + `health_flags[]`
2. **`FoundationDiagnosticsPanel`** (`/owner/foundations/diagnostics`):
   - Tiles: active triggers (rolling 7d), recommendation frequency, top/bottom effectiveness, trigger heatmap, low-health videos, suppression breakdown, cooldown visibility, stale content alerts
   - Drill-into trace inspector + replay
3. **URL/meta verifier** as part of nightly health job (HEAD request, integrity check).

---

## Wave E — Cold Start, Discovery, Cron, Rollback (Phases 14 + 15 + 16 + 17)

1. **Onboarding sequencer** (`src/lib/foundationOnboarding.ts`): first 30d = curated 1-per-week ramp by domain, beginner_safe gate, no advanced philosophies until `accountAgeDays ≥ 14` AND ≥10 reps logged.
2. **Discovery integration**:
   - `get-today-tips` edge function: include 1 foundation if state ∈ {fragile, lost_feel, post_layoff} AND no foundation surfaced in 7d
   - Hammer chat retrieval: foundations indexed in same vector store with `class:foundation` filter; surfaced on philosophy/recovery intents
   - "Return to your blueprint" + "Recommended because…" UI strings driven by `matched_triggers`
3. **Cron jobs** (pg_cron + edge functions, all idempotent + resumable via continuation tokens):
   - `nightly-foundation-effectiveness` (02:00)
   - `nightly-foundation-health` (03:00)
   - `hourly-trigger-decay` 
   - `daily-trace-prune` (90d retention)
   - `weekly-duplicate-detection`
4. **Rollback + kill switches** (`engine_settings` flags):
   - `foundations_enabled`, `foundations_learning_enabled`, `foundations_state_machine_enabled`, `foundations_fatigue_enabled`
   - Per-flag fallback paths in `useFoundationVideos` (degrade to deterministic-only, never crash)
   - Gradual rollout: `foundations_rollout_pct` (hash userId)

---

## Wave F — Replay Tests + Final Architecture Maps (Phases 18 + 19)

1. **Vitest suites** (`src/lib/__tests__/`):
   - `foundationScorer.replay.test.ts` — golden traces re-run deterministically
   - `foundationStateMachine.test.ts` — anti-flap, cooldown, decay
   - `foundationFatigue.test.ts` — quota, dedupe, exposure decay
   - `foundationCornerCases.test.ts` — malformed meta, zero candidates, all-suppressed, cold start, multi-tab race
2. **Architecture documentation** (`docs/foundations/`):
   - `dependency-map.md`, `event-flow.md`, `state-flow.md`, `trigger-lifecycle.md`, `recommendation-lifecycle.md`, `observability-map.md`, `cron-map.md`
3. **Memory updates**: add Core rule for foundations observability + reference entries for state machine, fatigue, effectiveness pipelines.

---

## Technical Notes

- **No schema breaks**: all new columns are additive + nullable; new tables are net-new.
- **JSONB versioning**: `foundation_effectiveness` gets `version: 1` stamp via existing `validate_foundation_meta` pattern; future migrations registered through `src/lib/jsonbMigrations.ts`.
- **Edge function standards**: `persistSession: false`, `Deno.serve()`, dual-auth, continuation tokens for >500 user batches (per existing HIE pattern).
- **System user `00000000-0000-0000-0000-000000000001`** excluded from all pipelines.
- **`video_url.trim() !== ''`** integrity preserved in scorer + health checks.
- **Multi-tab sync**: trace inserts + state transitions broadcast via `BroadcastChannel('data-sync')` with `TAB_ID`.

## Sequencing & Risk

- Wave A first — without traces, every later wave is unmeasurable.
- Waves B/C/D in parallel (independent tables).
- Wave E depends on B (state machine) + D (health).
- Wave F closes the loop; no production change without it.
- Each wave ships behind its kill switch; rollout can pause at any wave.

## Out of Scope (intentional)

- New athlete-facing UI surfaces beyond Today Tips integration + "Return to your blueprint" affordance.
- Vector embedding generation for foundations (assumes existing Hammer retrieval pipeline; only adds class filter).
- Multi-sport expansion beyond current baseball/softball domains.

---

Approve to begin **Wave A (Observability Backbone)**. I will not start later waves until A is verified in production traces.