# V1 Launch Operations Plan

**Sprint:** Hammers Modality V1 — Launch Operations & Reality Feedback System
**Date:** 2026-06-07
**Posture:** Documentation only. No code, no schema, no features. Establishes the post-launch observability and feedback loop so reality can govern V1.x.
**Authority:** Subordinate to `hammers-modality-v1-ratification.md` (RELEASE AUTHORIZED). Subordinate to RW-1…RW-10 (real-world organism execution), EI-1…EI-10 (intelligence delivery), and the Eternal Laws. Funnels and dashboards are **replay-derived projections**, never authoritative state, per `funnel-instrumentation.md` and `dropoff-detection.md`.

---

## Section A — Canonical Athlete Funnel

Eleven canonical stages from account creation to D30 return. Sources are existing tables and existing instrumentation; no new schema is proposed.

| # | Stage | Source signal | Current instrumentation | Gap | Owner |
|---|---|---|---|---|---|
| 1 | Account Created | `auth.users.created_at` (proxy: `profiles.created_at` insert) | Instrumented (auth + profile insert) | No canonical `asb_events` topic for signup | V1.x — surface in dashboard via `profiles` |
| 2 | Role Selected | `profiles.role` set non-null | Instrumented (column read) | No event-level history of role transitions | V2 |
| 3 | Sport Selected | `profiles.sport` set non-null | Instrumented (column read) | Same as above | V2 |
| 4 | Profile Completed | `profiles.name + role + subscription_status` populated | Instrumented (the same 4-table check `Auth.tsx:90-167` uses for routing) | Race condition flagged in RFL-042 | V1.x |
| 5 | First Event Logged | First row in `asb_events` for `user_id` | Instrumented (this is the canonical onboarding-completion proxy per RFL-032 closure) | None — this is the authoritative first-value signal | — |
| 6 | First `/command` Visit | First page-view to `/command` post-onboarding | **Gap** — no explicit page-view event; inferable from first `hammer_state_snapshots` row or first authenticated request post-onboarding | Explicit topic missing | V1.x — derive via `hammer_state_snapshots.created_at` for cohort |
| 7 | First Daily Plan Viewed | First `hammer_state_snapshots` row (server-derived) OR first client render of `HammerDailyPlan` | Partial — server snapshot is observable; client render is not | No client-side view event | V1.x — accept server-snapshot proxy |
| 8 | First Recommendation Consumed | First row in `foundation_recommendation_traces` with `consumed=true` (or first `drill_usage_tracking` / `video_user_outcomes` row) | Partial — surface-level instrumentation exists; cross-surface consolidation does not | Multi-surface fan-in undefined | V1.x — define union query |
| 9 | First Workout Completed | First `performance_sessions` row OR first `block_workouts` insert | Instrumented | None | — |
| 10 | D7 Return | ≥1 `asb_events` row in days 7–14 after Stage 5 | Instrumented (matches `funnels.ts` "retained" stage definition) | None | — |
| 11 | D30 Return | ≥1 `asb_events` row in days 28–35 after Stage 5 | Instrumented (same reducer pattern extended) | Not yet exposed as a discrete stage in `funnels.ts` | V1.x — extend `FUNNEL_DEFS` |

**Authority note.** Stages 1–4 are pre-organism (profile setup, no ledger truth yet). Stage 5 is the canonical first-value marker (per RFL-032 closure). Stages 6–11 are all replay-derivable from `asb_events` + existing canonical tables. No new event topics are required for V1 launch operations.

---

## Section B — Reality Feedback Dashboard (Launch Command Center) — spec only

Read-only specification. No build in this sprint. Consumer = leadership daily check + weekly review.

### Metric families (seven)

| # | Family | Primary metric | Source (existing tables only) | Cadence |
|---|---|---|---|---|
| 1 | Signups | New `profiles` rows per day | `profiles.created_at` | Daily |
| 2 | Onboarding completion | % of signups with ≥1 `asb_events` row within 24h | `profiles` ⨝ `asb_events` (first-event-per-user) | Daily |
| 3 | First-value attainment | % of onboarded athletes with first `hammer_state_snapshots` row within 48h of first event | `asb_events` ⨝ `hammer_state_snapshots` | Daily |
| 4 | Retention | D1 / D7 / D30 cohort return rate against Stage 5 | `asb_events` per `user_id` bucketed by days-since-first-event | Daily |
| 5 | Recommendation engagement | % of active athletes with ≥1 `foundation_recommendation_traces` consumed event per active day | `foundation_recommendation_traces` | Daily |
| 6 | Workout completion | Sessions per active athlete per active week; % of active athletes completing ≥1 session in trailing 7d | `performance_sessions`, `block_workouts` | Daily |
| 7 | Roadmap + command usage | Active-athlete count touching `athlete_roadmap_progress` or generating a `hammer_state_snapshots` row per day | `athlete_roadmap_progress`, `hammer_state_snapshots` | Daily |

