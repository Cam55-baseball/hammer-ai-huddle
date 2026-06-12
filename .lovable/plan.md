## Finalization Plan — Elite Onboarding, Anthro Prescription & Video Surfaces

Completes the five remaining items from the prior pass. No DB migration required (all fields already exist on `foundation_meta` JSONB, `anthropometrics`, `coach_context`, `scout_context`).

---

### 1. "How to Reach Elite" — promoted collapsible (Owner Video Library)

`src/components/owner/VideoEditForm.tsx`
- Replace the inline hint with a `Collapsible` section titled **"How to reach Elite"**, defaulting open when `confidence_score < 100`, closed at 100.
- Shows the prioritized gap list (missing tags, weak rule coverage, low confidence drivers) with one-click "Apply suggestion" buttons that prefill the relevant field.
- Mirrors the section onto Foundation videos via `FoundationTagEditor.tsx` (same component, fed from foundation-meta completeness).

### 2. Throwing-block anthro cues + supplemental drills

`src/lib/hammer/prescription/dailyPlan.ts` (throwing block branch)
- After base block assembly, call `selectThrowingAdaptations(anthroProfile)`.
- Append `cues[]` into the block's `coachingCues` and `supplemental[]` as a new "Anthro supplemental" sub-block (does not replace base drills — additive, replay-safe).
- Append rationale to `roadmapReason` with citation lineage.
- Surface in `HammerDailyPlan.tsx` throwing card as a collapsible "Why these cues for your levers" row.

### 3. Physio intake → normalizer

- `src/hooks/usePhysioProfile.ts`: route reads through `normalizeInjuryHistory()`; route writes through `canonicalizeInjuryHistory()`.
- `src/components/.../PhysioHealthIntakeDialog.tsx`: same in/out normalization; UI handles the canonical array shape only.
- `src/lib/hammer/context/decisionFilters.ts`: replace any remaining raw `.toLowerCase()` calls with `injuryHistoryToText()`.
- Edge functions: add `supabase/functions/_shared/normalizers.ts` (mirror of client normalizer) and import wherever `injury_history` is consumed (audit + patch in one pass).
- New `tests/normalizers.injury.spec.ts` covering string / array / object / null / "none" / mixed shapes.

### 4. Video-suggestion chips on Hammer Daily Plan card

`src/components/hammer/HammerDailyPlan.tsx`
- New `<DailyPlanVideoChips modality={block.modality} />` rendered on each modality card (hitting/throwing/strength/recovery).
- Pulls from existing `useVideoSuggestions` with `mode='session'`, scoped by the block's movement patterns + the user's long-term weakness clusters (reuses logic from `LongTermVideoSuggestions`).
- Renders max 2 chips per block (thumbnail + 1-line reason). Click → opens the watch sheet (existing `VideoSuggestionsPanel` drawer).
- 24h per-video dismiss via `localStorage` key `hammer:vid-dismiss:{videoId}` so users don't re-see what they've skipped.

### 5. Dashboard "Today's Pick" strip + post-session auto-scroll + new-pick toast

`src/pages/Dashboard.tsx` (or current `/index` host)
- New `<TodaysHammerPick />` strip directly above the daily plan card. Shows the single highest-score long-term pick when `score ≥ 0.65`, else hidden.
- Reuses `useVideoSuggestions` already-cached data — zero extra fetch.
- `IdentityCommandCard.tsx`: same pick surfaced inline when identity confidence ≥ 0.65.
- Post-session: `PostSessionVideoSuggestions` gains `autoScrollIntoView` on mount.
- New-pick toast: in `useVideoSuggestions`, diff previous vs. new top-score video id; if changed and new score ≥ 0.75, fire a `sonner` toast with "New Hammer pick for you" + jump link. One toast per session (sessionStorage guard).

---

### Files

**New**
- `supabase/functions/_shared/normalizers.ts`
- `src/components/hammer/DailyPlanVideoChips.tsx`
- `src/components/dashboard/TodaysHammerPick.tsx`
- `tests/normalizers.injury.spec.ts`

**Edited**
- `src/components/owner/VideoEditForm.tsx`
- `src/components/owner/FoundationTagEditor.tsx`
- `src/lib/hammer/prescription/dailyPlan.ts`
- `src/components/hammer/HammerDailyPlan.tsx`
- `src/hooks/usePhysioProfile.ts`
- `src/components/.../PhysioHealthIntakeDialog.tsx`
- `src/lib/hammer/context/decisionFilters.ts`
- `src/hooks/useVideoSuggestions.ts`
- `src/components/practice/PostSessionVideoSuggestions.tsx`
- `src/components/dashboard/LongTermVideoSuggestions.tsx` (export shared agg helper)
- `src/pages/Dashboard.tsx` / `/index` host
- `src/components/.../IdentityCommandCard.tsx`
- Edge functions touching `injury_history` (audited + patched)

### Constitutional guarantees
- All anthro/video additions are **additive overlays**; never author `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state`.
- Missingness preserved — empty anthro = no cue, no fabricated lever class.
- Replay-safe: every suggestion carries `{reason, citation}` lineage already wired in selectors.
- Athlete-reported injury text outranks any inferred readiness (RR-6).
- Video chips never auto-play; user-initiated only; 24h dismiss honored.
