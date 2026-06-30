## Status of the 7 deferred audit items

| # | Slice | Item | Status |
|---|---|---|---|
| 1 | A | RLS sweep + GRANTs on `gp_*` tables | ✅ Shipped (migration applied) |
| 2 | A | Edge function heartbeats (`withHeartbeat`) | ✅ Shipped on `parse-season-schedule`, `gp-ingest-document`, `hammer-chat`; `analyze-video` already heartbeats |
| 3 | B | GP → Roadmap deltas | ✅ Shipped (`roadmapDeltas.ts`, `useRoadmapDeltas.ts`) |
| 4 | B | Side-context heatmaps in `GameReports.tsx` | ❌ Not done |
| 5 | C | Schedule importer UX (preview/skip/dupe/undo) | ❌ Not done |
| 6 | C | Onboarding `?resume=<stepId>` deep-link | ❌ Not done |
| 7 | C | Drift markers card | ✅ Shipped (`DriftMarkersCard` mounted in `ProgressLanding`) |

**Honest answer: No — 4 of 7 shipped, 3 still open** (#4 side heatmaps, #5 importer UX, #6 onboarding deep-link).

## Proposed plan to finish E2E

**#4 — Side-context heatmaps**
- Read active `SideContext` (L/R) in `GameReports.tsx`.
- Split spray/contact/pitch-location maps into hitter-side and pitcher-side panels; add a small toggle to view "All / L / R".
- Pure presentation — no schema changes.

**#5 — Schedule importer UX**
- Extend `SeasonScheduleImporterDialog` with a 2-step flow: (1) AI parse → preview table with per-row edit + skip toggle, (2) commit.
- Duplicate detection: query `gp_games` + `calendar_events` by `(date, opponent)` before commit; mark dupes with skip-default.
- Success summary with 24h undo (store last batch id in localStorage; "Undo last import" deletes batch).

**#6 — Onboarding deep-link**
- `OnboardingResumeBanner` reads `?resume=<stepId>` and jumps directly to that step.
- Update `UserMenu.tsx` "Setup" badge href + email/CTA links to include the unfinished step id (e.g. `?resume=injury`).
- Map: `injury`, `categoryGoals`, `review`, etc.

**Verification per item**
- #4: visual check in Game Reports with a switch-hitter game logged.
- #5: paste a sample schedule, confirm preview edits + dupe-skip + undo.
- #6: open `/onboarding?resume=injury` from a fresh tab, confirm jump.
- Re-run `bash scripts/preflight.sh` + `bunx tsgo --noEmit`.

### Out of scope
- No new tables.
- No changes to `gp_*` schema.
- Drift markers card stays read-only.

Approve and I'll ship #4 → #5 → #6 in that order.