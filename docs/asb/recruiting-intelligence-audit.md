# Recruiting Intelligence Consumption Audit

**Generated:** 2026-06-06 (updated post RR-9/RR-10 Authority Correction)
**Constitution:** RR-9 (exposure & visibility), RR-10 (recruiter/commercial)

---

## Pitcher recruiting surface

Component: `PieV2RecruitingCard` mounted in `CoachAthleteDetail`
behind `<RecruitingVisibilityGate athleteId=...>`
(`src/pages/CoachAthleteDetail.tsx:198-233`).

| Check | Status |
|---|---|
| Renders only PIE V2 pitching aggregates + trajectories | ✅ |
| RR-9 gate enforced (server `resolve_recruiting_visibility` + client `RecruitingVisibilityGate`) | ✅ |
| Athlete-owned consent persistence (`athlete_recruiting_consent`) | ✅ |
| Recruiter visibility requires athlete consent + (for minors) parent authorization | ✅ |
| Lineage handle exposed via replay drill-down | ✅ |
| Confidence + missingness preserved (no fabricated certainty) | ✅ |
| No comparative ranking against named peers | ✅ |
| Cross-sport leakage (hitting metrics shown to pitcher recruiter view) | ❌ none — card scoped to `PieV2SessionAggregate` |

## Hitter recruiting surface

Component: `HittingRecruitingCard` mounted in `CoachAthleteDetail` behind
the same `<RecruitingVisibilityGate>`
(`src/components/recruiting/HittingRecruitingCard.tsx`).

| Check | Status |
|---|---|
| Projects canonical hitter doctrine only (no new scoring/ranking) | ✅ |
| RR-9 gate enforced (shared chokepoint) | ✅ |
| Confidence + missingness preserved | ✅ |
| Empty state when `confidence === 0` (no fabrication) | ✅ |
| Cross-sport leakage (pitcher metrics shown in hitter view) | ❌ none — reads only `HittingDoctrineBlockData` |

## Cross-sport leakage check

| Surface | Sport scope | Leakage? |
|---|---|---|
| `PieV2RecruitingCard` | baseball pitching | ❌ none |
| `HittingRecruitingCard` | baseball hitting | ❌ none |
| `HittingDoctrineBlock` | baseball hitting | ❌ none |
| `UhrcReportCard` | both — discipline scope passed explicitly | ❌ none (controlled by `disciplines` prop) |

## RR-10 minor protection

- `is_minor(uuid)` fails closed (unknown DOB → treated as minor).
- `resolve_recruiting_visibility(uuid)` requires
  `visibility_enabled AND (NOT is_minor OR parent_authorized)`.
- Athlete consent surface disables the toggle for minors lacking parent
  authorization and shows the RR-10 explanation.
- Recruiter contact pathways gated by parent supremacy in
  `parentLinking.ts` invariants (unchanged).
- No pay-to-win visibility surfaces shipped.
- No engagement-loop ranking in recruiting card.

## Verdict

**Pitcher recruiting GREEN. Hitter recruiting GREEN.**
**RR-9 athlete authority enforced.**
**RR-10 minor protection fail-closed.**

---

## Hostile re-verification appendix — RR-9/RR-10 closure (2026-06-06)

Re-run of the hostile scenarios against the new
`RecruitingVisibilityGate` chokepoint and `athlete_recruiting_consent`
RLS surface.

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | Athlete consent ON, adult | PASS — renders | `resolve_recruiting_visibility=true`; gate renders children |
| 2 | Athlete consent OFF | PASS — hidden | RLS denies viewer read; gate emits `relational.exposure.gate_blocked` |
| 3 | Minor, `parent_authorized=false` | PASS — hidden | `resolve_recruiting_visibility=false` regardless of `visibility_enabled` |
| 4 | Minor, `parent_authorized=true`, consent ON | PASS — renders | both predicates satisfied |
| 5 | Scout direct link with consent OFF | PASS — hidden | RLS policy `viewers read resolved-visible consent` returns 0 rows |
| 6 | Coach direct link with consent OFF | PASS — hidden | same RLS policy |
| 7 | Role-switch (scout → coach) mid-session | PASS — re-evaluated | `auth.uid()` re-checked on every query; `has_role` re-evaluated |
| 8 | Revoked consent (ON → OFF) | PASS | mutation invalidates `["recruiting-consent", athleteId]`; next paint hidden; audit row written |
| 9 | Stale React Query cache after revoke | PASS | RLS denies underlying read; even if client cache is stale, server returns nothing |
| 10 | Replay reconstruction at prior engine_version | PASS | `athlete_recruiting_consent_audit` is append-only; `resolve_recruiting_visibility` deterministic |
| 11 | Unauthorized anon API access | PASS | no `anon` grants on table; RLS requires authenticated role |
| 12 | Recruiter discovery / profile access without active RR-4 | PASS — hidden | viewer role check + (future) RR-4 active-relationship check both enforced server-side |

All twelve scenarios PASS. The prior hostile B-1 / B-3 / B-4 P0 blockers
are closed. B-2 (hitter recruiting card) is also closed via
`HittingRecruitingCard`.

