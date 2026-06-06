# Coach Hammer Authority Consolidation & Athlete Guidance Execution Sprint

## Mission

Make Coach Hammer the single source of "what to do next, why, how, and what's after" for every athlete. One authority. One identity. One memory. Zero dead ends.

## Section A — Next Step Authority Consolidation

Collapse `useCoachHammerNextStep` and `useNextAction` into one canonical hook.

- Create `src/hooks/useHammerNextStep.ts` as the **sole** next-step authority.
  - Internal arbitration: AI-derived step (`coach-hammer-next-step` edge fn) is primary; falls back to deterministic time-of-day/readiness heuristic (current `useNextAction` logic) when AI unavailable, loading, or low-confidence.
  - Output shape unifies both: `{ tier, title, why, instruction, route, ctaLabel, moduleHint, source: 'ai' | 'heuristic', lineageHandle }`.
  - Emits canonical `intelligence.next_step.resolved` ASB event (lineage-complete, replay-safe).
- Replace all call sites:
  - `TodayCommandBar`, `TodayGuidanceSlots`, `Dashboard`, `AthleteCommand`/`CommandCenterSection`, `PieV2HammerBriefPanel`, `PrescriptiveActionsCard`, any recommendation surfaces.
- Mark `useNextAction` and `useCoachHammerNextStep` as deprecated re-exports of `useHammerNextStep` for one cycle, then remove from new code paths.

## Section B — Hammer Onboarding Engine

Promote `HammerOnboardingPresence` from passive renderer to conversational acquisition engine.

- New `src/lib/hammer/onboarding/knowledgeGaps.ts`: declares required knowledge domains (goals, season phase, position, experience, equipment access, lifting age, schedule availability, injury constraints, development priorities) with source table/column + missingness predicate.
- New `useHammerOnboardingDirector` hook: scans athlete context, returns ordered list of gaps + next question.
- New `HammerOnboardingChat` component: conversational acquisition UI (one question at a time, skippable, persists answers to `profiles` + emits `onboarding.knowledge_gap_resolved` ASB events).
- Wire into `/onboarding/athlete` and into a persistent "Hammer needs N answers" chip on Today/Command Center until gaps closed.

## Section C — Athlete Context Model

Canonical context inventory consumed by every Hammer surface.

- New `src/lib/hammer/context/athleteContext.ts` exporting `useHammerAthleteContext()` returning typed `{ variable, value, source, confidence, missing, lastUpdated, consumer[] }` for every domain in Section B + readiness, fatigue, soreness, sleep, MPI, plan, roadmap progress.
- Single hook all Hammer surfaces read from. `useCoachHammerNextStep`'s ad-hoc snapshot construction is replaced by this.
- Doc: `docs/asb/coach-hammer-context-inventory.md` — variable × source × consumer matrix.

## Section D — Daily Prescription Engine

Extend `buildDailyPrescription` (and `useBlockWorkoutGenerator`/`useWarmupGenerator`) to cover all 9 modalities.

- Add generators for the missing 4: **hitting**, **defense**, **baserunning**, **fueling** (plus ensure warm-up, speed, strength, throwing, recovery remain).
- New `src/lib/hammer/prescription/dailyPlan.ts` orchestrator: pulls `useHammerAthleteContext`, season phase, roadmap, equipment, schedule, readiness, injury constraints → returns ordered `PrescribedBlock[]`, each with `{ modality, title, why, steps[], duration, route, ctaLabel, lineageHandle }`.
- Render on Today + Command Center via a single `<HammerDailyPlan />` component. Each block is actionable (start CTA → real route).

## Section E — Command Center Authority

Designate Command Center as **Hammer's workspace / athlete operating system**.

- `AthleteCommand.tsx` + `CommandCenterSection` restructured to three zones:
  1. **Hammer Now** — current next step (from §A) + ability to start/skip/ask.
  2. **Hammer Plan** — today's full prescription (from §D).
  3. **Hammer Chat** — unified Ask Coach (from §F).
- Dashboard becomes a thin window onto Command Center (single "Open with Hammer" CTA + Hammer Now preview). No duplicated arbitration.

