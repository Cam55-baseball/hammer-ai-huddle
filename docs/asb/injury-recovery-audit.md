# RR-6 Wave 1 — Injury Recovery Continuity Audit

**Status:** Active overlay. Doctrine sealed in `docs/asb/rr-6-injury-recovery-constitution.md`.
**Scope:** the `relational.injury.*` topic family.
**Subordinate to:** Eternal Laws, Megaphase 151–160, RR-1…RR-5 + RR-8,
safeguarding orchestration, minor-athlete supremacy, developmental
gating, visibility matrix, replay legality, RR-6 invariants 1–10.

## 1. Emotional safety review

All user-facing copy lives in `INJURY_RECOVERY_VOICE` (src/lib/relational/copy.ts).
Tone is observational, calm, non-medical, protection-first. No "you got
this" cheerleading. No countdowns. No motivational fabrication. The
chip and timeline render fixed templates only — no free-form generation.

## 2. Anti-diagnosis audit

`InjuryReportedPayload` / `InjuryUpdatedPayload` / `InjuryRecoveryCheckpointPayload`
use Zod `.strict()`. Any attempt to add `diagnosis`, `prognosis`,
`treatment_plan`, `eta_days`, `pain_score`, or `medication` fields fails
schema validation. Symptoms are constrained to the bounded
`INJURY_REPORTED_SYMPTOMS` enum (sensation only, never pathology).
`recovery_focus` and `body_region` strings are scanned at the emit
boundary against `INJURY_RECOVERY_VOICE.denylist`; matches throw
`InjuryEmissionError("INJURY_DENYLIST_HIT")`. The same denylist is
enforced for any Hammer reference via
`assertInjuryReferenceLegality`. Tested in `injurySchemas.test.ts`,
`injuryEmitters.test.ts`, `injury-reference.test.ts`.

## 3. Safeguarding precedence proof

`gate()` in `injuryEmitters.ts` mirrors the RR-8 pattern: when
`safeguardingLockdown` is set, `visibility_scope` is forced to `"parent"`
and `safeguarding_category` is forced to `true` before emission. The
projection inherits the demo↔production firewall and the parent-scope
guard sealed in Wave 1D (`prepareRows`). The Hammer panel computes
`safeguardingHeld = lifeCtx.safeguardingHeld || injury.safeguardingHeld`
and passes it to `arbitrateMemoryCallback`, which returns `{kind: "none"}`
when lockdown is active — suppressing the injury chip alongside RR-5/RR-8
references. Tested in `injury-visibility.test.ts` and
`injuryEmitters.test.ts`.

## 4. Replay determinism proof

`buildInjuryRecoveryState` is pure: no `Date.now`, no `Math.random`, no
I/O. It runs over rows already sorted by `(occurred_at, event_id)` via
`prepareRows`, then folds them deterministically. Memoization keys are
`(scope, lastEventId)` with `sourceCount` guard — identical to other
relational projections. The shuffle-equivalence and duplicate-id
idempotency assertions live in `injuryRecoveryState.replay.test.ts`.
Revocation rebuilds remove the referenced event from `visibleRecoveryTimeline`
and add it to `revokedEventIds` on the next pass.

## 5. Visibility matrix verification

Inherited from `prepareRows`:

| payload visibility_scope | reader scope | visible? |
|---|---|---|
| self | self | yes |
| self | coach/org/external/parent/demo | no |
| parent | parent | yes |
| parent | self/coach/org/external/demo | no |
| coach | coach | yes |
| coach | self/parent/org/external/demo | no |
| demo | demo | yes |
| demo | any non-demo | no |
| org/external | any | rejected at schema layer (RR-6 inv 4) |

## 6. Manipulation / coercion review

- No predictive recovery score.
- No autonomous RTP — `rtp_authorized` requires explicit
  parent/clinician authority, schema-enforced.
- AI actors blocked from authoring any RR-6 event.
- Recruiter/org/external visibility blocked at schema layer.
- No countdowns, no ETA, no "X days until return".
- No engagement loops — chip is a single observational line, never
  CTA-shaped.

## 7. Parent supremacy review

For minor athletes, `InjuryEmitGate.isMinor` is exposed to the gate; the
constitutional placement aligns with RR-8 minor handling (coach
visibility for minors requires parent authority for life-context; RR-6
extends the same hierarchy through safeguarding rerouting). Parent-scope
events are exclusively visible to parent readers via the Wave 1D
`prepareRows` guard.

## 8. Remaining risks

- The `"safeguarding_only"` scope name from the wave spec is realized as
  `visibility_scope="parent" + safeguarding_category=true`, mirroring the
  established RR-8 pattern, so the shared `VISIBILITY_SCOPES` enum and
  `Scope` type are not mutated. If a distinct `safeguarding_only` scope
  is later required, it must be added through a Megaphase 151 namespace
  amendment, not from inside RR-6.
- The emitter denylist scans only string-typed payload fields known to
  carry free-text (`recovery_focus`, `body_region`, `topic_tag`). New
  string fields added in future waves must be added to the scan list.

## 9. Final verdict

RR-6 Wave 1 — injury recovery continuity is operational as an
observational, replay-safe, survivability-bound overlay. No diagnosis,
no prescription, no autonomous RTP, no commercial exposure. Stop-gate
held: no RR-7/9/10 activation, no schema rewrites, no replay-engine
changes, no mutable recovery state.
