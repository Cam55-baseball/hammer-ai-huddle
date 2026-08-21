# Ask Hammer Recall — always-current, total recall

Goal: the Recall & Clarity chat should know what is happening right now and be able to recall anything the athlete has ever done in the app — not just notes and journals.

## What is true today (verified)

The `hammer-recall` backend only searches seven places: free notes, workout notes, mental-health journal, thought logs, video notes, daily log, and at-bats.

That means it currently cannot answer questions about:

- Today's Hammers plan, what was completed, skipped, or swapped
- Practice / performance sessions and custom activity logs
- Lift, speed, bat-speed and conditioning workouts and logged sets
- Games, at-bat/pitch history beyond raw at-bats, and saved Game Hub reports
- Saved videos in Players Club and their analyses
- Calendar events, scheduled games/tournaments, season dates
- Recaps and monthly reports, injuries and arm-care status, coach notes

Two more accuracy problems:

- The chat is never told what today's date is, so "right now", "this week" and "yesterday" are guesses.
- Search only matches when the first few words of the question appear literally in an entry, so real memories get missed when phrased differently.
- The function refuses to run unless an OpenAI key exists, even though Google is the primary provider — a single missing key silently kills recall.

## What we will build

### 1. One recall source registry

Replace the hand-written list of seven queries with a single registry file where every athlete-facing record type is declared once: label, table, date column, text fields, and how to summarize a row. Every existing source moves into it, plus the missing ones listed above.

Because it is one list, adding a new feature later means adding one entry — and a test will fail if a known athlete-data table has no registered recall source, so recall cannot silently fall behind the product again.

### 2. A live "right now" block

Every question gets a short current-state header before the history: today's date and the athlete's local day, current season phase and quarter, today's prescribed plan with completion state, today's check-ins (mood, sleep, CNS, soreness), next scheduled games/events, active injuries or arm-care restrictions, and the most recent test results.

This is what makes "what am I supposed to do right now?", "did I already finish lifts?", and "how am I trending this week?" answerable.

### 3. Better retrieval

- Keyword search over each source uses OR'd meaningful terms instead of one rigid phrase, with stop-words stripped.
- If keyword matching finds nothing, fall back to the most recent entries in that source so the chat still has grounded material.
- Relevance ordering mixes recency with match strength, and the corpus budget is spread across sources so one chatty table cannot crowd out the rest.
- Date ranges also understand "yesterday", "last season", named months and single dates.

### 4. Reliability and transparency

- Run on Google Gemini Flash with OpenAI as fallback only; no hard failure when one key is absent.
- Return a compact per-source coverage summary with the answer, and show it in the chat as "searched: plan, workouts, games, videos, notes…" so the athlete can see what was consulted.
- Sources already shown under an answer become tappable, opening the record (video, game report, calendar day, history entry).
- Clearer failure text instead of a generic error when the provider call fails.

### 5. Keeping it current

- Quick-start prompts refresh to reflect the current app (today's plan, last game, video work) instead of static examples.
- The entry button stays where it is on Hammers Today, but also carries the last-updated thread so returning to it resumes the conversation.

## Technical notes

- New `supabase/functions/hammer-recall/sources.ts` exporting a typed `RECALL_SOURCES` registry (table, user column, date column, searchable columns, row → `RecallSource` mapper, per-source row cap) plus `NOW_PROVIDERS` for the live block.
- `index.ts` becomes orchestration only: parse range → build now-block → fan out registry queries with `Promise.allSettled` → budgeted merge → prompt assembly → persist.
- Live block reuses existing read paths where possible: `hammer_daily_task_completions`, `calendar_events` / `athlete_events`, `athlete_daily_log`, `athlete_foundation_state`, injuries, latest `performance_sessions`.
- Additional registry sources: `custom_activity_logs`, `performance_sessions`, `block_workouts` + `block_exercises` / logged sets, `gp_games`, `gp_pitches`, `gp_reports`, `videos` (library only) + analyses, `calendar_events`, `monthly_reports`, `player_notes`, `hydration_logs`, `mind_fuel` progress.
- RLS is untouched: the function keeps validating the JWT and scoping every query to `user_id`.
- Vitest coverage: registry completeness guard, date-range parser cases (including "yesterday" and single dates), budgeted merge behaviour, and a no-match fallback test.
- Front-end changes limited to `src/pages/HammerRecall.tsx` (coverage line, source deep links, dynamic quick starts).