## Section F — Ask Coach Unification

Single conversational Hammer.

- Audit + collapse: `CommunicationAI`, any "Ask Coach" surfaces, dashboard AI, today AI, `pieV2/aiHammerTalkingPoints` → one `useHammerChat()` hook backed by one edge function `hammer-chat` that receives full `useHammerAthleteContext` + last next-step + recent prescription lineage as system context.
- One identity (`getHammerIdentity()`), one persistent thread per athlete (stored as ASB events `hammer.chat.message`), one memory.
- New `<HammerChat />` component reused everywhere (Command Center primary, Dashboard collapsed, Today collapsed).

## Section G — Dead End Elimination

- Fix `PrescriptiveActionsCard.tsx`: route `/practice-hub` → `/practice` (and `tex-vision` route verified).
- Sweep every coaching CTA in `src/components/{hie,today,command,hammer,coach}` and `src/pages` for routes not present in `App.tsx`'s route table; replace or remove.
- Add a test (`src/test/coachingCtaRoutes.test.ts`) that statically asserts every Hammer-surface CTA route resolves to a real route.

## Section H — Guidance Completeness Re-audit

Re-run the 8 binary capabilities from the prior audit against the new code.

- Produce `docs/asb/coach-hammer-authority-audit-v2.md` with PASS/FAIL per capability + new completeness %.
- Append RFL closure rows: RFL-011…RFL-016 → CLOSED with evidence links.

## Section I — Final Ratification

- Create `docs/asb/coach-hammer-final-ratification.md` answering all I-section questions, with GO / NO-GO and any P0/P1/P2 remainders.
- Update `.lovable/plan.md` with sprint closure.

## Technical Details

**New files**
- `src/hooks/useHammerNextStep.ts`
- `src/hooks/useHammerOnboardingDirector.ts`
- `src/hooks/useHammerChat.ts`
- `src/lib/hammer/context/athleteContext.ts`
- `src/lib/hammer/onboarding/knowledgeGaps.ts`
- `src/lib/hammer/prescription/dailyPlan.ts` (+ modality generators: `hitting.ts`, `defense.ts`, `baserunning.ts`, `fueling.ts`)
- `src/components/hammer/HammerOnboardingChat.tsx`
- `src/components/hammer/HammerDailyPlan.tsx`
- `src/components/hammer/HammerChat.tsx`
- `supabase/functions/hammer-chat/index.ts`
- `src/test/coachingCtaRoutes.test.ts`
- `docs/asb/coach-hammer-context-inventory.md`
- `docs/asb/coach-hammer-authority-audit-v2.md`
- `docs/asb/coach-hammer-final-ratification.md`

**Edited**
- `useNextAction.ts`, `useCoachHammerNextStep.ts` → deprecated thin wrappers.
- `TodayCommandBar`, `TodayGuidanceSlots`, `CommandCenterSection`, `AthleteCommand`, `Dashboard`, `Today`, `PieV2HammerBriefPanel`, `PrescriptiveActionsCard`, `HammerOnboardingPresence`.
- `buildDailyPrescription` extended.
- `asb_topic_registry` migration: register `intelligence.next_step.resolved`, `onboarding.knowledge_gap_resolved`, `hammer.chat.message`, `prescription.daily.modality.*`.
- `docs/asb/reality-feedback-ledger.md` (close RFL-011…RFL-016).

**Constitutional subordination**
- All new events ride `emitAsbEvent` / `buildAsbRow` / `asb_events` + `asb_event_lineage`. Zero parallel storage. Hammer remains **interpretive** — never authors `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state`. Safeguarding still supersedes. Minor-athlete parent supremacy preserved.

**Out of scope**
- No scoring/MPI changes. No recruiting/safeguarding changes. No doctrine changes. No demo-mode changes. No RLS posture changes beyond GRANTs for any new topic-registry rows.

## Exit Criteria

One next-step authority, Dashboard/Today/Command Center agree, Hammer-driven onboarding live, 9/9 daily modalities, unified Ask Coach, zero dead ends, completeness ≥ 85%, ratification doc GO.
