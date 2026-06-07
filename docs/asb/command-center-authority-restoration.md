# Command Center Authority Restoration Sprint

**Date:** 2026-06-07
**Scope:** `/command` runtime remediation of highest-priority findings from `command-center-authority-audit.md`.
**Type:** Runtime + documentation. Additive only. No schema, no new ASB topics, no doctrine changes.
**Subordination:** Eternal Laws, RR-6 (athlete-reported pain > inferred schedule), Phase 46 ledger supremacy, EI-1…EI-10, and all sealed phases through Megaphase 151–160 (Phase 151 sealed).

---

## A — BROKEN-loop remediation (RFL-068 — CLOSED)

`src/components/command/IntelligenceCardShell.tsx` now accepts an optional
`action?: { label, href }` that renders as a full-width outline button between
the card body and its lineage footer. The seven previously dead observation
cards now each carry a "What now?" affordance deep-linking to the matching
modality anchor inside `HammerDailyPlan`.

| Card | Deep-link target |
|---|---|
| `ReadinessCard` | `/command#hammer-plan-warmup` |
| `FatigueCard` | `/command#hammer-plan-recovery` |
| `RecoveryCard` | `/command#hammer-plan-recovery` |
| `WorkloadCard` | `/command#hammer-plan-strength` |
| `BehavioralRegulationCard` | `/command#hammer-plan-recovery` |
| `SchedulingLoadCard` | `/command#hammer-plan-strength` |
| `TrendShiftsCard` | family with largest \|Δ\|, falling back to warmup |

`HammerDailyPlan` exposes a stable `id="hammer-plan"` plus per-block
`id="hammer-plan-{modality}"` anchors with `scroll-mt-24` so deep-links land
visibly under the header.

The `LineageDrilldownButton` was already mounted on every card via
`IntelligenceCardShell` (Section E satisfied for cards by construction); the
audit's "Why?" gap is closed for the seven cards by the same shell.

## B — Answer Hammer dead-end repair

- **UHRC remediation CTA (RFL-069 — CLOSED).** `UhrcReportCard` adds a
  full-width "Work on this in today's plan" CTA targeting
  `/command#hammer-plan`. The card no longer terminates at a grade.
- **Escalation ack consolidation (RFL-071 — CLOSED).** `EscalationBanner` and
  `EscalationFlagsCard` now invoke `useAcknowledgeEscalation` before
  navigation, so the bell badge decrements regardless of entry surface. The
  Bell remains the canonical ack writer; the other two surfaces participate
  via the same hook (no parallel ack authority).
- **LineageDrilldownButton on UHRC (Section E).** `UhrcReportCard` mounts the
  lineage button in the header when an HIE snapshot id is available.

## C — Schedule authority integration (RFL-064 — partial CLOSED)

New `src/hooks/command/useScheduleWindow.ts` reads `games` and
`scheduled_practice_sessions` for `[today, today+7d]` and returns a typed,
missingness-preserving window:

```ts
interface ScheduleWindow {
  loading: boolean; empty: boolean; unknown: boolean;
  today: ScheduleSlot[]; tomorrow: ScheduleSlot[];
  upcomingCompetition: ScheduleSlot | null;
  totalGames: number; totalPractices: number;
}
```

Consumers (additive only, never authoritative):
- `HammerDailyPlan` renders a one-line `CalendarClock` context strip at the
  top of the card surfacing the next competition or weekly practice density.
  Suppressed when missing — never fabricated.
- `WorkloadCard` appends a "Next 7 days: N games · M practices" line plus a
  "competition in Nd" amber chip when ≤ 2 days out.

Buildtime change to `buildHammerDailyPlan` itself was held back to keep the
sealed prescription pure; schedule context is currently surfaced at the
presentation layer. Deeper antecedent integration (taper branching inside the
strength builder) is documented as a follow-up.

`calendar_events` and `game_plan_*` ingestion stay pending — RFL-064 remains
partially open and is re-scoped in the ledger.

## D — Organism-specific UHRC (RFL-065 — CLOSED, RFL-066 — deferred)

`UhrcAthleteSection` reads `sport_primary` from `useHammerAthleteContext`.
When the athlete's sport is not in the supported projector set
(`baseball`, `softball`), the surface renders a visible
"waiting on projector" missingness card rather than a baseball-shaped
report. Supported sports continue to render the canonical UHRC with `sport`
propagated into `buildUhrcReport` (`softball` accepted alongside `baseball`).

