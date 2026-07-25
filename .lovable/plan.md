# Elite Pitching Track — Full E2E Hardening

The v1 shipped last turn is structurally right but has real gaps that will cost credibility with elite users. This plan closes every one, adds the missing enforcement layers, and wires the track into the parts of the app it already assumes exist.

## Bugs & fragments to fix first

1. **Unused import in `PitchingCard.tsx`** — `DEFAULT_PITCHER_PROFILE` is imported but not referenced. Remove.
2. **PFP double-selection edge case** — when `pool.length === 1`, `second` becomes `pool[0]` after the `+1` wrap and duplicates the first drill. Guard with `length < 2 → return [first]`.
3. **Undiscoverable arsenal UX** — "right-click to remove" is invisible on mobile. Replace with an explicit "×" affordance on the chip when active, and a "Make primary" dropdown on long-press.
4. **`softballStarter` in-season clamp** — currently downgrades a non-game "start" to "side" without preserving the athlete's ability to opt back in; add a "protected start" flag driven by `preferredBullpenDow`.
5. **PitchingCard is not an arm-care owner** — on bullpen/start days the pitching card silently generates arm-care load, but `ArmCareBudgetProvider owner={armCareOwner}` in `HammerDailyPlan.tsx` only knows about `throwing/lift/warmup/none`. When both throwing card and pitching card are mounted on a bullpen day, athletes get double band-work. Extend the ArmCareBudget with a `"pitching"` owner and let PitchingCard call `suppressFor("throwing")` on pen/start days.

## E2E completeness — the real work

### A. Persistence & multi-device continuity

- **Move `PitcherProfile` from `localStorage` → `athlete_context.envelope`** under key `pitching`. Read priority: `athlete_context` value → `localStorage` fallback → `DEFAULT_PITCHER_PROFILE`.
- On save, write to both `athlete_context` (via existing `useHammerAthleteContext` mutation surface) and mirror to `localStorage` for offline reads.
- Add a `pitching` block to the `AthleteContext` shape (`src/lib/wic/athleteContext.ts`) so downstream engines can consume it deterministically.

### B. Rest-day and weekly-cap enforcement (not just display)

Today the ladder tells the athlete "earn 3 rest days" but nothing stops them from selecting bullpen tomorrow. Elite fix:

- New hook `useRecentPitchingLoad(days: 7)` that reads `wk_session_logs` where template ∈ (`bullpen_pitching`, `pitching_outing`) and sums `pitches` by day.
- New pure function `clampDayTypeForRecovery(today, plannedDayType, recentLoad, level, sport)`:
  - Returns `{ dayType, clampedReason }`. If yesterday's outing hasn't served its Pitch Smart rest days, force `flush` (day 1), `touch` (day 2+), etc.
  - Blocks new mound work if weekly pitch total has hit `weeklyPitchCap` regardless of what the microcycle wants.
- Surface the clamp in the UI: `Detail: "Clamped from Bullpen → Flush — 2 rest days remaining from Tue's 78-pitch outing."`
- This makes the track constitutionally survivability-first, per RW-1.

### C. Rehab / RTP mode

Notes-field ("rehabbing from TJ") is not enough. Add:

- `PitcherProfile.rehab: { active: boolean; program: "tj_return" | "shoulder_return" | "generic" | null; weekInProgram: number | null; clearedThroughStage: string | null }`.
- New library `rehabProgression.ts` with the standard TJ interval-throwing progression (weeks 1-24) and a generic shoulder version. Each stage clamps to `touch`/`long_toss` + PFP only, hides mound work entirely.
- Rehab mode surfaces its own headline: "TJ Week 14 — up to 90 ft, no mound until Week 20."

### D. Injury clamp (HPI / active_restrictions)

- Read `readiness.active_restrictions` and any `injury_event` topics from ASB. If elbow or shoulder is flagged, hard-clamp to `rest`/`flush` with a visible "Injury override — arm flag active" banner.
- Also read HPI arm-feel signal from recent throwing logs (`meta.armFeel`). Two consecutive poor arm-feel logs → downgrade the next mound day by one intensity tier.

### E. Log-flow parity (single Log button UX)

Pitching card currently has no direct Log entry, so athletes have to hunt for the throwing card to log an outing.

