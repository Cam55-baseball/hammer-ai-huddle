## Deferred Audit Items — Execution Plan

Shipping the 7 deferred items from the part-2 audit in dependency order. Each slice is independent and shippable.

### Slice A — Backend hardening (data integrity first)

**1. RLS sweep on `gp_*` tables**
- Audit policies on `gp_games`, `gp_at_bats`, `gp_pitches`, `gp_defense_plays`, `gp_baserun_events`, `gp_subs`, `gp_documents`, `gp_opponent_hitters`, `gp_pitcher_dossiers` (each currently shows 1 policy — likely permissive or missing per-action coverage).
- Ensure every table has: owner-scoped SELECT/INSERT/UPDATE/DELETE via `auth.uid() = user_id`, plus `service_role` ALL, plus GRANTs.
- Single migration, additive policies only (no destructive drops unless a policy is plainly wrong).

**2. Edge function heartbeats**
- Add heartbeat emission to long-running edge functions (video analysis, schedule importer, scorebook ingest, ask-hammer) so the client's stale-chunk / timeout guards have a signal source.
- Standardize via a tiny `withHeartbeat()` helper in each function; client `useHeartbeat` already exists from prior analysis fix.

### Slice B — Intelligence wiring

**3. GP → Roadmap deltas**
- `useRoadmapProgress.ts` already consumes `gpSignal`. Add explicit delta surfacing: when a game logs reveal a new weakness (e.g., breaking-ball whiff rate ↑, pop-time ↓), emit a roadmap milestone delta visible in The General + Hammer Daily Plan "Why today" line.
- New: `src/lib/gp/roadmapDeltas.ts` + integration into `dailyPlan.ts` reasoning trace.

**4. Side-context heatmaps**
- Extend `GameReports.tsx` heat maps to honor the active `SideContext` (L/R) — split spray/contact/pitch-location maps by hitter side and pitcher side.
- Pure presentation change to existing heatmap component.

### Slice C — UX polish

**5. Schedule importer UX**
- `SeasonScheduleImporterDialog`: add (a) preview-before-commit step showing parsed events with edit-in-place, (b) per-row skip toggle, (c) duplicate detection against existing `gp_games` + `calendar_events`, (d) success summary with undo (24h).

**6. Onboarding deep-link**
- `OnboardingResumeBanner` already exists. Add `?resume=<stepId>` deep-link support so emails / "Setup" badge can jump straight to the unfinished step (Injury, CategoryGoals, Review, etc.).
- Wire into `UserMenu.tsx` Setup badge and the resume banner CTA.

**7. Drift markers**
- Surface "drift markers" in The General: visible flags when a user's logged reality (gp signals, side differential, injury status) diverges from their stated goals/onboarding answers — with a one-tap "reconcile" that opens the relevant editor.
- New: `src/lib/general/driftMarkers.ts` + `DriftMarkersCard.tsx` rendered in `ProgressLanding.tsx`.

### Order of shipment

1. Slice A (#1 RLS migration → #2 heartbeats) — foundational, isolated
2. Slice B (#3 deltas → #4 side heatmaps) — depends on stable data layer
3. Slice C (#5 importer → #6 deep-link → #7 drift) — pure UX, ships last

### Out of scope

- No schema changes beyond RLS adjustments unless a column is plainly missing.
- No new tables.
- Drift markers are read-only signals — no auto-mutation of user data.

Approve and I'll start with Slice A (RLS migration first, since it requires user approval before code can land on it).
