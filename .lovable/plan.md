## Fixes

### 1. RLS error on `persistContextAnswer(weekly_availability_hours)`

**Root cause (verified):** The `athlete_context` policy is `USING/WITH CHECK (auth.uid() = user_id)`. The write itself is correct (`user_id: user.id`), so the only way this fails is if the Supabase auth session on the request is stale/missing at the moment of the upsert — `useAuth` still holds the React `user` object, but the JWT sent to PostgREST has expired or been evicted (the same class of eviction we hardened against earlier). Because `weekly_availability_hours` is roughly mid-flow, the token is often past its 1‑hour rotation when this question is answered.

**Fix in `src/lib/hammer/context/acquisition.ts`:**
- Before every upsert, call `supabase.auth.getSession()` and, if the access token is missing or expiring within 60s, call `supabase.auth.refreshSession()`.
- Assert `session.user.id === userId`; if not, throw a clear "Session expired — please sign in again" error instead of the raw RLS message.
- Apply the same guard to `persistCoachContextAnswer` / `persistScoutContextAnswer` and to `draftStore.ts`'s debounced remote flush (same table, same failure mode).

**Fix in the caller (`useHammerOnboardingDirector.resolve`)**:
- Catch the "session expired" error class and surface a toast + keep the answer in local state so the user's typing is not lost. Retry once after refresh.

### 2. New onboarding steps not appearing when going back through questions

**Root cause (verified):** The 4 new steps (`AnthropometricsStep`, `FuelRecoveryStep`, `MentalCareerStep`, `ConnectionsStep`) live only inside the standalone `src/pages/AthleteOnboarding.tsx` page (13-step shell). The surface the user actually re-enters from Hammers Today ("Answer Hammer") is the chat director in `src/components/hammer/HammerOnboardingChat.tsx` driven by `knowledgeGaps.ts` — and that gap list was never extended, so the new questions are invisible there.

**Fix — extend the chat director to include the new hybrid steps:**

Add knowledge gaps to `src/lib/hammer/onboarding/knowledgeGaps.ts` for the athlete audience:

| Gap id | Persist target | Input kind |
|---|---|---|
| `anthropometrics` | `athlete_context.anthropometrics` (jsonb, already exists) | custom form |
| `sleep_target_hrs` | new athlete_context column | numeric |
| `water_goal_oz` | new athlete_context column | numeric |
| `diet_style` | new athlete_context column | choice |
| `allergies` | new athlete_context column | text |
| `level_target` | new athlete_context column | choice |
| `focus_area` | new athlete_context column | text |
| `pregame_routine` | new athlete_context column | text |
| `parent_email` | writes to `parent_invite_dispatches` via existing helper | email |
| `coach_code` | new athlete_context column | text |

**Migration** — additive columns on `public.athlete_context` (nullable, no default):
`sleep_target_hrs numeric`, `water_goal_oz numeric`, `diet_style text`, `allergies text`, `level_target text`, `focus_area text`, `pregame_routine text`, `coach_code text`. Existing GRANTs on `athlete_context` already cover them.

**Router changes:**
- Extend `COLUMN_BY_KEY` in `acquisition.ts` with the 8 new columns.
- Extend the envelope hydrator (`athleteContext.ts`) so the chat director recognizes the values as "resolved" on back-navigation.
- Render the 4 existing step components inline in `HammerOnboardingChat.tsx` when the current gap id belongs to that group (a `renderKind: "form"` branch), reusing the same components used by `AthleteOnboarding.tsx` so the two surfaces stay in sync.
- Parent-email gap: reuse the `ConnectionsStep` inline; on submit, insert into `parent_invite_dispatches` (already implemented in that component) and mark the gap resolved without writing to `athlete_context`.

### Out of scope
- No changes to the standalone `AthleteOnboarding` page's ordering.
- No visual redesign.
- No changes to any other table's RLS.

### Technical details

- Migration is additive-only, adds 8 nullable columns. No RLS change (existing "athletes manage own context" policy covers them).
- Session refresh path uses `supabase.auth.refreshSession()`; on failure it throws a typed error the director catches and shows via `toast.error`.
- `HammerOnboardingChat.tsx` gets a small `<GapFormShell>` that renders the imported step component and calls the director's `resolve(gapId, value)` on submit; back/forward buttons remain the director's.
