# Command Center Authority & Closed-Loop Intelligence Audit

Pure documentation/audit sprint. **No** runtime code, schema, doctrine, UI, or component changes. Findings only.

## Scope (route `/command` → `src/pages/AthleteCommand.tsx`)

Surfaces mounted, in order:
1. `NotificationBell`
2. `HammerOnboardingChat`
3. `UhrcAthleteSection` (Universal Hammer Report Card)
4. `CommandCenterSection` (Readiness, Fatigue, Recovery, Workload, Behavioral Regulation, Scheduling Load, Trend Shifts, Escalation Flags)
5. `HammerDailyPlan` (9-modality daily prescription)
6. `HammerChat` (Ask-Coach)
7. `RecentEventsPreview` (replay tail)

## Deliverables

1. **`docs/asb/command-center-authority-audit.md`** (new) — sections A–I below.
2. **`docs/asb/reality-feedback-ledger.md`** — append findings as RFL entries (P0 broken loops / P1 traceability gaps / P2 IA + zero-knowledge clarifications). Ratification entry for the audit itself as CLOSED-as-doctrine-reference.
3. **`.lovable/plan.md`** — execution note + exit-criteria mapping.

## Audit document structure

### Section A — Card inventory
Table with one row per Command Center card (all `src/components/command/cards/*` + Hammer surfaces + UHRC + Onboarding chat + Recent events). Columns:
- Purpose
- Authority source (hook / ASB topic / projection)
- Intended athlete action
- Destination (route / surface)
- Completion path
- Feedback path (event emission, `asb_events` topic)
- Organism update path (which projections refresh)
- **Loop status**: COMPLETE / PARTIAL / BROKEN

### Section B — Answer Hammer audit
Trace every actionable affordance in `HammerOnboardingChat`, `HammerDailyPlan`, `HammerChat`, `EscalationBanner`, card CTAs, `LineageDrilldownButton`, `NotificationBell`. For each:
- click handler present
- routing target valid
- state update fired
- persistence path (Supabase / event)
- feedback recorded
List **dead actions** (clicks with no response) as P0.

### Section C — Recommendation traceability
For each recommendation source (daily plan modalities, readiness pill, fatigue/recovery cards, behavioral regulation, escalation flags, UHRC grade) document:
- source signals (ledger topics)
- decision logic (file:line)
- confidence source
- timing rationale
- Athlete-legible **Why this / Why now / Why me** — present, partial, or absent.

### Section D — Action completion loops
Per recommendation: Recommendation → Destination → Execution surface → Result logging → Organism update. List broken loops, prioritize P0/P1/P2 by athlete impact.

### Section E — Schedule authority
Audit whether `calendar_events`, `games`, `scheduled_practice_sessions`, `game_plan_*` tables flow into Command Center recommendations. Document gap + list recommendations operating without schedule awareness.

### Section F — Personalization authority
For each surface: position-aware? sport-aware? development-stage-aware? competition-level-aware? Classify **GENERIC** vs **ORGANISM-SPECIFIC**.

### Section G — UHRC authority
Audit `UhrcAthleteSection` / `UhrcReportCard`:
- which athlete it represents
- signals consumed
- should branch by sport? by position?
- recommendation (keep universal / branch / hybrid)

### Section H — Information architecture
Evaluate canonical home for Weekly Digest, Forecast, Body Status: Command Center vs Progress Dashboard. Recommend placement + rationale (cross-reference current mount points).

### Section I — Zero-knowledge athlete test
For each card answer 5 questions (knows what / why matters / what to do / where to go / how to complete). Flag ambiguity as P1/P2 RFL entries with recommended copy/affordance fix (documented only, not applied).

## Exit-criteria mapping

| Exit criterion | Covered by |
|---|---|
| Every card has documented authority source | Section A |
| Every action has completion loop | Sections A, B, D |
| Every recommendation has traceability | Section C |
| Navigation dead ends identified | Section B |
| Personalization gaps identified | Sections F, G |
| Validated for zero-knowledge athletes | Section I |

## Constraints

- Documentation only. No code, schema, event, doctrine, or copy changes.
- All findings routed through RFL with priority + recommended-but-deferred fixes.
- Subordinate to all sealed Eternal Laws and prior invariants — audit is interpretive, never authoritative over organism truth.
