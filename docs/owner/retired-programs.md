# Retired programs (owner-approved 2026-10-08)

Heat Factory, Iron Bambino, The Unicorn, Speed Lab and Explosive Conditioning are retired. Hammers Today replaces them. Nothing was deleted.

## Where everything is kept
| Program | Old address | Archived page |
|---|---|---|
| Heat Factory | /production-studio | src/archive/retired-programs/pages/ProductionStudio.tsx.archived |
| Iron Bambino | /production-lab | src/archive/retired-programs/pages/ProductionLab.tsx.archived |
| The Unicorn | /the-unicorn | src/archive/retired-programs/pages/TheUnicorn.tsx.archived |
| Speed Lab | /speed-lab | src/archive/retired-programs/pages/SpeedLab.tsx.archived |
| Explosive Conditioning | /explosive-conditioning | src/archive/retired-programs/pages/ExplosiveConditioning.tsx.archived |

- Program content (src/data/*Program.ts), components and translations are untouched in place.
- Data: original tables (speed_sessions, speed_goals, speed_partner_timings, sub_module_progress, training_blocks, block_workouts, block_exercises, block_workout_metrics, user_blocks, workout_blocks) are untouched, plus the read-only copies `_archive_*_20261007`.
- Finished program sessions still count toward rest rules (external-training days in `_shared/wic/schedule/externalTraining.ts` read history unchanged).
- Subscriptions and entitlements are unchanged (`src/constants/entitlements.ts`, `src/utils/tierAccess.ts`).

## How the retirement works
- Switch `programs_retired` (table wk_feature_switches) = `all`. It hides menu items, hub tiles, dashboard text, pricing/checkout/plan text, Game Plan tasks, calendar entries, demo entries and Help Desk FAQ entries, and tells the help chat (ai-helpdesk) to describe Hammers Today instead.
- Old addresses quietly go to /dashboard (`src/components/archive/RetiredProgramRoute.tsx`), no banner.

## Bring ONE program back (example: Speed Lab)
1. Move the file back: `src/archive/retired-programs/pages/SpeedLab.tsx.archived` → `src/pages/SpeedLab.tsx`.
2. In `src/App.tsx` add `const SpeedLab = lazyWithRetry(() => import("./pages/SpeedLab"));` and change the route to `<Route path="/speed-lab" element={<SpeedLab />} />`.
3. In `supabase/functions/_shared/archive/retiredPrograms.ts` remove the Speed Lab line from `RETIRED_PROGRAMS` (so menus, tiles, tasks, calendar, pricing text and help chat show it again), then redeploy `ai-helpdesk`.
4. Publish (and rebuild the iPhone app).
Same steps for the others with their file/address from the table above.

## Bring ALL five back
Do steps 1–2 for each page, then set `programs_retired` mode to `off`, redeploy `ai-helpdesk`, publish and rebuild the iPhone app.
