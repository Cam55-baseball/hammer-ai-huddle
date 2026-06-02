# RR-8 Wave 1B — Completion & Organism Stability Pass

Strict additive continuation of RR-8 only. No RR-6/7/9/10. No recruiter, injury, exposure, career-arc, or commercial activation. No schema rewrites, no new primitives, no new event families.

## Section 1 — Onboarding Life-Context Check-In

**Edit only** `src/pages/OnboardingFlow.tsx` and `src/lib/relational/copy.ts` (add `LIFE_CONTEXT_CHECKIN` block under `ONBOARDING_VOICE`).

- Insert one new optional step after `"checkin"` and before `"scope"` in `ONBOARDING_VOICE.steps`: id `"life_context_checkin"`, title "Quick check-in", body "Is anything heavy outside of training right now?".
- Render six selectable chips + skip button. Allowed labels exactly:
  - School or schedule → `topic_tag: "school_or_schedule"`
  - Travel → `"travel"`
  - Sleep → `"sleep"`
  - Family → `"family"`
  - General pressure → `"general_pressure"`
  - Nothing heavy right now → emits nothing
- Skip button (secondary) also emits nothing. Either path emits canonical `onboarding.step_completed`.
- Selecting a non-empty option calls `emitLifeContextDisclosure(ctx, "general_pressure", payload, gate)` with:
  - `visibility_scope: "self"`, `authority: "self"`, `intensity_band: "moderate"`
  - `window_start`/`window_end` set to `occurredAt` (no wall-clock drift; passed in once)
  - `topic_tag` derived from selection
  - `confidence: null`, `missingness: { fields: [], reason: "not_observed" }`, `lineage_parent_ids: []`
  - `gate: { safeguardingLockdown: false, isMinor }` (isMinor read from existing developmental projection if available; otherwise default `false`)
- Constraints honored: single primary CTA, one-sentence helper text, mobile-first spacing, no progression gating, no scoring, no free-text, no surveillance copy, no inference, no persistence outside canonical event flow.

## Section 2 — Visibility Matrix Completion Test

**Create** `src/lib/runtime/relational/__tests__/life-context-visibility.test.ts` modeled on `relational-visibility.matrix.test.ts`, driven through `lifeContextState`.

Cases:
1. `self` scope sees self-authored life-context rows.
2. `demo` scope never sees self-authored rows.
3. `self` scope never sees demo-authored rows (bidirectional firewall).
4. `recruiter` (modelled as `external` scope — recruiter scope does not exist in `Scope` union) reads zero life-context rows when payload scope is `self|parent`. Asserts recruiter-equivalent surfaces are starved.
5. Rows carrying `safeguarding_category: true` (treated as safeguarding_only) are excluded from `coach` scope.
6. Revocation event removes the original disclosure on replay rebuild.
7. Paused relationship downgrades visibility — simulated by emitting a coach-scoped disclosure followed by a revocation; coach projection drops it.
8. Parent supremacy: parent-authored row visible to `parent` scope when athlete is minor; self-authored row stays self-only.

No production logic edits unless test surfaces a real invariant violation.

## Section 3 — Hammer Memory Arbitration Stability

**Edit only** `src/lib/runtime/relational/hammerMemory.ts` and `src/components/relational/HammerConversationPanel.tsx`.

- Add pure helper `arbitrateMemoryCallback({ narrative, lifeContext, safeguardingLockdown })` returning `{ kind: "narrative" | "life_context" | "none", ref }`.
  - If `safeguardingLockdown` → `none`.
  - Pick newest legal reference by `occurred_at` descending.
  - Ties resolved by lexical comparison of `topic_tag ?? category ?? kind` ascending.
  - At most one callback per session — invariant unchanged.
- Update `HammerConversationPanel.tsx` to consume the helper instead of independently rendering both `callback` and `lifeCtxAck`. Render either the RR-5 chip OR the RR-8 chip, never both. Safeguarding lockdown suppresses both.
- No new UI surfaces. No copy changes beyond what already exists.

## Section 4 — Organism Coherence Verification

**Create** `docs/asb/rr-8-organism-coherence-audit.md` covering:
- Onboarding emotional safety review (skippability, no scoring, no surveillance framing).
- Disclosure coercion audit (no gating, no nudges, no implied requirement).
- Replay determinism confirmation (pure projection + emitter, pinned versions).
- Visibility isolation confirmation (matrix test results).
- Memory arbitration proof (RR-5 ↔ RR-8 single-callback rule).
- Safeguarding precedence verification.
- Missingness preservation proof.
- Mobile walkthrough findings at 390px and 440px.
- Remaining risks and final verdict.

## Section 5 — Verification

Run sequentially and report exact results:
- `bunx tsc --noEmit`
- Full relational vitest suite (`src/lib/runtime/relational` + `src/lib/runtime/projections` + `src/hooks/__tests__` if present)
- RR-5 + RR-8 tests together (narrative + life-context test files)
- `bash scripts/preflight.sh`

Return: exact files changed, exact tests added, pass/fail totals, invariant violations found, remaining risks, final verdict.

## Stop Gate

No RR-6/7/9/10 code. No recruiter workflows. No exposure systems. No injury systems. No career-arc systems. No new primitives. No schema rewrites. No new event families. No commercial activation.

## Technical notes

- `general_pressure` is the canonical onboarding topic family per the user's directive; per-selection differentiation lives in `topic_tag` (free-form short tag already permitted by `BoundedWindow`).
- `emitLifeContextDisclosure` already enforces actor/authority/safeguarding gating — onboarding only constructs the payload and gate.
- Visibility test uses `external` scope to represent recruiter (Scope union has no `recruiter`; recruiter surfaces consume `external` projections). This matches RR-10 reservation without introducing new scopes.
- Arbitration helper is pure and replay-stable; no clocks, no randomness.
