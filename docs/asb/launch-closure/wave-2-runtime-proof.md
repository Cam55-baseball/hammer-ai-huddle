# Wave 2 — Runtime Proof (Section 2 Evidence)

**Status:** ❌ **NO-GO** for Section 2 completion.

This document is a forensic audit, not a status report. Every claim is
backed by file:line citations or runnable test output. Where the system
fails the exit criteria, the failure is named with no euphemism.

---

## Section 2 Exit Criteria — Honest Verdict

| # | Question | Answer | Evidence |
|---|----------|--------|----------|
| 1 | Can a pitcher generate a populated aggregate? | ✅ **Yes (logic)** / ❌ **No (production)** | `src/lib/pieV2/aggregate.ts:89` + `src/lib/pieV2/__tests__/endToEnd.test.ts` — but no production page mounts `PitchingV2MicroInput` or calls `finalizePieV2Session`. See §A. |
| 2 | Can that aggregate reach coach surfaces? | ⚠️ **Read-path yes, write-path no** | `src/components/coach/PieV2CoachPanel.tsx:21` reads from `usePitchingV2Trends` which queries `asb_events` for `pitching.v2.session_aggregate`. No production code writes that event today. |
| 3 | Can trends consume the aggregate? | ✅ **Yes** | `src/lib/pieV2/longitudinal.ts:33-56` — exercised by `endToEnd.test.ts` "clean session" case. |
| 4 | Can safeguarding consume the aggregate? | ⚠️ **Projection yes, transport no** | `src/lib/runtime/projections/safeguardingNotifications.ts:39` subscribes to `pitching.v2.*`. `src/lib/pieV2/emit.ts:134` emits `arm_health_caution`. **Wiring proven in test**, but no caller in production code invokes the orchestrator. |
| 5 | Can a hitter generate phase-attributed analysis? | ❌ **No** | `supabase/functions/hie-analyze/index.ts` (1,982 lines) never imports `_shared/hittingPhases.ts` or `_shared/hittingCausalChains.ts`. Snapshot upserted at line 1927-1956 contains zero `violated_phases` / `causal_chains` / `priority_phase` / `confidence` fields. See §B. |
| 6 | Can roadmap + causal chain render? | ❌ **No** | `HittingCausalChainCard` (`src/components/hitting/HittingCausalChainCard.tsx:22`) and `HittingRoadmapLadder` (`src/components/hitting/HittingRoadmapLadder.tsx:17`) are **orphan components** — `rg -n "HittingCausalChainCard\|HittingRoadmapLadder" src/` returns only their own definitions. No page imports them. |
| 7 | Are projection caches actually written? | ❌ **No** | `performance_sessions.pie_v2_signals` (column exists at `types.ts:6426`) and `athlete_foundation_state.pie_v2_caution_state` (column at `types.ts:864`) have **zero writers**. `rg -n "pie_v2_signals\|pie_v2_caution_state" supabase/functions/ src/` returns only the auto-generated `types.ts` rows. See §D. |
| 8 | Is replay deterministic? | ✅ **Yes** | `src/lib/pieV2/__tests__/replay.test.ts` (pre-existing) + new `endToEnd.test.ts` "replay determinism" case proves byte-identical `event_id`, `idempotency_key`, and `payload` across two identical runs at pinned `PIE_V2_ENGINE_VERSION = "pie-v2.0.0"`. |

**Three of eight criteria fail outright. Section 2 cannot be marked
complete. Do not proceed to UHRC, AI Hammer, or Recommendation
Resolution.**

---

## §A — Pitching Capture Path (Section 2.1)

### What exists
- `src/components/micro-layer/PitchingV2MicroInput.tsx:88` — collapsible
  capture form, fully implemented, with explicit "Not measured" affordance
  per RR-6 missingness preservation.
- `src/components/micro-layer/PieV2FrameTagger.tsx:36` — video-derived rep
  tagger, lineage-anchored via `parent_video_event_id`.
