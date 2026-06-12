# Elite Completion Plan — Onboarding Hydration, Anthropometric Prescribers, Injury Audit, Owner Video Polish, Video Suggestion Visibility

## 1. Hydrate coach/scout gap completion from the new tables
Goal: progress survives reload for coach + scout onboarding, exactly like athlete `athlete_context` hydration.

- `src/hooks/useHammerOnboardingDirector.ts`
  - On mount, after detecting role, fetch the matching row:
    - coach → `coach_context` (organization, level, philosophy, focus_areas, regions, years_coaching, …)
    - scout → `scout_context` (organization, regions, sports_covered, evaluation_style, age_focus, …)
  - Build a `seededAnswers` map keyed by the same `gap.key` ids used in `knowledgeGaps.ts`, mark those gaps as `completed` so the director skips already-answered questions instead of re-asking after reload.
  - Treat empty strings / null arrays as "still missing" (preserve missingness, never impute).
- `src/lib/hammer/context/envelope.ts` — extend `fetchAthleteContextEnvelope` companion with `fetchCoachContextRow(userId)` / `fetchScoutContextRow(userId)` thin readers so the hook does not poke the table directly.
- Add a `useQuery(['onboarding-progress', role, userId])` wrapper so hydration is cached and revalidated on focus.

Acceptance: refreshing mid-onboarding as coach or scout reopens at the next unanswered gap; previously answered fields render as "✓ saved" chips.

## 2. Anthropometric-aware prescribers (5-Tool depth)
Goal: limb proportions drive different lift selections and throwing dosages.

### 2a. Compute an anthropometric profile
- New `src/lib/hammer/anthro/profile.ts`:
  - Input: `anthropometrics` from envelope (`height_in`, `weight_lb`, `wingspan_in`, `forearm_in`, `femur_in`, `tibia_in`, `torso_in`, `arm_total_in`).
  - Derived ratios (with missingness preserved — never fabricate when a measurement is null):
    - `apeIndex = wingspan / height`
    - `lowerLegRatio = tibia / femur`  → `long_tibia | balanced | long_femur`
    - `forearmRatio = forearm / arm_total` → `long_forearm | balanced | short_forearm`
    - `torsoRatio = torso / height` → `long_torso | balanced | short_torso`
  - Output `AnthroProfile { archetype: 'long_levers' | 'compact' | 'balanced' | 'mixed', flags: {...}, missing: string[] }`.
  - Pure, replay-safe, lineage-friendly (no DB writes — interpretive only, per Eternal Laws / spine doctrine).

### 2b. Strength prescriber adaptations
- New `src/lib/hammer/prescription/strengthSelector.ts`:
  - Squat pattern: if `long_femur` or `long_tibia` → prefer **heavy DB/BB reverse lunges, split squats, B-stance RDLs**; demote back-squat to technique-only, swap to **safety-bar box squat** or **front squat to box** with cue "vertical shin, sit between hips".
  - Hinge: `long_torso` → prioritize **trap-bar deadlift + 45° back ext**, deprioritize conventional pull.
  - Press: `long_forearm` → upgrade **DB bench, floor press, Swiss bar** dosage; demote straight-bar bench leverage assumptions; add cue "wrist stacked, elbow tracks 45°".
  - Pull: `long_arms / high apeIndex` → favor **chest-supported row, ring row, Meadows row**; cue scap setup.
  - Each suggestion carries `{ reason: "long forearm leverage", citation: "anthro.forearmRatio=long" }` so the daily plan card and Ask Hammer can explain *why*.

### 2c. Throwing/arm-care adaptations
- New `src/lib/hammer/prescription/throwingSelector.ts`:
  - `apeIndex ≥ 1.05` (long arms) → longer arm-action drills (Bowler / Towel), wider crow-hops, slightly higher long-toss ceiling but conservative pitch counts (longer levers = higher torque).
  - `long_forearm` → emphasize wrist-weight pronation series + grip-position cues for spin efficiency.
  - Short forearm / compact arm → quicker tempo plyos (rocker, pivot pickoff) before max-intent.
  - Output integrated into `dailyPlan.ts` throwing block (drills, dosage, cues).

### 2d. Wire into `dailyPlan.ts`
- `buildHammerDailyPlan`: read `AnthroProfile` from envelope, pass to strength + throwing selectors.
- For each modality, append `anthroReason` to the existing `roadmapReason` so the UI surfaces "Heavy DB reverse lunge — your tibia/femur ratio favors split-stance loading over bilateral squat" on the expandable card.
- If anthropometrics are missing, render a one-tap "Add measurements to unlock limb-specific work" inline gap (re-using `persistContextAnswer` path already built).

### 2e. Onboarding inputs
- `HammerOnboardingChat.tsx` anthropometrics grid: add `forearm_in`, `femur_in`, `tibia_in`, `torso_in` fields with how-to-measure helper text + diagram tooltip (text-only, no image dep). Existing height/weight/wingspan/leg_length stays.
- All optional — missingness preserved; missing measurements simply skip that branch in the selector.

