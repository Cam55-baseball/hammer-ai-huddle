# Wave 1 — Athlete Runtime Productization & Execution Realization

This wave converts the already-ratified ASB substrate (`asb_events` ledger, `emit.ts`, `replay.ts`, parity invariants, sensor scaffold, Command/Console/Digest projections) into the first usable athlete + coach operating system. **Nothing here adds new doctrine, schema, or runtime authority.** Every visible state is an event-derived projection; every write is an append-only canonical event through `emitAsbEvent`.

## What already exists (we project from, don't rebuild)

- ASB ledger + `emitAsbEvent` (append-only, idempotent, dedupe-safe)
- `replay.ts` deterministic re-derivation + `/replay/:eventId`
- `useAthleteCommandRows`, `useCoachRosterRows`, digest/forecast projections
- Command cards (Readiness/Fatigue/Workload/Recovery/Behavioral/Trend/Escalation)
- Coach Console (RosterGrid, EscalationQueue, MissingSignalQueue, WorkloadContinuity)
- Confidence/Missingness/Lineage primitives (`ConfidencePill`, `MissingnessChip`, `LineageDrilldownButton`)
- Parity invariants + central missingness thresholds

## What Wave 1 actually builds

Six thin, additive surfaces stitched onto the existing substrate:

### 1. Athlete Daily Runtime — `/today`
Single mobile-first screen, three stacked zones, progressive disclosure:
- **Pulse strip** (top): one-line readiness state + fatigue band + recovery debt chip, each tap-to-expand into existing Command cards. No numbers without confidence + lineage.
- **Today's Prescription card**: rendered from the canonical 6B→6K runtime stack via a new pure `buildDailyPrescription(rows, constraints)` projection. Adapts on readiness/fatigue/recovery/override state already present in the ledger. Shows session type, intent, 3–5 block summary, "why this today" lineage link.
- **Action rail** (bottom, sticky): `Start session` · `Log how I feel` · `Request change`. Each emits a canonical event (no mutation).

### 2. Session Execution Flow — `/today/session/:prescriptionEventId`
Linear, one-block-at-a-time, mobile-first:
- Block header (name, target, intent, confidence pill)
- Single CTA per state: `Begin` → `Complete` / `Modify` / `Skip` / `Substitute`
- Inline post-block check (RPE 1–5, optional note)
- Every transition emits `session.block.started|completed|modified|skipped|substituted` canonical events with `causality_refs` → prescription event
- Post-session capture screen → `session.response.captured` event

### 3. Override & Deviation Workflow
Shared sheet component triggered from prescription / session / coach surfaces:
- Reason (enum), free-text note, optional severity
- Emits `prescription.override.requested` / `session.deviation.logged` with full lineage refs
- Visible in athlete history + coach console (existing surfaces auto-pick up via projections)

### 4. Coach Operational Runtime — `/console` (extension)
Additive panels on existing CoachConsole:
- **Readiness distribution strip** (compressed histogram across roster, derived from existing rows)
- **Prescription history drawer** per athlete (reuses `useCoachRosterRows`)
- **Override visibility queue** (filters events with topic prefix `prescription.override.*`)
- **Alert hierarchy** unified into one tier-sorted list (red/amber/info) using existing `MissingnessChip` + `ConfidencePill`
No new endpoints. All projections.

### 5. Confidence + Lineage Continuity Layer
- Promote `ConfidencePill` + `MissingnessChip` + `LineageDrilldownButton` to a single shared `<TrustFooter />` rendered on every visible runtime card so the "why / what / how reliable" answer is always one tap from any surface.
- Engine version + replay handle exposed in TrustFooter expander.

### 6. Calm Production UI System
A small token-level pass in `index.css` / `tailwind.config.ts` adding semantic state tiers (no color hardcoding in components):
- `--state-calm / --state-watch / --state-escalate / --state-unknown`
- `--confidence-high / --med / --low / --absent`
- `--surface-runtime / --surface-runtime-elevated`
- Typography hierarchy: display / runtime-headline / runtime-body / lineage-caption
- One shared `RuntimeCard`, `RuntimeSheet`, `RuntimeActionBar` primitives so athlete + coach + session flows share calm spacing, no dashboard bloat.

## Screen inventory (new)
```
/today                          Athlete Daily Runtime
/today/session/:id              Session Execution
/today/session/:id/complete     Post-session capture
/today/history                  Personal lineage history (read-only over ledger)
/console (extended)             Coach panels above
/console/athlete/:id/history    Athlete prescription + override timeline
```

