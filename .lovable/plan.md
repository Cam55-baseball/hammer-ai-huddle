# Athlete Experience & Retention Audit — Plan

This is an **audit-only** task. No features, no schema, no doctrine, no implementation. Three documents are produced; nothing else changes.

## Scope

Evaluate whether athletes will understand, trust, enjoy, and repeatedly use the organism — across Sections A–I of the brief. Architecture is out of scope; athlete reality is in scope.

## Investigation (read-only)

Cover the actual surfaces an athlete touches, with `file:line` citations:

- **Entry / first 15 min:** `src/pages/Auth.tsx`, `Index.tsx`, `SelectRole.tsx`, `SelectSport.tsx`, `AthleteOnboarding.tsx`, `OnboardingFlow.tsx`, `ProfileSetup.tsx`, `components/hammer/HammerOnboardingChat.tsx`.
- **Daily use:** `Dashboard.tsx`, `AthleteCommand.tsx`, `Today.tsx`, `TodaySession.tsx`, `components/hammer/HammerDailyPlan.tsx`, `HammerChat.tsx`, `HammerStateBadge.tsx`, `ReadinessChip.tsx`.
- **Progression:** `ProgressDashboard.tsx`, `AthleteDigest.tsx`, `Calendar.tsx`, `Cycle.tsx`, `AsbTimeline.tsx`, roadmap surfaces in `src/lib/hammer/prescription/`.
- **Navigation:** full `App.tsx` route inventory + which routes are reachable from athlete nav vs. orphaned/admin-exposed.
- **Trust:** confidence / "why" rendering in `HammerDailyPlan`, `decisionFilters.ts`, empty-state copy, missing explanations flagged in prior RFLs (RFL-035, 037, 038, 041).
- **Cross-reference** open RFLs in `docs/asb/reality-feedback-ledger.md` and the launch hostile audit so this audit extends, not duplicates.

No edits during investigation — `code--view` and `rg` only.

## Deliverable 1 — `docs/asb/athlete-experience-retention-audit.md` (NEW)

Single document, structured exactly to the brief:

- **Section A — First 15 Minutes:** walk the actual journey signup → role → onboarding → first Hammer → first daily plan → first roadmap → first recommendation. For each step: next-action clarity, value visibility, confusion, overwhelm, emptiness, return motivation. Cite `file:line`.
- **Section B — Daily Use:** today's mission clarity, Hammer authority, daily-plan actionability, recommendation coherence, competing priorities, dead ends.
- **Section C — Progression Visibility:** roadmap progress, achievements, milestones, streaks, history, completed work — is improvement tangible?
- **Section D — Retention Loops:** D1 / D7 / D30 / D90 — can the athlete answer "what did I accomplish / what next / why return tomorrow?"
- **Section E — Navigation Audit:** hidden functionality, click depth, confusing labels, duplicates, unnecessary depth. Ranked P0/P1/P2 without severity inflation.
- **Section F — Trust Audit:** contradictions, unexplained recommendations / scores / priorities, confidence breaks.
- **Section G — Delight Audit:** moments that impress / feel intelligent / personalized / motivating, plus missed opportunities.
- **Section H — Launch Readiness Reassessment:** what harms retention / engagement / trust, fix-before-launch vs. defer-to-V2.
- **Section I — Final Verdict:** GO / GO WITH LIMITATIONS / NO-GO, based **solely** on athlete experience.

Every finding gets: severity, evidence (`file:line`), athlete impact, recommendation category (pre-launch fix / V2 / accept). Hostile disproof attempts included where applicable.

## Deliverable 2 — `docs/asb/reality-feedback-ledger.md` (APPEND)

Open new RFL entries (RFL-044 onward) for each net-new experience issue surfaced by this audit. Do not reopen closed entries; reference RFL-035/037/038/041 where the experience audit reinforces them. Each entry: id, severity, surface, evidence, athlete impact, status = OPEN.

## Deliverable 3 — `.lovable/plan.md` (UPDATE)

Replace current status block with the new verdict from Section I, a one-paragraph summary of athlete-experience findings, and the pre-launch vs. V2 split. Keep the existing P0-blocker-closure history intact.

## Out of scope (explicit)

- No edits to `src/`, `supabase/`, audit scripts, or any non-doc file.
- No new tables, migrations, edge functions, components, routes, copy changes, or UX fixes.
- No reopening of closed P0 RFLs (032/033/034) unless evidence shows regression.
- No intelligence expansion, doctrine work, or roadmap features.

## Exit criteria

- Sections A–I authored with cited evidence.
- New RFLs opened for net-new findings.
- `.lovable/plan.md` reflects the new verdict.
- One of GO / GO WITH LIMITATIONS / NO-GO issued on athlete-experience grounds alone.
