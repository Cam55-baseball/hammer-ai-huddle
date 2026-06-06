# Final Launch Risk Register

**Sprint:** Final Hostile Launch Forensic Audit
**Date:** 2026-06-06
**Scope:** Every residual risk after sealing of Architecture · Governance · Observability · Feedback Loop. Read-only — risks are recorded, not fixed in this sprint.

Severity legend — Probability/Impact: **L** (low) · **M** (medium) · **H** (high). Launch-blocking only when both Impact = H **and** no mitigation is in place.

## Active risks

| ID | Title | P | I | Launch-blocking | Mitigation in place | Owner |
|---|---|---|---|---|---|---|
| RR-A1 | **Wave-2 topics absent from `asb_topic_registry`** — `foundation.recommendation.*`, `foundation.drill.*`, `athlete.lifecycle.signup`, `athlete.onboarding.completed`, `intelligence.*` are emitted by `useEmitObservability` and reduced by `recommendationFunnel.ts` / `funnels.ts` / `intelligenceUtilization.ts`, but the `asb_topic_registry` table contains zero rows for them (verified by `select … where topic_id like 'foundation.%'` → 0 rows). Events still land in `asb_events` (no FK), reducers still work; impact is registry/observability metadata only. | M | L | **NO** | Reducers operate on event topic strings directly; ledger has no FK to registry; topics are documented in `docs/asb/canonical-event-governance.md` and `recommendation-event-governance.md`. | Observability |
| RR-A2 | **Foundation video terminal-completion gap (known missingness)** — `foundation.recommendation.completed` requires explicit player completion event; portion of video watches will surface as missingness in `computeRecommendationEffectivenessFromEvents`. | M | L | NO | Documented as canonical missingness, not smoothed; deferred sprint candidate already named. | Observability |
| RR-A3 | **Pre-existing scout-application manual review** — `scout_applications` requires operator approval before scout role activates. | M | L | NO | Documented in `final-launch-ratification.md` §7; expected operator workflow, not a defect. | Operations |
| RR-A4 | **Zero production events at launch** — `asb_events` contains 26 dev/test rows. Reducers, funnels, scoreboards return 0/0 until traffic begins. | H | L | NO | Expected. Command center, scoreboard, and 30-day window are pre-instrumented and will fill from first session. | Observability |
| RR-A5 | **`parent_athlete_links` has UPDATE policy `parent or athlete updates own link`** — allows either side to mutate the link row, including `authorized_*` columns if exposed. | L | M | NO | Authorization is gated by `enforce_parent_authorization_authority` (DB function, lineage-bound). UI exposes only `useParentRecruitingAuthorization`. Surface attack requires authenticated parent/athlete on their own row; constitutional invariant still preserved because recruiting visibility is resolved via `resolve_recruiting_visibility`, not directly off this column. | Governance |
| RR-A6 | **Replay window unbounded** — `asb_events` has no retention pruning; ledger grows monotonically. Not a launch defect (replay supremacy requires ledger immutability), but operational cost rises over time. | H | L | NO | Acceptable by Phase 46 EL doctrine (ledger truncation forbidden). Storage-scaling addressed in EI-1…EI-10 governance. | Operations |
| RR-A7 | **Coach acknowledgement is opt-in UX** — `foundation.recommendation.coach_ack` emits only when the coach clicks the "Acknowledge brief" button in `PieV2HammerBriefPanel.tsx`. Coaches who never click will register as 0% acknowledgement. | M | L | NO | Mount-time `intelligence.hammer.viewed` (RFL-004) still captures passive consumption; ack is intentional-signal channel only, by design. | Observability |
| RR-A8 | **Idempotency key collisions theoretically possible** — `sha256(athlete_id|topic|occurred_at|payload)` collisions are 2⁻²⁵⁶ but bucketing by UTC-day means same-day same-payload events dedupe by intent. | L | L | NO | Intended behavior per `useEmitObservability` contract; documented. | Architecture |

## Watchlist — invariant-violation triggers (auto-escalate to P0 if observed)

| ID | Watch condition | Source signal | Escalation |
|---|---|---|---|
| WL-1 | Any `safeguarding_notifications` row without matching `asb_events` emission. | `safeguarding.ts` reducer `invariant_violations[]`. | RFL P0 row + Phase 31 arbitration. |
| WL-2 | Any minor safeguarding signal with no parent ack within 24h. | `safeguarding.ts` reducer. | RFL P0 row. |
| WL-3 | Any insert into `asb_events` with `engine_version != 'asb-1.0.0'` without an `asb_engine_versions` row. | DB query in command center. | Halt deploy; replay invalidation. |
| WL-4 | Any UI surface mutating organism-truth tables (`asb_authority_overrides`, `asb_state_snapshots`) outside `emitAuthorizedRuntimeEvent`. | `rg` audit in CI. | NO-GO regression. |
| WL-5 | Recruiting visibility resolves to a row that is not `consent ∧ (adult ∨ parent_authorized)`. | `resolve_recruiting_visibility` log + RecruitingVisibilityGate. | RFL P0 + Phase 31. |

## Net assessment

- **Launch-blocking risks: 0.**
- All active risks are either expected operational reality (RR-A3, RR-A4, RR-A6), known missingness preserved as a signal (RR-A2, RR-A7), low-probability/low-impact (RR-A5, RR-A8), or pure metadata hygiene that does not affect the runtime path (RR-A1).
- Watchlist is the post-launch enforcement layer. RFL-CMD-CENTER will surface any WL-1…WL-5 trigger within one observation window.
