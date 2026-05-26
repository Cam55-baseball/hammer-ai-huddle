
# Wave 3 — Specialized Intelligence Expansion & Longitudinal Continuity

Additive overlay on the Wave 1/2 ASB runtime. No schema rewrites, no parallel runtimes, no black-box scoring. All new state is **event-derived** from `asb_events` via `emitRuntimeEvent`, lineage-linked, confidence-visible, CI-gated.

## Architectural Rule
Every Wave 3 domain follows the same pattern already proven in Wave 1:

```text
input surface → emitRuntimeEvent(topic, payload, sources[])
              → projection (useMemo, scope+last_event_id)
              → prescription modulator (pure, lineage-bound)
              → UI surface (StateBadge + TrustFooter)
```

No domain authors organism truth directly. Each is a **modulator** of the existing prescription pipeline with explicit `sources[]` lineage and a confidence ceiling = `min(source confidences)`.

## Event Taxonomy Additions (single canonical list)
All under existing `asb_events` table, new `topic` values:

- `cycle.phase_logged`, `cycle.symptom_logged` (athlete-private scope flag)
- `rtp.phase_advanced`, `rtp.restriction_set`, `rtp.clinician_note`
- `illness.logged`, `illness.resolved`
- `respiratory.load_logged`, `respiratory.pattern_logged`
- `env.travel`, `env.sleep_disruption`, `env.climate`, `env.surface`, `env.density`
- `position.assigned`, `position.workload_logged`, `position.specialization_drift`
- `perception.fatigue_logged`, `perception.reaction_logged`
- `education.module_completed`, `education.viewed`
- `onboarding.step_completed`
- `cert.module_completed`, `cert.path_advanced`
- `share.export_generated`, `share.scope_changed`
- `comm.notification_sent`, `comm.cadence_set`
- `locale.changed`, `a11y.preference_set`

Each event carries: `actor_role`, `sources[]`, `confidence`, `visibility_scope` (`self|coach|org|external`), `engine_version`.

## Module Inventory (12 domains, compressed)

```text
src/lib/runtime/modulators/   ← pure projection→prescription functions
  cycle.ts            rtp.ts            illness.ts
  respiratory.ts      environment.ts    position.ts
  perception.ts
src/lib/runtime/projections/  ← event→state, memoized
  cycleState.ts  rtpState.ts  illnessState.ts  envState.ts
  positionState.ts  perceptionState.ts  educationState.ts
  onboardingState.ts  certState.ts  shareState.ts
src/lib/comm/                 ← ethical notification governor
  cadence.ts  restraint.ts
src/lib/i18n/                 ← multilingual scaffolding
  registry.ts  formatter.ts  (no runtime semantics changes)
src/lib/a11y/
  preferences.ts  simplify.ts
src/pages/
  Cycle.tsx            RTP.tsx           Illness.tsx
  Environment.tsx      Position.tsx      Perception.tsx
  EducationHub.tsx     OnboardingFlow.tsx
  CertPath.tsx         ShareConsole.tsx
src/components/edu/   parent/coach explainer cards (replay walkthrough,
                       confidence explainer, readiness explainer)
src/components/onboarding/  progressive disclosure stepper, athlete-type paths
```

## Prescription Pipeline Integration
`src/lib/runtime/prescription.ts` already accepts a modulator list. Wave 3 registers the new modulators in fixed order (deterministic): `rtp → illness → cycle → respiratory → environment → position → perception`. Each:

- reads its projection (read-only, event-derived)
- returns `{ ceiling, notes[], sources[] }`
- never raises confidence, never removes a hard stop, never overrides clinician/coach authority

`PrescriptionCard` gains a collapsible "Why" panel listing active modulators + sources (one-tap lineage).

## Specialized Domain Notes

- **Cycle**: athlete-private by default; `visibility_scope='self'`. Coach view shows only an opaque "modulated" flag unless athlete grants `coach` scope. No phase prediction — only logged-phase modulation. Anti-shame copy reviewed in `src/lib/copy/cycle.ts`.
- **RTP**: phases are append-only `rtp.phase_advanced` events. Restrictions gate prescriptions via hard ceilings. Clinician notes are first-class lineage sources. No auto-advance.
- **Illness**: symptom severity is bounded ordinal; outputs are survivability ceilings only — no diagnosis, no medication guidance. Reintegration requires explicit `illness.resolved`.
- **Respiratory / Perception**: low-friction 1-tap inputs; outputs are recommendation notes with confidence; never composite "scores".
- **Environment**: derives from logged travel/sleep/climate/density events; modulates load ceilings; temporal continuity preserved via event timestamps.
- **Position**: tracks assignments + workload per position; specialization drift surfaced as a *visibility* metric, never an alarm; youth athletes get an anti-early-specialization advisory in `PrescriptionCard`.
- **Education / Cert**: progression = event count over curriculum graph; no streaks, no XP, no badges that decay.
- **Share / Scout**: exports are deterministic replay-linked summaries; athlete toggles `share.scope_changed`; every external view re-renders from events, no cached PDFs treated as truth.

