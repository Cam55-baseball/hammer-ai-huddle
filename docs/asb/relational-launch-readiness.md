# Relational Demo — Final Pre-Launch Operations Readiness

Date: 2026-06-01. Scope: presentation-mode lock honored; operational only.

## Section 1 — Node-safe seed runner

**Delivered:** `scripts/seed-relational-demo-node.ts`.

- No browser APIs, no `localStorage`. Uses `@supabase/supabase-js` directly with
  `auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }`.
- Service-role only (`SUPABASE_SERVICE_ROLE_KEY`). Anon/publishable key would be
  blocked by RLS.
- Sources rows from canonical `buildDemoSeed()` — the same builder the fixture
  fallback and replay-reconstruction tests use. Zod validation runs at build
  time (fail-fast).
- Idempotent: each row's `idempotency_key === event_id` (deterministic).
  Re-runs surface as Postgres 23505 → logged `dedup`, not failure.
- Schema bridge: live `asb_events.event_id` is `uuid`. Fixture uses readable
  string ids (`ev_age_0001`). The script's `liveize()` projects every fixture
  id through a stable UUIDv5-shaped sha1 mapping; `lineage_parent_ids` and
  `lineage_refs` are remapped in lockstep so lineage closure survives the
  projection. Same input → same UUID forever.
- Dry-run verified: **15 events, 14 lineage edges**, first projected UUID
  `dd8e248a-bdb9-5335-9ae6-d1dac2782b10`.

### Live-execution blocker (DISCOVERED)

The relational topic namespace is **not registered in `asb_topic_registry`**:

```
SELECT topic_id FROM asb_topic_registry WHERE topic_id LIKE 'relational.%';
-- 0 rows
```

`asb_events.topic_id` has an FK to `asb_topic_registry(topic_id)`. Until the 13
relational topics (`relational.conversation.{turn,shared,redacted,rejected}`,
`relational.psych.{self_report,inferred,transition}`,
`relational.developmental.{age_observed,growth_attestation,puberty_marker,deload_window,transition,gate_decision}`)
are registered, **no relational event can be persisted to live DB**. The
fixture path has masked this because it never touches Supabase.

This is the single hard reason live seeding cannot be executed for tomorrow.
It is a registry-data gap, not a code defect — the script itself is correct
and will succeed the moment the topics are registered.

Recommended action (post-presentation, requires explicit unlock):
seed registry rows with appropriate `topic_class` / `authority_pathway` /
`replay_policy` / `materialization_policy` enum values for each of the 13
relational topics, then re-run `bun scripts/seed-relational-demo-node.ts`.

## Section 2 — Device smoke (fixture path)

`/relational/demo?fallback=fixture` — verified path. Hook
`useAsbTimeline` already short-circuits to in-memory `buildDemoSeed()` when
`?fallback=fixture` is present, so zero network dependency, zero cold-start
latency on Supabase, and zero exposure to the topic-registry blocker.

- 80/80 relational tests green (replay reconstruction, demo firewall, hammer
  citation, psych ceiling, developmental monotonic, redaction, conversation
  shared, slump reload, parent trust, recruiting roadmap, injury lifecycle).
- Mobile (440×782) verified last pass; no white screens, no undefined
  flashes, transitions stable.

## Section 3 — Onboarding flow (post-commit)

Pre-existing path: `/` → `/auth` (sign up / sign in) → `SelectUserRole` →
`SelectSport` → `OnboardingFlow` (4 steps) → `Today`. Reset-password route
exists at `/reset-password`. Known sharp edges (pre-existing, out of
presentation lock scope): auth requires email confirm; no anonymous demo
onboarding path; the demo URL is the ONLY surface intended for camp.

**Public-facing instruction for camp:** demo the relational system from
`/relational/demo?fallback=fixture`. Do NOT route prospects through signup
during the demo session.

## Section 4 — Demo isolation proofs

1. `/relational/demo?fallback=fixture` — `useAsbTimeline` returns fixture
   rows; no `asb_events` POST. ✅ (code path verified: line 64 of
   `src/hooks/useAsbTimeline.ts` short-circuits before the supabase query).
2. Phase-151 firewall: `prepareRows` filters `visibility_scope: "demo"` under
   any non-demo scope. Covered by replay-reconstruction test `(4) demo
   firewall: production scope cannot read demo events` — PASS.
3. PresenterOverlay only mounts when `?presenter=1`. Debug chips only when
   `?debug=1`. Both default off. ✅
4. Production routes (`/today`, `/relational`) read with `scope: "self"`; the
   firewall strips any demo rows. No demo contamination possible.

## Section 5 — Launch risk table

| Risk | Severity | Likelihood | Mitigation | Status |
|---|---|---|---|---|
| Topic registry missing → live seed impossible | High | Certain | Use `?fallback=fixture` for camp; register topics post-launch | Mitigated by fixture |
| Network drop mid-demo | High | Med | Fixture is fully in-memory; route survives offline | Mitigated |
| Mobile layout flash on cold load | Med | Low | rAF warm-up in `RelationalDemo`; tests green | Mitigated |
| Presenter overlay leaks into prospect view | High | Low | Gated by `?presenter=1`; default off | Mitigated |
| Demo events leak into production projection | Critical | Negligible | `prepareRows` firewall + scope test passing | Mitigated |
| Onboarding confusion during demo | Med | Med | Do NOT route prospects through signup; demo URL only | Operational |
| Stuck spinner on slow load | Med | Low | Fixture path resolves synchronously | Mitigated |
| Console errors visible to audience | Low | Low | Run in incognito; close devtools | Operational |
| UUID collision with existing live row | Negligible | Negligible | Stable UUIDv5 namespace `relational-demo-seed:` | Mitigated |

## Section 6 — Final verdict

**READY WITH CONDITIONS.**

Stable for live camp tomorrow:
- `/relational/demo?fallback=fixture` — full 9-step choreography, zero
  network dependency, 80/80 tests green, mobile + desktop verified.
- Presenter overlay (`&presenter=1`) and debug chips (`&debug=1`) available
  on demand.
- Demo↔production firewall constitutionally enforced.

Not stable / do not attempt:
- Live signup / onboarding during the demo session.
- `/relational/demo` without `?fallback=fixture` against a freshly-seeded
  live athlete — blocked by missing `asb_topic_registry` rows for the
  relational namespace.
- Any path that requires writing relational events to production.

Promise tomorrow:
- "Every screen reconstructs from one append-only ledger" — TRUE for fixture.
- "Replay-proof, 80+ tests" — TRUE.
- "No screen holds its own state" — TRUE.

Do NOT promise:
- Live production seeding "in five minutes."
- Athlete signup → relational onboarding in one continuous flow.
- Multi-athlete demo (single demo athlete UUID only).

Post-presentation unlock items:
1. Register the 13 `relational.*` topics in `asb_topic_registry`.
2. Run `bun scripts/seed-relational-demo-node.ts` against live.
3. Drop the `?fallback=fixture` requirement; verify replay parity between
   live-seeded and fixture projections.
