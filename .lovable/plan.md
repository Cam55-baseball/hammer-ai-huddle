# Mastery Phase Plan — Organism Coherence & Production Durability

Scope-locked: no new primitives, no RR-5…RR-10, no recruiter/injury/narrative/exposure/career systems, no schema rewrites, no new event families, no architecture changes. Only coherence, durability, calm, mobile polish, maintainability.

## Section 1 — Product Coherence Sweep
- Walk every user-facing surface: `Index`, `OnboardingFlow`, `Relational`, `RelationalDemo`, `ParentInvite`, `AcceptParentInvite`, `SafetyCenter`, `RelationshipSettings`, plus relational components (`AthleteJourneyMap`, `HammerConversationPanel`, `ParentTrustCard`, `RecruitingRoadmap`, `SlumpReloadFlow`).
- Produce `docs/asb/mastery-coherence-audit.md` with per-surface rows: issue, severity, emotional impact, operational impact, simplification, resolved y/n.
- Apply only calm, copy, spacing, hierarchy fixes through `src/lib/relational/copy.ts` and component class adjustments. One primary action per section; demote secondary actions to ghost/link.

## Section 2 — Design System Stabilization
- Audit `index.css` + `tailwind.config.ts` tokens; confirm semantic tokens (no raw colors in components).
- Standardize: card padding rhythm (`p-5`/`p-6`), radius (`rounded-2xl` for cards, `rounded-xl` for inputs/buttons), shadow scale (single soft shadow token), status chip variants, empty-state + skeleton + error-state primitives.
- Remove harsh borders, duplicate badges, destructive styling on non-destructive actions. No redesign — only normalization.

## Section 3 — Performance & Survivability Hardening
- Audit projection cold-start (`useSafetyState`, relational hooks), suspense boundaries, route transitions, edge function failure paths (`send-parent-invite`).
- Add calm skeletons, deterministic fallbacks, non-blocking retry for transport, guard against duplicate requests (debounce already in invite).
- Replace any raw error surfaces with calm copy from `copy.ts`. No blank screens, no infinite spinners.

## Section 4 — Human Trust Optimization
- Sweep copy across onboarding, parent flows, safety, relationship settings, athlete surfaces for protection-first, non-legalistic, non-surveillance tone.
- All changes routed through `src/lib/relational/copy.ts`. No diagnostic, predictive, or AI-authority phrasing.

## Section 5 — Operator Durability
- Produce `docs/asb/operator-durability-audit.md`: dead code, duplicated utilities, unused hooks, stale flags, console noise, naming drift.
- Per row: file, risk, danger, recommendation, safe-now y/n. Apply only the safe-now cleanups (delete dead files, remove console logs, consolidate trivial duplicates). Defer anything touching primitives or projections.

## Section 6 — Mobile Mastery Pass
- Verify each major surface at 390 and 440 via browser tool; check tap targets (≥44px), keyboard overlap, sticky collisions, modal overflow, thumb reach.
- Fix via spacing/size class adjustments only.

## Section 7 — Final Organism Consistency Pass
- Vocabulary, tone, spacing rhythm, action hierarchy, disclosure behavior, loading/error unification across all relational + safety + onboarding surfaces.

## Section 8 — Mastery Verification
- Run `bunx tsc --noEmit`.
- Run full relational/onboarding/relationship/safeguarding test suite.
- Browser walkthroughs: onboarding, athlete, parent invite, parent accept, relationship settings, safety center, relational demo, refresh mid-flow.
- Mobile walkthrough at 390 + 440.
- Final verdict appended to `mastery-coherence-audit.md`: MASTERY READY / READY WITH CONDITIONS / NOT READY, with biggest remaining risk, highest-friction surface, and three confidence ratings (operational survivability, emotional trust, maintainability).

## Files Expected to Change
- New: `docs/asb/mastery-coherence-audit.md`, `docs/asb/operator-durability-audit.md`.
- Edited (copy/spacing/hierarchy only): `src/lib/relational/copy.ts`, relational components listed above, page files listed above, possibly `index.css`/`tailwind.config.ts` for token normalization.
- Deletions: only confirmed dead files surfaced by the durability audit.

## Stop Gate Held
No edits to: ASB primitives, emitters, projections (beyond cold-start polish), schema, edge function logic, routing topology, doctrine docs, RR-5…RR-10, recruiter/injury/narrative/exposure/career surfaces.

## Deliverables on Completion
- Exact files changed
- Exact test counts
- Exact operational findings
- Remaining risks
- Final mastery verdict