### Query posture

All queries follow the `funnels.ts` reducer pattern: read-only projections over the canonical ledger, ordered by `(occurred_at, event_id)` to match replay chronology, no writeback, no imputation. Stages with missing topics report `entries=0 / unobservable=true` (per `dropoff-detection.md`).

### What this spec does **not** require

- No new tables.
- No new edge functions.
- No new event topics.
- No client-side instrumentation work.
- No dashboard UI (spec only; build deferred to V1.x).

---

## Section C — Drop-off Detection

For each of the eleven funnel stages: success event, failure event, abandonment signal. Abandonment thresholds follow `dropoff-detection.md` (`high_abandonment ≥ 50%`, `stalled > 7d median time-to-next`).

| Stage | Success | Failure | Abandonment signal |
|---|---|---|---|
| 1 Account Created | `profiles` row exists | Auth flow error | none (entry stage) |
| 2 Role Selected | `profiles.role` set | Profile setup abandoned | >24h since signup without role |
| 3 Sport Selected | `profiles.sport` set | Same | >24h since signup without sport |
| 4 Profile Completed | All 4 fields populated | Same | >48h with partial profile |
| 5 First Event Logged | First `asb_events` row | Onboarding chat exit without emit | >48h after profile complete with zero events |
| 6 First `/command` Visit | First `hammer_state_snapshots` row | Athlete deep-links to `/dashboard` or `/today` and never reaches `/command` | >24h after first event without snapshot |
| 7 First Daily Plan Viewed | Server snapshot exists | `compute-hammer-state` failure (regression of RFL-033) | >24h with snapshot absent |
| 8 First Recommendation Consumed | First `consumed=true` trace | All recommendations dismissed / ignored | >7d with zero consumption |
| 9 First Workout Completed | First `performance_sessions` row | Daily plan viewed but no session | >7d with viewed plan and zero sessions |
| 10 D7 Return | Any event days 7–14 | No event days 7–14 | Day 14 with zero events post-Stage 5 |
| 11 D30 Return | Any event days 28–35 | No event days 28–35 | Day 35 with zero events post-Stage 5 |

### Top 5 athlete-loss locations (likelihood × impact)

Grounded in the open RFLs (`RFL-044`, `RFL-052`, `RFL-055/056`) and the funnel above.

1. **Stage 5 → Stage 6.** Profile complete but first event never emitted, or first event emitted but `/command` never reached. Symptom of RFL-044 (9-modality overwhelm) and the onboarding-chat exit path. **Highest priority.**
2. **Stage 7 → Stage 8.** Daily plan viewed but no recommendation consumed. Symptom of RFL-055/056 (missing inline `why` lineage outside `HammerDailyPlan`) — athlete sees recommendations they cannot trust.
3. **Stage 8 → Stage 9.** Recommendation consumed but no workout completed. Likely a per-modality friction (drill UX, video player, scheduling).
4. **Stage 9 → Stage 10 (D7).** First workout completed but no return within 7 days. Symptom of RFL-052 (no weekly digest / "here's what you did this week" hook).
5. **Stage 10 → Stage 11 (D30).** D7 returner that does not return at D30. Compounded by RFL-049 (no trajectory delta on roadmap) and RFL-058 (no before/after on drill completion).

---

## Section D — Release Health Scoreboard

Six launch-health metrics with explicit Healthy / Warning / Critical bands. **First-cohort calibration caveat:** all numeric thresholds are launch-priors. After the first 30-day cohort, thresholds are re-anchored to observed organism baseline. Thresholds are advisory (per `dropoff-detection.md`) — never enforcement, never used to mutate organism truth.

| Metric | Healthy | Warning | Critical |
|---|---|---|---|
| Activation rate (Stage 1 → Stage 5, within 48h) | ≥60% | 40–60% | <40% |
| Onboarding completion (Stage 4 → Stage 5, within 24h) | ≥70% | 50–70% | <50% |
| D1 retention (event in 24–48h window post-Stage 5) | ≥45% | 25–45% | <25% |
| D7 retention (event in days 7–14) | ≥30% | 15–30% | <15% |
| Workout completion (% active athletes with ≥1 session in trailing 7d) | ≥40% | 20–40% | <20% |
| Recommendation engagement (% active athletes with ≥1 consumed trace per active day) | ≥30% | 15–30% | <15% |

