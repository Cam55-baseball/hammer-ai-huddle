# Coach Hammer Authority, Onboarding & Athlete Guidance — Forensic Audit

**Date:** 2026-06-06
**Method:** Read-only. Re-derived from `src/`, `supabase/`, live DB.
**Disposition:** Hostile — attempted to disprove that Coach Hammer is the athlete's primary developmental coach.

---

## Core question

> When an athlete opens Hammers Modality, can the system answer **"What should I do next?"** without confusion, fragmentation, dead ends, or contradictory guidance?

**Verdict: PARTIAL PASS / FAIL on coherence.** The system *answers* the question on multiple surfaces, but **two independent next-step engines coexist** and **deliver different answers on different routes** (`/dashboard` vs `/today`). See Section A. The system can render a step. It cannot guarantee one canonical step. Launch is not blocked — but Coach Hammer is not yet the **canonical** developmental coach; it is one of several authoritative voices.

---

## Section A — Hammer Authority Map

| Surface | Source | Can issue | Can plan | Can assign | Can answer Q | Can redirect | Contradicts? |
|---|---|---|---|---|---|---|---|
| **Coach Hammer · Next Best Step** | `src/components/dashboard/CommunicationAI.tsx:88–145` → `useCoachHammerNextStep` → edge `coach-hammer-next-step` | ✅ AI-generated step | ❌ single step only | ❌ no DB write | ❌ one-way | ✅ `ctaRoute` | **YES — conflicts with TodayGuidanceSlots `useNextAction`** |
| **TodayGuidanceSlots (Today)** | `src/components/today/TodayGuidanceSlots.tsx:62–69` → `useNextAction` (`src/hooks/useNextAction.ts:18–61`) | ✅ time-of-day heuristic | ❌ | ❌ | ❌ | ✅ `/practice`/`/tex-vision`/`/vault`/`/nutrition-hub`/`/bounce-back-bay` | **YES — wall-clock branching, ignores Hammer brief and edge function** |
| **Daily Prescription (Today)** | `src/lib/runtime/prescription.ts:1–120` (LIFT/SPRINT/THROW/RECOVERY hardcoded block lists, lines 56–92) | ✅ block list | ✅ session-level | ❌ | ❌ | ❌ | Partial — does not consume position/goal/equipment |
| **CommandCenterSection** | `src/components/command/CommandCenterSection.tsx` (signals/projections) | ❌ status only | ❌ | ❌ | ❌ | ✅ deep links | No — observational |
| **UHRC Hammer Brief** | `src/lib/uhrc/generateHammerBrief.ts:1–80` | ✅ priority_fix / drill / video | ❌ no session plan | ❌ no assignment write | ❌ | ✅ via drill | No (translator role, doc says "never re-scores, never re-ranks") |
| **PieV2 Hammer Brief Panel** | `src/components/coach/PieV2HammerBriefPanel.tsx` | ✅ coach-facing translation | ❌ | ✅ coach ack only | ❌ | ✅ | No |
| **HammerStateBadge** | `src/components/hammer/HammerStateBadge.tsx:17–60` | ❌ status badge only | ❌ | ❌ | ❌ | ❌ | No |
| **BlockWorkoutGenerator** | `src/hooks/useBlockWorkoutGenerator.ts`, `src/components/elite-workout/intelligence/BlockWorkoutGenerator.tsx` | ✅ full block plan | ✅ multi-week | ❌ no Hammer link | ❌ | ❌ | **YES — generates plans outside Hammer authority** |
| **WarmupGenerator** | `src/hooks/useWarmupGenerator.ts`, `src/components/custom-activities/WarmupGeneratorCard.tsx` | ✅ | ✅ single warm-up | ❌ | ❌ | ❌ | Independent of Hammer |
| **RoadmapLadder / HittingRoadmapLadder** | `src/components/causal/RoadmapLadder.tsx`, `src/components/hitting/HittingRoadmapLadder.tsx` | ✅ long-term path | ✅ ladder | ❌ | ❌ | ✅ | Independent of Hammer |
| **BounceBackBay** | `src/pages/BounceBackBay.tsx` (486 lines) | ✅ recovery prescription | ✅ recovery plan | ❌ | ❌ | ✅ | Independent recovery surface |
| **Foundations Shelf** | `src/components/video-library/FoundationsShelf.tsx` | ✅ video recs | ❌ | ✅ video assignment | ❌ | ✅ | Independent of Hammer brief |
| **PrescriptiveActionsCard** | `src/components/hie/PrescriptiveActionsCard.tsx:1–30` (drives from `useHIESnapshot`) | ✅ drill suggestion | ❌ | ✅ via drill nav | ❌ | ✅ `/tex-vision` or `/practice-hub` | Independent of Hammer; **routes to `/practice-hub` which does not exist** — actual route is `/practice` (`App.tsx:325`) → **dead end (404 → NotFound)** when `module !== 'tex-vision'` |
| **HelpDeskChat (Ask Coach)** | `src/components/HelpDeskChat.tsx` → edge `ai-helpdesk` | ✅ Q&A | ❌ | ❌ | ✅ chat | ❌ | Separate AI from Hammer |
| **Dashboard `IdentityCommandCard`** | `Dashboard.tsx:552` | ❌ status | ❌ | ❌ | ❌ | ✅ | No |
| **GamePlanCard** | `src/components/GamePlanCard.tsx` | ✅ daily to-do | ✅ | ✅ schedule writes | ❌ | ✅ | **YES — parallel daily plan outside Hammer** |

