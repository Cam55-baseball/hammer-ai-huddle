# Plan — Hammers Modality

## Current status (2026-06-07, post Final Production Release Verification)

**Launch verdict: RELEASE AUTHORIZED** — Hammers Modality V1 is ratified for public athlete use.

See:
- `docs/asb/final-production-release-verification.md` — disproof attempt + verdict
- `docs/asb/hammers-modality-v1-ratification.md` — V1 ratification, constitutional completion, V2 inventory

### Closed P0 blockers
- RFL-032 (onboarding bypass) — `Auth.tsx` ledger-truth gate
- RFL-033 (`compute-hammer-state` boot failure) — `_shared/seasonPhase.ts` dedupe
- RFL-034 (minor-athlete supremacy) — `decisionFilters.ts` + `dailyPlan.ts`
- RFL-053 (athlete-home duality) — `/command` is single canonical home

### Canonical surfaces
- Athlete home: **`/command`** (`src/pages/AthleteCommand.tsx`)
- Module catalog: `/dashboard` (non-authoritative)
- Onboarding: `/onboarding/athlete`

## Accepted launch debt (disclosed)

**V1.x (next sprints):** RFL-036, 037, 038, 041, 042, 044, 045, 048, 049, 052, 054, 055, 056.
**V2:** RFL-035, 039, 040, 043, 046, 047, 050, 051, 057, 058.

Full table in `docs/asb/final-production-release-verification.md` §G.

## V2 workstreams (post-launch)

1. `/today` deprecation into `/command` (RFL-048)
2. Trust-lineage expansion on recommendation surfaces (RFL-055/056/038)
3. Retention hooks D7/D30 (RFL-052/057/058)
4. Daily-plan & progress hierarchy/density polish (RFL-036/037/044/045)
5. RR-5…RR-10 implementation per `post-mastery-expansion-roadmap.md`
6. Commercial/operational layer (RFL-046/043)
7. Intelligence deepening (RFL-035/039/040)
8. Routing cleanup (RFL-041/054)
