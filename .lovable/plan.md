# Coach Hammer Authority, Onboarding & Athlete Guidance Audit — Plan

## Nature
Read-only forensic verification. Mirrors prior hostile-audit method: re-derive every claim from `src/`, `supabase/`, `docs/asb/*` and live DB queries. Attempt to **disprove** that Coach Hammer is the athlete's primary developmental coach. No code, schema, doctrine, copy, or routing changes. Defects are **reported**, not fixed.

## Core question (binary verdict)
When an athlete opens Hammers Modality, can the system answer **"What should I do next?"** — without fragmentation, dead ends, or contradictory guidance? → PASS / FAIL with evidence chain.

## Investigation passes (parallelized; evidence-only verdicts)

**A · Hammer Authority Map.** Inventory every surface that can issue next-step guidance: `useNextAction`, `useCoachHammerNextStep`, `TodayGuidanceSlots`, `CommandCenterSection`, `CommunicationAI`, `PrescriptionCard`, `HammerSetbackGuidance`, `PrescriptiveActionsCard`, `useBlockWorkoutGenerator`, `useWarmupGenerator`, `RoadmapLadder`/`HittingRoadmapLadder`, `BounceBackBay`, `Dashboard.tsx`, `Today.tsx`, `AthleteCommand.tsx`, Foundations shelf, `useQuickActionExecutor`, `generateHammerBrief`, `pieV2/aiHammerTalkingPoints`, `useDrillAssignments`, `useNNSuggestions`, `useTrainingBlock`. For each: can-issue / can-plan / can-assign / can-answer-questions / can-redirect / can-contradict. Verdict: who is the **canonical owner** and is it Hammer? PASS/FAIL.

**B · Onboarding Audit.** Trace `AthleteOnboarding.tsx`, `OnboardingFlow.tsx`, `HammerOnboardingPresence`, `resolveOnboardingPresence`, `AcceptParentInvite`, scout/coach onboarding paths. Per persona (new/existing/returning athlete · coach · parent · recruiter): does Hammer initiate / establish context / identify missing info / ask / fill / produce initial plan? Evidence = file:line + emitted topics.

**C · Knowledge-Gap Acquisition.** Inventory critical coaching variables (age, level, position, goals, season status, lifting age, equipment access, schedule, injury history, recovery capacity, sport, throws/bats, school year). For each: collection site (table+column / event topic), trigger, Hammer discovery path, update path, missingness propagation (`buildDailyPrescription`, `useHIESnapshot`, `useReadinessState`, `useDayState`). Identify blind spots — variables never collected or never reaching Hammer.

**D · Daily Coaching Audit.** Can Hammer produce a full "today should look like" plan (warm-up · speed · strength · hitting · throwing · defense · baserunning · fueling · recovery) using season phase, athlete state, roadmap, equipment, time, goals, recovery? Re-derive from `buildDailyPrescription`, `useBlockWorkoutGenerator`, `useWarmupGenerator`, `useCoachHammerNextStep`, `coach-hammer-next-step` edge function, `seasonPhase.ts`. Mark each modality present/absent/partial with evidence.

**E · Command Center Audit.** Define purpose, audience, and authority of `CommandCenterSection`/`AthleteCommand`. Can a first-time athlete read it? Does it answer next-step? Does Hammer live in it or compete with it? Should Hammer authority originate there? Evidence from component tree + emitted topics.

**F · Dead-End Detection.** Trace user flows from each guidance surface (Ask Coach / Dashboard / Hammer brief / Recommendations / Roadmaps / Recovery / Workout Generator / Schedule Builder / Foundations) to terminal action. Flag: redirect loops, empty states, surfaces promising help without producing action, route handoffs to unimplemented pages, `ComingSoon` landings, CTAs that no-op.

**G · Athlete Guidance Completeness.** Composite scoring (8 binary capabilities × evidence) → completeness %. Identify single biggest athlete-experience weakness with file:line evidence.

**H · Hammer Roadmap.** For every gap from A–G, classify P0 (launch-critical) / P1 (athlete guidance) / P2 (optimization). Design-only — no implementation steps written as instructions to build.

## Deliverables (two new files, zero edits to code)
1. **`docs/asb/coach-hammer-authority-audit.md`** — Sections A–G with evidence citations (file:line, event topics, table names), authority map table, dead-end report, completeness %, biggest weakness, PASS/FAIL per section + overall verdict on the core question.
2. **`docs/asb/coach-hammer-roadmap.md`** — Section H. Prioritized gap list (P0/P1/P2), per-gap evidence link back into audit doc, launch-impact assessment, and recommendation on whether any gap downgrades the existing GO verdict.

Reality Feedback Ledger (`docs/asb/reality-feedback-ledger.md`) will be appended with any new RFL rows discovered (audit-only entries, not closures).

## Exit criteria
- Every Section A–G claim carries evidence or is marked UNVERIFIED.
- Every guidance surface in Section A has an authority verdict.
- Every persona in Section B has a per-question verdict.
- Every variable in Section C has collection + missingness evidence.
- Dead-end report enumerates every traced flow.
- Completeness % is derived from binary capability evidence, not narrative.
- Launch-impact assessment explicitly states whether the prior GO holds or downgrades.

## Out of scope
Any code, schema, RLS, doctrine, copy, routing, scoring, or UI change. No new instrumentation. No "quick fixes." Findings are reported only.
