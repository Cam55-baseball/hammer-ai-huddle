# Athlete Experience & Retention Audit

**Date:** 2026-06-07
**Posture:** Hostile, audit-only. Assumes athletes will get confused, bored, or distrustful unless proven otherwise.
**Scope:** athlete reality — onboarding, daily use, progression, retention, navigation, trust, delight.
**Out of scope:** architecture, schema, doctrine, intelligence expansion, implementation.
**Inputs:** sealed P0 launch-blocker remediation (RFL-032/033/034 CLOSED), open P1s (RFL-035…RFL-043), live route map (`src/App.tsx`, 119 routes), Hammer surface inventory (`src/components/hammer/*`), canonical athlete entry points (`/dashboard`, `/command`, `/today`, `/onboarding/athlete`).

---

## Section A — First 15 Minutes

Walking the actual signup → first-recommendation journey, file:line cited.

### A.1 Signup → role selection — **OK**
- `src/pages/Auth.tsx:1-404` — sign-up emits `athlete.lifecycle.signup` (RFL-001 CLOSED).
- After signup the user is routed through role / sport selection (`SelectRole.tsx`, `SelectSport.tsx`). Next action is obvious.

### A.2 Onboarding — **OK (post RFL-032 fix)**
- `src/pages/Auth.tsx` now consults `asb_events` count and routes profile-only-no-event athletes to `/onboarding/athlete`. The first canonical event is guaranteed.
- `src/components/hammer/HammerOnboardingChat.tsx:1-98` runs the 9-gap director. Self-hides at zero gaps. Athlete-visible value: Hammer asks, athlete answers, plan starts personalizing.

### A.3 First Hammer interaction — **OK**
- Mounted at `src/pages/AthleteCommand.tsx:54` and reachable via `/command`. Single identity, single arbitration (`useHammerNextStep`).

### A.4 First daily plan — **OK with two reservations**
- `src/components/hammer/HammerDailyPlan.tsx:1-80` renders 9 modalities with `why` + next-action. Differentiation verified (11/11 unique fingerprints, `scripts/audits/evidence/p0-3-differentiation.json`).
- **Reservation 1 — overwhelm.** Nine modality blocks rendered simultaneously on first visit. No "today, do these three things first" hierarchy. **Severity: P1 (new) — RFL-044.**
- **Reservation 2 — empty-state copy.** For a brand-new athlete with no historical signals, several blocks fall back to `awaiting-input` without the canonical (explanation + next action + recovery) triplet. Reinforces existing **RFL-037 (P1)**.

### A.5 First roadmap — **OK**
- `src/hooks/useRoadmapProgress.ts::orderedMilestones` consumes spine (RFL-031 CLOSED). Top milestone is differentiated per persona (8/9 unique tops).

### A.6 First recommendation — **OK with reservation**
- Drill/workout/video recs consume the spine envelope (RFL-029 CLOSED).
- **Reservation — repetition risk.** 5 of 9 personas share a single drill legality bucket (RFL-036, P1, **carried**). A brand-new athlete will not see this on day one; observed risk is days 7–30.

### A.7 First-15-min answers
| Question | Verdict |
|---|---|
| Next action always obvious? | Mostly. Two athlete-primary destinations (`/dashboard` and `/command`) compete — see E.1. |
| Athlete value visible immediately? | Yes after onboarding completes. Hammer addresses the athlete by name, references gaps just answered. |
| Anything confusing? | Yes — `/dashboard` vs `/command` ambiguity (E.1) and `Dashboard.tsx:262-287` paywall paths surface tier-upgrade modals to new athletes pre-value (RFL-046). |
| Anything overwhelming? | Yes — 9 modality blocks at once (RFL-044); 15+ HIE cards on `/progress` (RFL-045). |
| Anything empty? | Yes for cold-start athletes in workout / drill rec hooks (RFL-037 reinforced). |
| Does athlete understand why to return? | Partial — daily-plan "why" copy gives a reason but no explicit tomorrow-promise. RFL-047. |

---

## Section B — Daily Use

