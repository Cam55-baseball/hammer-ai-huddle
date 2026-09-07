# Softball pre-launch lock report

Date: 2026-09-07
Scope: hide or withhold every softball surface that would hand an athlete a
baseball answer. Owner and admin accounts are unaffected everywhere.

## Why this exists

The softball side was built on the baseball spine. Several surfaces run on
baseball catalogs, baseball anchors, or a baseball delivery model. Left open,
they do not look unfinished — they look confidently wrong. Holding them back is
the honest state until softball gets its own content pass.

## Findings

| Surface | What is actually wrong | Decision |
| --- | --- | --- |
| Defensive drill library (`/drill-library`) | 14 softball drills against 168 baseball drills; most positions have no coverage at all | Locked |
| Tex Vision (`/tex-vision`) | Pitch-recognition drills are seeded from baseball pitch types and baseball release timing; a windmill release is a different look entirely | Locked |
| PIE v2 pitching intelligence (coach panel, hammer brief, recruiting card) | Signal catalog, drill catalog and video catalog are all overhand-model; softball fastpitch mechanics are not represented | Hidden for softball |
| Base stealing trainer (`/base-stealing`) | Baseball lead-off and pickoff model; softball has no lead-off. A softball-specific trainer exists at `/softball-stealing` and stays open | Locked (softball trainer remains) |
| Pick-off trainer (`/pickoff-trainer`) | Same reason — the read does not exist in fastpitch | Locked |
| Throw-velocity, pop-time, home-to-first and beaten-runner grades | `scale_reference` holds baseball scouting anchors only; a softball athlete was being scored on the wrong sport's 20–80 scale | Grade withheld, raw number kept |
| Org standards / recruiting standards | Criteria library is baseball-shaped | Already owner/admin only via `StaffOnlyRoute` — no change needed |

## What a softball athlete sees now

- Locked routes render a coming-soon screen naming the feature and saying
  plainly that we would rather hold it back than give a baseball answer.
- The matching sidebar entries are gone, so nothing dead-ends.
- Measurement pages still record and display the raw number with the line
  "Softball benchmarks are still being built — your raw number is saved, but it
  isn't graded yet."

## What still works on softball

Softball stealing trainer, hitting, lifting and the whole WIC lifting engine,
nutrition, hydration, mind fuel, calendar, games, video, vault, recruiting
profile, and every measurement log (values save; only the grade is withheld).

## Unlock conditions

Each entry in `src/lib/softball/lockedFeatures.ts` carries its own
`unlockCriteria`. In short:

- Drill library: softball drill coverage at parity for every position.
- Tex Vision: fastpitch pitch-type and release-timing set seeded.
- PIE v2: a fastpitch signal model, not a re-labelled overhand one.
- Base stealing / pickoff: fastpitch-correct read, or permanent retirement in
  favour of `/softball-stealing`.
- Grades: softball anchors seeded into `scale_reference`, sport-filtered.

## Implementation

- Registry: `src/lib/softball/lockedFeatures.ts`
- Gate: `src/components/softball/SoftballLock.tsx` (`SoftballLock`, `useSoftballLocked`)
- Screen: `src/pages/SoftballComingSoon.tsx`
- Note: `src/components/softball/SoftballBenchmarkNote.tsx`
- Benchmark fetch is skipped for softball in `useCatchingReps`,
  `useThrowingReps`, `useBaserunningSplits`, `useDefensivePlays`; grade helpers
  already return `null` on empty rows, so no grade logic changed.
