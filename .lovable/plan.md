## Goal

Turn the "Coach Hammer · Next Best Step" card from a hardcoded rules engine into a real AI coach that reads the athlete's actual signals, analyzes what they've done, and writes a personalized next step each load.

## What's wrong today

`src/components/dashboard/CommunicationAI.tsx` never calls an LLM. `deriveCommunication()` is a 6-branch `if/else` over readiness/fatigue/recovery thresholds with hardcoded English. That's why it doesn't feel like an agent — it isn't one.

## What will change

### 1. New edge function — `supabase/functions/coach-hammer-next-step/index.ts`

- Verifies the caller's JWT.
- Accepts a compact athlete snapshot from the client (signals + recent activity summary; no PII beyond what we already pass).
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) via the AI SDK with `generateText` + `Output.object` (Zod schema) to return strict JSON:
  ```ts
  { tier, tierLabel, title, instruction, why, ctaLabel, ctaRoute, analysis }
  ```
  where `analysis` is one short sentence acknowledging what the athlete recently completed (e.g. "You logged 3 hitting sessions this week and recovery is trending up").
- System prompt: Coach Hammer persona — calm, plain English, survivability-first, never fabricates data, picks `ctaRoute` from a fixed allow-list (`/command`, `/practice`, `/tex-vision`, `/bounce-back-bay`, `/vault`, `/nutrition-hub`).
- CORS headers, 429/402 surfaced as structured errors.
- Uses the shared gateway provider per Lovable AI SDK pattern (no raw fetch, no `apiKey`).

### 2. New hook — `src/hooks/useCoachHammerNextStep.ts`

- Reads existing data already in scope of the card: `useAthleteCommandRows`, `useEscalationFeed`, `useDayState`, plus `useMPIScores` and `useReadinessState` for analysis context.
- Builds a small `snapshot` object (latest readiness/fatigue/recovery scores + freshness, escalation count, day type, MPI score + trend, count of sessions logged in last 7 days from `rows`).
- React-Query `useQuery` keyed on `[user.id, snapshotHash]` with a 10-minute `staleTime` so we don't burn credits on every re-render. Calls the edge function via `supabase.functions.invoke`.
- Returns `{ step, analysis, isLoading, error }`.

### 3. Rewrite `CommunicationAI.tsx`

- Drop `deriveCommunication`, `timeOfDayStep`, `scoreOf`, `TIER_TONE` defaults that are now AI-owned (keep `TIER_TONE` styling map — tiers still come back from the model in the same enum).
- Render layout stays compact (the size you already approved): header "Coach Hammer · Next Best Step" + tier badge, then `title`, the `analysis` line in muted text ("Here's what I'm seeing: …"), the `instruction` with arrow, and the primary CTA.
- Loading: existing skeleton.
- Error / quota exceeded: fall back to a single calm message ("Coach Hammer is catching his breath — try again in a minute") and a generic CTA to `/command`, so the dashboard never breaks.

### 4. Keep deterministic safety net

Keep the old `deriveCommunication` function exported (renamed `deriveFallbackStep`) and use it only when the edge function errors or returns invalid JSON. That preserves survivability/escalation routing if the LLM is unavailable — the agent never silently hallucinates organism truth, consistent with the project's AI orchestration rules.

## Out of scope

- No chat / conversation UI (per your choice).
- No persistence of past suggestions.
- No changes to `IdentityCommandCard`, `AskHammerPanel`, or the floating help chat.
- No change to card placement or visual size.

## Technical notes

- `LOVABLE_API_KEY` is already auto-provisioned; no secret prompt needed.
- Allow-list CTA routes are validated server-side after the model responds; an invalid route triggers the fallback rather than navigating somewhere broken.
- Snapshot sent to the model is bounded (~1 KB) — no raw event rows, just aggregated scores + counts, so cost stays minimal.
