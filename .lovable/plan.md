## Phase 6 — Enforcement, Feedback Loops, Monetization Pressure

### Audit Result (verified, not assumed)

| Area | Current state | Gap |
|---|---|---|
| Publish gate | `isReady` only disables Save button in editors | No DB-side or distribution-side consequence |
| Recommendation engine (`recommendVideos`) | Pure tag-match scoring; no readiness/confidence factor | Ignores tier — Empty videos can rank as high as Elite |
| Suggestions hook (`useVideoSuggestions`) | Loads all 500 videos, scores, returns top N | No throttle/suppression for Incomplete |
| Public library (`useVideoLibrary`) | `created_at` / `likes_count` order; no readiness sort | Incomplete videos surface equally |
| Confidence | Visual badge only | No effect on ranking, no inline fix CTAs |
| Quick fix | None — owner must open full edit form | High friction for ⚠️ batch cleanup |
| Monetization | No layer exists | Greenfield |
| Behavior tracking | `ownerLearning.ts` records last 50 saves but never surfaces patterns | Silent — no nudges |
| Fast Mode | Static editor | No "delta preview", no auto-focus on missing |

**Owner Authority remains intact** — every change below is gated on explicit clicks. No auto-application.

---

### 1. Hard Enforcement Layer

**Publish gate (DB-side, single source of truth)**
- Add a generated column `library_videos.distribution_tier` via migration: `'blocked' | 'throttled' | 'normal' | 'boosted' | 'featured'`. Computed by trigger from `(video_format, skill_domains, ai_description, assignment_count, confidence_score)`.
- Trigger fires on `library_videos` and `video_tag_assignments` upsert/delete. Recomputes:
  - `blocked` → 4/4 missing fields (Empty)
  - `throttled` → ≥1 missing OR confidence <70 (Incomplete / Needs Work)
  - `normal` → ready + 70–89
  - `boosted` → ready + 90–94
  - `featured` → ready + ≥95
- Add `library_videos.confidence_score smallint` cached column updated by same trigger so we don't recompute in JS for every list query.

**RLS / API enforcement**
- Update `library_videos` RLS or add a `BEFORE INSERT/UPDATE` check: if a non-owner tries to read a `blocked` video → filtered out via a new view `public_library_videos` that excludes `tier='blocked'`.
- `useVideoLibrary` (athlete-facing) switches its source to `public_library_videos`.
- Owner manager keeps reading `library_videos` directly so they still see Empty drafts.

**Owner-side warning banner**
- On owner manager card: when `tier='throttled'`, render a small red strip:
  > "Underperforming — reduced visibility. Fix to restore reach."

### 2. Confidence → System Leverage (recommendation engine)

Update `src/lib/videoRecommendationEngine.ts`:
- Add `confidence_score?: number` and `distribution_tier?: string` to `VideoWithTags`.
- New scoring multipliers applied **after** the tag-match score:
  - `featured` ×1.30, `boosted` ×1.15, `normal` ×1.0, `throttled` ×0.55, `blocked` → excluded entirely
- Tier multiplier acts on the final score, not the raw match — keeps relevance dominant but lets confidence break ties decisively.
- Engine rejects `blocked` videos at the domain gate (early continue).
- `useVideoSuggestions` extends its meta select to `confidence_score, distribution_tier`.

### 3. "Fix in One Click" Quick Actions

New small component `src/components/owner/QuickFixActions.tsx` rendered on each card when `r.is_ready === false`. Three buttons (only those that apply):
- **"Apply Smart Defaults"** → calls `getSmartDefaults()` from `ownerLearning.ts`, opens Fast Editor with format/domain pre-filled (still requires owner Save click — Owner Authority).
- **"Auto-Suggest + Review"** → opens Fast Editor with `?focus=tags`, auto-runs `regenerateAISuggestions`, opens `AIComparePanel` automatically. Owner adopts via existing click-to-add flow.
- **"Complete Missing Fields"** → opens Fast Editor and auto-focuses the first missing field (`format` → `domain` → `description` → `tags`). Pass `initialFocus` prop.

Wire these by adding an `initialFocus` and `autoOpenSuggestions` prop to `VideoFastEditor`.

### 4. AI → Revenue Bridge (Monetization Readiness)

**New table `library_video_monetization`** (migration):
```
video_id uuid PK references library_videos(id) on delete cascade
cta_type text                 -- 'program' | 'bundle' | 'consultation' | null
cta_url text
linked_program_id uuid        -- nullable, references future programs table
series_slug text              -- groups bundled videos
conversion_score smallint     -- 0-100 cached
updated_at timestamptz default now()
```
RLS: owner-only insert/update; public select.

**Conversion score (`src/lib/videoMonetization.ts`)** — pure function:
- Title specificity (length 30–80 chars, contains noun + verb): 25
- Description CTA-readiness (mentions outcome/benefit verb): 25
- Tag count in `result` layer ≥1: 20
- Has CTA configured: 30 (this is the gate — without CTA, max is 70)

