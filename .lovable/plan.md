## Honest status — Final Mastery Wave

Most of the plan landed, but **not 100% E2E**. Here's what's done vs. still open.

### Done and wired
- `gp_*` realtime publication + `useGpRealtime` subscribed in `GameSheet`, `Games`, `GameReports`.
- Sticky `GameTotalsHeader` in `GameSheet`.
- "Open today's game" CTA banner on `Games.tsx` (auto-detect via `useGameDayContext` reading the new `gp_games` ledger).
- `useGpSignal` 7-day projection feeding `GpInGameAdvisoryStrip` (Hammer Daily Plan) and `GpInGameSummaryCard` (Progress Dashboard).
- Drift guard `scripts/check-no-legacy-games.sh` — currently green.

### Not yet complete (gaps the prior turn claimed or implied)
1. **Pitch ↔ At-Bat coupling** — `AtBatLogger` does not embed `PitchLogger`, no `useAtBatPitches(atBatId)` helper, no auto-advance on ball-4 / strike-3, no live pitch totals at the AB header.
2. **Dedicated Game Day Mode surface** — only the CTA banner exists. The high-touch `GameDayMode.tsx` (large-touch 4-logger grid, live score/inning/outs) inside `GameSheet` was not built. Auto-create of a `gp_games` shell row on calendar-game start is also not implemented.
3. **Drift guards** — `scripts/preflight.sh` does not call `check-no-legacy-games.sh`; the `src/lib/games/__tests__/ledger.spec.ts` vitest suite was not added.
4. **UX polish** — no per-logger empty states, no single-key shortcuts in `AtBatLogger` (1B/2B/3B/HR/K/BB/HBP), no 10s undo toast on inserts.
5. **Hammer Daily Plan ordering** — `useGpSignal` advisories render as a strip but are not yet fed into `dailyPlan.ts` to actually bias the Tex-Vision / fielding block selection (the plan called for additive modulation, not just a banner).
6. **Roadmap `gp_signal` envelope** — `useRoadmapProgress` was not updated to consume the new signal for milestone ordering.

### Proposed closure plan (in order, each slice validated before the next)

1. **Coupling slice** — add `useAtBatPitches`, embed `PitchLogger` in `AtBatLogger`, auto-close AB on ball-4/strike-3/in-play with pre-filled outcome, live counts in the AB drawer header.
2. **Game Day Mode slice** — `src/components/games/GameDayMode.tsx` rendered as the default tab inside `GameSheet` when the game is today; large-touch buttons for the 4 loggers, current score/inning/outs derived from the ledger. Add idempotent shell-row creation keyed on `calendar_event_id` (hook into `useGameDayContext`).
3. **Hammer + Roadmap modulation** — pass `useGpSignal` output into `dailyPlan.ts` via `athleteContext.gpSignal`; bias skill block selection additively (never overrides survivability / freshness). Emit the same envelope to `useRoadmapProgress` for milestone ordering.
4. **Drift guards** — append `bash scripts/check-no-legacy-games.sh` to `scripts/preflight.sh`; add `src/lib/games/__tests__/ledger.spec.ts` asserting every `GP_TABLES` key matches a generated Supabase type and that `gp(...)` is the only call path.
5. **UX polish slice** — empty states in `AtBatLogger` / `PitchLogger` / `DefenseLogger` / `BaserunLogger` / `SubLogger`; single-key shortcuts in `AtBatLogger`; 10s `sonner` undo toast on every ledger insert with a `gp(...).delete().eq("id", ...)` rollback.
6. **Verification pass** — typecheck, run preflight, manually exercise: open today's game from Hammer → log a pitch sequence → see AB auto-close → see totals tick → see advisory refresh on Progress without reload.

No schema changes required. All work remains additive over `gp_*`.

Approve and I'll execute slices 1–6 in order.