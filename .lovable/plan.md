# P0 Launch Blocker Remediation Sprint — COMPLETE

All three verified P0 blockers from the Launch Readiness Hostile Audit are CLOSED.

## Closure summary

- **RFL-033** — Deleted duplicate `getSeasonProfile` in `supabase/functions/_shared/seasonPhase.ts`. `compute-hammer-state` boots and returns 200.
- **RFL-032** — Sign-in (`src/pages/Auth.tsx`) now consults `asb_events.count` (ledger truth) and routes profile-only/no-event athletes to `/onboarding/athlete`.
- **RFL-034** — `decisionFilters.ts` + `dailyPlan.ts` consume `isMinor` / `parentSupremacyActive` / `parentConcerns` from the spine. `applyContextFilter`, `selectSpeedFocus`, `orderRoadmapMilestones`, and `buildHammerDailyPlan` all branch on minor-supremacy. Audit: 11/11 unique daily plans across 11 personas; minor+parent-concern persona verified to suppress speed/throwing/strength + roadmap max-load milestones.

## Verdict

**GO WITH LIMITATIONS.** P1s (RFL-035…RFL-043) carried forward as disclosed launch debt.

See `docs/asb/p0-launch-blocker-remediation-ratification.md` for evidence.
