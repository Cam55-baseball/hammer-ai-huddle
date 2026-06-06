# P0 Launch Blocker Remediation — Ratification

**Date:** 2026-06-06
**Scope:** Remediation + verification of the three verified P0 blockers from `docs/asb/launch-readiness-hostile-audit.md`. No new features, doctrine, or intelligence.

---

## RFL-033 — `compute-hammer-state` boot failure

**Root cause.** Duplicate `getSeasonProfile` declaration in `supabase/functions/_shared/seasonPhase.ts` (canonical at line 123 + orphan at lines 143–145). Deno refused to boot; every fire-and-forget invocation (`useDayState`, `useEngineRecomputeTrigger`, `useQuickActionExecutor`, `useNNSuggestions`, `useRestDay`, `GamePlanCard`) silently swallowed the boot error via `.catch(() => {})`.

**Fix.** Deleted the orphan duplicate. One definition remains at `seasonPhase.ts:123`. Signature and behavior unchanged.

**Verification.**
- `rg "^export function getSeasonProfile" supabase/functions/_shared/seasonPhase.ts` → 1 match.
- `supabase deploy compute-hammer-state` → success.
- `POST /compute-hammer-state` returned `200 { status: "ok", result: { … } }` (sample request: user_id zeros).
- Boot error no longer appears in fresh logs.

**Closure recommendation:** **CLOSED.**

---

## RFL-032 — Onboarding bypass at `src/pages/Auth.tsx`

**Root cause.** Sign-in router computed `hasCompletedOnboarding = hasProfile || hasSubscription || hasRole`. Any user with `/profile-setup` history (but no canonical event) was routed to `/dashboard`, bypassing `AthleteOnboarding` — the only surface that emits the first canonical ledger event.

**Fix.** Promoted `asb_events` ledger truth (`hasFirstEvent`) to the canonical onboarding authority, mirroring `useAthleteOnboardingState`. Sign-in now:

1. Adds a fourth parallel query: `count(asb_events) where athlete_id = uid`.
2. Computes `hasFirstEvent = (count ?? 0) > 0`.
3. New athlete-cohort branch: `hasCompletedOnboarding && !isScout && !hasRole && !hasFirstEvent` → `navigate('/onboarding/athlete')`.
4. `AthleteOnboarding` already short-circuits to `/command` once `hasFirstEvent` flips → loop self-terminates.

Scout, ops, returnTo, and brand-new-signup paths unchanged.

**Verification.**
- Manual trace of the four redirect paths in `Auth.tsx` (signup, profile-only-no-event, has-event, scout) — each routes to exactly one target.
- `rg "navigate.*onboarding/athlete" src/pages/Auth.tsx` → 1 match (the new branch).
- Route `/onboarding/athlete` exists in `App.tsx:264`.

**Closure recommendation:** **CLOSED.**

---

## RFL-034 — Minor-athlete supremacy not enforced in prescription

**Root cause.** `src/lib/hammer/context/decisionFilters.ts` had zero references to `parent | minor | guardian`. Lifecycle gating used `lifecycleBand ∈ {u10,u12,u14}` only for youth drill hygiene; parent-flagged concerns did not shape prescription. Violated the minor-athlete-supremacy doctrine (Megaphase 151–160 cross-primitive).

**Fix (interpretive, additive, missingness-preserving — no schema, no doctrine).**

1. Extended `AthleteContextProjection` with `isMinor`, `parentSupremacyActive`, `parentConcerns` (all derived from existing spine keys: `lifecycle_band`, `date_of_birth`, `parent_link_active`, `parent_concerns`; missing → safe defaults).
2. Added `isMinorParentLegal()` — minor high-risk superset (`max_load|1rm|weighted_ball_max|depth_jump_max|pull_down|max_throw|heavy_squat|back_squat_max|deadlift_max`) plus parent-concern → blocked-pattern map (`arm_load|speed_max|heavy_lift|jump_load|contact`).
3. Wired into `applyContextFilter` → drill/workout/video consumers gain minor branch automatically (reason tokens: `minor:high-risk`, `minor:parent-concern:<token>`).
4. `selectSpeedFocus` — minor + `parent_concerns ⊇ {speed_max}` now precedes injury supremacy and returns `tempo_recovery`.
5. `orderRoadmapMilestones` — minor + parent concerns suppresses any milestone matching `/max|heavy|sprint_max|throw_max/` (reason: `minor-parent-defer`).
6. `dailyPlan.buildHammerDailyPlan` — added `applyMinorParentSupremacy()` post-processor that flips affected modality blocks (`throwing|speed|strength|defense|baserunning`) to `awaiting-input` with parent-concern note in `why`. No new templates authored.
7. `toEdgeFunctionPayload` exports `is_minor`, `parent_supremacy_active`, `parent_concerns`.

**Verification (`scripts/audits/p0-3-decision-differentiation.ts` extended with `minor-u16-no-concerns` + `minor-u16-parent-concerns`).**

```
personas             11
uniqueDailyPlans     11
uniqueSpeedFoci       5
uniqueDrillLegalSets  3
uniqueRoadmapTops    10
```

- `minor-u16-parent-concerns` → speed focus `tempo_recovery` with rationale `"minor + parent concern (speed_max) — max-effort sprints suppressed"`.
- `minor-u16-parent-concerns` daily speed block flipped to `awaiting-input`.
- `minor-u16-parent-concerns` roadmap top: `m-throw-max(S), m-youth-skill(S), m-max(S)` — all three high-risk milestones suppressed.
- `minor-u16-no-concerns` produces a distinct fingerprint from any other persona (additive, non-regressive).

Evidence: `scripts/audits/evidence/p0-3-differentiation.json`.

**Closure recommendation:** **CLOSED.**

---

## Regression verification

- All 9 pre-existing personas remain uniquely fingerprinted (`uniqueDailyPlans=11` for 11 personas).
- Speed-focus diversity preserved (5 distinct values; ≥4 required).
- Roadmap diversity expanded (10 unique tops vs. previous 8).
- No prior consumer changed shape; new fields are additive.
- Edge function boot restored; downstream silent-catch consumers no longer fed empty state.

---

## Release Authorization

| Question | Answer |
|---|---|
| Any unresolved P0 blockers? | **No.** RFL-032 / 033 / 034 all CLOSED with evidence. |
| Any unresolved athlete safety blockers? | **No P0.** RR-6 RTP-gating remains P1 (pre-existing, non-blocking). |
| Any unresolved onboarding blockers? | **No.** Canonical ledger-truth gate active at sign-in. |
| Any unresolved authority conflicts? | **No P0.** HammerChat-ungrounded (RFL-035) remains P1 (pre-existing, non-blocking). |
| Any unresolved launch blockers? | **No P0.** P1/P2 inventory carried forward as known limitations. |

**Verdict: GO WITH LIMITATIONS.**

Known non-blocking limitations carried forward from the hostile audit: RFL-035 (HammerChat not grounded by projectEnvelope), RFL-036 (drill differentiation collapses to 3 buckets), RFL-037/038 (empty-state copy + staleness visibility), RFL-039+ (parent-concern reasons surfaced in athlete UI), RFL-041 (route-surface pollution). None block athlete safety, onboarding, or canonical authority.
