# Launch Readiness Hostile Audit — Plan

Pure audit + documentation sprint. No new features, no doctrine, no schema, no UI changes. Three docs written; codebase untouched.

## Method

Static hostile audit driven by reading the actual code paths athletes traverse, plus existing audit corpus in `docs/asb/`. I will not simulate journeys in the browser — the audit is code-evidence based, with file:line citations so every finding is verifiable and rebuttable.

Investigation order (read-only):

1. **Entry & onboarding** — `src/pages/Auth.tsx`, `AthleteOnboarding.tsx`, `Activate.tsx`, `BuildAccessGate.tsx`, onboarding hammer chat (`HammerOnboardingChat.tsx`), parent-invite (`AcceptParentInvite.tsx`).
2. **First-run surfaces** — `Dashboard.tsx`, `AthleteCommand.tsx`, `AthleteDigest.tsx`, `HammerDailyPlan.tsx`, `HammerChat.tsx`.
3. **Recommendation surfaces** — `useWorkoutRecommendations`, `useDrillRecommendations`, `useRoadmapProgress`, `useSpeedProgress`, `dailyPlan.ts`, `decisionFilters.ts`, `recommendDrills.ts`, `recommendVideos.ts`.
4. **Authority chain** — cross-check Hammer output vs roadmap vs daily plan vs recommendations for contradiction surfaces; reuse `coach-hammer-authority-audit.md` + `intelligence-utilization-audit.md` as priors.
5. **Empty / partial / stale states** — grep for empty-state branches (`.length === 0`, `no data`, `null` fallbacks) across athlete surfaces.
6. **Retention loops** — progression, streaks, achievements, history components; verify D1/D7/D30/D90 value visibility.
7. **Injury / parent-supervised / recruiting paths** — verify branching exists end-to-end, not just at decision filter layer.

Prior audits in `docs/asb/` (humanization, dropoff, life-context, injury-recovery, intelligence-consumption, data-consistency, final-launch-risk-register) consulted but re-tested against current code rather than trusted.

## Deliverables

### 1. `docs/asb/launch-readiness-hostile-audit.md` (primary)

Sections matching the brief:

- **A. End-to-end athlete journeys** — 7 personas (brand-new, beginner, advanced, returning, injured, parent-supervised, recruiting). For each: onboarding → first Hammer → first plan → first rec → first roadmap → first workout → return. Per-step findings: dead ends, confusion, contradictions, missing next actions, empty states, trust breaks. File:line evidence.
- **B. Hammer authority audit** — enumerate conflict surfaces (Hammer chat vs daily plan vs roadmap vs rec engine). Each conflict cites source files producing divergent outputs.
- **C. Empty state audit** — every athlete-visible surface that can render with zero/partial/stale data; verify (explanation + next action + recovery) triplet exists; list gaps.
- **D. UX friction audit** — clicks, navigation depth, label clarity, hidden functionality, cognitive load, onboarding friction. Ranked.
- **E. Recommendation quality audit** — attempt to break each rec surface: repetition, contradiction, irrelevance, low-confidence emission; cross-reference `p0-3-differentiation.json` evidence.
- **F. Retention audit** — D1/D7/D30/D90 return value; progression visibility, achievements, next actions, value compounding.
- **G. Hostile disproof** — argue "Hammers Modality is not ready for launch", then rebut each argument with cited evidence.
- **H. Launch blocker inventory** — P0/P1/P2 with no severity inflation; each finding tagged with affected journey + harm dimension.
- **I. Launch readiness verdict** — explicit answers to the 6 brief questions + shortest-path-to-launch + GO / GO-WITH-LIMITATIONS / NO-GO with rationale.

### 2. `docs/asb/reality-feedback-ledger.md` (append)

New RFL entries for each P0 / P1 finding. Status OPEN. Each entry: id, severity, surface, evidence, harm dimension, proposed remediation owner (not solution).

### 3. `.lovable/plan.md` (update)

Insert "Launch Readiness Hostile Audit" stanza referencing the new doc, replacing prior "ready for publication" framing with audit-conditioned verdict.

## Out of scope

- No code edits to `src/`, no migrations, no edge functions, no UI changes, no new tests, no new audit scripts.
- No new doctrine, no new constitution files, no new RR-/EE-/etc invariant families.
- No remediation work — audit identifies, does not fix. Fixes (if user authorizes) become a separate sprint.
- Browser-driven journey simulation deferred — static code audit is sufficient for launch-blocker identification at this stage.

## Verdict framing rule

P0 reserved for: data loss, security exposure, broken auth, decision contradictions visible to athlete in same session, onboarding dead-ends preventing first-plan emission, injury-branch failure exposing unsafe prescription, parent-supervision bypass for minors. Everything else is P1 or P2. No inflation.

## Exit criteria

7 journeys audited with citations, blockers classified without inflation, GO/NO-GO issued with rationale, RFL updated, plan.md updated.


# Launch Readiness Hostile Audit — VERDICT: NO-GO (2026-06-06)

Hostile audit completed. Prior P0-3 "GO WITH KNOWN LIMITATIONS" verdict is **withdrawn**.

## Findings (full report: `docs/asb/launch-readiness-hostile-audit.md`)

### P0 — true launch blockers (3)

- **RFL-032** — Onboarding bypass: `src/pages/Auth.tsx:128-167` routes the majority of returning users straight to `/dashboard`, skipping `/onboarding/athlete` and `HammerOnboardingChat` entirely. First canonical event is never emitted for these athletes.
- **RFL-033** — `compute-hammer-state` edge function: `BootFailure: Identifier 'getSeasonProfile' has already been declared` at `supabase/functions/_shared/seasonPhase.ts:161`. Has never booted.
- **RFL-034** — Minor-athlete supremacy not enforced in `src/lib/hammer/context/decisionFilters.ts` (zero parent/minor/guardian branches). Parent-flagged load concerns do not branch prescription. Violates Megaphase 151–160 cross-primitive doctrine.

### P1 — disclosed launch debt (9)

RFL-035 (chat ↔ plan grounding) · RFL-036 (drill bucket collapse 4/9) · RFL-037 (empty-state triplet gaps) · RFL-038 (staleness invisible) · RFL-039 (pain → suppression latency) · RFL-040 (RTP gate absent) · RFL-041 (nav pollution 100+ routes) · RFL-042 (auth routing race) · RFL-043 (parent-invite 200-event cap).

### P2 — post-launch backlog

HammerOnboardingChat silent null-render · "Needs input" label undefined for first-time users · No streak / progression visibility · Recruiting athletes undifferentiated.

## Shortest path to launch

1. Fix RFL-033 (~10 min — dedup `getSeasonProfile`).
2. Fix RFL-032 (~1 hr — gate `/dashboard` on `useAthleteOnboardingState.hasFirstEvent` at Auth.tsx:128-167).
3. Fix RFL-034 (~2 hr — add parent_concerns / minor_flag branches in `decisionFilters.ts`).
4. Re-issue launch verdict.

Estimated end-to-end: **~half a day of focused work**.

## Verdict

**NO-GO** until RFL-032, RFL-033, RFL-034 closed.

After P0 remediation: expected **GO WITH KNOWN LIMITATIONS** (P1s as disclosed debt).
