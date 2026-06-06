# Final Hostile Launch Forensic Audit — Plan

**Nature:** Read-only forensic verification. No code changes, no schema changes, no doctrine work, no optimization. Output is **evidence-backed documentation** plus two new ratification artifacts. Trust nothing prior — re-verify against the codebase and database.

## Method

For every section (A–I), the audit will:
1. **Re-derive evidence directly** from `src/`, `supabase/`, `docs/asb/*`, and live DB queries (`asb_events`, `asb_event_lineage`, `user_roles`, `parent_athlete_links`, `safeguarding_notifications`, `foundation_*`, `drill_*`, RLS policies via `supabase--linter` + `pg_policies`).
2. **Attempt to disprove** the prior PASS verdicts before confirming them.
3. Record **PASS / FAIL / BLOCKED** with file:line or `event_id` / policy-name evidence — never narrative.
4. Any finding that cannot be evidenced is recorded as **UNVERIFIED** (not PASS).

## Investigation passes (parallelized)

| Pass | Sources interrogated | Disproof attempted |
|---|---|---|
| **A. Organism authority** | `src/lib/asb/emit.ts`, `emitRuntimeEvent.ts`, `overrideAuthority.ts`, all `supabase.from(...).insert/update` sites for organism-truth tables, RLS on `asb_events` / `asb_authority_overrides` / `asb_state_snapshots` | grep for non-ASB writers to organism-truth tables; UI components mutating state without lineage; bypass of `emitAuthorizedRuntimeEvent` |
| **B. Orphan intelligence** | UHRC, Hammer brief, AsbTimeline, AthleteDigest, PieV2, Foundations, recommendation surfaces — match each producer → persistence → consumer → display → observability topic | any output produced but never read; any reducer with no UI; any UI with no reducer |
| **C. Orphan signals** | Every `asb_topic_registry` entry + every `emitObservability` / `emitAsbEvent` call site → trace to a reducer in `src/lib/observability/*` and a consumer | topics emitted but never reduced; signals captured but unobservable |
| **D. Authority boundary attack** | `roleMatrix.ts`, `requireRole.tsx`, `overrideAuthority.ts`, RLS policies on parent/recruiter/coach/minor surfaces, `RecruitingVisibilityGate`, `resolve_recruiting_visibility`, demo↔prod firewall in `prepareRows` | simulate each override class against RLS + governance wrapper; check cache/replay/stale-projection/visibility-scope attacks |
| **E. Observability forensics** | `funnels.ts`, `intelligenceUtilization.ts`, `recommendationFunnel.ts`, `safeguarding.ts` reducers vs. registry vs. instrumentation sites | producer with no consumer; consumer with no producer; blind spot per critical behavior |
| **F. Production journey audit** | Trace 10 journeys via code paths only (athlete/parent/coach/recruiter/pitcher/hitter/safeguarding/recruiting/recommendation/drill completion) — confirm zero manual ops outside the already-documented scout-application review | any path requiring undocumented operator action |
| **G. Technical debt** | grep TODO/FIXME/HACK/XXX/deferred; `.lovable/backlog.md`; deprecated functions (e.g. table-derived recommendation fallback, foundation video terminal-watch gap) | classify each: launch-blocking YES/NO |

## Deliverables (only two new files)

1. **`docs/asb/final-launch-risk-register.md`** — table of every remaining risk with probability (L/M/H), impact (L/M/H), mitigation, owner, launch-blocking? Plus invariant-violation watchlist.
2. **`docs/asb/final-public-release-ratification.md`** — sectioned PASS/FAIL verdict mirroring Sections A–I with evidence citations, final public-launch readiness %, GO/NO-GO, and the next highest-value post-launch activity derived from evidence (not assumption).

No other files will be created or edited. The existing `reality-feedback-ledger.md` will only be updated if the audit uncovers a new gap requiring an RFL row — and only then.

## Exit criteria

The sprint exits only when:
- Every Section A–G claim carries file:line / policy-name / `event_id` evidence or is marked UNVERIFIED.
- Every authority-attack vector in Section D has a BLOCKED verdict with the blocking mechanism named.
- The risk register enumerates every residual risk, including those rated low.
- The ratification states GO or NO-GO with the evidence chain. If any UNVERIFIED items remain in a launch-critical path, verdict defaults to **NO-GO**.
- Recommended post-launch activity is derived from the highest-severity register row or the highest-severity observability gap — never from assumption.

## Out of scope

Any code change, schema migration, RLS edit, doctrine extension, scoring change, intelligence change, UI change, or "optimization." If the audit finds a defect, it is **reported** in the risk register and ratification — not fixed in this sprint.
