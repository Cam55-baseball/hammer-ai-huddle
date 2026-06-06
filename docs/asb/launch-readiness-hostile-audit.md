# Launch Readiness — Hostile Audit

**Date:** 2026-06-06  
**Posture:** assume the system is broken; attempt to prove it.  
**Scope:** every athlete-visible surface; every authority interaction; every empty / partial / stale state; every return-visit value loop.  
**Out of scope:** new features, new doctrine, new intelligence layers, remediation patches. Audit identifies; it does not fix.

All findings are cited at `file:line`. Severity is not inflated — see §H for the P0 reservation rule.

---

## A. End-to-end Athlete Journeys

Seven personas walked through: signup → first Hammer interaction → first daily plan → first recommendation → first roadmap → first workout → return visit.

### A1. Brand-new athlete

| Stage | Finding | Evidence |
|---|---|---|
| Sign-up | OK. Email/password + Zod validation. | `src/pages/Auth.tsx:178-186` |
| Post-signup routing | New signup → `/select-user-role`. Reasonable. | `src/pages/Auth.tsx:190-193` |
| First-login routing (returning brand-new) | **Bug.** If profile has *any* `first_name OR last_name OR full_name OR subscription OR role`, login routes straight to `/dashboard`, **completely bypassing** `/onboarding/athlete`. The athlete-onboarding step (which is the only path that emits the first canonical event and walks the user through `HammerOnboardingChat`) is unreachable for any user who completed profile-setup but never finished athlete onboarding. | `src/pages/Auth.tsx:128-167` vs `src/pages/AthleteOnboarding.tsx:51-58` |
| First Hammer interaction | `HammerOnboardingChat` renders only inside `/onboarding/athlete`, which is now unreachable per above. On `/dashboard` and `/command` there is no equivalent gap-filling prompt. | `src/components/hammer/HammerOnboardingChat.tsx:27-32` |
| First daily plan | If the athlete somehow reaches `/command`, `HammerDailyPlan` will render but with `missingnessCount` ≥ 5 — most blocks `awaiting-input` because no canonical event was ever emitted. CTAs route to capture surfaces, which is correct, but with no orienting copy explaining *why* so many blocks are amber. | `src/components/hammer/HammerDailyPlan.tsx:35-40`, `src/lib/hammer/prescription/dailyPlan.ts:31` |
| First recommendation | Drill / workout / video recs degrade gracefully (context envelope returns `confidence:low / missingness:high`) but produce generic outputs that look indistinguishable from "the engine doesn't know me yet" vs "the engine is broken". | `src/hooks/useDrillRecommendations.ts`, `decisionFilters.ts:155-170` |
| First roadmap | Roadmap surface depends on `goal_summary` + `lifecycle_band` + `season_phase`. Brand-new athlete has none → roadmap renders defensive defaults; **no explicit "tell me your goal so I can build this" CTA** observed at the roadmap surface itself. | `src/hooks/useRoadmapProgress.ts` |
| First workout | Bodyweight default fallback works (equipment scope → `inferred:bodyweight`). | `src/lib/hammer/prescription/dailyPlan.ts:232-260` |
| Return visit | No "welcome back, here's what changed since last time" surface. | (absence) |

**Journey verdict:** **broken at step 2** (onboarding bypass). Severity P0.

### A2. Beginner athlete (≤6 months training age)

- `lifecycle_band="beginner"` → `decisionFilters` correctly suppresses max-effort sprints, capped reps. ✅ `src/lib/hammer/context/decisionFilters.ts:251-258`
- `dailyPlan` strength block branches to bodyweight-pattern templates when equipment is sparse. ✅
- **Risk:** no surface explicitly *labels* the athlete as beginner in the UI. The athlete cannot see that the system is treating them as beginner, and cannot correct that classification → trust break if mis-classified.

### A3. Advanced athlete (≥3 yr training age, in-season)

- Spine projects `season_phase="in"` → potentiation 3×3, hitting/throwing volume reduced. ✅
- **Risk:** Elite-tier consumers (`useEliteWorkout`, `useBlockWorkoutGenerator`) are not yet wired to the spine (P0-3 ratification §Limitations). Advanced athletes will see the same daily-plan branching depth as intermediate athletes. Differentiation is structural-only, not depth-of-prescription. P1.

### A4. Returning athlete (lapsed 30+ days)

- No "your context is stale" notice. The spine still serves the last known values from `athlete_context` with no decay visibility at the UI layer. `athlete_development_history_events` has 30-day form half-life in *projection* — but UI does not display confidence/missingness degradation.
- **Risk:** athlete returns, sees an old plan presented as current truth → trust break.

### A5. Injured athlete