Any **two** metrics in Warning or **one** metric in Critical for two consecutive days → triggers RFL intake review per Section E.

---

## Section E — Reality Feedback Ledger intake path

Reality is the organism's governing authority. Every external signal — athlete, coach, parent, recruiter, support — has a deterministic path into the RFL.

### Capture channels (existing surfaces; no new build)

- Athlete complaints / confusion: support inbox, in-app feedback, session-end mood capture (`session_start_moods`)
- Coach feedback: `coach_notifications`, direct messages, support inbox
- Parent feedback: `safeguarding_notifications`, support inbox, parent-portal interactions
- Recruiting feedback: `scout_evaluations` free-text fields, support inbox
- Support tickets: existing support inbox
- Operational signals: Section D scoreboard breaches; Section C top-5 drop-off alerts

### Triage pipeline

```text
capture channel
   │
   ▼
triage owner (launch operations DRI)
   │
   ▼
severity rubric — three axes (NOT effort)
   • athlete impact   (how many, how much)
   • retention impact (does this break D1/D7/D30?)
   • trust impact     (does this break intelligence-delivery doctrine?)
   │
   ▼
RFL entry  (id, finding, severity, status, surface, harm)
   │
   ▼
Section F prioritization board
   │
   ▼
V1.x sprint OR V2 backlog
```

### Severity bands

- **P0** — launch-blocking experience or trust regression (e.g. RFL-053 class). Triggers immediate sprint.
- **P1** — disclosed launch debt that degrades retention or trust. Targeted in V1.x order per Section F.
- **P2** — polish / delight. Tracked, addressed in V2 or opportunistically.

### Cadence

- Daily: triage owner reviews capture-channel deltas + Section D scoreboard
- Weekly: full RFL review; re-rank Section F board
- Monthly: cohort-anchored threshold recalibration (Section D)

### Doctrinal anchor

Reality outranks doctrine framing. Per RW-1…RW-10 and the Eternal Laws, athlete-reported pain, parent-reported concern, and observed real-world failure events supersede inferred organism state. No external signal may author `organism_truth` / `athlete_intent` / `authority_override` / `hard_stop` / `rehabilitation_state`; signals enter as RFL entries, are interpreted, and are remedied through normal sprint authority.

---

## Section F — V1.x Prioritization Board

Every currently OPEN RFL re-ranked on the three axes from Section E. Ordered explicitly **not by implementation effort**.

### Scoring rubric

- Athlete impact: 3 = touches every athlete; 2 = touches a cohort; 1 = edge case
- Retention impact: 3 = breaks D1; 2 = breaks D7; 1 = breaks D30 or later
- Trust impact: 3 = violates EI-1 lineage doctrine on a primary surface; 2 = secondary; 1 = polish
- **Total score = sum.** Tie-break: trust impact, then retention impact.

### Immediate V1.x (score ≥ 7)

