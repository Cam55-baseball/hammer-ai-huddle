# Current focus

**Sprint complete (2026-06-06):** Athlete Context Spine Constitution.

Ratified deliverables:
- `docs/asb/athlete-context-spine-constitution.md` — 17 profile groups, six lifecycle bands, equipment scopes, speed model, longitudinal adaptation, propagation map, completeness tiers.
- `docs/asb/athlete-context-spine-gap-analysis.md` — per-variable status + hostile disproof of "no spine needed" premise.
- `docs/asb/reality-feedback-ledger.md` — RFL-026, RFL-027, RFL-028 opened.

## Next sprint (implementation, P0-1 — NOT YET STARTED)

Construct the Minimum Context Set persistence + projection layer per Section H of the constitution. Order:

1. Minimum Context Set persistence (9 columns or `hammer_athlete_context` table + GRANTs + RLS + onboarding write path).
2. Equipment scope model (persistent + session + temporary + inferred with precedence resolver).
3. Lifecycle band projection from DOB.
4. Speed Profile projection — light the first dark table.
5. Workload + ACWR projection from `athlete_load_tracking`.
6. Context envelope accessor.

Awaiting authorization before implementation.
