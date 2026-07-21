
# Recall & Clarity Chat ("Ask Hammer")

A dedicated conversational space on Hammers Today where the athlete can ask anything about their own history — drills, notes, journal entries, video annotations, workouts, at-bats, mood/CNS logs — across any time range, and get grounded answers plus optional real-time plan adjustments for mental state.

## Entry point

- New card on `HammerDailyPlan.tsx` above the fold: **"Ask Hammer — Recall & Clarity"** with a "Start dialogue" button.
- Also reachable from The General (Progress Dashboard) via a "Talk it out" chip.
- Route: `/hammer/recall` (lazy, `lazyWithRetry`), full-page chat with a right-side "Context found" panel.

## Conversation shape & storage

- **Threaded conversations, database-backed.** Athletes will want to revisit past dialogues (e.g. "the slump chat from July").
- Route: `/hammer/recall/:threadId`; `/hammer/recall` selects most recent or creates a new thread.
- Tables (new):
  - `recall_threads` (id, user_id, title, summary, created_at, updated_at)
  - `recall_messages` (id uuid, thread_id, role, parts jsonb, created_at) — stores AI SDK `UIMessage` shape.
  - RLS: user_id = auth.uid(); full GRANTs per public-schema rule.

## Recall corpus (read-only sources, athlete-scoped)

Aggregated by a server-side retriever, filtered by `user_id` and optional date range parsed from the user's question:

- `vault_free_notes`, `vault_workout_notes`, `player_notes`
- `video_annotations` + parent `videos` (title, created_at, side)
- `mental_health_journal`, `thought_logs`, `emotion_tracking`, `session_start_moods`
- `athlete_daily_log` (sleep, CNS, soreness, mood)
- `custom_activity_logs`, `performance_sessions`, `wk_session_logs`
- `gp_at_bats`, `gp_pitches`, `gp_baserun_events`, `gp_pregame_plans`, `gp_plan_outcomes`
- `vault_focus_quizzes`, `vault_weekly_wellness_quiz`, `mind_fuel_streaks`
- `athlete_context` (goals, side, injuries) for grounding

## Backend: `hammer-recall` edge function (Lovable AI / Gemini)

AI SDK `streamText` with `google/gemini-3-flash-preview` (fast, cheap, long context — fits the "millions of users, low budget" direction already chosen).

Tools exposed to the model (all server-side, athlete-scoped):

1. `search_notes({ query, from?, to?, sources? })` — keyword + recency search across notes/journals/annotations. Returns snippets with `{source, id, date, text}`.
2. `get_daily_logs({ from, to })` — mood/CNS/sleep/soreness timeseries.
3. `get_performance_window({ from, to })` — sessions, at-bats, key metrics for the window.
4. `find_good_stretches({ metric?, lookbackDays? })` — identifies periods where mood/performance/CNS trended well, so "what was I focused on when I was hitting well?" works.
5. `propose_plan_adjustment({ reason, adjustments })` — `needsApproval: true`. Writes to `user_day_state_overrides` / `game_plan_task_schedule` / `calendar_skipped_items` to soften today's plan (e.g., swap heavy lift for mobility + mental reset) when the athlete is in a rough mental state. Requires explicit in-chat "Apply" tap.

System prompt anchors the model as a recall + sports-psych mentor: cites sources, never fabricates memories, asks a clarifying question when the corpus is thin, and offers concrete mental resets (breathwork, cue words from their own past notes).

## Frontend

- AI Elements: `Conversation`, `Message`, `MessageResponse`, `PromptInput` (textarea + footer submit), `Tool` (collapsed) for retrieval calls, `Shimmer` "Recalling…".
- `useChat` with `DefaultChatTransport` pointed at the edge function; `id = threadId`.
- Right rail: "Sources" list showing every snippet the retriever returned for the last answer, each clickable to jump to the original note/video/at-bat.
- Quick-start chips: "What helped me hit well?", "Show my last 2 weeks", "I feel off today — reset me", "Between 6/10 and 6/18".
- Composer stays focused per chat-agent UI contract; textarea autofocus on mount, send, thread switch.
- Approval UI for `propose_plan_adjustment`: inline card summarizing changes with Apply / Dismiss; on Apply, invalidates today-plan query keys so `HammerDailyPlan` reflects the reset immediately.

## Plan-shaping loop (mental → physical)

When the athlete signals distress ("anxious", "flat", "burned out"), model calls `propose_plan_adjustment` with a bounded set of allowed moves (respecting WIC / season phase):

- Downshift lift intensity tier by 1.
- Replace conditioning with breathwork + visualization block.
- Insert 10-min journaling prompt sourced from their own past "good day" notes.
- Skip a session with reason logged to `emotion_tracking` + `athlete_daily_log`.

All writes go through existing mutations; nothing bypasses RLS or WIC legality.

## Migration & wiring checklist

1. Migration: `recall_threads`, `recall_messages` + GRANTs + RLS + `updated_at` trigger.
2. Edge function `supabase/functions/hammer-recall/index.ts` with tools above.
3. Frontend:
   - `src/pages/HammerRecall.tsx` (route + thread bootstrap).
   - `src/components/recall/RecallChat.tsx`, `RecallSourcesPanel.tsx`, `RecallThreadList.tsx`, `PlanAdjustmentProposal.tsx`.
   - `src/hooks/useRecallThreads.ts`, `useRecallMessages.ts`.
   - Card on `HammerDailyPlan.tsx`: `RecallEntryCard.tsx`.
   - Router entry + `lazyWithRetry`.
4. Cache invalidation on Apply: today-plan, calendar, daily logs.

## Out of scope (intentionally)

- Embeddings/vector search — v1 uses keyword + date-window retrieval over structured tables; fast, cheap, deterministic. Vector layer can be added later without changing the chat UX.
- Cross-athlete comparisons.
- Voice input (can follow later via existing TTS/STT stack).
