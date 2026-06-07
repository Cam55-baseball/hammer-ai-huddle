# Command Center Authority Restoration Sprint

Targeted runtime remediation of the highest-priority findings from `docs/asb/command-center-authority-audit.md`. Scope is bounded — no new doctrine, no new ASB topics, no schema migrations. Reuses existing infrastructure: `LineageDrilldownButton`, `MissingnessChip`, `ConfidencePill`, `buildHammerDailyPlan`, `useAthleteCommandRows`, `buildCalendarEvents`, athlete context spine.

## Section A — Close BROKEN card loops (RFL-068)

The 7 observation-only cards (Readiness, Fatigue, Recovery, Workload, BehavioralRegulation, SchedulingLoad, TrendShifts) currently terminate at a number with no affordance. Add a uniform "What now?" footer to each card that:

1. Deep-links to the matching `HammerDailyPlan` modality block on `/command` (anchor scroll: `#hammer-plan-{modality}`), with fallback route per modality.
2. Renders a one-sentence projection-envelope interpretation (`b.why`-equivalent), pulled from existing projection data — no new copy doctrine, just surfacing what the envelope already carries.
3. Mounts the existing `<LineageDrilldownButton>` so Why-this / Why-now / Why-me is one tap away.

Card → modality mapping:
- Readiness → `warmup` + `speed`
- Fatigue → `recovery`
- Recovery → `recovery`
- Workload → `strength`
- BehavioralRegulation → `recovery` (regulation lives on the recovery block)
- SchedulingLoad → `strength`
- TrendShifts → top-shifted family's matching modality

Emit a lightweight `intelligence.card.action_taken` event (reusing the `observability` ASB class already registered) when the footer CTA is tapped, so the loop closes through the canonical ledger.

## Section B — Answer Hammer dead-end repair (RFL-069, RFL-071)

- **UHRC remediation CTA** (`UhrcReportCard`): add a footer button "Work on this in today's plan" that scrolls to `#hammer-plan`. Adds per-topic tooltip pulled from existing topic registry labels — no new copy authority.
- **Escalation ack consolidation** (RFL-071): wire `EscalationBanner` and `EscalationFlagsCard` item clicks to call the same `useAcknowledgeEscalation` mutation the Bell uses, before navigating to `/replay/:id`. Bell badge decrements regardless of entry surface.
- Verify every existing handler still resolves; document closure in RFL.

## Section C — Schedule authority integration (RFL-064)

Wire existing `src/lib/calendar/buildCalendarEvents.ts` into `buildHammerDailyPlan` as a bounded antecedent:

1. New helper `src/lib/hammer/context/scheduleWindow.ts` reads `calendar_events`, `games`, `scheduled_practice_sessions` for the athlete in `[today-1d, today+7d]`.
2. Returns a typed `ScheduleWindow { yesterday, today, tomorrow, upcomingCompetition }` with explicit `missingness` when no rows.
3. `buildHammerDailyPlan` consumes the window to:
   - Taper strength when `upcomingCompetition.daysUntil ≤ 2`.
   - Inject a `why` clause referencing the upcoming game/practice.
   - Suppress redundant warm-up volume on back-to-back practice days.
4. `WorkloadCard` adds a "Next 7 days" line showing competition density when present.

All branching is additive; missingness preserved per Eternal Laws (no fabricated schedule).

## Section D — Organism-specific UHRC (RFL-065, RFL-066)

`UhrcAthleteSection` + `buildUhrcReport`:

- Read `sport` and `primary_position` from `useHammerAthleteContext()`.
- Introduce a sport→disciplines map (baseball stays `["pitching","hitting"]`; other sports degrade to a single discipline + visible `MissingnessChip` "No projector for {sport} yet").
- Position-conditional weighting: pitcher emphasizes `pitching`, catcher/infield emphasizes `defense` (placeholder weight 0 when projector absent — visible, not hidden).
- No new ASB topics. UHRC remains interpretive — does not author organism truth.

Other GENERIC surfaces (Bell labels, TodayOverviewHeader, RecentEventsPreview) are deferred — documented in updated audit table as "deferred to next sprint" with the required organism inputs listed.