**UI** — new section in `VideoEditForm` "Monetization" (collapsed by default):
- Conversion score badge
- CTA type select + URL field
- "Link to program" picker (placeholder for now if no programs table — disabled w/ tooltip)
- Series slug input + "Bundle into series" suggestion when ≥3 videos share top-2 tags

Owner Authority preserved: every CTA is a manual field. The system only **suggests** ("Add CTA — +30 score").

### 5. Owner Behavior Tracking (Silent Coaching)

Extend `ownerLearning.ts` to track per-save:
- `skipped_auto_suggest: boolean` (auto-suggest button never clicked before save)
- `description_length: number`
- `final_confidence: number`
- `accepted_ai_tags: number` / `rejected_ai_tags: number`

New component `OwnerCoachingNudge.tsx` rendered above the videos tab (replaces nothing — additive, dismissible per-session). Surfaces ONE pattern at a time, rotating:
- "Your last 10 videos averaged 68 confidence — 22 points below your top 5"
- "You skipped Auto-Suggest on 8 of your last 10 saves. Try it once."
- "5 of your videos are throttled. [Fix Now →]" (deep-links to BackfillQueueDialog filtered to throttled)
- "Adding 1 more `correction` tag would lift 7 videos to Boosted"

Pure derivation from existing localStorage history + `useVideoConfidenceMap`. No new table.

### 6. Fast Mode Evolution (Performance Cockpit)

Update `VideoFastEditor.tsx`:
- **Auto-open missing fields**: on mount, if `initialFocus` prop set, scroll/focus that field.
- **Inline confidence delta preview**: next to each empty field show `+15` or `+25` chip — uses the same `videoConfidence.ts` weights.
- **"Run Hammer Suggestions"** button (replaces silent auto-run): owner clicks, suggestions appear in `AIComparePanel` already wired. Clarify with helper text: "Suggestions only — you decide."
- **Save preview**: footer shows `Confidence: 68 → 84 after save` computed live from current draft.

### 7. System-Wide Message Shift (copy)

Add a constant `src/lib/systemTone.ts` with three reused strings:
- Header subtitle in `VideoLibraryManager`: replace "Manage videos" with "Your library determines what wins and what gets buried."
- Throttled warning: "Reduced reach — incomplete structure"
- Blocked warning: "Cannot publish — engine rejects empty videos"

### 8. Non-Negotiables Verification

- ✅ Owner Authority untouched — every quick-fix opens an editor; nothing auto-saves.
- ✅ AI suggestions still require explicit click in `AIComparePanel`.
- ✅ Distribution tier is computed from owner-set fields only — system never edits them.
- ✅ Monetization fields are 100% owner-input.
- ✅ Smart Defaults still only pre-fill empty fields.

---

### Files

**New:**
- `src/components/owner/QuickFixActions.tsx`
- `src/components/owner/OwnerCoachingNudge.tsx`
- `src/components/owner/VideoMonetizationSection.tsx`
- `src/lib/videoMonetization.ts`
- `src/lib/systemTone.ts`

**Edited:**
- `src/lib/videoRecommendationEngine.ts` — tier multiplier + blocked exclusion
- `src/hooks/useVideoSuggestions.ts` — fetch `distribution_tier`, `confidence_score`
- `src/hooks/useVideoLibrary.ts` — switch to `public_library_videos` view
- `src/components/owner/VideoLibraryManager.tsx` — wire QuickFixActions, throttled banner, coaching nudge, tone copy
- `src/components/owner/VideoFastEditor.tsx` — `initialFocus`, delta chips, save-preview footer, optional auto-open suggestions
- `src/components/owner/VideoEditForm.tsx` — Monetization section
- `src/lib/ownerLearning.ts` — extended save metadata

**DB Migration:**
- Add `confidence_score`, `distribution_tier` columns to `library_videos`
- Trigger function `recompute_video_tier()` on insert/update of `library_videos` and `video_tag_assignments`
- View `public_library_videos` (excludes `tier='blocked'`)
- Table `library_video_monetization` + RLS

### Out of Scope
- No changes to taxonomy, rules, or analytics dashboards.
- No payments / Stripe wiring (Monetization layer is metadata only — actual checkout is Phase 7).
- No removal of any current behavior.

### Validation Checklist
- [ ] Empty video cannot be published (DB rejects) and is excluded from `public_library_videos`.
- [ ] Throttled video appears in suggestions but with ×0.55 score multiplier.
- [ ] Quick-fix buttons open Fast Editor with correct field focused.
- [ ] Confidence delta chips render and update live.
- [ ] Coaching nudge surfaces real pattern from local history.
- [ ] Monetization score reaches 70 max without CTA, 100 with everything filled.
- [ ] No code path auto-applies AI suggestions or overwrites owner fields.