### B.1 Is today's mission obvious?
- `/today` (`src/pages/Today.tsx:1-191`) is sparse — two `<Link>`s (digest, forecast) at L97/L103. The actual "do this now" surface lives on `/command`. **Two competing today-pages** = ambiguous mission. **RFL-048 (P1).**

### B.2 Is Hammer authoritative?
- Within `/command` yes. **Across** the app, no — `HammerChat` is not grounded by `projectEnvelope` so it can contradict the same-session `HammerDailyPlan`. RFL-035 (P1, **carried**).

### B.3 Is the daily plan actionable?
- Yes — each modality has a CTA route. Dead-end routes patched in prior sprint (RFL-019).

### B.4 Recommendation coherence
- Within a session, all rec hooks read the same spine — coherent.
- Across HammerChat ⇄ DailyPlan — risk (RFL-035).

### B.5 Competing priorities
- `Dashboard.tsx` mixes module-purchase upsells (`navigate("/pricing", …)` at L262, L269, L276, L284) with current-day intelligence. New athletes see commercial CTAs adjacent to performance CTAs. **RFL-046 (P1).**

### B.6 Dead ends
- Athlete-side: none verified after RFL-012 / RFL-019 closures.
- Engineering-side: `/admin`, `/owner/*`, `/ops/*`, `/runtime/*` are still reachable by typed URL or accidental linking (RFL-041 **carried**).

---

## Section C — Progression Visibility

### C.1 Roadmap progress
- `orderedMilestones` differentiates; UI surfaces are functional but **percent-complete vs. trajectory delta is not headlined**. Athlete can see "what's next" but not "how fast am I moving." **RFL-049 (P1).**

### C.2 Achievements / streaks
- `DualStreakDisplay` exists (`src/components/dashboard/DualStreakDisplay.tsx`) but is mounted in `ProgressDashboard` only. Not on `/command` or `/today` where the daily decision happens. **RFL-050 (P2).**

### C.3 Historical / completed work
- `RecentEventsPreview` is the replay tail on `/command`. Functional but unannotated — events appear as a list without "you completed X this week" summarization. **RFL-051 (P2).**

### C.4 Does progress feel tangible?
- For an athlete with 7+ days of activity: partial. Numbers exist; narrative does not.
- For an athlete with 0–3 days: no — every progression surface reads as empty or placeholder. Reinforces RFL-037.

---

## Section D — Retention Loops

| Window | Can athlete answer "what did I accomplish?" | "what next?" | "why return tomorrow?" |
|---|---|---|---|
| D1 | No (no prior session yet) | Yes (daily plan) | Implicit (plan exists) — no explicit hook |
| D7 | Partial — `RecentEventsPreview` lists events, no weekly digest mounted on athlete home | Yes | Partial — streaks exist but are buried on `/progress` |
| D30 | Weak — no monthly milestone surface; roadmap progress not headlined | Yes | Weak — no narrative thread (and per RR-5, narratives must be observational, not destiny — so the bar is "observed momentum," not hype) |
| D90 | Very weak — no career-arc summary; deferred per post-mastery roadmap | Yes | Very weak — no longitudinal "you've moved from X to Y" surface |

D30/D90 retention surface area is structurally thin. **RFL-052 (P1)** — D7+ retention hooks (weekly digest preview on athlete home, monthly milestone callout, streak surfacing on `/command`) absent.

Hostile disproof: "Weekly digest already exists on `/progress`." Yes — but `/progress` is not the daily landing page; athletes optimizing for "open app, see plan" never see it.

---

## Section E — Navigation Audit

