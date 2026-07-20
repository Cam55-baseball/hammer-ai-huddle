## Scope

Rework two onboarding questions in `HammerOnboardingChat` (Q11 lifting history, Q23 pre-game routine). Frontend/copy-only — the underlying columns already store JSON/text, no DB migration needed.

---

## 1. Q11 — Lifting history (deeper layoff context)

Reframe as *"most recent long layoff"* and add follow-up fields so the athlete can explain when it happened, why, and where they are in return-to-lift.

**File:** `src/components/hammer/HammerOnboardingChat.tsx` (the `lifting_history` input renderer, lines ~251-305) and `src/lib/hammer/onboarding/knowledgeGaps.ts` (question copy at line 223-224).

New/updated field structure (persisted as JSON into existing `lifting_history` column):

- `total_years` (kept)
- `consistent_last_12mo` (kept — Yes/No)
- If **No**, reveal the layoff sub-panel:
  - `interruption_months` — how long was the most recent long break (kept, relabeled *"Length of most recent long layoff (months)"*)
  - `interruption_ended_months_ago` — new: *"How long ago did that layoff end? (months, 0 if still off)"*
  - `interruption_injury_related` — new: Yes/No toggle
  - `interruption_reason` — kept, textarea (not input), relabeled *"What happened & what have you done since? (injury details, rehab, PT, any lifting you've resumed)"*
  - `return_to_lifting_status` — new: segmented choice *"Not yet returned" / "Light / rehab only" / "Partial lifts" / "Fully back"*

Question copy update:

- Question: *"Tell me about your lifting history — and if you've had a long layoff, walk me through the most recent one."*
- Helper: *"Total years and current consistency. If you had a break, I need the most recent long one: when it ended, whether it was injury-related, and where you are now in returning to lifting."*

The layoff sub-panel is collapsed unless `consistent_last_12mo === "no"` to keep the form short for consistent lifters. `canSubmit` still only requires `total_years`.

## 2. Q23 — Pre-game mental funnel routine (position-agnostic)

**File:** `src/lib/hammer/onboarding/knowledgeGaps.ts` (`pregame_routine` gap, lines 365-373). Text-only change — same `pregame_routine` text column, no schema work.

- Question: *"Walk me through your pre-game mental funnel — from the bus/car ride to the first pitch."*
- Helper: *"Applies to any position. Think in stages: (1) arrival mindset, (2) warm-up focus, (3) dugout/on-deck reset, (4) the last 10 seconds before the play starts. What actually works for you — cues, breathing, self-talk, visualization?"*
- Placeholder in the text input updated to match (currently *"e.g. 4 breaths, visualize first pitch, tap helmet"* → *"e.g. Headphones on the ride, 3 breaths between innings, one cue word before the pitch — 'see it deep' / 'quiet feet' / 'trust it'"*).

Priority/id/persist target unchanged so returning users' saved routine stays intact.

---

## Out of scope

- No DB migration (existing JSON/text columns absorb the new sub-fields).
- No changes to downstream consumers of `lifting_history` — they already treat it as an opaque JSON blob; new keys are additive and simply ignored by legacy readers.
- No changes to `AthleteOnboarding.tsx` standalone page unless it renders the same shared component (it does — same file).