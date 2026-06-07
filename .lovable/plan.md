# Plan — Hammers Modality

## Current status (2026-06-07, post RFL-053)

**Launch verdict: GO WITH LIMITATIONS**

P0 launch blockers — all closed:
- RFL-032 (onboarding bypass) — closed by ledger-truth gate in `Auth.tsx`.
- RFL-033 (`compute-hammer-state` boot failure) — closed by deduping `getSeasonProfile` in `_shared/seasonPhase.ts`.
- RFL-034 (minor-athlete supremacy not enforced) — closed in `decisionFilters.ts` + `dailyPlan.ts`.
- RFL-053 (athlete-home duality) — closed by routing all post-login / post-onboarding / post-reset flows to `/command`. `/dashboard` retained as module catalog only.

Canonical athlete home: **`/command`** (`src/pages/AthleteCommand.tsx`). Sole surface mounting `HammerOnboardingChat`, `HammerDailyPlan`, `HammerChat`, `UhrcAthleteSection`, `CommandCenterSection`, `RecentEventsPreview`.

## Disclosed launch debt (P1/P2, not blocking)

Carried in `docs/asb/reality-feedback-ledger.md`:
- Hammer / spine: RFL-035 (HammerChat grounding), RFL-036 (drill bucket collapse), RFL-037 (empty-state triplets), RFL-038 (staleness invisible), RFL-039 (pain → suppression latency), RFL-040 (no RTP surface).
- Routing / reliability: RFL-041 (nav pollution), RFL-042 (Auth race), RFL-043 (parent-invite cap).
- Experience: RFL-044 (daily-plan hierarchy), RFL-045 (ProgressDashboard density), RFL-046 (paywall adjacency), RFL-047/050/051/057/058 (delight/D1 hooks), RFL-048 (`/today` vs `/command` duality — recommend deprecating `/today` next), RFL-049 (trajectory delta), RFL-052 (D7/D30 hooks), RFL-054 (hidden routes), RFL-055/056 (drill/MPI lineage exposure).

## Suggested next sprint (not started)

`/today` deprecation or merge into `/command` to remove the secondary "do this now" duality flagged in RFL-048. Smallest-possible follow-up to keep the single-authority property intact long-term.
