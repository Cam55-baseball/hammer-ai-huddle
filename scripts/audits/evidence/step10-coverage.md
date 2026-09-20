# Step 10 — coverage table (item 3)

642 cells = 17 roles × their legal phases × 2 age bands × 3 equipment tiers.
A cell is a gap when fewer than 3 legal options exist. Counts come from
`scripts/audits/coverage-matrix.ts` run against the live catalog
(974 rows: 785 active, 189 inactive).

| | gaps | filled cells |
|---|---|---|
| Today (active rows only) | **163** | 479 |
| After the 48 new rows are approved | **38** | 604 |

125 of the 163 gaps close the moment the owner approves the new rows.

## The 38 that stay open — and why

| role | age band | tier | cells | why it is not filled |
|---|---|---|---|---|
| heavy_triples_main | 13–15 | none / minimal / full_gym | 7 / 7 / 4 | heavy triples are 16+ by law; nothing may be written for 13–15 |
| heavy_triples_main | 16+ | none / minimal | 1 / 1 | a heavy triple needs a barbell — impossible without one |
| jump_tier3 (depth jumps) | 13–15 | none / minimal / full_gym | 2 / 2 / 2 | depth jumps are 16+ by law |
| jump_tier3 | 16+ | none | 2 | a depth jump needs a box |
| sled_tools | 13–15 / 16+ | none | 7 / 1 | a sled is the equipment; there is no sled-free sled |
| banded_velocity | 13–15 / 16+ | none | 1 / 1 | banded speed work needs bands |

Every remaining gap is either an age law (never loosened) or an
equipment impossibility. None was closed by lowering a minimum age or widening
legality.