- Decision filters correctly suppress max-effort, max-lift patterns when `injury_regions` includes hamstring / ankle / knee / groin / shoulder / ucl. ✅ `decisionFilters.ts:251-258`, `dailyPlan.ts:232-260`
- **Gap:** athlete-reported pain (per RR-6) is not connected to the spine on a same-session basis. Athlete must re-emit injury context through a capture surface; until then, the day's plan can still prescribe loaded patterns. Pain self-report → next-plan latency is not bounded. P1 (not P0 because suppression *does* fire once injury context is recorded — but the gap window is unbounded).
- **Critical:** no RTP gating surface — athlete cannot easily mark "I'm cleared by my trainer". RR-6 requires explicit human authorization for return-to-play; current UI does not surface this requirement. P1.

### A6. Parent-supervised minor

- Parent invite + acceptance flow exists. ✅ `src/pages/AcceptParentInvite.tsx`
- **P0 finding:** `decisionFilters.ts` contains **zero** references to `parent | minor | guardian | age` (grep result: empty). The prescription layer is not branching on minor-athlete supremacy at all. A minor whose parent has flagged training-load concerns will receive the same prescription as an unsupervised adult. This violates the minor-athlete-supremacy doctrine codified in the relational organism architecture (Megaphase 151–160 cross-primitive doctrine) and undermines parent trust.
- Parent invite flow relies on resolving the originating `created` event by paging the athlete timeline up to 200 events. For athletes with >200 events between created and invite-accept, the lookup fails silently. `src/pages/AcceptParentInvite.tsx:46-55`. P1.

### A7. Recruiting-focused athlete

- No decision-filter branch for recruiting context (`rg recruit src/lib/hammer/` → no prescriptive hits).
- `RecruitingConsent` route exists. Once consent is granted, no downstream prescriptive surface changes — recruiting-focus athletes get the same daily plan as everyone else. Not unsafe; just undifferentiated. P2.

---

## B. Hammer Authority Audit

The Hammer (HammerChat / HammerDailyPlan / HammerOnboardingChat) is supposed to be the single voice of truth. Auditing for divergence:

| Surface | Source of authority | Risk |
|---|---|---|
| `HammerDailyPlan` | `buildHammerDailyPlan(ctx)` — spine + `selectSpeedFocus` | Canonical. |
| `HammerChat` | `useHammerChat` — LLM-routed, ungrounded by the spine envelope at the prompt level. | **Divergence risk:** chat answers about "what should I do today" can disagree with `HammerDailyPlan` because the chat does not receive the same `projectEnvelope` snapshot as the daily-plan builder. P1. |
| `useRoadmapProgress.orderedMilestones` | spine-ordered. | Aligned with daily-plan branching. ✅ |
| `useWorkoutRecommendations` / `useDrillRecommendations` | spine-filtered via `applyContextFilter`. | Aligned. ✅ |
| `useSpeedProgress` | `selectSpeedFocus(proj)` | Aligned with the speed block of daily-plan. ✅ |
| **Edge function `compute-hammer-state`** | **DEPLOY FAILURE** | **P0.** Worker boot error: `Identifier 'getSeasonProfile' has already been declared` at `supabase/functions/_shared/seasonPhase.ts:161`. The function has never booted since deployment. Any consumer that depends on server-side hammer state (vs client-derived) is reading stale or empty output. See `edge-function-logs` snapshot at the top of this turn. |

**Authority conflicts found:** 2 (HammerChat ungrounded; `compute-hammer-state` is broken).

---

## C. Empty State Audit

Searched for explicit empty-state branches across athlete surfaces (`rg '.length === 0|isEmpty|no data|nothing yet'` on Dashboard, AthleteCommand, AthleteDigest, useWorkoutRecommendations, useDrillRecommendations, useRoadmapProgress) → **almost no hits**.

| Surface | Has explanation? | Has next action? | Has recovery path? |
|---|---|---|---|
| `HammerChat` (no messages yet) | Yes — "Ask me about today…" `src/components/hammer/HammerChat.tsx:48-52` | Implicit | n/a |
| `HammerDailyPlan` (high missingness) | Partial — per-block `why` + amber tone | Yes — CTA per block | Yes |
| `HammerOnboardingChat` (`nextGap` null) | **Renders `null`** — no copy, no hand-off to next surface. `src/components/hammer/HammerOnboardingChat.tsx:30-32` | No | No |
| `Dashboard` (no data) | "Show placeholder if no data yet" comment at line 332 — copy not audited but pattern suggests passive placeholder | unclear | unclear |
| Workout / Drill recommendations (zero results) | No explicit "no recommendations because…" hardened copy found | No | No |
| Roadmap (no goal_summary) | No explicit goal-capture CTA at roadmap surface | No | No |

**Gap:** the "(explanation + next action + recovery)" triplet exists on `HammerDailyPlan` blocks only. Other surfaces fail at least one leg.

---

## D. UX Friction Audit

