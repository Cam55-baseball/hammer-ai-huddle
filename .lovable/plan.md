
# Athlete Development Intelligence Architecture Audit & Constitution

Constitutional audit sprint. **No code, no UI, no schema changes, no recommendations.** Three documents produced. All claims sourced from live `profiles` columns, `asb_topic_registry`, `asb_events`, and existing `src/lib/**` / `src/data/**` modules. Subordinate to Eternal Laws, RR-1…RR-10, RW-1…RW-10, EI-1…EI-10, and all sealed phases. Hammer remains interpretive — audit may never author `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, `rehabilitation_state`.

## Method

1. Query live DB for `profiles` columns, `asb_topic_registry` entries, recent `asb_events` topics, and any athlete-context tables (`athlete_*`, `hammer_state_snapshots`, `user_engine_profile`, `physio_*`, `training_*`, `speed_*`, `sprint_analyses`, `running_*`, `block_*`, `performance_sessions`, `athlete_load_tracking`, `hie_snapshots`, `mpi_scores`).
2. Read `src/lib/hammer/context/athleteContext.ts`, `src/lib/hammer/prescription/dailyPlan.ts`, `src/lib/hammer/onboarding/knowledgeGaps.ts`, `src/lib/runtime/projections/developmentalState.ts`, `src/lib/runtime/modulators/**`, `src/lib/pieV2/**`, `src/lib/engine/EngineInputContractV2.ts`, `src/data/ENGINE_CONTRACT.ts`, `src/data/fatigueThresholds.ts`, `src/data/ageCurves.ts`, sport-specific data dirs, `useUserProfile`, `useSportConfig`.
3. For each Section A–I domain: record present / partial / absent, source, authority owner, confidence, update path, accessibility to Hammer / workouts / roadmap / recommendation surfaces.
4. Attempt hostile generation of a six-week plan in prose (Section H) using only currently available context — list every assumption made.
5. Compute per-domain completeness % as `(verifiable_fields_with_active_update_path / required_fields_for_elite_individualization)`. Overall = unweighted mean across J's nine sub-scores (declared, not invented).
6. Classify gaps P0/P1/P2 in the roadmap. No solutions designed.

## Deliverables

- `docs/asb/athlete-development-intelligence-audit.md` — Sections A–J with evidence tables and completeness scores.
- `docs/asb/athlete-development-intelligence-roadmap.md` — Section K gap classification (P0/P1/P2) only.
- `docs/asb/reality-feedback-ledger.md` — append RFL-023 (audit opened), RFL-024 (completeness verdict), RFL-025 (P0 gap inventory).

## Out of scope

New tables, new columns, new topics, new surfaces, new prompts, new workouts, new recommendation logic, design changes, prescription algorithm changes, any modification to `engineVersion` / `reasoningVersion` pins. All identified gaps become roadmap items only.

## Exit criteria

All ten domains (A–J) have evidence-backed completeness scores; overall athlete-development intelligence % is published; P0/P1/P2 roadmap is classified; three docs committed; RFL entries closed.
