# Foundations System — Architecture Maps

Wave F deliverable. Each map is a single source of truth for one slice of the system. Update these whenever a wave ships.

## Files

- `recommendation-lifecycle.md` — End-to-end: trigger derivation → state → cooldown → scoring → fatigue → onboarding gate → trace → surface.
- `state-flow.md` — Athlete `foundation_state` transitions, dwell guards, decay.
- `trigger-lifecycle.md` — How a trigger fires, persists, decays, and resolves.
- `event-flow.md` — DB tables + edge functions + cron schedule.
- `dependency-map.md` — Module-level imports across `src/lib/foundation*.ts` and `src/hooks/useFoundationVideos.ts`.
- `observability-map.md` — Tracing, replay, diagnostics panel, health scoring.
- `cron-map.md` — Every cron job, schedule, function, and side effect.