- `src/lib/pieV2/scoring.ts` → `src/lib/pieV2/aggregate.ts:89`
  `aggregateSession()` → `src/lib/pieV2/emit.ts:85`
  `emitPieV2SessionAggregate()` — all pure, deterministic, replay-stable.
- **NEW:** `src/lib/pieV2/finalizeSession.ts` `finalizePieV2Session()` —
  single orchestrator that calls aggregate → emit aggregate → derive
  caution → emit caution. Production callers must use this entry point.

### What is broken
- `rg -n "PitchingV2MicroInput\|PieV2FrameTagger" src/` returns **only the
  component definitions themselves**. Neither component is rendered by any
  page, layout, or route. The pitching capture flow that the doctrine
  assumes exists, **does not exist in production code**.
- `CompletePitcher.tsx:42` is a navigation tile page (5 tiles linking to
  other modules). It is not a capture surface and does not import any PIE
  V2 component.
- `AnalyzeVideo.tsx` (988 lines) is the surface behind `/analyze/:module`
  but does not mount `PieV2FrameTagger` either.

### Runtime proof of the pure chain
`src/lib/pieV2/__tests__/endToEnd.test.ts` drives the full chain with the
real implementations of scoring/aggregation/longitudinal/safeguarding-
projection, mocking only `@/lib/asb/emit` to capture rows. It proves:

- Aggregate produced with populated signals + non-null composite + pinned
  `engine_version: "pie-v2.0.0"`.
- Exactly one `pitching.v2.session_aggregate` event emitted per
  finalization, with deterministic `idempotency_key`.
- `trajectoriesAll([aggregate])` produces consumable trend data for the
  coach panel.

### Capture/video event payload example (from test capture)
```json
{
  "topic_id": "pitching.v2.session_aggregate",
  "athlete_id": "ath-e2e-1",
  "occurred_at": "2026-06-04T12:30:00.000Z",
  "payload": {
    "session_id": "sess-e2e-1",
    "pie_v2_composite": <number>,
    "signals": [{ "signal_id": "energy_angle", "sample_count": 4, "average": 25, "tier": "clean", ... }, ...],
    "athlete_reported_pain_in_session": false,
    "engine_version": "pie-v2.0.0"
  },
  "engine_version": "pie-v2.0.0",
  "idempotency_key": "<sha256 over (athlete_id|topic_id|occurred_at|canonical_payload)>"
}
```

---

## §B — Hitting Analyzer Path (Section 2.2)

### Forensic finding
```
$ rg -n "hittingPhases|hittingCausalChains" supabase/functions/hie-analyze/index.ts
(no matches)
```
`supabase/functions/hie-analyze/index.ts` is **1,982 lines** and computes
weakness clusters, prescriptive actions, MPI, readiness, smart-week plan,
and writes a snapshot to `hie_snapshots`. The final upsert at lines
**1927-1956** lists every snapshot field. **None of them are
`violated_phases`, `causal_chains`, `priority_phase`, or `confidence`.**

`_shared/hittingPhases.ts:231` exposes `attributePhaseFromSymptoms()`.
`_shared/hittingCausalChains.ts:11-19` already imports it. **The shared
attribution module exists. hie-analyze never calls it.**

### What must happen (out of scope for this turn — Section 2.2 blocker)
1. `supabase/functions/hie-analyze/index.ts` must import
   `_shared/hittingPhases.ts` + `_shared/hittingCausalChains.ts`, derive
   symptoms from `weaknessClusters`/`microPatterns`, call
   `attributePhaseFromSymptoms` for P1-P4 attribution, and add the four
   fields to the snapshot payload.
2. A consumer page (e.g. `AnalyzeVideo.tsx` for `module === "hitting"`)
   must read those fields and render `HittingCausalChainCard` +
   `HittingRoadmapLadder`.