## Onboarding Architecture
Single `OnboardingFlow.tsx` with athlete-type branches (youth/HS/college/pro/coach/parent). Progressive disclosure driven by `onboarding.step_completed` events — same event substrate as everything else, so onboarding state is replay-reconstructable. No skipping survivability primitives; advanced surfaces unlock by event, not by toggle.

## Communication Ethics (`src/lib/comm/`)
`cadence.ts` enforces a hard rate ceiling per athlete per day (default 2 non-critical, unlimited critical-survivability). `restraint.ts` blocks notifications that would re-surface already-acknowledged events. CI rule forbids any component importing a toast/notify API outside `lib/comm/`.

## Internationalization & Accessibility
`i18n/registry.ts` is a flat key→string map with locale fallback. No runtime semantic translation (confidence/lineage labels are canonical tokens). `a11y/simplify.ts` provides a "plain language" toggle that swaps copy bundles — never alters numeric outputs or lineage visibility.

## CI Enforcement (extend `scripts/check-invariants.sh`)
New rules 9–13:
- 9: modulators must export pure functions, no `supabase` imports
- 10: no direct `notify`/`toast` calls outside `src/lib/comm/`
- 11: no domain may write to a non-`asb_events` table
- 12: `visibility_scope` required on all cycle/share/illness event emissions (grep)
- 13: no `Math.random` or `Date.now()` inside `modulators/` or `projections/` (determinism)

Preflight extended: parity test must include every new modulator.

## Validation Strategy
- Per-domain unit tests under `src/lib/runtime/modulators/__tests__/` — pure-function tables.
- `parity.test.ts` extended: each modulator validated against `validateRuntimeProjection` (confidence ceiling, escalate-requires-source).
- Replay determinism test: full Wave 1+2+3 event corpus replayed twice → byte-identical projections.
- Privacy test: cycle events with `scope='self'` never appear in coach-scope projection snapshots.
- Notification cadence test: > ceiling emissions are dropped, not deferred silently (logged as `comm.notification_dropped`).

## Rollout Sequencing
1. Modulator scaffold + prescription registration (no UI yet) → parity green
2. RTP + Illness (highest survivability value)
3. Cycle (privacy-first, athlete-only UI)
4. Environment + Respiratory + Perception
5. Position specialization
6. Education / Onboarding / Cert
7. Share / Scout export
8. Comm ethics + i18n + a11y
9. CI rules 9–13 + full preflight

Each step ships behind a capability flag in `roleMatrix`; nothing visible until parity + replay tests pass.

## Operational Risk Map
- *Risk:* modulator stacking suppresses signal → *Mitigation:* `PrescriptionCard` always shows full modulator list + ceiling source.
- *Risk:* cycle data leakage → *Mitigation:* scope enforced at projection layer + RLS policy review (one additive migration only if audit finds a gap).
- *Risk:* notification fatigue → *Mitigation:* cadence ceiling + CI rule 10.
- *Risk:* education gamification creep → *Mitigation:* no streak/XP fields in event schema; CI grep forbids `streak|xp|badge` in `education/cert` paths.
- *Risk:* i18n drift breaking lineage labels → *Mitigation:* canonical tokens excluded from translation bundles.

## Technical Debt Prevention
- No new tables. No new runtimes. No new state stores.
- Every modulator is a pure function with a unit-test table.
- Every UI surface composes existing `RuntimeCard / StateBadge / TrustFooter / PrescriptionCard`.
- All copy centralized in `src/lib/copy/<domain>.ts` for i18n + simplify.
- Capability flags retire after rollout — no dead toggles.

## Out of Scope (explicit)
Autonomous medical AI, hormonal scoring models, black-box athlete ranking, social feeds, streaks/XP/badges, push-notification campaigns, schema rewrites, parallel runtimes, mutable projections, ML-based phase prediction, biometric ingestion beyond logged events.

## Files to Create (compressed)
`src/lib/runtime/modulators/{cycle,rtp,illness,respiratory,environment,position,perception}.ts` + tests; `src/lib/runtime/projections/{cycle,rtp,illness,env,position,perception,education,onboarding,cert,share}State.ts`; `src/lib/comm/{cadence,restraint}.ts`; `src/lib/i18n/{registry,formatter}.ts`; `src/lib/a11y/{preferences,simplify}.ts`; `src/lib/copy/<domain>.ts`; `src/pages/{Cycle,RTP,Illness,Environment,Position,Perception,EducationHub,OnboardingFlow,CertPath,ShareConsole}.tsx`; `src/components/edu/*`, `src/components/onboarding/*`; extended `scripts/check-invariants.sh`; extended `parity.test.ts` + new replay-determinism test.

## Edits
`src/lib/runtime/prescription.ts` (register modulators), `src/App.tsx` (routes behind capability gates), `src/lib/auth/governance/roleMatrix.ts` (new capability flags), `.lovable/plan.md`.
