
## Goal
Run an end-to-end audit of the entire app and ship a remediation pass so every surface is bug-free, drift-free, fragment-free, deeply personalized to the signed-in user, and fully connected across modules. Output is a clean app + an audit report the user can re-run.

## Scope (every facet)
- **Auth & session**: AuthContext, useOptionalAuth, protected routes, sign-in/up, password reset, eviction-on-focus, OAuth callbacks.
- **Onboarding**: 5-category goals (V2), discipline trees (pitcher/softball/two-way), Save & Exit, Review/Edit, resume banner, injury intake.
- **Hammer Modality**: Daily Plan, Answer-Hammer, Add-to-Gameplan, schedule-aware modulation, GP-bias badge.
- **Calendar & Schedule**: CalendarView render-loop guard, day sheet, importer (text + image), Season Dates editor, cancel/reschedule.
- **Game Performance (gp_\*)**: Game Day Mode, AtBat/Pitch/Defense/Baserun/Sub loggers, undo toasts, scorebook ingest, useGpSignal → dailyPlan + roadmap.
- **Video Analysis**: preflight (probeVideoMetadata), heartbeat, AnalysisProgressIndicator, side-aware uploads, vault filtering.
- **Side Context (L/R)**: switch hitters/throwers differential everywhere reads/writes occur.
- **Competition Level**: unified picker on every collection point.
- **Game IQ 101**: diamond render, role shifts, offense/softball coverage, quiz feedback (verdict, why-wrong, why-right, roster).
- **The General (Progress)**: topic panels, correlations, GP summary, IQ insight, side splits, Ask Hammer.
- **Sport split**: every (SB)-only item gated out of baseball; every baseball-only item gated out of softball.
- **Infrastructure**: lazyWithRetry on every dynamic import, ServiceWorker chunk policy, AuthContext import canonicalization, global error boundaries.
- **Cloud/DB**: RLS + GRANTs on every public table, role separation via has_role, no nullable user_id on RLS-keyed tables, edge function timeouts/heartbeats.

## Audit method (Waves)
Each wave is a single pass with a checklist; findings become commits.

```text
W0  Repo health scan       grep/rg drift markers, dead routes, dupes
W1  Auth & route guards    follow every <Route>, every useAuth/useOptionalAuth
W2  Cross-module wiring    AppSidebar ↔ App.tsx ↔ pages ↔ contexts
W3  Personalization seams  every read must filter by user_id + side + sport + level
W4  Schedule/Plan coupling gpSignal + scheduleContext into dailyPlan + roadmap
W5  Loggers + Undo parity  AtBat/Pitch/Defense/Baserun/Sub identical UX shape
W6  IQ 101 content audit   sport gating, primary_path on every situation, feedback completeness
W7  Video pipeline         preflight → upload → heartbeat → indicator → side-aware vault
W8  Backend (Cloud)        RLS+GRANT linter pass on all public.* + user_roles integrity
W9  Build/runtime hygiene  lazyWithRetry coverage, SW caching, global error listeners
W10 Eternity guards        scripts/preflight.sh + ledger tests + drift-marker grep in CI script
```

### Drift markers grepped
`TODO|FIXME|HACK|stub|placeholder|legacy|deprecated|"Progress Dashboard"|games\.team_name|console\.error\(.*ignored`, plus AuthContext import variants, duplicate route paths, and orphaned lazy imports.

### Personalization checklist (per surface)
1. Reads scoped to `auth.uid()` via RLS.
2. Hammer prescriptions consume: goals (V2), sport, discipline (pitcher/two-way), competition level, side context, gpSignal, scheduleContext, injury state.
3. Writes always carry `user_id` (non-null) and respect side context where applicable.
4. UI labels reflect sport (baseball vs softball), not generic copy.
5. Resume points (onboarding, daily plan, IQ progress) survive reload.

### Connectivity checklist (cross-module)
- Onboarding goals → dailyPlan ordering → roadmap weighting → The General topic ranking.
- Schedule events → scheduleContext → dailyPlan modulation → calendar render.
- Game logs → gpSignal → dailyPlan bias + roadmap unlocks + The General GP card.
- IQ attempts → IQ insight card on The General + Hammer "Game IQ" block.
- Video analyses → vault + side-differential + Hammer skill blocks.

## Deliverables
1. **Audit report** at `docs/audits/full-app-audit-2026-06-30.md`: findings table (severity / module / file:line / fix) + drift-marker grep output + RLS/GRANT linter results.
2. **Fix commits** organized by wave; each fix references the report row.
3. **Eternity guards** added to `scripts/preflight.sh`:
   - drift-marker grep that fails on new occurrences,
   - lazyWithRetry coverage check (no raw `lazy(() => import(`),
   - AuthContext canonical-import check,
   - RLS-without-GRANT check via supabase linter snapshot,
   - duplicate-route check in App.tsx,
   - "Progress Dashboard" string check (must be "The General").
4. **Verification**: `tsgo` typecheck, `vitest run`, `scripts/preflight.sh`, Playwright smoke (sign-in → onboarding resume → daily plan → calendar day → IQ quiz → video upload preflight → game log → The General topic open) with screenshots in `/tmp/browser/audit/`.

## What stays untouched
- File renames (component identifiers, hooks, comments) — internal stability.
- Route paths (`/progress`, `/games`, etc.) — deep links preserved.
- DB column renames — additive only; new columns + backfills only if a fix demands it.
- Visual redesigns — copy/wiring only unless a fix requires UI change.

## Out-of-scope (call out, don't ship)
Any finding that would require a destructive migration, schema rename, or a new product surface will be listed in the report as **Deferred** with rationale, not silently changed.

## Estimated size
~15–25 surgical fixes across ~30–50 files plus the audit doc and preflight additions. No new tables. No new routes.
