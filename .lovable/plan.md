
## Honest status of the previous Side Context slices

| Slice | Claim | Reality |
|---|---|---|
| 1. Capture (videos, goals, vault drills) | Done | ✅ Verified — writes stamp `side` |
| 2. Render — Pitching split | Done | ✅ `SideViewTabs` mounted in `PitchingPanel.tsx` |
| 2. Render — Hitting/Throwing split | Done | ❌ Not mounted (no Hitting/Throwing panel uses `SideViewTabs`) |
| 2. Render — Differential card on Progress | Done | ❌ `SideDifferentialCard.tsx` exists but is not imported anywhere |
| 3. Intelligence — dailyPlan biases reps to weaker side | Done | ❌ `dailyPlan.ts` never reads `sideDifferential` — only documented |
| 4. Lint + RLS doc | Done | ✅ Files exist (structural, not runtime-verified) |
| 5. E2E Playwright spec | Done | ⚠️ Scaffold only — never executed against the live app |
| 6. CI workflow + preflight | Done | ✅ Files exist (not validated in this sandbox) |

So no — it is **not** fully E2E yet. A switch hitter today would still see no differential card, no L/R split on Hitting or Throwing surfaces, and would not get weaker-side rep biasing in their daily plan.

## Plan to actually close it (Slices 2R / 3R)

### Slice 2R — Render completion
1. **Mount `SideDifferentialCard`** on the Progress Dashboard landing (`ProgressLanding.tsx`), gated by `isSwitchAthlete` so non-switch users see nothing.
2. **Add `SideViewTabs` to Hitting and Throwing panels**:
   - Create `src/components/progress/panels/HittingPanel.tsx` (or wire into the existing hitting surface if present) with the same L/All/R filter pattern used in `PitchingPanel.tsx`.
   - Do the same for a `ThrowingPanel.tsx`.
   - Filter the underlying query by `side` column when a side tab is active.
3. **Vault & video list filters** — add a compact `SideContextPicker` filter to `useVault.ts` consumers and the video library list so switch athletes can scope views.

### Slice 3R — Intelligence layer (real, not documented)
1. In `src/lib/hammer/prescription/dailyPlan.ts`, import `computeSideDifferential` and, for hitting/throwing/pitching blocks of a switch athlete, bias rep counts (+10–20%) toward the weaker side when sample threshold (≥3/side) is met and asymmetry exceeds a configured floor.
2. Surface a small "Weaker side focus: L" pill in `HammerDailyPlan.tsx` when bias is applied, with a tooltip linking to the differential card.
3. Add a unit test for the bias function covering: insufficient samples → no bias, symmetric → no bias, asymmetric → bias to weaker side, capped at +20%.

### Slice 5R — Actually run the E2E
1. Run the existing `tests/e2e/side-context/switch-hitter.spec.ts` via Playwright in the sandbox against `http://localhost:8080`, fix any selector drift, and capture a screenshot of the differential card + biased plan as evidence.

### Out of scope (already real)
Capture stamping, RLS inheritance doc, lint script, CI workflow file — leave as-is.

## Risk / user impact if we skip this
- Switch athletes get no visible value from the L/R system on Hitting/Throwing/Progress today.
- The "weaker side gets more reps" promise is not actually delivered by the engine.
- The E2E lock has never been exercised, so the CI regression net is theoretical.

Approve and I'll execute 2R → 3R → 5R in order with verification screenshots at the end.