| # | Friction | Severity | Evidence |
|---|---|---|---|
| 1 | **100+ top-level routes** in `App.tsx:207-312`. Athletes can be one click from `/admin`, `/owner/foundations/traces`, `/ops/replay`, `/runtime/illness` — surfaces irrelevant to them. Cognitive overload + accidental nav into engineering surfaces. | P1 | `src/App.tsx:207-330` |
| 2 | Auth flow has 6 distinct post-login destinations (`/scout-dashboard`, `/dashboard`, returnTo, `/select-user-role`, dual-purpose routes) decided by a 4-table parallel query. Race conditions on slow networks are possible (no abort logic). | P1 | `src/pages/Auth.tsx:90-167` |
| 3 | No global "where am I in onboarding" indicator outside the AthleteOnboarding page itself. | P2 | (absence) |
| 4 | `HammerOnboardingChat` renders nothing when there are no gaps and nothing when loading — silent. | P2 | `HammerOnboardingChat.tsx:27-32` |
| 5 | Daily-plan amber blocks count is shown but the *meaning* of "needs input" is undefined to a first-time athlete. | P2 | `HammerDailyPlan.tsx:35-40` |

---

## E. Recommendation Quality Audit

Cross-referenced `scripts/audits/evidence/p0-3-differentiation.json`:

- **9/9 unique daily-plan fingerprints** across 9 personas. ✅
- **5 unique speed foci** across 9 personas. ✅
- **8/9 unique roadmap orderings.** ✅
- **4 unique drill legality sets across 9 personas.** ← this is the weak link. Drill recommendations collapse into 4 buckets, meaning 5 of 9 personas receive the same drill set as another persona. P1 (repetition risk for athletes who differ by lifecycle_band but share equipment + injury status).

Attempted breakage:
- **Repetition:** confirmed at drill layer (4 legality sets / 9 personas).
- **Contradiction:** HammerChat vs HammerDailyPlan (see §B) — not yet observed in artifact, but architecturally possible.
- **Irrelevance:** untestable without runtime; static audit cannot disprove.
- **Low-confidence:** spine surfaces confidence per RR-1; UI does not visibly degrade rec strength when confidence is low.

---

## F. Retention Audit

| Return horizon | Value visibility | Finding |
|---|---|---|
| Day 1 | Daily plan refreshes per spine projection | OK |
| Day 7 | No streak / "you've done X this week" surface observed in audited files | P1 — no compounding visibility |
| Day 30 | `athlete_development_history_events` exists but no UI consumes it to show "you've moved from beginner band to intermediate band" or similar | P1 |
| Day 90 | Roadmap progress exists; no "you've completed N milestones since signup" badge surface | P2 |

**Verdict:** progression *exists* in data; it does not *exist* in the athlete's eyes. This is the single biggest retention risk after §A1.

---

## G. Hostile Disproof — "Hammers Modality is not ready for launch"

| # | Argument against launch | Rebuttal |
|---|---|---|
| 1 | Brand-new returning athletes bypass onboarding entirely; they never see HammerOnboardingChat. | **Conceded.** §A1, §H-P0-1. Real blocker. No rebuttal. |
| 2 | `compute-hammer-state` edge function is dead. | **Conceded.** §B. Real blocker. Logs prove BootFailure on every invocation. |
| 3 | Minor-athlete supremacy not enforced in prescription. | **Conceded.** §A6, §H-P0-3. Real blocker for parent trust. |
| 4 | Drill recommendations collapse into only 4 buckets across 9 personas. | **Partial.** P1, not P0 — outputs are not unsafe, just under-personalized. Acceptable launch debt with disclosure. |
| 5 | HammerChat is not grounded by the spine envelope and can contradict HammerDailyPlan. | **Partial.** P1 — not observed in evidence, only architecturally possible. Mitigate with monitoring; not a launch blocker. |
| 6 | Empty states across most surfaces lack the (explanation + next action + recovery) triplet. | **Partial.** P1 — degraded experience, not broken experience. |
| 7 | 100+ routes pollute athlete nav. | **Rejected as launch blocker.** P1 — fixable post-launch with route guards. |
| 8 | Retention loop is invisible (no streaks, no progression visibility). | **Partial.** P1 — affects retention, not first-launch trust. |
| 9 | Auth flow has race-prone post-login routing logic. | **Rejected.** P2 — slow-network edge case; no evidence of production breakage. |
| 10 | Intelligence is only ~65%. | **Rejected.** Per P0-3 ratification, 65% is sufficient *with disclosure*. Not a blocker. |