### Canonical owner verdict

**There is no single canonical owner.** Hammer's *brand* appears on `CommunicationAI` (Dashboard) and `TodayGuidanceSlots` (Today), but the two are powered by **different engines that can disagree**:
- Dashboard `CommunicationAI` → AI edge function `coach-hammer-next-step` with deterministic fallback (route may be `/command`, `/check-in`, etc.).
- Today `TodayGuidanceSlots` → `useNextAction` pure time-of-day heuristic (`hour < 10` → Tex Vision, `hour < 16` → Practice, etc.) that ignores the AI step entirely.

At 09:00, an athlete who navigates Dashboard → Today can see two different "next steps" with two different CTAs in the same minute, both branded as Hammer.

**Verdict: FAIL on canonical authority. PASS on coverage.** Hammer is *present*; Hammer is not yet *sovereign*.

---

## Section B — Onboarding Audit

Surfaces inspected: `src/pages/AthleteOnboarding.tsx` (293 LOC), `src/pages/OnboardingFlow.tsx`, `src/components/onboarding/HammerOnboardingPresence.tsx`, `src/lib/runtime/onboarding/resolver.ts`, `src/lib/runtime/parent/resolver.ts` (parent re-uses athlete resolver, lines 38/141), `src/pages/AcceptParentInvite.tsx`.

| Persona | Hammer initiates? | Establishes context? | Identifies missing info? | Asks Qs? | Fills gaps? | Builds initial plan? |
|---|---|---|---|---|---|---|
| New athlete | ❌ — flow is hand-coded `STEPS = ["Welcome","Profile","Schedule today","Confirm","Notifications","Done"]` (`AthleteOnboarding.tsx:18`); Hammer is a presentation slot only (`HammerOnboardingPresence` "authors no copy", line 4 of component) | ⚠️ minimal — only `day_type` emitted (`AthleteOnboarding.tsx:80`) | ❌ — no missingness inventory | ❌ — single hardcoded picker (day_type) | ❌ — no goal/position/equipment/season prompts | ❌ — first plan = whatever `buildDailyPrescription` returns from one event |
| Existing athlete | n/a — skipped if `hasFirstEvent` (`AthleteOnboarding.tsx:54`) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Returning athlete | ❌ no re-onboarding | ❌ | ❌ | ❌ | ❌ | ❌ |
| Coach | ❌ no dedicated Hammer onboarding | ❌ | ❌ | ❌ | ❌ | ❌ |
| Parent | ❌ — `AcceptParentInvite` is link acceptance only; `parent/resolver.ts` delegates to athlete `resolveOnboardingPresence` | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| Recruiter | ❌ no Hammer onboarding (per RR-10 commercial subordination this is intentional) | n/a | n/a | n/a | n/a | n/a |
| Scout | ❌ — `ScoutApplication` flow only (`App.tsx:212`) | ❌ | ❌ | ❌ | ❌ | ❌ |

**Verdict: FAIL.** Hammer does not currently *conduct* onboarding for any persona. `HammerOnboardingPresence` is a passive renderer of resolver output — it surfaces a "signals on file" count but asks no questions and fills no gaps. Onboarding is script-driven, not Hammer-driven.

---

## Section C — Knowledge-Gap Acquisition Audit