### E.1 Duplicated athlete-home destinations — **P0 (new)**
- `/dashboard` (`src/pages/Dashboard.tsx`, 613 lines, marketing-heavy, module-purchase CTAs) and `/command` (`src/pages/AthleteCommand.tsx`, 74 lines, canonical Hammer surface) **both function as athlete-home**.
- Post-login redirect lands authenticated athletes on `/dashboard` by default; `/command` is reached via deep link.
- An athlete who lands on `/dashboard` may never see `HammerOnboardingChat`, `HammerDailyPlan`, or `HammerChat` until they happen to navigate to `/command`.
- **This is the largest experience-side launch risk.** Severity: **P0 — RFL-053.**
- Hostile disproof attempt: "Auth.tsx routes new athletes to `/onboarding/athlete`, then to `/dashboard`." Confirmed via `src/pages/Auth.tsx`. The fix from RFL-032 only handles the *first* event; **subsequent logins still land on `/dashboard`**, where the canonical Hammer surface is not mounted. Disproof fails.

### E.2 Route pollution — **P1 (carried, RFL-041)**
- `src/App.tsx` declares 119 routes including `/admin`, `/owner/*`, `/ops/*`, `/runtime/*`, `/initialize-owner`, `/engine-health`, etc. Athlete-side route guards exist (`useAdminAccess`, `useOwnerAccess`) but the **URL surface area** is still public — accidental sharing, search-engine indexing, and typed-URL exploration all expose engineering surfaces.

### E.3 Hidden athlete functionality — **P2 (new)**
- `/digest`, `/forecast`, `/calendar`, `/cycle`, `/safety-center`, `/relationship-settings` exist as routes but are not surfaced from `/command` or `/dashboard` navigation. **RFL-054.**

### E.4 Click depth
- Daily plan → drill: 2 clicks (acceptable).
- Daily plan → "why" lineage: surfaced inline (good).
- Hammer chat → context: 0 clicks (good).
- Settings → notifications: 3+ clicks (acceptable).

### E.5 Confusing labels
- `/command` vs `/dashboard` (E.1) is the dominant label issue.
- "Hammer" is consistent across surfaces (post-disambiguation constitution).

---

## Section F — Trust Audit

### F.1 Contradictory guidance
- HammerChat ⇄ HammerDailyPlan divergence (RFL-035 P1, **carried**) is the only verified contradiction surface.

### F.2 Unexplained recommendations
- `HammerDailyPlan` exposes `why` per modality (good).
- Drill / workout / video recommendation cards do not consistently expose `why` — most show title + CTA only. **RFL-055 (P1).** (Adjacent to RFL-037; this one is specifically about the lineage-one-interaction-away requirement from EI-1…EI-10 athlete intelligence delivery doctrine.)

### F.3 Unexplained scores
- MPI score on `ProgressDashboard.tsx:39` is rendered as a number + grade label with no inline lineage link. Athletes see "84 • B+" with no "how was this computed?" path. **RFL-056 (P1).**

### F.4 Confidence breaks
- Returning-athlete spine staleness invisible (RFL-038 P1, **carried**). Confidence/missingness exist in projection but never surface to the athlete.

### F.5 Would an athlete trust the organism?
- **In the first session: yes.** Hammer is personable, explains, and adapts to onboarding answers.
- **At D14+: at risk.** Repetition (RFL-036), unexplained scores (F.3), invisible staleness (F.4), and cross-surface contradiction (F.1) compound.

---

## Section G — Delight Audit

### G.1 Moments that already impress
- HammerOnboardingChat using the athlete's name and prior answers (good).
- Daily-plan `why` strings that reference real signals (good).
- Roadmap top-milestone differentiation (audit evidence: 8/9 unique).

### G.2 Missed delight opportunities (findings only)
- No "first plan generated" celebration — onboarding completes silently into a list of nine blocks. **RFL-057 (P2).**
- No streak callout on the daily landing surface. **RFL-050 (P2).**
- No "Hammer noticed X about your week" weekly summary on athlete home. **RFL-052 (P1).**
- No before/after surface for completed drills (athlete completes a drill, sees no "you logged this — here's how it changed your projection"). **RFL-058 (P2).**

(All "missed delight" findings are observation-only — none propose features, only flag absence.)

---

## Section H — Launch Readiness Reassessment

### H.1 What still harms retention
- Duplicated home destinations (RFL-053 **P0**) — top item.
- D7+ retention hooks absent (RFL-052).
- Recommendation repetition (RFL-036).
- Invisible progression cadence (RFL-049).