| Rank | RFL | Score (A/R/T) | Reason |
|---|---|---|---|
| 1 | RFL-055 | 3 / 2 / 3 = 8 | Recommendation surfaces lack inline `why` lineage — direct EI-1 violation on primary daily surface. |
| 2 | RFL-056 | 3 / 2 / 3 = 8 | MPI score rendered with no inline lineage — direct EI-1 violation on flagship trust surface. |
| 3 | RFL-052 | 3 / 3 / 1 = 7 | No weekly digest / "here's what you did" hook → direct D7 retention breaker. |
| 4 | RFL-044 | 3 / 2 / 2 = 7 | 9-modality overwhelm on cold start → Stage 5→6 drop-off (Top-5 #1). |

### Near-term V1.x (score 5–6)

| Rank | RFL | Score | Reason |
|---|---|---|---|
| 5 | RFL-048 | 2 / 2 / 2 = 6 | `/today` vs `/command` ambiguity (residual after RFL-053). |
| 6 | RFL-049 | 3 / 2 / 1 = 6 | Roadmap shows "what's next" but no trajectory delta. |
| 7 | RFL-045 | 3 / 1 / 2 = 6 | 15+ HIE cards on `ProgressDashboard` → cognitive overload. |
| 8 | RFL-037 | 2 / 2 / 2 = 6 | Empty/partial/stale states missing canonical triplet outside `HammerDailyPlan`. |
| 9 | RFL-041 | 2 / 1 / 2 = 5 | Engineering routes leak into athlete navigation. |
| 10 | RFL-038 | 2 / 1 / 2 = 5 | Returning-athlete staleness is invisible. |
| 11 | RFL-036 | 2 / 2 / 1 = 5 | Drill recommendations collapse across personas. |
| 12 | RFL-042 | 2 / 1 / 2 = 5 | Auth.tsx 4-table parallel query race-prone on slow networks. |
| 13 | RFL-046 | 2 / 1 / 2 = 5 | Paywall CTAs interleaved with performance surfaces. |

### V2 (score ≤ 4)

| RFL | Score | Reason |
|---|---|---|
| RFL-035 | 1 / 1 / 2 = 4 | HammerChat not envelope-grounded; architectural, latent risk. |
| RFL-039 | 1 / 1 / 2 = 4 | Pain → suppression latency (RR-6 spirit). |
| RFL-040 | 1 / 1 / 2 = 4 | RTP-authorization absence (RR-6 spirit). |
| RFL-043 | 1 / 1 / 1 = 3 | Parent-invite 200-row cap. |
| RFL-047 | 2 / 1 / 1 = 4 | "Tomorrow promise" hook absent. |
| RFL-050 | 1 / 1 / 1 = 3 | Streak display not on `/command`. |
| RFL-051 | 1 / 1 / 1 = 3 | No weekly summarization on recent events. |
| RFL-054 | 1 / 1 / 1 = 3 | `/digest`, `/forecast`, `/calendar`, `/cycle`, `/safety-center` not surfaced. |
| RFL-057 | 1 / 1 / 1 = 3 | No "first plan generated" celebration. |
| RFL-058 | 1 / 1 / 1 = 3 | No before/after surface after drill completion. |

### Re-evaluation triggers

Any RFL is automatically re-ranked when:
- A capture-channel signal (Section E) shows the harm is broader than estimated.
- A Section D scoreboard breach is causally linked to the RFL.
- A new RFL opens that compounds an existing one (then re-score both).

---

## Section G — Post-Ratification Verdict

The four leadership questions.

### Q1 — What metrics determine success?

Three primary metrics:
- **Activation rate** (Stage 1 → Stage 5 within 48h) — proves the organism is reachable.
- **D7 retention** — proves the organism is worth returning to.
- **Workout completion rate** — proves the organism translates into real-world athlete behavior.

If all three are in **Healthy** band for a 30-day cohort, V1 is succeeding by reality's measure.

### Q2 — What metrics indicate danger?

Any of:
- Activation rate **<40%** (Critical) — organism is not reachable; Section C Top-5 #1 is firing.
- D1 retention **<25%** (Critical) — first session was not worth returning to; trust or relevance failure.
- Recommendation engagement **<15%** (Critical) — intelligence delivery is not landing; EI-1 surface failure.
- Any single funnel stage with **>50% drop** in two consecutive cohorts — structural friction at that stage.
- Any Section D metric in **Warning** for two consecutive days, or **Critical** for one day.

### Q3 — What is the first thing leadership should check daily?

In order:
1. **Activation rate** for the prior 24h cohort (Section D, row 1).
2. **D1 retention** for the cohort that signed up 24–48h ago (Section D, row 3).
3. **Failure-event count** at the Section C Top-5 stages (Stage 5→6, 7→8, 8→9, 9→D7, D7→D30).
4. **RFL inbox**: any new capture-channel signals overnight (Section E).

A single dashboard view of these four data points constitutes the daily ritual.

### Q4 — What is the first thing leadership should fix if adoption stalls?

Walk Section C Top-5 in order. The first stage with a >50% drop is the fix target.

**Most likely first fix:** the onboarding → first-event gap (Stage 5→6 in Section C, RFL-044 in Section F). The remediation is hierarchy and pacing on `HammerDailyPlan` — surface the single "do this first" block before the other eight, and emit the missing "first plan generated" acknowledgement (RFL-057). This is the highest-leverage single change because it sits at the top of the funnel where loss compounds downstream.

**Second-most-likely first fix:** trust lineage on recommendation surfaces (RFL-055 + RFL-056). If Stage 7→8 is the failing stage, the fix is exposing inline `why` on drill / workout / video / MPI surfaces, in line with the EI-1 "lineage one interaction away" doctrine that `HammerDailyPlan` already satisfies.

---

## Exit criteria

- Launch visibility established (Sections A, B, C, D).
- Reality feedback path established (Section E).
- Open RFLs prioritized (Section F).
- Post-launch operating plan documented (Section G).

Release authorization (per `hammers-modality-v1-ratification.md`) is unaffected by this sprint. This document is the operating runbook leadership consults after launch.
