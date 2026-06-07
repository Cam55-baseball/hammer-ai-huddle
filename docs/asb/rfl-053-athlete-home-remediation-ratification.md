# RFL-053 — Athlete Home Authority Remediation Ratification

**Date:** 2026-06-07
**Sprint:** RFL-053 Athlete Home Authority Remediation
**Predecessor:** Athlete Experience & Retention Audit (2026-06-07)
**Verdict:** **GO WITH LIMITATIONS**

---

## Section A — Authority Mapping (Overlap Matrix)

| Surface / Responsibility               | `/command` (AthleteCommand.tsx) | `/dashboard` (Dashboard.tsx) |
|---------------------------------------|---------------------------------|------------------------------|
| Hammer onboarding chat                | ✅ `HammerOnboardingChat`       | ❌                           |
| Hammer daily plan (9 modalities)      | ✅ `HammerDailyPlan`            | ❌                           |
| Hammer chat (Ask Coach)               | ✅ `HammerChat`                 | ❌                           |
| UHRC report card                      | ✅ `UhrcAthleteSection`         | ❌                           |
| Readiness / fatigue / workload grid   | ✅ `CommandCenterSection`       | ✅ (`CommandCenterSection` partial) |
| Recent events / replay tail           | ✅ `RecentEventsPreview`        | ❌                           |
| Module catalog / tier purchase CTAs   | ❌                              | ✅ (primary)                 |
| Marketing hero imagery                | ❌                              | ✅                           |
| Identity command card / game plan     | ❌                              | ✅                           |
| Weekly digest / forecast preview      | ❌ (carried as RFL-052)         | ✅ (preview-only)            |
| Onboarding gate (ledger truth)        | ✅ → `/onboarding/athlete`      | ❌                           |
| Lines of code                         | 74                              | 613                          |

**Duplicated:** `CommandCenterSection` (readiness/fatigue grid). `/command` exposes the full grid with signals; `/dashboard` mounts the same component as a glance widget.
**Conflicting:** Hammer authority is *only* on `/command`; `/dashboard` markets modules but cannot deliver the prescription — yet `Auth.tsx` defaulted athletes to `/dashboard` after every login, so the canonical authority was unreachable to anyone who did not deep-link.
**Orphaned:** Module catalog browsing has no home if `/dashboard` is removed as the post-login default. Resolution: keep `/dashboard` mounted, repurpose as the module library/catalog accessed *from* `/command` (via existing AppSidebar and back-buttons).

---

## Section B — Canonical Home Determination

**CANONICAL ATHLETE HOME = `/command`**

| Criterion                         | `/command`                                      | `/dashboard`                              |
|----------------------------------|-------------------------------------------------|-------------------------------------------|
| Decision density                 | High — every section is a decision surface      | Low — hero, paywalls, then modules        |
| Hammer authority                 | Full stack mounted                              | None                                      |
| Daily execution flow             | `HammerDailyPlan` is the first scroll target    | No daily plan                             |
| Retention characteristics        | Returns to a single "today" surface              | Returns to a module-shopping surface       |
| Navigation complexity            | One column, 6 ordered sections                  | Tabs + tier grid + paywalls + heroes      |
| Routes prescription `route` target | `dailyPlan.ts:213,340,479` → `/command`        | n/a                                       |
| Onboarding gate (RFL-032)        | Enforced via `useAthleteOnboardingState`        | Not enforced                              |

Evidence: `src/pages/AthleteCommand.tsx:30-72`, `src/lib/hammer/prescription/dailyPlan.ts:213,340,479`, `src/pages/Dashboard.tsx:1-80`.

---

## Section C — Routing Remediation (Change Set)

Minimal, additive, comment-tagged with `RFL-053`. Three edits, zero new files.

| File                          | Before                                                    | After                                                  |
|-------------------------------|-----------------------------------------------------------|--------------------------------------------------------|
| `src/pages/Auth.tsx:182-184`  | `navigate("/dashboard", { replace: true })`              | `navigate("/command", { replace: true })`             |
| `src/pages/ProfileSetup.tsx:295` | `navigate(goToActivate ? "/activate" : "/dashboard", …)` | `navigate(goToActivate ? "/activate" : "/command", …)` |
| `src/pages/ResetPassword.tsx:47` | `navigate("/dashboard", { replace: true })`            | `navigate("/command", { replace: true })`             |

**Unchanged on purpose:**
- `/dashboard` route mount in `App.tsx:220` — still serves as the module library.
- Scout branch `/scout-dashboard`, owner gates, coach routes.
- Per-module back-buttons (`SpeedLab`, `Nutrition`, `PickoffTrainer`, `VideoLibrary`, etc.) that return to `/dashboard` — this is correct, those are module-catalog returns.
- `AthleteCommand.tsx` onboarding gate (already correct).
- `redirectTarget` short-circuit in `Auth.tsx` (deep-link preservation preserved).

