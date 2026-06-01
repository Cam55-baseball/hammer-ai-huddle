# Relational Demo Rehearsal Log

Static rehearsal walkthrough of `/relational/demo` against the seeded demo athlete.
Live in-browser timing pass to be appended by the presenter immediately before the
investor demo using the `?presenter=1` overlay's elapsed timer.

## Static walkthrough (code-derived)

| # | Step | Component(s) | Target | Risk |
|---|------|--------------|--------|------|
| 0 | Intro | `Card` | 45s | None — pure copy. |
| 1 | Today | `DevelopmentalStageChip` | 45s | Low — chip + paragraph. |
| 2 | The journey | `AthleteJourneyMap` | 75s | Med — projection-bound list; falls back to "Your journey starts…" on empty. |
| 3 | Where they are | `DevelopmentalStageChip` + Card | 90s | Low. |
| 4 | The slump | `SlumpReloadFlow` + Card | 120s | Resolved — Card narration now renders even if `SlumpReloadFlow` returns null because confidence band didn't hit `strained`/`crisis`. |
| 5 | Hammer remembers | `HammerConversationPanel` | 120s | Med — relies on seeded turns with `recalled_event_ids`; verified by RR-1 failure-injection tests. |
| 6 | Parent safety | `ParentTrustCard` | 90s | Low — copy now leads with "Protected first". |
| 7 | Protected from pressure | `RecruitingRoadmap` | 60s | Low — gated by developmental stage. |
| 8 | Recovery, on record | `InjuryLifecycleStrip` | 30s | Low. |
| 9 | Replay proof | `Card` | 60s | None. |

Total target runtime: **~12:00**.

## Observed risks (pre-live)

- **Cold projection load:** first navigation to `/relational/demo` may show empty content for ~150–400ms while `useAsbTimeline` resolves. Mitigated by `requestAnimationFrame` warm on mount and by `bg-muted animate-pulse` placeholders inside projection components.
- **Slump step empty render:** historically `SlumpReloadFlow` returned `null` when confidence band did not match. Step 4 now always renders an explanatory Card alongside the flow.
- **Presenter cadence drift:** without the timer, steps 4 and 5 tend to overrun by ~30s each. The `?presenter=1` overlay surfaces per-step target seconds and elapsed time to keep pacing honest.

## Live timing pass (to be filled before demo)

| # | Step | Target | Actual | Notes |
|---|------|--------|--------|-------|
| 0 | Intro | 45s |  |  |
| 1 | Today | 45s |  |  |
| 2 | The journey | 75s |  |  |
| 3 | Where they are | 90s |  |  |
| 4 | The slump | 120s |  |  |
| 5 | Hammer remembers | 120s |  |  |
| 6 | Parent safety | 90s |  |  |
| 7 | Protected from pressure | 60s |  |  |
| 8 | Recovery, on record | 30s |  |  |
| 9 | Replay proof | 60s |  |  |

Total actual: ____

## Awkward pauses / flat spots / dead clicks

(populate during live rehearsal)

## Resolved during this pass

- Slump step blank-render risk → wrapped with descriptive Card.
- No keyboard navigation for live presentation → `PresenterOverlay` mounted on `?presenter=1` with `←`/`→`/`Space`/`R`/`F` bindings.
- Cold-start jitter → `requestAnimationFrame` warm on `RelationalDemo` mount.
- Parent copy hedged ("by design", "until age-appropriate") → replaced with "Protected first" and direct second-person framing.