| Variable | Collected? | Where | When | Hammer discovery path | Update path | Missingness propagation |
|---|---|---|---|---|---|---|
| Age / DOB | ✅ | `profiles.date_of_birth` (DB) | Profile setup | Read in `OnboardingFlow.tsx:36` for minor-gating only | `/profile` | Defaults to `isMinor=true` (protection-first) |
| Sport | ✅ | `profiles` + `SportThemeContext` | `/select-sport` | UI only | `/select-sport` | n/a |
| Position | ✅ | `profiles.position` | Profile setup | ❌ **Not consumed by `useCoachHammerNextStep` snapshot or `buildDailyPrescription`** | `/profile` | n/a — silently ignored |
| Throwing hand / batting side | ✅ | `profiles.throwing_hand`, `batting_side` | Profile setup | ❌ Not consumed | `/profile` | n/a |
| Height / weight | ✅ | `profiles.height`, `weight` | Profile setup | ❌ Not consumed by Hammer | `/profile` | n/a |
| Grade / grad year | ✅ | `profiles.high_school_grad_year`, `college_grad_year` | Profile setup | ❌ Not consumed | `/profile` | n/a |
| Experience level | ✅ | `profiles.experience_level` | Profile setup | ❌ Not consumed | `/profile` | n/a |
| **Goals** | ❌ | no column, no topic | never | **BLIND SPOT** | n/a | n/a |
| **Season status / phase** | ⚠️ | derived in `src/lib/seasonPhase.ts` from date heuristic only | computed | ⚠️ partial | n/a | n/a |
| **Lifting age / training history** | ❌ | no column, no topic | never | **BLIND SPOT** | n/a | n/a |
| **Equipment access** | ❌ | no column, no topic | never | **BLIND SPOT** | n/a | n/a |
| **Schedule availability** | ⚠️ | `athlete.schedule.day_type` event (one-shot at onboarding) | onboarding | partial | re-emit only via raw event | preserved by command rows |
| **Injury history** | ❌ | no column, no topic, no `injury_event` rows | never | **BLIND SPOT** per RR-6 sealing doctrine (implementation deferred) | n/a | n/a |
| Recovery capacity | ⚠️ | derived from `behavioral.recovery` events (none in live DB — see live topic count) | ad-hoc check-in | ✅ via `useCoachHammerNextStep` snapshot | `/check-in` sheet | missingness preserved (`buildDailyPrescription` returns `state: "unknown"`) |
| Readiness / fatigue / soreness / sleep / stress / hydration | ✅ | `behavioral.*` events | check-in | ✅ snapshot fields in `useCoachHammerNextStep.ts:88–110` | `/check-in` | ✅ stale-hours surfaced |

**Live ledger evidence** (`asb_events` group-by-topic, 9 distinct topics total): only `behavioral.*` + `athlete.plan.today` + `athlete.schedule.day_type` + `behavioral.checkin` are present. **Zero** rows for `athlete.profile.*`, `athlete.goal.*`, `athlete.equipment.*`, `athlete.injury.*`, `athlete.season.*`, `athlete.context.*`, `relational.life_context.*`. `asb_topic_registry` returns **zero** rows matching `season|equipment|goal|profile|context|life|injur`.

**Verdict: FAIL.** Four critical coaching variables (goals · lifting age · equipment access · injury history) have **no collection mechanism at all**, and four more (position · throws/bats · grade · experience) are collected by `profiles` but **never reach Hammer's reasoning surface**. The snapshot in `useCoachHammerNextStep.ts:73–116` never reads `profiles`. Hammer cannot personalize on attributes it cannot see.

---

## Section D — Daily Coaching Audit

Can Hammer produce "today should look like — warm-up · speed · strength · hitting · throwing · defense · baserunning · fueling · recovery"?

| Modality | Source | Evidence | Verdict |
|---|---|---|---|
| Warm-up | `useWarmupGenerator` (independent), `prescription.ts:56` LIFT_BLOCKS[0] hardcoded "8–10 min mobility + activation" | Not branched by position/sport/equipment | ⚠️ generic |
| Speed | `prescription.ts:71` SPRINT_BLOCKS "4×30m, full recovery" | Hardcoded; not personalized | ⚠️ generic |
| Strength | `prescription.ts:56–63` LIFT_BLOCKS "3×3 @ heavy" | Hardcoded; no equipment/lifting-age input | ⚠️ generic |
| Hitting | ❌ no block in `prescription.ts`; HittingRoadmap is separate | Not in Hammer authority | ❌ absent |
| Throwing | `prescription.ts:78–83` THROW_BLOCKS "15–20 throws @ intent" | Hardcoded; no position/arm-care history | ⚠️ generic |
| Defense | ❌ no block | n/a | ❌ absent |
| Baserunning | ❌ no block; `BaserunningIQ` page is separate | n/a | ❌ absent |
| Fueling | ❌ no block; `NutritionHub` page is separate; `useNextAction` only routes there after 21:00 | n/a | ❌ absent from plan |
| Recovery | `prescription.ts:84–88` RECOVERY_BLOCKS or BounceBackBay page | Hardcoded | ⚠️ generic |
| Inputs used | `prescription.ts:1–12`: readiness · fatigue · recovery · override only | Position / goals / equipment / time-available / season-phase / roadmap **never read** | — |

