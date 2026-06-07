# Onboarding Authority & Context Acquisition Optimization — Plan

Pure documentation/analysis sprint. No code, schema, events, or doctrine changes. Builds directly on RFL-051…RFL-060 produced by the prior remediation sprint.

## Scope discipline

- No new onboarding questions added.
- No removal of existing onboarding questions.
- No schema or spine mutation.
- No HammerOnboardingChat / OnboardingFlow / ProgressiveDisclosureStepper changes.
- Output is a canonical authority-classification model used to govern future V1.x onboarding proposals.

## Deliverables

1. **`docs/asb/onboarding-authority-optimization.md`** (new) — canonical context authority model.
2. **`docs/asb/reality-feedback-ledger.md`** — append RFL entries for any newly-surfaced authority/activation tradeoffs identified during analysis (no re-opening of closed RFLs).
3. **`.lovable/plan.md`** — append execution note recording sprint completion, scope, and that no runtime artifacts changed.

## Source material (read-only)

- `docs/asb/onboarding-reality-validation-remediation.md` — Sections C–G gap analysis, RFL-053…RFL-060.
- `docs/asb/athlete-context-spine-constitution.md` and gap-analysis — canonical spine.
- `docs/asb/onboarding-production-audit.md` — current onboarding shape.
- `src/pages/OnboardingFlow.tsx`, `src/components/onboarding/*`, `src/components/hammer/HammerOnboardingChat.tsx`, `src/hooks/useHammerOnboardingDirector.ts`, `src/lib/hammer/context/*` — for current acquisition surface + duration audit.
- `src/lib/runtime/relational/onboardingBootstrap.ts` — relational primitive entry.

No mutations to any of these files.

## Structure of `onboarding-authority-optimization.md`

### Section A — Context Inventory
Enumerate every field currently collected during onboarding (spine + supplemental). For each field, record:
- Current acquisition point (step / chat turn / deferred)
- Constitutional authority class (organism truth / interpretive / personalization seasoning)
- Consumer dependency (daily plan, first recommendation, first roadmap, longitudinal only)
- Classification: **Required Before First Daily Plan / Required Before First Recommendation / Required Before First Roadmap / Post-Onboarding / Inferable**

Cross-reference RFL-053…RFL-060 candidate fields (primary/secondary position, competition level, development stage, training experience, training continuity, anthropometrics, other sports).

### Section B — Position Authority
Evaluate `primary_position` and `secondary_positions` against:
- Recommendation dependency (does Hammer's first recommendation degrade meaningfully without it?)
- Workload dependency (does workload calibration require position?)
- Roadmap dependency (does roadmap path branch on position?)

Classify each as **Required / Deferred / Inferable** with explicit authority justification. Expectation: primary = Required (Tier 1); secondary = Deferred (Tier 2).

### Section C — Competition Level Authority
Evaluate `{ recreational, travel, high_school, varsity, college, professional }`. Determine whether competition level is needed before first prescription or whether a safe organism default (development-stage-derived) suffices. Expectation: Deferred (Tier 2), inferable from development_stage + age signal.

### Section D — Training History Authority
Evaluate training age, detraining history, current consistency. Establish **minimum viable acquisition model** — which single field, if collected, unlocks the most prescription legality at lowest activation cost. Expectation: current consistency = Tier 1 lightweight signal; training age = Tier 2; detraining history = Tier 3 (longitudinal observation supersedes self-report).

### Section E — Anthropometric Authority
Review height, weight, wingspan, limb lengths, body composition. Classify by:
- Required (none for first prescription)
- Useful (height, weight — Tier 2)
- Trust-gated (wingspan, limb lengths, body composition — Tier 3/4, post-trust)

Document that anthropometrics never block activation.

### Section F — Onboarding Length Audit
Measure current onboarding duration (step count, estimated time-on-task from existing flow). Estimate marginal cost per RFL-053…RFL-060 candidate. Identify the **activation risk ceiling** — the point at which added context degrades completion more than it improves personalization.

### Section G — Recommended Acquisition Strategy
Four-tier canonical model:
- **Tier 1 — Required before activation**: sport (already), primary position, current consistency signal, injury baseline (already), development stage (lightweight).
- **Tier 2 — First-week acquisition**: secondary positions, competition level, training age, height/weight.
- **Tier 3 — Longitudinal acquisition**: detraining history, other sports, training continuity refinement.
- **Tier 4 — Advanced organism profiling**: wingspan, limb lengths, body composition — trust-gated, opt-in.

Each tier entry cites the authority justification and the consumer it unlocks.

### Section H — Governance Rule
State the canonical rule: **no onboarding expansion may occur without (a) demonstrated authority value for a named consumer, (b) tier classification, (c) activation-cost estimate, (d) RFL link.**

## RFL updates

Append to `docs/asb/reality-feedback-ledger.md`:
- **RFL-061** — Canonical onboarding authority model ratified (this sprint). Status: CLOSED-as-doctrine-reference.
- Any new authority/activation tradeoff observations surfaced during the length audit (e.g., if HammerOnboardingChat already collects a Tier 3+ field that should be deferred). OPEN, P2.

No re-opening of RFL-051/052 (resolved) or RFL-053…RFL-060 (each gets a tier assignment cross-reference added).

## `.lovable/plan.md`

Append a short execution note: sprint name, deliverable paths, scope (documentation-only, no runtime artifacts), and confirmation that exit criteria are met.

## Exit criteria mapping

- Canonical onboarding context model exists → `onboarding-authority-optimization.md` Sections A + G.
- No onboarding expansion without demonstrated authority value → Section H governance rule.
- Activation protected → Section F length audit + Tier 1 minimality.
- Personalization capability increases → Tier 2–4 acquisition roadmap.

---

## Execution note — 2026-06-07

**Sprint:** Onboarding Authority & Context Acquisition Optimization — completed.

**Deliverables shipped:**
- `docs/asb/onboarding-authority-optimization.md` — canonical four-tier authority model (Sections A–H).
- `docs/asb/reality-feedback-ledger.md` — RFL-061 (model ratified, CLOSED-as-reference), RFL-062 (school_grade replacement note, Open P0), RFL-063 (chat ordering re-prioritization, Open P2), plus tier-classification mapping table for RFL-053…RFL-060.
- `.lovable/plan.md` — this note.

**Scope:** Documentation only. Zero runtime artifacts modified — no code, schema, ASB topics, spine, event fabric, doctrine, or UI changes. `HAMMER_KNOWLEDGE_GAPS`, `ONBOARDING_VOICE`, `OnboardingFlow`, `HammerOnboardingChat`, and the Athlete Context Spine are untouched.

**Exit criteria:** All four met — canonical model exists (Sections A + G); governance rule against unjustified expansion established (Section H); activation protected via Tier 1 +30s ceiling rule (Section F); personalization roadmap defined for Tiers 2–4.