3. `/analyze/hitting` already routes to `AnalyzeVideo` via
   `App.tsx:272` (`/analyze/:module`), but the surface does not
   currently consume the new fields.

---

## §C — Safeguarding Wiring (Section 2.3)

### What exists and is proven
- `src/lib/pieV2/injuryDetection.ts:21` `deriveInjuryCaution()` — RR-6
  ordering correct (≥3 mechanical factors → "elevated" before ≥2 →
  "watch"; pain alone → "watch"; pain + factors → "elevated").
- `src/lib/pieV2/emit.ts:134` `emitPieV2ArmHealthCaution()` — emits
  `pitching.v2.arm_health_caution` with `safeguarding_category: true` when
  `level === "elevated"`, includes lineage edge to the parent aggregate.
- `src/lib/runtime/projections/safeguardingNotifications.ts:39` —
  PREFIXES already includes `"pitching.v2."`. RR-6 advisories WILL reach
  the Safety Center read-path once a producer fires them.

### What `endToEnd.test.ts` proves
- Pain alone → `caution.level === "watch"`, `arm_health_caution` event
  captured with `payload.athlete_reported_pain === true`.
- Pain + variance + tempo decay → `caution.level === "elevated"`, captured
  event has `payload.safeguarding_category === true`.
- The captured event fed into `safetyState(rows, "self", ...)` is
  consumed: `meta.sourceCount === 1`, `meta.lastEventId` matches the event.

### What remains broken in production
- No production code path invokes `finalizePieV2Session()`. The Safety
  Center will not light up until a capture surface (see §A) mounts and
  calls the orchestrator at session close.

### Safeguarding event payload example (from test capture)
```json
{
  "topic_id": "pitching.v2.arm_health_caution",
  "athlete_id": "ath-elev-1",
  "occurred_at": "2026-06-04T14:00:00.000Z",
  "payload": {
    "session_id": "sess-elev-1",
    "level": "elevated",
    "contributing_factors": ["arm_slot_variance_elevated", "within_session_tempo_decay"],
    "athlete_reported_pain": true,
    "recommended_action": "Route through safeguarding role for human review. Suspend velocity-tier work until cleared.",
    "visibility_scope": "self",
    "confidence": 1,
    "authority": "system",
    "safeguarding_category": true,
    "engine_version": "pie-v2.0.0"
  },
  "lineage_refs": { "parent_aggregate_event_id": "<aggregate event id>" }
}
```

---

## §D — Projection Writers (Section 2.4)

### Schema reality
- `performance_sessions.pie_v2_signals jsonb` — defined at
  `src/integrations/supabase/types.ts:6426`. ✅ column exists.
- `athlete_foundation_state.pie_v2_caution_state jsonb` — defined at
  `src/integrations/supabase/types.ts:864`. ✅ column exists.

### Writer reality
```
$ rg -n "pie_v2_signals|pie_v2_caution_state" supabase/functions/ src/ | grep -v "types.ts"
(no matches)
```

**No code writes either column. The columns are dead surfaces.** Without
writers, replay can derive the truth (it does — that's the canonical
authority per Phase 47 RP-1…RP-10), but the projection caches the system
is supposed to populate are empty. Coach surfaces that depend on a
materialized read instead of the live aggregate query will see nothing.

### What must happen (out of scope for this turn — Section 2.4 blocker)
1. A projection writer (subscriber to `pitching.v2.session_aggregate` +
   `pitching.v2.arm_health_caution`) must upsert into
   `performance_sessions.pie_v2_signals` and
   `athlete_foundation_state.pie_v2_caution_state`.
2. Replay must be tested to prove the writer is idempotent — running the
   same canonical event prefix twice produces identical column contents,
   never duplicated or mutated.
