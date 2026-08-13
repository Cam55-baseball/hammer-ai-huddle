# Generate Today's Plan on demand

Today, opening the app auto-builds the plan. `useWkDailyPrescriptions` fires `wk-generate-daily` the moment it sees no rows for the date (and also on version / phase / game-day drift). Every athlete who loads the dashboard pays for a build whether or not they intend to train from it.

This change makes the build explicit: nothing is generated until the athlete presses **Generate today's plan**. Everything downstream stays identical.

## The roadmap is safe

Verified in `progressionState.ts`: block index and week-in-block are derived from a fixed calendar anchor (`WAVE_ANCHOR_ISO`) plus the athlete's real 28-day prescription/log history — not from a counter that advances each time the generator runs. Exposure windows, personal bests, test-day nomination and career horizon all read history by date. So an athlete who generates on Monday and again ten days later lands exactly where the wave says they should: same block, correct week, correct deload timing, re-exposure respected, targets built off their real bests. Skipped days were always possible (an athlete could ignore the plan); on-demand generation is the same situation, now honest about it.

## What changes

**1. Auto-generation is removed.** The empty-state effect no longer calls `generate()`. The hook exposes the same `generate()` for the button to call.

**2. Drift no longer regenerates silently.** Version / phase / game-day mismatches on an already-generated plan stop auto-invoking. Instead the plan shows a small "Your schedule changed — refresh today's plan" bar with a Refresh button, so an athlete only pays for a rebuild they asked for.

**3. A standout Generate card.** When there are no prescriptions for the date, the Hammers Today section renders a prominent generate panel instead of empty cards:

```text
┌────────────────────────────────────────────┐
│  Today's plan isn't built yet              │
│  Block 3 · Week 2 · Intensify              │
│                                            │
│  Picks up exactly where your roadmap is.   │
│                                            │
│      [  Generate today's plan  ]           │
└────────────────────────────────────────────┘
```

Primary-filled, full-width, with a subtle pulse until pressed (same treatment already used for HPI / Start Line via `useOpenedOnceToday`). While running it shows the existing progress state; on success the full card stack renders as it does today. Failure keeps the current structured error + Retry.

**4. Regenerate stays available.** Once a plan exists, a quiet "Rebuild today's plan" action lives in the plan header for athletes who change their day (added a game, felt different). Same function, one tap, no automatic spend.

## Scope guardrail

This is generation-trigger work only. No engine, catalog, progression, validator, or card-content change. The prescription written by a button press is byte-identical to the one the auto-trigger would have written for that date.

## Technical notes

- `src/hooks/useWkDailyPrescriptions.ts` — drop the auto-invoke effect; keep `generate` / `retry`; add derived `needsGeneration` (no rows) and `isStale` (version/phase/game-day mismatch) so the UI can decide instead of the hook.
- `src/components/hammer/HammersTodayProvider.tsx` — unchanged; still the single snapshot owner.
- `src/components/hammer/HammerDailyPlan.tsx` — new `WkGeneratePanel` shown when `needsGeneration`, stale banner when `isStale`, rebuild action in the header.
- Any other consumer of `useWkDailyPrescriptions` gets the same non-auto behavior — checked before edit so no surface silently keeps auto-generating.
- Cost note: `wk-generate-daily` is deterministic and makes no model call, so the saving here is edge-function compute and DB writes, not AI tokens. If AI-token spend is the real target, the Coach Hammer chat/next-step surfaces are where model calls actually happen — say the word and I'll scope that separately.