**`useCoachHammerNextStep` edge-function snapshot** (`useCoachHammerNextStep.ts:73–116`) carries: hour · dayType · escalationCount · readiness · fatigue · soreness · sleep · stress · hydration · plan modules · check-in · MPI · 7-day session/check-in counts. **It does not carry: position · throws/bats · goals · equipment · season phase · roadmap · lifting age · age · grad year.**

**Verdict: FAIL on completeness.** Hammer can produce *a* prescription, but 4 of 9 requested modalities (hitting, defense, baserunning, fueling) are absent from the canonical daily plan, and personalization inputs are limited to behavioral/check-in signals.

---

## Section E — Command Center Audit

`src/pages/AthleteCommand.tsx` (57 lines), `src/components/command/CommandCenterSection.tsx`.

- **What it is:** a projection viewer over canonical ASB rows (`useAthleteCommandRows`) plus `UhrcAthleteSection` (report-card) plus `RecentEventsPreview`.
- **Who it is for:** athlete (route gated to authed user, redirects unauthed to `/auth`, redirects without first event to `/onboarding/athlete` at `AthleteCommand.tsx:27–32`).
- **Can a first-time athlete understand it?** Surface uses `NotificationBell`, projection chips, signal cards. Onboarding redirect protects against empty-state confusion. ⚠️ Vocabulary ("organism status", "signals", "lineage") is unscoped for novice athletes — evidence: `UhrcAthleteSection` is the same UHRC report-card surfaced to coaches. No first-time guidance.
- **Can it answer "what to do next"?** ❌ It is observational. Next-step is the *job* of `CommunicationAI` (Dashboard) and `TodayGuidanceSlots` (Today). `AthleteCommand` carries neither.
- **Can Hammer live there?** Yes structurally — `CommandCenterSection` is already imported by both `Today.tsx:74` and `AthleteCommand.tsx`. Hammer is not currently rendered inside `AthleteCommand`.
- **Should Hammer authority originate there?** Evidence-only answer: **the system already designates `/command` as the recovery fallback** for `CommunicationAI` (`CommunicationAI.tsx:35,82`), meaning the deterministic fallback already routes athletes to Command when Hammer is uncertain. That implicit contract is consistent with `/command` being the canonical "what's happening with me" surface. Whether Hammer authority should *originate* there is a design decision — see roadmap P1.

**Verdict: PASS for purpose, FAIL for guidance role.** Command Center is a well-formed organism status surface. It is not the canonical answer to "what should I do next?"

---

## Section F — Dead-End Detection

Traced flows by following `ctaRoute` / `navigate(...)` calls in the guidance surfaces:

| Origin | Destination | Result |
|---|---|---|
| `CommunicationAI` fallback (no rows) → `/check-in` | No `/check-in` route in `App.tsx` | ✅ **Intercepted** by `handleCta` (`CommunicationAI.tsx:103–109`) → opens `QuickCheckInSheet`. Not a 404. |
| `CommunicationAI` fallback (alert) → `/command` | `App.tsx:223` → `<AthleteCommand />` | ✅ resolves |
| `useNextAction` → `/bounce-back-bay` | `App.tsx:308` | ✅ |
| `useNextAction` → `/tex-vision` | `App.tsx:312` | ✅ |
| `useNextAction` → `/practice` | `App.tsx:325` → `<PracticeHub />` | ✅ |
| `useNextAction` → `/vault` | `App.tsx:311` | ✅ |
| `useNextAction` → `/nutrition-hub` | `App.tsx:306` | ✅ |
| **`PrescriptiveActionsCard.handleStartDrill` → `/practice-hub?...`** | `App.tsx` has **no `/practice-hub`** (route is `/practice`) | **❌ DEAD END → `NotFound`** (`PrescriptiveActionsCard.tsx:18–23`) when `drill.module !== 'tex-vision'` |
| Hammer brief → drill | `generateHammerBrief.ts:32` returns `drill.id` only; no canonical assignment write happens here | ⚠️ surface is informational; assignment happens elsewhere via `useDrillAssignments` |
| HelpDeskChat | renders inline; no terminal redirect | ✅ |
| GamePlanCard CTAs | per-task navigate | not audited in this pass |

