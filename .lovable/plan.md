## Honest status

The IQ system is **functionally complete but not yet E2E-elite**. What's shipped:

- 94 published canonical situations across baseball/softball, both sports, all four lenses (defense / offense / pitching / baserunning).
- Variant generator → effectively unlimited reps.
- SM-2 spaced repetition with attempt + progress writeback.
- Daily plan integration (`game_iq` modality, role-aware lens).
- Weakest-lens insight on Progress Landing with deep-link CTA.
- Owner authoring: wizard, Three B's validator, bulk JSON import, duplicate, soft-delete + restore, Deleted tab.
- Athlete queries respect `deleted_at`.

What's **missing for "elite + safe to exit anytime"**:

1. **Quiz runner has no Save & Exit.** A mid-scenario exit loses the in-progress answer selection and (worse) can drop the attempt if the user closes the tab between "answered" and "graded". No resume.
2. **Owner authoring wizard has no draft autosave.** A 9-actor + variants flow that crashes or gets auth-evicted starts over.
3. **Bulk import dialog** accepts JSON but doesn't persist the paste buffer across reload.
4. **No "Continue where you left off"** entry on the IQ landing — users have to re-find the situation.
5. **Wave 3 Playwright regression sweep** never ran. Wave 7 cert never ran.
6. **No analytics on dead-ends** (situation with zero attempts in 30d, lens with no published content for a sport/role combo).

---

## Plan to finish E2E

### A. Bulletproof Save & Exit across every IQ surface

1. **Quiz runner resume** (`src/components/iq/IqScenarioRunner.tsx`)
   - Persist `{situationId, scenarioId, selectedRole, startedAt}` to `localStorage` under `iq:run:<userId>` on every state change.
   - On mount, if a run exists for the current situation, offer "Resume" vs "Restart".
   - Wrap the answer-submit path so a network failure queues the attempt in `localStorage` and retries on next mount (idempotent via client-generated `attempt_id`).
   - Mount `SaveAndExitBar` (existing component) — "Save & exit" snapshots state and routes to `/iq`.

2. **Owner wizard draft autosave** (`src/pages/owner/IqLibrary.tsx` editor path)
   - Debounced (800 ms) save of the in-progress situation + actors + variants to a new `iq_situation_drafts` row keyed by `(owner_id, draft_key)`.
   - "Save & exit" button persists immediately and routes to library list.
   - On editor open, if a draft exists for this slug, prompt to resume or discard.

3. **Bulk import paste persistence** — keep the textarea buffer in `sessionStorage` until a successful import clears it. Survives accidental refresh / auth blip.

4. **"Continue where you left off" tile** on `/iq` landing — reads the resume snapshot and deep-links straight back.

### B. Auth-eviction hardening for IQ surfaces

- Mark the quiz runner, wizard editor, and bulk import textarea with `data-protected-editing="true"` so `useRequireAuth` already-shipped guard refuses to evict mid-edit (already wired globally; just needs the attribute on these three containers).

### C. Schema (single additive migration)

```sql
create table public.iq_situation_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  draft_key text not null,           -- slug or "new:<uuid>"
  payload jsonb not null,            -- {situation, actors, variants}
  updated_at timestamptz not null default now(),
  unique (owner_id, draft_key)
);
-- + GRANTs to authenticated/service_role, RLS owner_id = auth.uid(), updated_at trigger.
```

No changes to `iq_situations`, `iq_user_progress`, `iq_user_attempts`.

### D. Wave 3 regression sweep (one Playwright run)

`/tmp/browser/wave3/regression.py` covering:
- Onboarding resume
- Calendar import + day click (no eviction)
- Today Plan → Add to gameplan, Answer Hammer
- Manage Events cancel/reschedule
- IQ quiz: start → exit mid-scenario → resume → submit → progress row written
- Owner: create draft → close tab → reopen → publish → athlete sees it

Output: `docs/asb/wave3-regression-report.md`. Any bug surfaced gets fixed same turn.

### E. Wave 7 final E2E cert

`/tmp/browser/wave7/cert.py` — new athlete → onboarding → schedule import → 7 simulated days of plan + IQ reps + a canceled game → Progress shows ≥1 correlation card AND IQ Insight surfaces a weakest lens → owner adds situation → athlete sees on next pull.

Output: `docs/asb/elite-readiness-wave7.md` flipped from "deferred" to pass/fail per surface with screenshots.

### F. Content-health observability (lightweight)

- Owner library badge per situation: "0 attempts / 30d" so dead content is visible.
- Empty-lens detector: if a sport+role has <5 published situations for a lens, owner library shows a "Gap" banner.

---

## Order of execution

1. Migration for `iq_situation_drafts` (one approval).
2. Quiz runner resume + SaveAndExitBar + protected-editing attrs.
3. Owner wizard autosave + bulk-import buffer.
4. Continue-where-you-left-off tile + content-health badges.
5. Wave 3 sweep → fix any surfaced bugs.
6. Wave 7 cert → ship report.

Estimated 3 focused turns end-to-end. After this the IQ system is the strongest in the market and genuinely safe to leave mid-rep on any screen.