3. Until both exist, **the ledger is the only source of truth** and any
   surface reading the projection columns must fail closed (show "No PIE
   V2 sessions" rather than fabricate).

---

## §E — Replay Verification

`src/lib/pieV2/__tests__/endToEnd.test.ts` "replay determinism" case
runs the entire orchestrator twice with identical inputs and asserts
every captured event matches byte-for-byte across runs:

- `event_id` identical (deterministic — derived from idempotency key)
- `idempotency_key` identical (SHA-256 over `athlete_id | topic_id | occurred_at | canonicalized payload`)
- `payload` deeply equal
- `engine_version` pinned to `"pie-v2.0.0"`

Combined with the pre-existing `src/lib/pieV2/__tests__/replay.test.ts`
this satisfies the Phase 47 RP-1 byte-determinism obligation **for the
scoring/aggregation/emission layer**. It does **not** yet prove projection
writer idempotency (no writer exists — see §D).

---

## §F — Pre-Launch Fix Order (Section 2 closure)

In strict order; do not skip:

1. **§D-1 Projection writer for `pie_v2_signals`** — subscribe to
   `pitching.v2.session_aggregate`, upsert one row keyed by
   `session_id` into `performance_sessions.pie_v2_signals`.
   Idempotent. Replay-safe. Test: replay-twice produces identical row.
2. **§D-2 Projection writer for `pie_v2_caution_state`** — subscribe to
   `pitching.v2.arm_health_caution`, upsert latest caution into
   `athlete_foundation_state.pie_v2_caution_state` keyed by
   `athlete_id`. Idempotent. Test: replay-twice produces identical row.
3. **§A-1 Mount `PieV2FrameTagger`** in `AnalyzeVideo.tsx` for
   `module === "pitching"` after video upload completes.
4. **§A-2 Mount `PitchingV2MicroInput`** in the practice-session creation
   flow (callsite TBD — needs the same surface that writes a
   `performance_session` row).
5. **§A-3 Call `finalizePieV2Session()`** when the session closes,
   passing the captured reps and any `recent_aggregates` for cross-session
   drift detection.
6. **§B-1 Patch `hie-analyze`** to import hitting doctrine and add
   `violated_phases` / `causal_chains` / `priority_phase` / `confidence`
   to the snapshot.
7. **§B-2 Mount `HittingCausalChainCard` + `HittingRoadmapLadder`** in
   the hitting branch of `AnalyzeVideo.tsx` (route already exists at
   `App.tsx:272`).
8. **Re-run** `src/lib/pieV2/__tests__/endToEnd.test.ts` plus new
   projection-writer replay tests. Then re-evaluate Section 2 exit
   criteria.

---

## §G — Files Changed This Turn

- **Created:** `src/lib/pieV2/finalizeSession.ts` — single orchestrator
  for capture-side callers. Aggregate → emit aggregate → derive caution
  → emit caution.
- **Created:** `src/lib/pieV2/__tests__/endToEnd.test.ts` — runtime proof
  of the pure chain with real projection consumption; mocks only network
  emission.
- **Created:** this document.

No production page wiring was changed. Mounting capture surfaces inside
real flows requires user decisions about which surface owns session
creation — see §F-3 / §F-4. Those mounts are explicitly deferred until
the projection writers (§F-1 / §F-2) exist, because mounting capture
without writers means data lands in the ledger and immediately stops at
the empty cache, producing inconsistent reads.

---

## Verdict

**NO-GO.** Section 2 is not complete. Three of eight exit criteria fail:
hitting attribution is unimplemented in `hie-analyze`, hitting render
components are orphaned, and both projection writers are missing.
Pitching capture is mounted nowhere. The pure runtime chain (scoring →
aggregation → emission → safeguarding-projection → trend) is **proven
deterministic and replay-safe**, which is the foundation everything else
rests on — but proving the foundation does not prove the building.

Do not advance to UHRC, AI Hammer, or Recommendation Resolution until
§F-1 through §F-7 are complete and `endToEnd.test.ts` is extended with
real projection-writer assertions.