## 3. Audit remaining `injury_history` consumers → route through normalizer
- `src/hooks/usePhysioProfile.ts`, `src/components/physio/PhysioHealthIntakeDialog.tsx`: read/write via `normalizeInjuryHistory()` and `injuryHistoryToText()`. Writes go back as the canonical `Array<{note, region?, severity?, reported_at?}>` shape.
- `src/lib/hammer/context/decisionFilters.ts` + `athleteContext.ts`: any `.toLowerCase()` / `.includes()` on `injury_history` swapped for `injuryHistoryToText(raw)`.
- Edge functions sweep — any function reading `athlete_context.injury_history` or `physio_health_profiles.injury_history` (none currently grep-matched, but re-grep at implementation time) gets a small inline normalizer copy (Deno can't import the TS module, so a `_shared/normalizers.ts` mirror) — only if a consumer is found.
- Add a vitest `tests/normalizers.injury.spec.ts` covering string / array<string> / array<object> / null / `"none"` inputs.

## 4. Owner Video Library Manager polish
- `src/components/owner/VideoEditForm.tsx`
  - Promote the existing inline "How to reach Elite (score/100)" amber strip into a labeled **collapsible section** titled **"How to reach Elite"** with: current score, missing-field checklist, one-tap "Fix next field" that scrolls/focuses the relevant input. Visible whenever score < 100 (not just <90), and *also* on Foundation videos (currently only Application path).
- Foundation Coach Notes
  - `src/lib/foundationVideos.ts`: extend `FoundationMeta` with `coach_notes?: string` (max 2000 chars). Update `EMPTY_FOUNDATION_META`, `parseFoundationMeta` (tolerate missing field for back-compat).
  - `src/components/owner/FoundationTagEditor.tsx`: add a multiline **Coach Notes** textarea under the chips ("Cues to drill, common mistakes, how you'd teach this in a private lesson"). Persists through existing `onChange(foundationMeta)` plumbing — no migration needed since `foundation_meta` is JSONB.
  - Surface read-only Coach Notes on the player (`VideoLibraryPlayer.tsx`) under a "From the Coach" disclosure when present.

## 5. Video suggestion visibility — opportune surfacing
Goal: athletes can't miss Hammer picks. Current placements: post-session summary + dashboard "Develop This Week". Add high-attention moments:

- **Post-rep, end-of-block (practice)**: after a drill block completes (already a natural pause), render a compact `<VideoSuggestionsPanel mode="session" />` chip-row above the "Next block" button. Tap → full panel; dismiss persists for 24h via `localStorage` key `video-sugg-dismissed:<sessionId>`.
- **Hammer Daily To-Do cards**: each modality card in `HammerDailyPlan.tsx` already has roadmap text — append a "Watch first (2 min)" video chip when `VideoSuggestionsPanel` resolves a long-term pick matching the block's modality + weakness cluster. Uses the existing `useVideoSuggestions` hook with `mode='long_term'` and the modality-derived skill domain.
- **Identity / Command card on `/index`**: small "Today's Hammer pick" thumbnail strip (1 video) above the daily plan, only when at least one pick scores ≥ 0.65 — never empty-state noise.
- **Post-session summary**: keep current placement, but auto-scroll into view if the user lingers > 4s on the summary without scrolling (intersection + idle timer).
- **Notification trigger (existing infra)**: when `recommendVideos` produces a new top-tier pick the user hasn't seen, queue a single in-app toast "Hammer picked a new video for you" once per 24h, deep-linking to the dashboard panel. Respect `notification_preferences`.
- All new surfaces share the same `trackVideoSuggestionShown` call already in `useVideoSuggestions.ts` so observability/lineage stays intact (no new event types — additive only).

## 6. Verification
- Vitest: normalizer + anthro profile + strength/throwing selector pure-function tests.
- Manual QA script (in `.lovable/qa-checklist.md`):
  1. Reload mid-coach-onboarding → resumes at next gap.
  2. Enter tibia > femur → daily plan strength block swaps squat → DB reverse lunge with explanation.
  3. Enter long forearm → press block shows DB bench priority.
  4. Owner: edit a Foundation video → Coach Notes textarea persists; "How to reach Elite" section visible.
  5. Complete a practice block → suggestion chip appears, dismisses for 24h.

## Files touched (summary)
**New:** `src/lib/hammer/anthro/profile.ts`, `src/lib/hammer/prescription/strengthSelector.ts`, `src/lib/hammer/prescription/throwingSelector.ts`, `src/hooks/useOnboardingHydration.ts`, `tests/normalizers.injury.spec.ts`, `tests/anthroProfile.spec.ts`.
**Edited:** `useHammerOnboardingDirector.ts`, `HammerOnboardingChat.tsx`, `envelope.ts`, `dailyPlan.ts`, `HammerDailyPlan.tsx`, `decisionFilters.ts`, `athleteContext.ts`, `usePhysioProfile.ts`, `PhysioHealthIntakeDialog.tsx`, `VideoEditForm.tsx`, `FoundationTagEditor.tsx`, `foundationVideos.ts`, `VideoLibraryPlayer.tsx`, `Dashboard.tsx`, `IdentityCommandCard.tsx`, post-block practice component.

No DB migration required (foundation_meta is JSONB; anthropometrics column already added in last sprint). No edge-function-blocking changes.