---

## Section D — Journey Re-verification

| Journey                                          | Path                                                                                  | Result |
|--------------------------------------------------|---------------------------------------------------------------------------------------|--------|
| Brand-new athlete (sign-up)                      | `/auth` → `/select-user-role` → … → `ProfileSetup` → `/activate` (player) or `/command` | ✅     |
| Returning athlete *with* first event             | `/auth` → `/command` (Hammer stack mounts)                                            | ✅     |
| Returning athlete *without* first event (RFL-032) | `/auth` → `/onboarding/athlete` → `/command` (after first event)                      | ✅     |
| Advanced athlete                                 | Same as returning — `/command` shows full plan                                        | ✅     |
| Injured athlete                                  | `/command` → `HammerDailyPlan` reflects pain capture per `decisionFilters` (RFL-034)  | ✅     |
| Recruiting / scout                               | `/auth` → `/scout-dashboard` (unchanged)                                              | ✅     |
| Password-reset return                            | `/reset` → `/command`                                                                 | ✅     |
| Recommendation / daily-plan CTA                  | `dailyPlan.ts` blocks → `/command`                                                    | ✅     |
| Module-library access                            | `/command` → AppSidebar → `/dashboard` (catalog role only)                            | ✅     |

Today's mission: obvious — `HammerDailyPlan` is the second scroll target on `/command`.
Next action: obvious — every plan block carries a `route` and `cta`.
Hammer authority: single — `/command` is the only Hammer-mounted surface.
Daily plan visibility: guaranteed — first surface returning athletes see.
Recommendations visibility: preserved — drills/workouts continue to surface in their feature pages, reachable from `/dashboard` catalog.
Roadmap reachability: unchanged — AppSidebar `/roadmap` link.

---

## Section E — Experience Regression Check

| Concern                                      | Status   | Evidence |
|---------------------------------------------|----------|----------|
| RFL-032 (ledger-truth onboarding gate)      | ✅ intact | `Auth.tsx:120-191` `hasFirstEvent` branch untouched; new athletes still route to `/onboarding/athlete` before `/command`. |
| RFL-033 (`compute-hammer-state` boot)       | ✅ intact | Edge function code unchanged. |
| RFL-034 (minor-athlete supremacy)           | ✅ intact | `decisionFilters.ts` + `dailyPlan.ts` unchanged. Suppression continues to apply on `/command`. |
| P0-3 differentiation                        | ✅ intact | `scripts/audits/evidence/p0-3-differentiation.json` not affected — script does not assert routes. |
| Roadmap ordering                            | ✅ intact | `useRoadmapProgress` and roadmap routes unchanged. |
| Recommendation visibility                   | ✅ intact | Recommendation hooks unchanged; module pages still reachable via `/dashboard` catalog and AppSidebar. |
| Onboarding gating                           | ✅ intact | Same `hasFirstEvent` gate. |
| Deep-link preservation                      | ✅ intact | `redirectTarget = state?.returnTo` short-circuit preserved in `Auth.tsx:160-166`. |

---

## Section F — RFL Closure

| ID     | Status     | Evidence |
|--------|-----------|----------|
| RFL-053 | **CLOSED** | Post-login (`Auth.tsx`), post-onboarding (`ProfileSetup.tsx`), and post-reset (`ResetPassword.tsx`) all route athletes to `/command`. `/dashboard` retained as module catalog only. Single canonical athlete authority surface established. |

---

## Section G — Experience Verdict

- Single athlete authority surface? **Yes.** `/command` is the only post-login athlete destination; `/dashboard` is module catalog.
- Today's mission obvious? **Yes.** `HammerDailyPlan` is the first decision surface on `/command`.
- Hammer authoritative? **Yes.** All Hammer surfaces mount only on `/command`.
- Athlete journeys coherent? **Yes.** All five personas land on the same authority.
- Remaining P0 experience blockers? **None.**

### **VERDICT: GO WITH LIMITATIONS**

Carry forward as disclosed launch debt (P1/P2, not launch-blocking):
- RFL-035 (HammerChat grounding), RFL-036, RFL-037, RFL-038, RFL-039, RFL-040, RFL-041, RFL-042, RFL-043
- RFL-044 (HammerDailyPlan hierarchy), RFL-045 (ProgressDashboard density), RFL-046, RFL-047, RFL-048 (`/today` vs `/command` — recommend deprecating `/today` in a future sprint), RFL-049, RFL-050, RFL-051, RFL-052, RFL-054, RFL-055, RFL-056, RFL-057, RFL-058