**Contradictions / loops:**
- **CommunicationAI vs TodayGuidanceSlots** (Section A) — same brand, different engines, different CTAs on different routes.
- **`useNextAction` time-of-day branching** (`useNextAction.ts:23–60`) — at exactly 10:00 the recommended route flips from Tex Vision to Practice with no signal-based justification, and the `useCoachHammerNextStep` AI step on the same page surface may say something entirely different. Athlete sees CTA change without a state change.

**False-promise check:** `PrescriptiveActionsCard` advertises "What To Do Next — Suggested" with a "Start" button that 404s for non-Tex-Vision modules.

**Verdict: FAIL with one hard dead-end (`/practice-hub`) and one cross-surface contradiction.** All other audited routes resolve.

---

## Section G — Athlete Guidance Completeness

| Capability | Evidence | Pass? |
|---|---|---|
| Can Hammer act as a real coach today | AI step + brief exist; but only behavioral inputs; 4/9 modalities absent (Section D) | ❌ |
| Can Hammer build a daily plan | `buildDailyPrescription` → yes for lift/sprint/throw/recovery; no for hitting/defense/baserunning/fueling | ⚠️ partial |
| Can Hammer build a seasonal plan | No seasonal planner consumes Hammer authority; `seasonPhase.ts` is a date heuristic | ❌ |
| Can Hammer discover missing context | Onboarding emits one event; no missingness-driven question prompts (Section B) | ❌ |
| Can Hammer continuously adapt | Cached for 30-min window via `useCoachHammerNextStep` `halfHour` hash (line 121); re-runs on snapshot change | ⚠️ partial |
| Can Hammer answer athlete questions | HelpDeskChat exists but is a **separate AI** (`ai-helpdesk` not `coach-hammer-next-step`) — Hammer brand absent | ❌ |
| Can Hammer assign next actions | `ctaRoute` only; no DB-side assignment from Hammer next-step | ❌ |
| Can Hammer eliminate athlete confusion | Two contradicting next-step engines (Section A) | ❌ |

**Athlete guidance completeness: 1.5 / 8 = ~19%.**

**Biggest athlete-experience weakness:** **Two competing next-step engines (`useCoachHammerNextStep` on Dashboard vs `useNextAction` on Today) producing different recommendations under the same Hammer brand, with no shared arbitration layer.** File evidence: `src/components/dashboard/CommunicationAI.tsx:92` vs `src/components/today/TodayGuidanceSlots.tsx:32`.

---

## Section H — pointer to roadmap

See `docs/asb/coach-hammer-roadmap.md` for prioritized P0/P1/P2 gap list.

---

## Overall verdict

| Section | Verdict |
|---|---|
| A — Authority | **FAIL** (canonical owner) / PASS (coverage) |
| B — Onboarding | **FAIL** |
| C — Knowledge gaps | **FAIL** |
| D — Daily coaching | **FAIL** (completeness) |
| E — Command Center | PASS purpose / FAIL guidance role |
| F — Dead ends | **FAIL** (1 hard dead-end + 1 contradiction) |
| G — Completeness | **19%** |

**Core question verdict: FAIL on coherence, PASS on coverage.** The system *can* answer "what should I do next?" — multiple times, with multiple answers, from multiple authorities, with one route that 404s. Coach Hammer is **not currently the athlete's primary developmental coach**; it is one of several coaches sharing the surface.

**Launch impact:** Prior GO verdict (`final-public-release-ratification.md`) was scoped to constitutional, governance, observability, and safeguarding integrity. None of the findings here violate constitutional invariants, RLS, replay integrity, or safeguarding. They are **product-quality and authority-coherence findings**, not launch blockers. The prior GO **holds**, but the launch ships with a Coach Hammer that is identity-fragmented at the athlete UI layer.

---

## Reality Feedback Ledger additions (audit-only, no closures)

- **RFL-011** — Two-engine contradiction: `useCoachHammerNextStep` vs `useNextAction` (Section A). Severity: M. Open.
- **RFL-012** — `/practice-hub` dead-end in `PrescriptiveActionsCard` (Section F). Severity: M. Open.
- **RFL-013** — Hammer reasoning blind to `profiles` (position, throws/bats, grade, goals, equipment) (Section C). Severity: M. Open.
- **RFL-014** — 4-of-9 daily modalities absent from canonical prescription (Section D). Severity: M. Open.
- **RFL-015** — Onboarding does not perform knowledge-gap acquisition (Section B). Severity: M. Open.
- **RFL-016** — Ask-Coach is a separate AI surface from Hammer (Section G). Severity: L. Open.