## Navigation architecture
- Athlete root → `/today` (post-onboarding). Existing `/command`, `/digest`, `/forecast` remain as deep surfaces accessible from TrustFooter / pulse expansions.
- Coach root → `/console` with sub-routes for athlete deep-dives.
- Bottom tab bar (mobile): Today · History · Digest · Settings.

## Event interaction map (all additive topics)
```
prescription.daily.rendered         (system, on /today load if absent for date)
session.started                     (athlete)
session.block.started|completed     (athlete)
session.block.modified|skipped|substituted
session.deviation.logged
session.response.captured
prescription.override.requested     (athlete or coach)
prescription.override.acknowledged  (coach)
runtime.feedback.captured           ("Log how I feel")
```
All emitted via `emitAsbEvent`, idempotency-keyed, lineage-linked to source prescription event. No new tables; existing `asb_events` ledger absorbs them.

## Runtime state flow
```
ledger(asb_events) ──► projections(useAthleteCommandRows, buildDailyPrescription)
                              │
                              ▼
                       RuntimeCard (read-only)
                              │ user action
                              ▼
                       emitAsbEvent (append-only)
                              │
                              ▼
                       new event ──► re-projects on next render
```
Zero frontend-owned truth. Zero direct mutation.

## API / dependency map
- Read: `asb_events` via existing hooks (no new query shapes beyond filters).
- Write: `emitAsbEvent` only.
- Replay: existing `/replay/:eventId` linked from TrustFooter.
- No new edge functions. No new schema.

## Validation strategy
- Unit: `buildDailyPrescription` is pure → snapshot tests across readiness/fatigue permutations.
- Parity: extend `asbCrossSystemValidators.ts` with a `validateRuntimeProjection` check — runtime card values must equal ASB-emitted values (no amplification).
- Replay: every session flow event reconstructable; add a fixture test asserting `prescription → blocks → completion` replay determinism.
- E2E (Playwright): athlete completes a full daily flow on mobile viewport; coach sees the resulting events in console; replay drilldown opens lineage.
- Grep guard (`scripts/check-invariants.sh`): forbid direct `supabase.from('asb_events').insert` outside `emit.ts`; forbid inline state tiers outside the new tokens.

## Mobile-first interaction flow (athlete)
```
open app → /today (1 tap, <300ms to first paint of pulse strip)
  ↓ tap Start session
session block 1 (Begin → Complete) → block 2 → … → post-session capture
  ↓ done
back to /today, prescription card now shows "completed" projection
```
Minimum-tap goal: cold open → first block begin in ≤3 taps.

## Coach workflow flow
```
/console → scan readiness distribution + escalation queue
  ↓ open athlete → /console/athlete/:id/history
  ↓ review prescription + overrides
  ↓ (optional) acknowledge override → emits override.acknowledged event
```

## Production rollout sequencing
1. UI tokens + RuntimeCard/Sheet/ActionBar primitives + TrustFooter
2. `buildDailyPrescription` pure projection + tests
3. `/today` athlete daily runtime
4. Session execution flow + canonical event emission
5. Override + deviation sheet (shared)
6. Coach console additive panels + athlete history route
7. Parity validator extension + Playwright sweep
8. Grep guard updates + CI verification

Each step ships independently; nothing earlier breaks if a later step is paused.

## Implementation risk map
- **Projection drift** → mitigated by extending parity invariants in step 7 before rollout.
- **Mobile latency** → all projections already cached by React Query; keep `/today` to one query + memoized derivations.
- **UI bloat regression** → enforced by shared RuntimeCard primitive + token guard.
- **Hidden mutation temptation** during session flow → grep guard on direct ledger writes; all writes via `emitAsbEvent`.
- **Override loop confusion** → single shared sheet, single event family, surfaced identically on athlete + coach sides.

## Technical-debt prevention
- No new tables, no new edge functions, no parallel state.
- All new components consume existing hooks; new hooks are pure projections over existing rows.
- New event topics namespaced (`session.*`, `prescription.*`, `runtime.*`) and registered alongside existing topic prefix rules used by parity validators.
- Tokens centralized; no per-component color literals.

## Strict out-of-scope (explicit)
No AI summaries, no autonomous authority, no gamification, no notification spam, no social mechanics, no black-box scoring, no schema changes, no architectural rewrites, no sensor activation (Backlog #7 remains deferred).

## Deliverable shape
~25 new files (6 routes, ~10 components, 3 hooks, 1 projection lib, 2 tests, 1 token pass, 1 parity validator extension, 1 grep guard update). Zero migrations. Zero edge functions.