- Add a `<Button size="sm">Log outing</Button>` and `Log bullpen`/`Log PFP` in the card that opens `ExerciseLogSheet` with a synthetic `WkRx` shaped to route `resolveTemplate` → OUTING / BULLPEN / PFP.
- Persist the resulting `wk_session_logs` row with `movement_slug: "start_pitch"` or `bullpen`, `distance_feet: null`, so `useRecentPitchingLoad` (B) can find them.

### F. Two-way athlete coordination

- When `profile.role === "two_way"` AND today's `dayType ∈ {start, game}`: broadcast a `pitchingHighEffort` flag via a lightweight context so the bat-speed card can drop to `bat_speed_tee` + suppress overload work.
- Bat card reads the flag with `useOptionalPitchingIntent()` — if undefined (non-pitcher), no-op.

### G. Trends & progress read-out

Re-use existing `usePitchingV2Trends` to show, in the Pitching card's expanded state:
- 7d/30d pitch totals vs the ladder cap (progress bars).
- Strike% and 1st-pitch strike% trend from `bullpen_pitching` + `pitching_outing` logs.

### H. Coach visibility & modulation

- New tab under Coach Console → Athlete profile → **Pitching**: read-only mirror of today's headline, this-week rhythm, weekly-cap-vs-thrown, rest debt.
- Coach cannot author the profile (athlete-owned) but can leave a `pitching_note` (`asb_events` topic `pitching.coach_note`) that renders on the athlete card.

### I. Onboarding hook

- If `athlete_context.identity.two_way || primary_position ∈ (P, SP, RP)` AND `pitcher_profile.level === "unknown"`, add a one-step slot at the end of onboarding: role + level + arsenal. Skips cleanly for non-pitchers.

### J. Determinism tests

Because Pitch Smart is legally / medically load-bearing, add vitest suites:

- `pitchLadder.test.ts`: exhaustive matrix asserts USA Pitch Smart daily maxes and rest bands for every `(sport, level, role, rung, quarter)` combination.
- `pitchingMicrocycle.test.ts`: given game on Fri, baseball starter foundation rung → asserts Sun/Sat "rest", Wed "bullpen or side per rung", Fri "start" or "game".
- `pfpLibrary.test.ts`: deterministic rotation across a year — no duplicate drill in any single day's picks, coverage of all beginner drills within a week for foundation rung.
- `clampDayTypeForRecovery.test.ts`: 78-pitch outing at HS clamps next 3 days.

## Technical notes

- `src/components/hammer/ArmCareBudgetContext.tsx::ArmCareOwner` gets a `"pitching"` variant; suppressFor logic already generic.
- `AthleteContext` gains an optional `pitching?: PitchingBlock` field; migration is additive-only (per Eternal Laws).
- New files (all additive):
  - `src/lib/hammer/pitching/recentLoad.ts` + hook `src/hooks/useRecentPitchingLoad.ts`
  - `src/lib/hammer/pitching/recoveryClamp.ts`
  - `src/lib/hammer/pitching/rehabProgression.ts`
  - `src/lib/hammer/pitching/twoWayCoordination.tsx` (context provider + hook)
  - `src/components/hammer/PitchingLogButtons.tsx`
  - `src/components/coach/PitchingPanel.tsx`
  - test files under `src/lib/hammer/pitching/__tests__/`
- No DB migration required for v2 (uses existing `athlete_context`, `wk_session_logs`, `asb_events`). A dedicated `athlete_pitcher_profile` table can come later if the coach-mutation surface grows.

## Rollout order

1. Bug/fragment sweep (unused import, PFP dedupe, arsenal UX, softball clamp, ArmCareBudget owner).
2. Persistence to `athlete_context` + `AthleteContext` block.
3. Rest-day + weekly-cap enforcement (recentLoad + recoveryClamp).
4. Injury clamp + HPI arm-feel modulation.
5. Log-flow parity buttons on the card.
6. Rehab / RTP mode.
7. Two-way coordination context.
8. Trends read-out.
9. Coach panel + onboarding slot.
10. Vitest suites.

Each step ships behind the existing card mount — no gating flag needed, and every step is additive and replay-safe.
