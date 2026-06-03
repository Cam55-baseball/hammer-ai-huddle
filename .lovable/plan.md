# HAMMER PHASE 1 — Guidance Orchestration Audit (Plan)

Audit-only. No code, no schema, no RR-7/9/10 activation, no new primitives.

## Deliverable

Single new file: `docs/asb/hammer-guidance-orchestration-audit.md`.

Nothing else is touched. No tests run, no projections edited, no copy edited.

## Method

Read-only walkthrough of the surfaces already in the repo:

- Conversational Hammer: `src/components/relational/HammerConversationPanel.tsx`, `src/lib/runtime/relational/hammerMemory.ts`, `src/lib/relational/copy.ts` (HAMMER_VOICE, NARRATIVE_VOICE, LIFE_CONTEXT_VOICE, INJURY_RECOVERY_VOICE, ONBOARDING_VOICE, PARENT_VOICE, RECRUITING_VOICE, SAFETY_VOICE).
- Hammer State (biomarker): `src/components/hammer/HammerStateBadge.tsx`, `ReadinessChip.tsx`, `EliteModePanel.tsx`, `src/hooks/useHammerState.ts`, `src/hooks/useNextAction.ts`, `src/hooks/useCoachHammerNextStep.ts`.
- Pages: `Index.tsx`, `Today.tsx`, `Relational.tsx`, `SafetyCenter.tsx`, `RelationshipSettings.tsx`, `ParentInvite.tsx`, `AcceptParentInvite.tsx`, `AthleteOnboarding.tsx`, `OnboardingFlow.tsx`, `RTP.tsx`, `BounceBackBay.tsx`, `Dashboard.tsx`, `PracticeHub.tsx`, `TrainingBlock.tsx`, `CoachDashboard.tsx`.
- Adjacent: `AthleteOnboardingShell.tsx`, `TodayCommandBar.tsx`, `AthleteJourneyMap.tsx`, `SlumpReloadFlow.tsx`, `InjuryLifecycleStrip.tsx`, `RecruitingRoadmap.tsx`, `DevelopmentalStageChip.tsx`, `ParentTrustCard.tsx`.

For each surface: extract what Hammer knows (projections wired), what it displays, what it can explain (templated copy / arbitration callbacks), what it cannot explain (free-form generation forbidden, denylists, no recall outside cited events).

## Document outline

### §0 Scope & method
Restate audit-only constraint; list the three distinct "Hammer" concepts found in the codebase and flag the naming collision as an upstream confusion source:
1. **Conversational Hammer** — `HammerConversationPanel` on `/relational`. Replay-derived memory + single-callback arbitration across RR-5/6/8.
2. **Hammer State** — biomarker overall_state (`prime`/`ready`/`caution`/`recover`) on `/today` via `HammerStateBadge`, `EliteModePanel`, `useNextAction`.
3. **"Hammer" marketing label** — landing page (`Index.tsx`) uses "Hammer Motion Capture" / "Hammer Powered Results" with no in-product referent.

### §1 Surface inventory
Table per surface (knows / displays / can explain / cannot explain / decision supported):
- HammerConversationPanel (/relational)
- Onboarding (`AthleteOnboarding`, `OnboardingFlow`, `AthleteOnboardingShell`, `ProgressiveDisclosureStepper`, `LIFE_CONTEXT_CHECKIN`)
- Relational hub (`Relational.tsx`, `RelationalDemo.tsx`)
- Parent-facing (`ParentTrustCard`, `ParentInvite`, `AcceptParentInvite`, `RelationshipSettings`)
- Safety (`SafetyCenter`, classifier-fed notifications)
- Athlete dashboard (`Today`, `Dashboard`, `TodayCommandBar`, `EliteModePanel`)
- Training guidance (`PracticeHub`, `TrainingBlock`, `PrescriptionCard`)
- Roadmap (`AthleteJourneyMap`)
- Recruiting (`RecruitingRoadmap`)
- Slump recovery (`SlumpReloadFlow`)
- Injury continuity (`InjuryLifecycleStrip`, `RTP`, `BounceBackBay`)
- Life-context (LIFE_CONTEXT_VOICE chip in HammerConversationPanel; no standalone surface)
- Narrative continuity (NARRATIVE_VOICE chip; no standalone surface)

### §2 Athlete journey (Day 0 → first milestone)
Step table: Day 0 / onboarding / first training week / first setback / first parent interaction / first recovery event / first improvement milestone. Each row: what Hammer says, what Hammer knows, what Hammer recommends, residual confusion. Call out moments where Hammer is silent (sign-up, dashboard, training, parent invite acceptance, RTP, injury logging).

### §3 Parent trust journey
Onboarding → invite → safety center → progress visibility → recovery visibility. Map where trust is created (PARENT_VOICE copy, scope firewall, one-tap removal), unclear (no Hammer narrator anywhere in parent UX; Safety Center is event list with no Hammer voice), Hammer present (only in relational hub, parent rarely lands there), Hammer absent (everywhere else parents go).

### §4 Navigation dependency audit
Workflows that today require platform knowledge (no Hammer guidance): finding `/relational`, `/safety`, `/relationships`, `/rtp`, `/bounce-back-bay`, `/practice`, `/digest`, `/forecast`, parent invite acceptance, demo vs production scope, switching between `/today` (biomarker Hammer) and `/relational` (conversational Hammer). Severity + athlete/parent confusion risk + current coverage + missing coverage per row.

### §5 Readiness scores (0–10 with justification)
- Guidance Readiness
- Parent Simplicity
- Athlete Simplicity
- Navigation Independence
- Trust Formation
- Retention Support

Justification cites specific surfaces / gaps from §1–§4.

### §6 Missing capabilities (Critical / Important / Future)
Capability-level only (no implementation):
- **Critical**: cross-surface Hammer presence (today + onboarding + parent + safety), Hammer-led navigation handoffs, name disambiguation, parent-facing Hammer voice, first-setback explainer, onboarding narrator.
- **Important**: in-context "what is this surface" tooltips, Hammer summary on /today, Hammer-led injury check-in coach, parent digest from Hammer voice.
- **Future**: cross-device continuity, multi-language Hammer voice, voice/audio modality.

### §7 Final verdict
**Hammer Partially Ready** (anticipated). With:
- biggest adoption blocker: Hammer lives only on `/relational`; new athletes never discover it.
- biggest parent blocker: zero Hammer voice in parent UX; `ParentTrustCard` and `SafetyCenter` read as data lists.
- biggest athlete blocker: name collision between conversational Hammer and Hammer State; no narrator on `/today`.
- fastest path to perceived value: surface conversational Hammer on `/today` and during onboarding, with explicit handoffs into `/relational`, `/safety`, `/rtp`, `/practice`.

## Stop gate

No production code, projection, emitter, schema, replay-engine, or UI changes. No RR-7/9/10 activation. Only the new audit markdown file is created.
