# Intelligence Utilization Audit

**Sprint:** Post-Launch Observability & Reality Validation
**Reducer:** `src/lib/observability/intelligenceUtilization.ts`
**Posture:** Measure actual consumption. No optimization. No redesign.

## Surfaces tracked

| surface | source | topic / table | gap? |
|---|---|---|---|
| UHRC | `src/lib/uhrc/*`, UHRC pages | `GAP` (no view topic) | YES |
| Detailed analysis | `src/pages/AthleteDigest.tsx`, `src/pages/AsbTimeline.tsx` | `GAP` | YES |
| Hammer | `src/lib/hammer/identity.ts` surfaces | `GAP` | YES |
| Roadmap | `athlete_roadmap_progress` | partial via progress table | partial |
| Recruiting | `RecruitingVisibilityGate`, recruiter pages | `relational.exposure.*` | partial |
| Coach intelligence | `src/pages/CoachConsole.tsx`, `useCoachRosterRows` | `GAP` | YES |
| Trends | `src/pages/AsbTimeline.tsx` | `GAP` | YES |

## Reducer output

For each surface over the window:

```ts
{
  surface,
  eligible_users,
  unique_viewers,
  total_views,
  view_rate,                  // unique_viewers / eligible_users
  median_views_per_viewer,
  zero_consumption_users,     // eligible but never opened
  unobservable: boolean       // true if topic is GAP
}
```

## Reality flags

- **Surface dark** — `unobservable=true` (logged to reality-feedback-ledger as instrumentation gap).
- **Surface unused** — `view_rate < 0.05` over 30d for instrumented surfaces.
- **Surface dominant** — `view_rate >= 0.50` (informational, no action).

## Constitutional bounds

- View counts never mutate intelligence ranking.
- "Unused" status is observation, not a redesign trigger.
- Surfaces with low consumption become **candidates** for the next sprint's investigation, not for removal (Phase 60 FC-10 additive-only).
