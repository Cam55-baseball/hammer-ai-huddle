# Wave 3 Closure Pass — Final Plan

Additive-only completion of Wave 3. No new architecture, no schema changes, no new doctrine. All work is pure, deterministic, replay-safe, and gated by existing capabilities.

## 1. Projections Layer (10 files)

Create `src/lib/runtime/projections/` with pure builders for each domain:

- `cycleState.ts`, `rtpState.ts`, `illnessState.ts`, `envState.ts`, `positionState.ts`, `perceptionState.ts`, `educationState.ts`, `onboardingState.ts`, `certState.ts`, `shareState.ts`

Shared contract:

```ts
type ProjectionKey = `${string}::${string}`; // scope::last_event_id
buildXState(events: RuntimeEvent[], scope: Scope): XState // pure, no I/O
```

- Module-level `WeakMap`-free memo: `Map<ProjectionKey, State>` keyed on `(scope, last_event_id)` — no time-based eviction, no mutation of returned state (frozen).
- Filter by `visibility_scope` before fold (cycle defaults to `self`).
- No `supabase`, no `Date.now()`, no `Math.random()`, no UI imports.
- Wire each modulator in `src/lib/runtime/modulators/*.ts` to consume its projection instead of raw events where applicable.

## 2. Replay Determinism Suite

Create `tests/replay-determinism-wave3.test.ts`:

- Load fixture corpus (Wave 1 + 2 + 3 events) from `tests/fixtures/wave3-corpus.json` (new, ~40 events covering every topic).
- **Byte identity**: `JSON.stringify(replay(corpus)) === JSON.stringify(replay(corpus))`.
- **Order independence**: shuffle non-causal events within same `occurred_at` → identical projection (events are sorted by `(occurred_at, event_id)` in projections).
- **Modulator order**: assert `MODULATOR_ORDER` applied deterministically; swapping input event order does not change envelope merge.
- **Confidence monotonicity**: for every modulator output, `envelope.confidenceCeiling <= min(source.confidence)`.
- **Scope leakage**: cycle events with `visibility_scope='self'` absent from any coach/org-scoped projection.
- **Lineage preservation**: every `DailyPrescription.sourceEventIds` is a superset of contributing modulator `sources[]`.

## 3. Education + Explainability Components

Create under `src/components/edu/`:

- `ConfidenceExplainer.tsx` — explains confidence ceiling math via current `TrustFooter` data.
- `ReadinessExplainer.tsx` — walks the prescription pipeline stages.
- `ReplayExplainer.tsx` — shows append-only + replay determinism in plain language.
- `OrganismContinuityExplainer.tsx` — longitudinal continuity narrative.
- `ParentView.tsx` — read-only, simplified (uses `simplify.ts`), shows only ceilings + notes, no raw numbers.
- `CoachEducationView.tsx` — coach-scoped explainer linking to `/ops/replay`.

All use `RuntimeCard` + `TrustFooter` only. Progressive disclosure via `<details>`. No streaks, no badges, no progress bars beyond step counters.

## 4. Onboarding Continuity

Create under `src/components/onboarding/`:

- `ProgressiveDisclosureStepper.tsx` — derives current step from count of `onboarding.step_completed` events (pure projection via `onboardingState.ts`).
- `AthleteTypePath.tsx` — emits `onboarding.path_selected` event; never mutates state directly.
- `RuntimeOrientation.tsx` — explains event/replay model in ≤3 concepts.
- `SurvivabilityPrimer.tsx` — mandatory primer; cannot be skipped (stepper blocks advancement until `onboarding.primer_acknowledged` event exists).

Wire into existing `src/pages/OnboardingFlow.tsx`.

## 5. Share / Export Continuity

Extend `src/pages/ShareConsole.tsx` + new `src/lib/share/exporter.ts`:

- `buildShareExport(scope, athleteId)` re-runs projection from canonical events; never reads cached blobs.
- Output includes `{ engine_version, last_event_id, replay_handle, generated_at_event_id, confidence, sources[] }`.
- Athlete-controlled visibility: requires `share.granted` event; revocation via `share.revoked`.
- No ranking, no composite scores.

## 6. Copy + i18n Completion

- Audit `src/lib/copy/*` for canonical terms: "ceiling", "confidence", "lineage", "replay", "survivability". Add missing keys for new edu/onboarding/share strings.
- Extend `src/lib/i18n/registry.ts` EN/ES/JA for all new keys. Add `simplify` variants for parent/elder mode.
- Add `tests/i18n-parity.test.ts`: every key exists in every locale; no locale introduces semantic drift (assert via a fixed canonical-term map).

## 7. CI + Preflight Expansion

Extend `scripts/check-invariants.sh` with rules 14–18:

```bash
# 14: projections forbid UI imports
rg -n "from ['\"](@/components|react|@/pages)" src/lib/runtime/projections && fail

# 15: exports only from replay pipeline
rg -n "ShareConsole|exporter" src --files-with-matches | xargs rg -L "buildShareExport|replay" && fail

# 16: onboarding progression event-derived
rg -n "useState.*step|setStep" src/components/onboarding && fail

# 17: no hardcoded user-facing strings in new surfaces
rg -n ">[A-Z][a-z]+ [a-z]+<" src/components/edu src/components/onboarding | rg -v "t\(|copy\." && fail

# 18: no confidence amplification
rg -nE "confidence\s*[+*]\s*[0-9.]+|Math\.max\([^)]*confidence" src/lib/runtime/{projections,modulators} && fail
```

Extend `scripts/preflight.sh` to run:
- `replay-determinism-wave3.test.ts`
- `i18n-parity.test.ts`
- cross-scope privacy sweep (subset of determinism suite)
- export replay verification (subset)

## Out of Scope

No new waves, doctrine, sensors, AI scoring, notifications, social systems, gamification, mutable stores, databases, parallel runtimes.

## Required Output Summaries (on completion)

File inventory; replay integrity result; CI rules 14–18 status; determinism + privacy + onboarding + export verification; remaining gaps (expected: none).