### H.2 What still harms engagement
- 9-modality overwhelm at first visit (RFL-044).
- Dense `ProgressDashboard` (RFL-045).
- Marketing CTAs interleaved with performance surfaces (RFL-046).

### H.3 What still harms trust
- HammerChat ungrounded (RFL-035).
- Unexplained scores (RFL-056) and recs (RFL-055).
- Invisible staleness (RFL-038).
- Empty-state triplet gaps (RFL-037).

### H.4 Fix-before-launch
- **RFL-053 (P0)** — resolve `/dashboard` vs `/command` duality. Minimum: post-login redirect → `/command`; `/dashboard` becomes the marketing/module-discovery surface only (or a clear "explore modules" label).

### H.5 Defer-to-V2 (acceptable launch debt)
- RFL-035, RFL-036, RFL-037, RFL-038, RFL-039, RFL-040, RFL-041, RFL-042, RFL-043 (carried P1s).
- RFL-044, RFL-045, RFL-046, RFL-047, RFL-048, RFL-049, RFL-050, RFL-051, RFL-052, RFL-054, RFL-055, RFL-056, RFL-057, RFL-058 (new audit findings).
- D90 / career-arc surfaces remain under post-mastery-expansion-roadmap (RR-7 sealed, implementation deferred).

---

## Section I — Final Pre-Launch Verdict

**Verdict: NO-GO** on athlete-experience grounds alone, contingent on a single P0 fix.

**Sole blocker: RFL-053 (athlete-home duality).** The duplicated `/dashboard` and `/command` destinations mean the canonical Hammer surfaces — the entire P0-3 differentiation work, the entire context spine activation, the entire minor-supremacy enforcement — can be invisible to a returning athlete who lands on `/dashboard`. This nullifies the architectural investment for an unknown fraction of the user base. The fix is small (post-login redirect + label cleanup), but until it ships the launch verdict cannot be GO.

**Post-fix expected verdict: GO WITH LIMITATIONS.** All other findings (P1 and P2) are acceptable launch debt with the carried hostile-audit P1s.

**Architecture verdict (unchanged):** GO WITH LIMITATIONS. No new architecture work proposed by this audit.

---

## Appendix — Findings Index

| ID | Section | Severity | Status | Summary |
|---|---|---|---|---|
| RFL-044 | A.4 | P1 | Open | 9-modality daily plan lacks "do these first" hierarchy |
| RFL-045 | A, C | P1 | Open | `ProgressDashboard` cognitive overload (15+ HIE cards) |
| RFL-046 | A.7, B.5 | P1 | Open | Module-purchase upsells interleaved with performance surfaces on `/dashboard` |
| RFL-047 | A.7 | P2 | Open | No explicit "tomorrow promise" / return hook on daily plan |
| RFL-048 | B.1 | P1 | Open | `/today` vs `/command` ambiguity for "do this now" |
| RFL-049 | C.1 | P1 | Open | Roadmap progress lacks trajectory delta headline |
| RFL-050 | C.2, G | P2 | Open | Streaks not surfaced on daily landing |
| RFL-051 | C.3 | P2 | Open | Recent activity unannotated (no weekly summary) |
| RFL-052 | D, G | P1 | Open | D7/D30 retention hooks (weekly digest on home, monthly milestone) absent |
| RFL-053 | E.1, H.4 | **P0** | Open | `/dashboard` vs `/command` athlete-home duality — canonical Hammer surfaces invisible to athletes landing on `/dashboard` |
| RFL-054 | E.3 | P2 | Open | `/digest`, `/forecast`, `/calendar`, `/cycle`, `/safety-center` not surfaced from athlete home nav |
| RFL-055 | F.2 | P1 | Open | Drill/workout/video recommendation cards lack inline `why` (lineage-one-interaction-away gap) |
| RFL-056 | F.3 | P1 | Open | MPI score rendered without inline lineage path |
| RFL-057 | G.2 | P2 | Open | No "first plan generated" celebration after onboarding |
| RFL-058 | G.2 | P2 | Open | No before/after surface after drill completion |
