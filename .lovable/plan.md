## The two bugs

1. **Warm-Up CTA dumps the athlete into Practice Hub** (`/practice?module=warmup`). Practice Hub is the home of hitting/throwing/defense/baserunning *practice sessions* — landing there for a warm-up is confusing and off-pattern.
2. **Baserunning CTA opens the Baserunning IQ *learning* module** (`/baserunning-iq`). When the daily plan tells an athlete to *do baserunning practice*, it should open the baserunning practice session, not the IQ classroom. IQ stays the destination only for the injury-suppressed "IQ-only / leg-protected" variant.

The other CTAs are already correct: Lift → `/training-block`, Speed → `/speed-lab`, Hitting → `/practice?module=hitting`, Throwing → `/practice?module=throwing`, Defense → `/practice?module=defense`, Nutrition → `/nutrition-hub`, Recovery → `/bounce-back-bay`.

## Fix 1 — Warm-Up opens the Warm-Up Generator in place

Stop routing the Warm-Up block. Tapping "Open warm-up" opens a dialog that wraps the existing `WarmupGeneratorCard` (`src/components/custom-activities/WarmupGeneratorCard.tsx`) right on top of the Hammer plan — the athlete picks duration/context, generates a personalized warm-up, and confirms.

- New thin component `src/components/hammer/HammerWarmupDialog.tsx` — a `Dialog` rendering `<WarmupGeneratorCard exercises={[]} isWarmupActivity sport={sport} onAddWarmup={…} />`.
- On `onAddWarmup`, create a one-shot `custom_activity_templates` row tagged for today (mirroring the existing `handleAddToGamePlan` flow in `HammerDailyPlan.tsx` — `activity_type: 'warmup'`, `source: 'hammer.daily.warmup'`, `display_on_game_plan: true`), invalidate `custom-activity-logs` / `custom-activity-templates` / `game-plan`, broadcast `data-sync`, and toast "Warm-up added to today's Game Plan" with a "View" action.
- In `src/components/hammer/HammerDailyPlan.tsx`, when a block's `modality === 'warmup'`, the CTA opens this dialog instead of navigating. The "Add to Game Plan" secondary CTA on the same block stays as-is.
- In `src/lib/hammer/prescription/dailyPlan.ts`, the warmup block's `route` becomes a sentinel like `hammer:open-warmup-generator` and `ctaLabel` stays `"Open warm-up"`. (Sentinel-routes are already a pattern in the file — e.g. `#hammer-onboarding` for the Answer Hammer flow.)

## Fix 2 — Baserunning prescription opens the practice session

In `src/lib/hammer/prescription/dailyPlan.ts`, the *normal* baserunning prescription block (lines ~912–924, in-season "game scenarios" / off-season "Baserunning IQ" titles):

- `route: "/practice?module=baserunning"` (was `/baserunning-iq`)
- `ctaLabel: "Open baserunning"` (was `"Open baserunning IQ"`)

`PracticeHub` already supports `?module=baserunning` natively (it's a first-class module with `SessionConfigPanel` and `RepScorer` paths), so no new pages or routes are needed.

The **injury-suppressed** "Baserunning — IQ only (leg-protected)" block (lines ~873–886) **keeps** `/baserunning-iq` + `"Open baserunning IQ"` — that variant is explicitly mental-reps-only and IQ is the correct destination.

## Files touched

- `src/lib/hammer/prescription/dailyPlan.ts` — change baserunning route/label (one block); change warmup `route` to sentinel.
- `src/components/hammer/HammerDailyPlan.tsx` — intercept the warmup sentinel and open `HammerWarmupDialog` instead of navigating.
- `src/components/hammer/HammerWarmupDialog.tsx` — **new**, ~80 lines.

No DB migrations. No new routes.

## Verification

1. Healthy athlete with a baserunning prescription → "Open baserunning" lands on `/practice?module=baserunning` and the Baserunning module is preselected.
2. Athlete with active leg-region injury → "Baserunning — IQ only" still shows "Open baserunning IQ" and lands on `/baserunning-iq`.
3. Any athlete with a warmup block → tapping "Open warm-up" opens the generator dialog in place, generating + confirming adds a row to today's Game Plan, toast appears, "View" jumps to `/dashboard#game-plan`.
4. Lift / Speed / Hitting / Throwing / Defense / Nutrition / Recovery CTAs unchanged — manual spot-check.
5. `bunx tsgo --noEmit` clean.