**Net hostile verdict:** three real P0 blockers (#1, #2, #3) and several P1 launch debts. Launch is **not** ready without fixing #1–#3.

---

## H. Launch Blocker Inventory

P0 is reserved per the audit plan for: data loss, security exposure, broken auth, decision contradictions visible in-session, onboarding dead-ends preventing first-plan emission, injury-branch failure exposing unsafe prescription, parent-supervision bypass for minors.

### P0 — launch blockers

| ID | Finding | Affected journey | Harm dimension |
|---|---|---|---|
| **P0-1** | Brand-new athlete onboarding is bypassed by `src/pages/Auth.tsx:128-167` whenever the profile has *any* non-null name/role/subscription. Athletes never reach `/onboarding/athlete` and therefore never emit the first canonical event via `HammerOnboardingChat`. | A1 brand-new | onboarding completion, trust, recommendation quality |
| **P0-2** | `compute-hammer-state` edge function fails to boot (`Identifier 'getSeasonProfile' has already been declared` in `supabase/functions/_shared/seasonPhase.ts:161`). Every invocation since deployment has returned BootFailure. | All journeys depending on server-side hammer state | recommendation quality, trust, observability |
| **P0-3** | Minor-athlete supremacy is not enforced in the prescription layer. `src/lib/hammer/context/decisionFilters.ts` has zero references to parent / minor / guardian. Parent-flagged load concerns do not branch prescription. | A6 parent-supervised minor | trust, safeguarding, parent retention |

### P1 — should fix before launch

| ID | Finding |
|---|---|
| P1-1 | HammerChat is not grounded by the spine envelope; can contradict HammerDailyPlan. |
| P1-2 | Drill recommendations collapse into 4 legality sets across 9 personas (repetition). |
| P1-3 | Empty states on Dashboard, Workout/Drill recommendations, and Roadmap lack the (explanation + next action + recovery) triplet. |
| P1-4 | Returning-athlete staleness is invisible; spine confidence/missingness degradation is not surfaced at the UI. |
| P1-5 | Injured-athlete pain-self-report → next-plan suppression latency is unbounded. |
| P1-6 | No RTP-authorization surface for injured athletes (RR-6 doctrine gap at UI layer). |
| P1-7 | Athlete nav is polluted by 100+ routes including admin / ops / owner surfaces. |
| P1-8 | Auth.tsx post-login routing race-prone on slow networks (4-table parallel query, no abort). |
| P1-9 | Parent-invite resolution caps timeline lookup at 200 events; fails silently for deep histories. |

### P2 — post-launch

- HammerOnboardingChat null-render is silent.
- "Needs input" label undefined for first-time users.
- Streak / progression-visibility retention surface missing.
- Recruiting-focused athletes are undifferentiated.

---

## I. Launch Readiness Verdict

### What can break athlete trust?
- P0-2 (silent server-side Hammer state failure → recommendations that look broken).
- P0-3 (parent flags ignored → parent rage / churn).
- P1-1 (Hammer says one thing, plan says another).
- P1-4 (returning athlete sees stale data presented as truth).

### What can break retention?
- P0-1 (athletes who get past auth without onboarding will see broken-looking surfaces and leave).
- F-tier findings (no compounding value visibility at D7 / D30 / D90).

### What can break onboarding?
- P0-1 (the entire onboarding flow is bypassable). This is the single largest pre-launch risk.

### What can break recommendations?
- P0-2 (server-side hammer state is dead).
- P1-2 (drill collapse to 4 buckets / 9 personas).
- P1-1 (chat ↔ plan contradictions).

### What are the true launch blockers?
- **P0-1, P0-2, P0-3.** Nothing else.

### Shortest path to launch
1. **Fix P0-2** (single-line dedup of `getSeasonProfile` in `_shared/seasonPhase.ts`). ~10 min.
2. **Fix P0-1** by inserting an "athlete onboarding incomplete" check at the same `Auth.tsx:128-167` decision point, gating `/dashboard` on `useAthleteOnboardingState.hasFirstEvent`. ~1 hr.
3. **Fix P0-3** by adding `parent_concerns` / `minor_flag` branches in `decisionFilters.ts` analogous to the `injury_regions` branch. ~2 hr.
4. **Issue revised launch verdict.**

Estimated end-to-end time to remediate the three P0s: **~half a day of focused work**.

### GO / NO-GO

**Verdict: NO-GO until P0-1, P0-2, P0-3 are remediated.**

After P0 remediation, verdict is expected to revert to **GO WITH KNOWN LIMITATIONS** (P1s become disclosed launch debt, P2s become post-launch backlog).

Prior P0-3-ratification verdict of "GO WITH KNOWN LIMITATIONS" is **withdrawn** by this hostile audit pending the three P0 fixes above.

---

## Prior audits consulted

`humanization-audit.md`, `dropoff-detection.md`, `life-context-audit.md`, `injury-recovery-audit.md`, `intelligence-utilization-audit.md`, `data-consistency-audit.md`, `final-launch-risk-register.md`. None of them caught P0-1, P0-2, or P0-3 in their current form — re-validation against current code surfaced all three.
