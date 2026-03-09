

# Five Improvements

## 1. Replace "AI" with "Hammer" Across the App

**Scope:** ~33 files containing "AI" references in user-facing text. This includes:
- Labels/badges: "AI" → "Hammer" (e.g., `<Badge>AI</Badge>` → `<Badge>Hammer</Badge>`)
- Section titles: "Vault & AI Recap" → "Vault & Hammer Recap", "AI Meal Suggestions" → "Hammer Meal Suggestions"
- FAQ text: "AI will analyze" → "Hammer will analyze", "AI-powered" → "Hammer-powered"
- Help desk chat: "AI assistant" → "Hammer assistant"
- Component names stay unchanged (internal code) — only user-visible strings change
- Edge function system prompts and internal comments stay as-is (backend, not user-facing)

Key files: `HelpDesk.tsx`, `HelpDeskChat.tsx`, `SessionDetailDialog.tsx`, `AIMealSuggestions.tsx`, `NutritionHubContent.tsx`, `TodaysTipsReview.tsx`, `ProgressDashboard.tsx`, `VaultRecapCard.tsx`, `AIPromptCard.tsx`, `PracticeHub.tsx`, `LiveRepRunner.tsx`, `AnalyzeVideo.tsx`, sidebar labels, and all FAQ answer strings.

## 2. Practice Intelligence Hub — "Log Your Practice Here" UX

**File:** `src/pages/PracticeHub.tsx`

Change the header area:
- Title stays "Practice Intelligence"
- Subtitle changes from "Log sessions, track progress, and build your MPI score" → **"Log your practice here — pick a module below to get started"**
- Add a small helper banner/card below the header (before the tabs) with a clean callout: icon + "Select a module, choose your session type, and start logging reps" — dismissible

## 3. Practice Session Detail View in Players Club

**Problem:** Practice cards in Players Club (`renderPracticeCard`) have no `onClick` — users can see a card but cannot view drill blocks, rep data, videos, or full contents.

**Solution:** Create a `PracticeSessionDetailDialog` component:

| File | Action |
|------|--------|
| `src/components/PracticeSessionDetailDialog.tsx` | **Create** — Dialog showing full practice session contents |
| `src/pages/PlayersClub.tsx` | **Edit** — Add `onClick` to practice cards, add state + dialog rendering |

The dialog will display:
- Session header: type, date, sport, module, coach grade
- Drill blocks list: each block shows type, intent, volume, execution grade, outcome tags
- Per-rep micro layer data (if stored): goal of rep, actual outcome, rep tags
- Session notes
- Session context (environment, equipment, etc.)
- Videos associated with the session (from `session_videos` if any exist)

## 4. Vault Performance Test — Vertical Scroll for Recent Tests

**File:** `src/components/vault/VaultPerformanceTestCard.tsx`

Current: `<ScrollArea className="max-h-[200px]">` — this is already a scroll area but `max-h-[200px]` is very small for viewing history.

Changes:
- Increase `max-h-[200px]` → `max-h-[400px]` for more visible entries
- Remove the `recentTests = tests.slice(0, 5)` limit — show **all** tests with scroll
- Add a visible vertical scrollbar indicator so users know content is scrollable

## 5. User Idea Drop Box on Help Desk

**Files:**

| File | Action |
|------|--------|
| `src/pages/HelpDesk.tsx` | **Edit** — Add "Share an Idea" card section before the embedded chat |
| `src/components/IdeaDropBox.tsx` | **Create** — Simple form: textarea + optional name + Submit button |
| `supabase/functions/submit-idea/index.ts` | **Create** — Edge function that sends email to HammersModality@gmail.com via Resend |

The "Share an Idea" card will appear between the FAQ section and the chat, with:
- Lightbulb icon + "Got an idea? Drop it in the box!"
- Textarea for the idea
- Submit button that calls the edge function
- Success toast on submission
- The edge function sends a transactional email to HammersModality@gmail.com with the user's idea text, their profile name, and timestamp

---

## Files Summary

| File | Action |
|------|--------|
| ~15 UI files | Edit — replace "AI" → "Hammer" in user-facing strings |
| `src/pages/PracticeHub.tsx` | Edit — update subtitle + add helper banner |
| `src/components/PracticeSessionDetailDialog.tsx` | Create — full practice session viewer |
| `src/pages/PlayersClub.tsx` | Edit — wire practice cards to detail dialog |
| `src/components/vault/VaultPerformanceTestCard.tsx` | Edit — expand scroll area, remove 5-item limit |
| `src/components/IdeaDropBox.tsx` | Create — idea submission form |
| `src/pages/HelpDesk.tsx` | Edit — add idea drop box section |
| `supabase/functions/submit-idea/index.ts` | Create — email idea to HammersModality@gmail.com |

