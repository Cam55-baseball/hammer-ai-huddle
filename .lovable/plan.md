
# Canonical Event Emission & Observability Closure Sprint

**Posture:** Instrumentation-only. Additive emission via existing `emitAsbEvent` / `buildAsbRow` / `computeIdempotencyKey` fabric. Zero new doctrine, no new storage, no scoring change, no UI redesign — only emission hooks at well-defined producer sites and reducer extensions to consume them. All seven new topics ride `asb_events` with deterministic idempotency keys (refresh-safe, replay-safe).

## Constitutional bounds

- Subordinate to all prior sealed phases. Topics are interpretive observability events — they NEVER author `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state`.
- Idempotency: every topic uses `computeIdempotencyKey(athlete_id, topic, occurred_at, payload)` with `occurred_at` bucketed where needed (per-day for signup/onboarding/coach/recruiter/intel views) so refresh and multi-device do not double-count.
- `engine_version` pinned via `ENGINE_VERSION` (`asb-1.0.0`). No schema migration. No new tables.

## New canonical topics (7)

| Topic | Producer site | Bucket / dedupe | Actor |
|---|---|---|---|
| `athlete.lifecycle.signup` | `src/contexts/AuthContext.tsx` — first `SIGNED_IN` after `signUp`, gated by one-shot per `user.id` | per `user.id` (lifetime) | athlete |
| `athlete.onboarding.completed` | `src/pages/start-here/StartHereRunner.tsx` final terminal step handler | per `athlete_id` (lifetime) | athlete |
| `intelligence.uhrc.viewed` | UHRC surface mount (`src/lib/uhrc/*` consumer page — most likely `AthleteCommand.tsx` UHRC panel or dedicated UHRC route) | per `athlete_id` + day bucket | athlete |
| `intelligence.hammer.viewed` | Hammer surface mount (consumer of `src/lib/hammer/identity.ts`) | per `athlete_id` + day bucket | athlete |
| `coach.review.opened` | `src/pages/CoachAthleteDetail.tsx` mount | per `coach_id` + `athlete_id` + day bucket | coach |
| `recruiter.review.opened` | Recruiter athlete-detail page mount (scout review surface) | per `recruiter_id` + `athlete_id` + day bucket | org |
| `intelligence.trend.viewed` | `src/pages/AsbTimeline.tsx` + `src/pages/AthleteDigest.tsx` mount | per `athlete_id` + day bucket | athlete |

Each emission goes through a thin `useEmitOnce(topic, key, payload)` hook (new file `src/hooks/useEmitObservability.ts`) that:
1. Computes the dedupe key client-side and guards re-emission within the session via `sessionStorage`.
2. Calls `emitAsbEvent(buildClientRow(...))` — server-side `idempotency_key` UNIQUE constraint provides the canonical dedupe guarantee.
3. Never throws, never blocks render.

## Reducer extensions (consumption)

- `src/lib/observability/funnels.ts` — wire `athlete.lifecycle.signup` and `athlete.onboarding.completed` into the Athlete funnel stages; wire `coach.review.opened` and `recruiter.review.opened` into Coach / Recruiter funnels.
- `src/lib/observability/intelligenceUtilization.ts` — replace `topic: null` for `uhrc`, `hammer`, `trends`, `coach_intelligence` (and recruiting where appropriate) with the new canonical topics; remove the `unobservable: true` branch for those surfaces.
- `recommendationFunnel.ts` and `safeguarding.ts` — no change (out of scope for this sprint; their gaps are RFL-008…RFL-010).

## Documentation deliverables

1. `docs/asb/canonical-event-governance.md` — Canonical Event Registry v1: topic | producer file:line | consumer | payload schema | lineage path | replay status | versioning.
2. `docs/asb/observability-consumption-audit.md` — every new topic → reducer consumption proof table.
3. `docs/asb/event-replay-ratification.md` — per-topic PASS/FAIL on replay-safe, idempotent, refresh-safe, multi-device-safe, versioned, lineage-preserved.
4. `docs/asb/observability-completeness-ratification.md` — coverage matrix for all 16 critical behaviors, completeness %, orphan check.
5. `docs/asb/reality-feedback-ledger.md` — update RFL-001…RFL-007 status column to `CLOSED` with evidence pointers (file:line + topic). No new rows unless discovered.

## Verification (evidence the sprint produces)

For each topic: (a) producer `file:line`, (b) one sample `asb_events` row queried via psql, (c) reducer-output snippet showing the topic incrementing a counter, (d) refresh test (re-mount yields dedupe via 23505).

## Out of scope (explicit)

- RFL-008 (drill assignment/completion topics), RFL-009 (recommendation lifecycle topics), RFL-010 (coach ack topic) — deferred to the recommendation-instrumentation sprint.
- No changes to migrations, RLS, edge functions, `client.ts`, `types.ts`, intelligence engines, recommendation logic, UI styling, or routing.

## Technical notes

- Producer sites for UHRC / Hammer / Recruiter detail need to be located by `code--view` during build (likely `AthleteCommand.tsx`, a Hammer page under `src/pages/`, and a scout/recruiter detail page). If a surface has multiple mount sites, emission attaches to the canonical container component, not each child.
- All emissions use `actor_role` matching the user's role; `actor_id` set to the auth user id; `athlete_id` is the athlete being viewed (for coach/recruiter topics) or the actor themselves (for athlete topics).
- Day-bucket `occurred_at`: floor to UTC midnight in payload `bucket_day` (string) so the idempotency hash collapses same-day re-views to one canonical event while preserving real-time `occurred_at` on the row.

## Final return at sprint exit

Canonical Event Registry, closed-gap report (RFL-001…RFL-007 CLOSED with evidence), consumption audit, replay ratification, observability completeness %, and recommended next optimization sprint chosen from the highest-severity remaining ledger row (expected: RFL-009 recommendation lifecycle instrumentation, pending real Day-1 data).