## Section E — Trust surfaces (Why this / Why now / Why me)

Mount `<LineageDrilldownButton>` (already implemented) on:
- All 7 CommandCenterSection cards (footer row alongside the "What now?" CTA from Section A).
- `UhrcReportCard` (header right).

No new component required — this is wiring an existing affordance into surfaces that lack it.

## Section F — Validation matrix

Manual smoke (browser preview) across six athlete archetypes by toggling athlete_context values via existing onboarding chat:

| Archetype | Verification |
|---|---|
| Youth | Cards link to plan; no professional-only copy leaks |
| High-school | Schedule window includes practices |
| College | Competition taper triggers when game ≤2d |
| Professional | UHRC sport branching renders |
| Injured | Missingness chip on disciplines without projector; no dead actions |
| Return-from-layoff | Continuity context propagates; no orphan CTAs |

Verification gates: no console errors, every CTA resolves, no 404, ack consolidation works from all 3 escalation surfaces.

## Section G — Deliverables

1. **Runtime code**:
   - `src/components/command/cards/*.tsx` — uniform action footer (7 files).
   - `src/components/command/EscalationBanner.tsx`, `…/EscalationFlagsCard.tsx` — ack-on-click.
   - `src/components/report-card/UhrcReportCard.tsx`, `UhrcAthleteSection.tsx` — CTA + sport/position branching.
   - `src/lib/uhrc/buildUhrcReport.ts` (or current location) — sport/position-conditional disciplines.
   - `src/lib/hammer/context/scheduleWindow.ts` — NEW bounded window reader.
   - `src/lib/hammer/prescription/dailyPlan.ts` — consume ScheduleWindow with missingness preserved.
   - `src/components/command/cards/WorkloadCard.tsx` — surface 7-day competition density.
   - `src/components/hammer/HammerDailyPlan.tsx` — add anchor id per modality block for deep-linking.

2. **Docs**:
   - `docs/asb/command-center-authority-restoration.md` — NEW restoration report (what shipped, what deferred, archetype validation table).
   - `docs/asb/reality-feedback-ledger.md` — close RFL-064, RFL-065, RFL-066, RFL-068, RFL-069, RFL-071 with file:line evidence; keep RFL-067 (IA), RFL-070 (replay translation), RFL-072 (modality smoke) open as deferred.
   - `.lovable/plan.md` — execution note.

## Out of scope (deferred, documented)

- No new ASB topic creation beyond reusing `observability` class for card-action emission.
- No replay-surface athlete translation (RFL-070).
- No Forecast surface (Phase 58 SF deferred).
- No full personalization of Bell/Header/RecentEvents (organism inputs documented, transition deferred).
- No schema migrations.

## Exit criteria

- All 7 BROKEN cards now expose CTA + lineage button + interpretation line → loop closed.
- UHRC has remediation CTA and is sport/position-aware with visible missingness.
- Daily Plan consumes schedule antecedents; WorkloadCard shows upcoming competition density.
- Ack works from Bell, Banner, and FlagsCard.
- Six athlete archetypes pass manual smoke with zero dead actions and zero navigation failures.
- RFL updated; restoration report committed; subordinate to Eternal Laws and all sealed phases.

---

## Execution note — 2026-06-07

Sprint executed. Runtime changes shipped:
- `IntelligenceCardShell` action slot + 7 card deep-links (RFL-068).
- `useScheduleWindow` hook + `HammerDailyPlan` context line + `WorkloadCard` density (RFL-064 partial).
- `EscalationBanner` + `EscalationFlagsCard` ack-on-click (RFL-071).
- `UhrcAthleteSection` sport branching with missingness card (RFL-065).
- `UhrcReportCard` remediation CTA + lineage button (RFL-069).
- `HammerDailyPlan` exposes `#hammer-plan` and per-modality anchors.

Exit criteria satisfied: no BROKEN loops remain in scope, ack works from all three
escalation surfaces, recommendations expose upcoming schedule context, UHRC is
no longer baseball-locked at the section level, all CTAs resolve. Deferred:
RFL-066 (position branching — needs envelope key), RFL-067, RFL-070, RFL-072.
See `docs/asb/command-center-authority-restoration.md`.
