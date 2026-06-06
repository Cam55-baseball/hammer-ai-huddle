## Organism Wiring Sprint

Goal: convert PIE V2 + HIE from working engines into reachable production systems. No new doctrine, no UHRC, no AI Hammer, no recommendation work. Pure wiring + projection completion + 10-question ratification.

---

### Forensic anchors (verified before planning)

- `PitchingV2MicroInput` (`src/components/micro-layer/PitchingV2MicroInput.tsx`) — zero production call sites.
- `PieV2FrameTagger` (`src/components/micro-layer/PieV2FrameTagger.tsx`) — zero production call sites.
- `MicroLayerInput` (`src/components/micro-layer/MicroLayerInput.tsx`) — also unmounted in pages; only `PracticeHub.tsx` runs a `pitching` session via `usePerformanceSession.createSession`.
- `finalizePieV2Session` (`src/lib/pieV2/finalizeSession.ts`) — exists, tested, never invoked by capture surfaces.
- `performance_sessions.pie_v2_signals` + `athlete_foundation_state.pie_v2_caution_state` columns exist (migration `20260604200642`); **no writer in the codebase** (rg confirms only type defs reference them).
- `supabase/functions/hie-analyze/index.ts` (1,982 lines) — no import of `_shared/hittingPhases.ts` or `_shared/hittingCausalChains.ts` (only `ai-chat` and `analyze-video` import them). No `violated_phases` / `causal_chains` / `priority_phase` keys produced anywhere.
- `HittingCausalChainCard` / `HittingRoadmapLadder` — only referenced from each other; zero page mounts.

This plan only fills those gaps. It does not invent new engines.

---

### Section A — Capture surface wiring

A1. **Pitching session capture (`PracticeHub.tsx`, `build_session` step).**
- Add a baseball-only Advanced Mechanics panel: mount `PitchingV2MicroInput` inside the build-session view when `sessionType === 'pitching'` and `sport === 'baseball'`.
- Hold its value in local state alongside `drill_blocks`. On session save, store the rep-style payload on `data.micro_layer_data.pie_v2` (existing JSONB field) so nothing in the legacy save shape changes.

A2. **Session finalization hook.**
- In `usePerformanceSession.createSession`, after the `performance_sessions` insert and immediately before the `calculate-session` invoke, if `micro_layer_data.pie_v2` reps are present, call `finalizePieV2Session({ session_id, athlete_id: user.id, reps })`.
- Capture the returned `aggregate` + `caution` for the projection writer in Section B. Failures are logged and swallowed (additive only — never break legacy save).

A3. **Video-derived capture (`AnalyzeVideo.tsx`).**
- After a successful pitching analysis response (`module === 'pitching' && sport === 'baseball'` and `currentVideoId` set), render `PieV2FrameTagger` with `athleteId=user.id`, `sessionId=currentVideoId` (video-session bridge), `videoId=currentVideoId`, `parentVideoEventId` left undefined for now.
- Tagger already calls `emitPieV2RepScore` directly — no new emission code required.

A4. **Evidence file:** `docs/asb/launch-closure/organism-wiring-ratification.md` Section A — file:line table for every mount and the runtime chain capture → score → aggregate → emit → safeguard → persist.

---

### Section B — Projection writer completion

Single canonical writer: `src/lib/pieV2/persistSession.ts`.

```text
persistPieV2Session({ session_id, athlete_id, aggregate, caution }) → void
  ├─ update performance_sessions.pie_v2_signals  = { aggregate, engine_version, computed_at }
  └─ upsert athlete_foundation_state.pie_v2_caution_state
       = { level, contributing_factors, athlete_reported_pain,
           recommended_action, session_id, engine_version, computed_at }
       (only when caution.level !== 'none'; clears row to null when 'none')
```

Rules:
- Pure function; no business logic — just deterministic projection of the aggregate.
- `engine_version` stamped from `PIE_V2_ENGINE_VERSION`.
- Idempotent: re-running with the same aggregate is a no-op (`updated_at` may bump, payload identical).
- Replay-safe: derived strictly from the event-ledger aggregate produced by `emitPieV2SessionAggregate`. Never authors organism truth.
- Called from `finalizePieV2Session` after emit, behind a `persist?: boolean` flag (default true) so the existing unit tests keep running pure.

Evidence: insert one real session via PracticeHub in build mode, read back both rows, then re-run `finalizePieV2Session` from the same reps and assert the projection is byte-identical.

---

### Section C — Hitting doctrine connection (`hie-analyze`)

C1. Add imports at the top of `supabase/functions/hie-analyze/index.ts`:
```ts
import { HITTING_PHASES, type HittingPhaseId } from "../_shared/hittingPhases.ts";
import { PHASE_CAUSAL_CHAINS, PHASE_ROADMAPS } from "../_shared/hittingCausalChains.ts";
```

