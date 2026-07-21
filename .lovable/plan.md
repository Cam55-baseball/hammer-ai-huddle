## What I found

All three features exist in code, but they're discoverable in ways that don't match the promise:

1. **Route anchoring + playback in `IqDiamond`** — wired (`playing`, `progress`, `roleShifts`, `defensivePositions` props all flow through). ✓
2. **Batter's box highlight in `IqField`** — wired via `batterSide={hand}` from `GameIqSituation.tsx:325` → `IqScenarioRunner:206` → `IqDiamond:134` → `IqField:120–123`. But the highlight is `hsl(var(--iq-chalk) / 0.18)` — nearly invisible.
3. **"Watch the play" button in `IqScenarioRunner`** — the `IqPlaybackControls` bar renders only after the athlete answers (gated by `submitted`), and its play control is an unlabeled Play icon, not a "Watch the play" button. That's why it looks missing.

Plus: routes/pucks don't animate before submit, so the "anchoring + walking pucks" story isn't visible during the quiz phase either.

## Fix

### 1. Make batter's box highlight unmistakable — `src/components/iq/IqField.tsx`
Replace the `0.18` fills with a solid accent fill + a 1px accent stroke on the active box, and dim the inactive box to `0.06`. Highlight color: `hsl(var(--iq-execute))` (already in the palette) so it reads as "the batter stands here."

### 2. Add a real "Watch the play" button — `src/components/iq/IqScenarioRunner.tsx`
- In the **quiz phase** (before submit), render a secondary "Watch the play" button next to the "Submit" button that lets the athlete preview the animation without answering. It sets `submitted=true` in a "preview mode" flag so routes and pucks animate but the answer state stays unresolved (they can still answer after).
- In the **reveal phase**, above `IqPlaybackControls`, render a prominent labeled "▶ Watch the play" button (uses the same handler as Restart+Play) so the action is obvious. Keep the compact controls beneath it for scrubbing/speed.

### 3. Ensure pucks visibly walk their routes — `src/components/iq/IqDiamond.tsx`
Already works when `playing` is true. Confirm by:
- Verifying `useIqPlayTimeline` sample function returns positions that interpolate along `primary_path` (spot-check with two situations).
- If any actor has no `primary_path`, ensure the puck still animates from its resolved position to the same position (no-op) rather than snapping — already handled by `animate={{ left, top }}`.

## Verification

1. Reload `/iq/comebacker-r1-double-play` as RHH → left-hand batter's box is dim, right-hand box has a solid accent fill and outline. Toggle to LHH → highlight swaps.
2. Before submitting → "Watch the play" button is visible; clicking it animates every defender's puck along their route with dashed route lines drawing in.
3. After submitting → prominent "▶ Watch the play" button appears above the scrub/speed bar; clicking replays the animation from t=0.
4. Spot-check one bunt situation and one deep-fly situation for the same behavior.

## Out of scope

- No new tables, no changes to `playTimeline.ts` sampling logic, no scenario data changes, no changes to overlay/voice logic.