# Player week calendar — Item 1

## What changes
- Add a Week calendar tab in each coach/player profile, also reachable by authorized organization administrators.
- Show Monday–Sunday with previous/next week controls. Each day lists its saved cards and activities, with Done ✓, Partly done, Not done, Skipped (allowed), Removed by coach, or Rest day where the existing records support that status.
- Selecting a day opens its cards, exercises, and exact logged results. Missing plans and failed reads stay explicitly unavailable, never counted as missed work.

## Technical details
- Add one read-only, seven-date database function using the existing `_coach_training_access` permission gate and the redacted `coach_athlete_plan` reader.
- Read existing prescriptions, workout logs, saved engagement marks and coach prescription records; project statuses without new storage or Discipline counters.
- Keep viewer/athlete/week cache keys scoped and avoid background polling or plan generation.
- Add targeted mocked status/access tests, then load-check and take one screenshot as democoach viewing a connected TEST player with real logged work.
- Record the architecture rule and current task status; no proof document, full suite, publish, cron or iOS changes.

## Assumptions
- “This week” means Monday–Sunday in the viewer’s device calendar.
- Existing server training/health permissions remain unchanged; the calendar does not grant new access.