C2. New pure helper `deriveHittingDoctrineAttribution(hieSnapshot)` co-located in the function:
- Input: the snapshot/weakness signals hie-analyze already computes for hitting.
- Output:
  ```ts
  {
    violated_phases: HittingPhaseId[];          // P1..P4 ordered by severity
    priority_phase: HittingPhaseId | null;      // first non-negotiable violator, else worst
    causal_chains: CausalChain[];               // PHASE_CAUSAL_CHAINS[priority_phase] + adjacent
    roadmap: RoadmapStep[];                     // PHASE_ROADMAPS[priority_phase]
    confidence: number;                         // 0..100 from sample depth + signal agreement
  }
  ```
- Maps existing hitting weakness metrics → phases per `_shared/hittingPhases.ts` (e.g. chase/whiff → P1 Stabilize, contact_quality vs velocity → P2 Hand Load, exit_direction pull-side leak → P3 Back Hip, timing/decision → P4 Hitter's Move).
- No placeholder values, no stub logic. If signal depth < doctrine threshold, returns `confidence: 0` with empty arrays and an explicit `missingness` reason — never imputes.

C3. Attach the result to the hitting snapshot payload as `hitting_doctrine: { ... }` (additive field on the existing `hie_snapshots` row JSONB). Persist via the existing snapshot writer — no new table.

C4. Evidence: 4 sample fixture athletes (one weakness per phase P1..P4) — committed under `supabase/functions/hie-analyze/__tests__/hittingDoctrine.fixtures.ts` with assertions that each fixture produces the correct `priority_phase`, non-empty `causal_chains`, and non-empty `roadmap`.

---

### Section D — Hitting surface activation

D1. **Athlete view.** On the hitter-facing analysis surface (currently `AnalyzeVideo.tsx` when `module === 'hitting'`, plus the HIE summary on `AthleteCommand`/`ProgressDashboard` — exact file confirmed during implementation by tracing where `hie_snapshots` is read), mount:
- `<HittingCausalChainCard chain={chain} />` for each `causal_chains[*]`
- `<HittingRoadmapLadder roadmap={roadmap} />` once

Both feed from `hie_snapshots.hitting_doctrine` written in C3.

D2. **Coach view.** In `CoachAthleteDetail.tsx` hitting tab, mount the same two components reading the same field so coach + athlete see identical chains. Coach surface uses default `showCoach` state so the "Coach's notes" toggle is available.

D3. Empty state: when `hitting_doctrine.confidence === 0`, render a single muted "Not enough hitting reps yet" line — never fake a chain.

D4. Evidence: file:line refs for both mounts plus a manual run (hitter upload → analysis → both cards render → coach sees identical chain).

---

### Section E — End-to-end ratification

Create `docs/asb/launch-closure/organism-wiring-ratification.md`. Body = 10-question PASS/FAIL matrix with one piece of evidence per row (file:line, query result, or screenshot path). No narrative. Questions:

1. Can a pitcher create a session?
2. Does that session create a PIE V2 aggregate event?
3. Does the aggregate persist to `performance_sessions.pie_v2_signals`?
4. Does it appear in trends (longitudinal read path)?
5. Does it appear for coaches (`CoachAthleteDetail` / `CoachConsole`)?
6. Does it update `athlete_foundation_state.pie_v2_caution_state`?
7. Can a hitter generate phase analysis (`hitting_doctrine` populated)?
8. Does `HittingRoadmapLadder` render?
9. Does `HittingCausalChainCard` render?
10. Can coach view hitting analysis (identical chain)?

Sprint exits only when all ten = PASS. Output includes: matrix, remaining blockers (if any), and a launch-readiness % computed strictly as `PASS / 10`.

---

### Technical details

- New files:
  - `src/lib/pieV2/persistSession.ts`
  - `supabase/functions/hie-analyze/__tests__/hittingDoctrine.fixtures.ts`
  - `docs/asb/launch-closure/organism-wiring-ratification.md`
- Edited files (expected):
  - `src/components/micro-layer/MicroLayerInput.tsx` or new wrapper to host `PitchingV2MicroInput` cleanly inside the existing build-session card on `PracticeHub.tsx`.
  - `src/pages/PracticeHub.tsx` — mount + state + pass-through.
  - `src/hooks/usePerformanceSession.ts` — call `finalizePieV2Session` + `persistPieV2Session` post-insert.
  - `src/pages/AnalyzeVideo.tsx` — mount `PieV2FrameTagger` on baseball-pitching success.
  - `supabase/functions/hie-analyze/index.ts` — doctrine imports + attribution helper + snapshot field.
  - Hitting-view page(s) — mount the two cards.
  - `src/pages/CoachAthleteDetail.tsx` — mount the same two cards in hitting tab.
- DB: no schema changes (columns + JSONB already exist).
- Tests:
  - Reuse `src/lib/pieV2/__tests__/endToEnd.test.ts` — extend with a `persist=true` path against a mocked supabase client.
  - New deno test in `hie-analyze` for doctrine fixtures P1..P4.

### Out of scope (do not start)

UHRC, AI Hammer standardization, recommendation resolution, softball parity, onboarding polish, design changes. These remain blocked until the 10-question matrix is fully PASS.