Position branching (RFL-066) requires `primary_position` to be added to the
context envelope (not currently exposed) and a pillars weighting refactor.
Held for the post-RFL-053 onboarding sprint and remains open.

## E — Trust surfaces

Every command-section card and the UHRC report card now expose the canonical
`LineageDrilldownButton`. "Why this / Why now / Why me" copy on cards remains
delegated to the projection envelope (`b.why` on plan blocks, projection
metadata on cards). Card-level narrative copy beyond what the envelope
already carries is deferred — adding manual copy would risk fabrication
beyond projection authority.

## F — Validation matrix (manual smoke against `/command`)

All six archetypes were exercised by toggling `sport_primary`, `season_phase`,
`injury_history`, and `lifecycle_band` via the existing onboarding chat and
context envelope.

| Archetype | Outcome |
|---|---|
| Youth | All 7 cards expose CTA → deep-link resolves; no professional copy leak. |
| High-school | Schedule window populated from `scheduled_practice_sessions` when present. |
| College | Competition ≤2d surfaces amber chip on WorkloadCard + plan header strip. |
| Professional | UHRC renders for baseball sport_primary; LineageDrilldownButton mounted. |
| Injured | Existing `awaiting-input` suppression preserved; CTAs still resolve to plan anchors. |
| Return-from-layoff | Strength block "awaiting on lifting age" still routes to `/command` (Hammer chat). No new dead surfaces. |

Verification gates passed:
- No console errors on `/command` render.
- All CTAs resolve to a defined route or in-page anchor.
- No 404 surfaces.
- Ack from Banner, FlagsCard, and Bell all decrement the unacked count.
- Schedule line is suppressed when `useScheduleWindow.unknown || loading || empty`.

## G — Constraints honored

- Additive only. No deletions, no schema changes, no doctrine modifications.
- No new ASB topics. Card actions remain client-side navigations; downstream
  modality surfaces continue to write canonical session events as before.
- Missingness preserved at every junction; nothing imputed.
- Replay legality unaffected — UHRC, daily plan, projections all read from
  the same canonical sources as before.

## H — RFL transitions

| RFL | Prior | New | Evidence |
|---|---|---|---|
| RFL-064 | Open P1 | **Partial CLOSED** | `src/hooks/command/useScheduleWindow.ts`; consumed by `HammerDailyPlan` + `WorkloadCard`. `calendar_events` / `game_plan_*` integration still open. |
| RFL-065 | Open P1 | **CLOSED** | `src/components/report-card/UhrcAthleteSection.tsx` sport branching + missingness card. |
| RFL-066 | Open P1 | Open | Requires `primary_position` envelope key + pillar reweighting. |
| RFL-068 | Open P1 | **CLOSED** | All 7 cards now carry `action` deep-links via `IntelligenceCardShell`. |
| RFL-069 | Open P1 | **CLOSED** | `UhrcReportCard` "Work on this in today's plan" CTA + LineageDrilldownButton. |
| RFL-071 | Open P2 | **CLOSED** | `EscalationBanner` and `EscalationFlagsCard` call `useAcknowledgeEscalation` on activation. |
| RFL-067, RFL-070, RFL-072 | Open | Open (deferred) | Out of sprint scope. |

---

## Files changed

- `src/components/command/IntelligenceCardShell.tsx` — added `action` prop.
- `src/components/command/cards/{Readiness,Fatigue,Recovery,Workload,BehavioralRegulation,SchedulingLoad,TrendShifts}Card.tsx` — wired `action`.
- `src/components/command/cards/WorkloadCard.tsx` — schedule density line.
- `src/components/command/cards/EscalationFlagsCard.tsx` — ack-on-click.
- `src/components/command/EscalationBanner.tsx` — ack-on-click.
- `src/components/hammer/HammerDailyPlan.tsx` — anchors + schedule context line.
- `src/components/report-card/UhrcReportCard.tsx` — CTA + lineage button.
- `src/components/report-card/UhrcAthleteSection.tsx` — sport branching + sourceEventId.
- `src/hooks/command/useScheduleWindow.ts` — NEW bounded reader.
- `docs/asb/command-center-authority-restoration.md` — this report.
- `docs/asb/reality-feedback-ledger.md` — RFL transitions appended.
- `.lovable/plan.md` — execution note.
