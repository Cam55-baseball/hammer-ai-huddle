
# Athlete Context Spine Constitution — Plan

Constitutional architecture sprint. **No code, schema, UI, prompt, workout, or recommendation changes.** Three markdown deliverables only.

## Audit inputs (read-only)

- `src/lib/hammer/context/athleteContext.ts`, `src/lib/hammer/onboarding/knowledgeGaps.ts`
- `src/lib/runtime/projections/developmentalState.ts`, `src/lib/runtime/relational/developmentalGates.ts`
- `src/hooks/useUserProfile.ts` + live `profiles` column inventory (58 cols)
- Domain tables: `athlete_load_tracking`, `sprint_analyses`, `speed_sessions`, `physio_health_profiles`, `performance_sessions`, `hammer_state_snapshots`, `athlete_professional_status`, `athlete_foundation_state`
- Prior audits: `athlete-development-intelligence-audit.md`, `athlete-development-intelligence-roadmap.md`, `coach-intelligence-audit.md`, `life-context-audit.md`
- Relational doctrine: `rr-6-injury-recovery-constitution.md`, `rr-7-career-arc-constitution.md`, `rr-8-life-context-constitution.md`

## Deliverable 1 — `docs/asb/athlete-context-spine-constitution.md`

Sections A–I exactly per brief.

- **Section A — Canonical Context Model:** all 17 profile groups (Core Identity → Lifecycle). Each variable gets a row: `name | authority owner | update source | confidence source | missingness behavior | downstream consumers`. Owners drawn from existing authority hierarchy (athlete self-report, clinician, sensor, coach, derived projection, system-of-record).
- **Section B — Development History:** lifting age, training age, detraining, injury interruptions, sport transitions, coaching changes, growth spurts, milestones. Each defined as either event-sourced (asb_events lineage) or state-projected.
- **Section C — Lifecycle Intelligence:** maps the six age bands to existing `DEVELOPMENTAL_STAGES` (Phase 154 matrix). Defines required context, adaptation priorities, decision variables, training implications per band — declarative, no programs.
- **Section D — Equipment & Environment:** canonical enums for venue (`commercial_gym | home_gym | bands | bodyweight | travel | hotel | field_only`) and seasonal availability. Splits into persistent / session-specific / temporary / conversation-derived layers with TTL and override precedence.
- **Section E — Speed Intelligence:** acceleration, top speed, stride, force, asymmetry, start, adaptation history. Each mapped to source table (`sprint_analyses`, `speed_sessions`) and consumer surfaces.
- **Section F — Longitudinal Adaptation:** remember / forget / decay / accumulate / re-evaluate rules per variable class. Defines decay half-lives and re-evaluation triggers constitutionally.
- **Section G — Propagation Map:** ASCII matrix `variable → collection → storage → update path → Hammer / workouts / speed / roadmap / recommendations / reports / adaptation engine`.
- **Section H — Completeness Targets:** Minimum / Recommended / Elite context sets with estimated intelligence ceilings (e.g. 35% / 70% / 95%).
- **Section I — Ratification:** answers all 8 mandated questions.

## Deliverable 2 — `docs/asb/athlete-context-spine-gap-analysis.md`

- Per-variable status: `present | partial | missing | dark` (dark = captured, never projected).
- Tables affected vs. tables required.
- Hostile disproof attempt: try to build elite individualization purely from current `profiles` + Hammer context, document where it collapses.
- Cross-reference RFL-023/024/025 from prior sprint.

## Deliverable 3 — `docs/asb/reality-feedback-ledger.md` (append)

- **RFL-026** — Context spine constitutionally undefined prior to this sprint.
- **RFL-027** — Equipment/environment has no canonical enum or persistence model.
- **RFL-028** — Longitudinal adaptation rules (decay/re-evaluation) constitutionally undefined.

## Exit criteria

Spine + propagation + lifecycle + equipment + speed + longitudinal defined. Gap analysis complete. Zero implementation. `.lovable/plan.md` updated to point at the next sprint (spine implementation P0-1).
