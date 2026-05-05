## Phase X.7 — Revenue Engine: Commitment, Urgency, Friction Removal

Persuasion → revenue. No gating changes. All seven phases implemented exactly.

### 1. New: `src/components/demo/CommitIntentDialog.tsx`
Reusable shadcn `Dialog`:
- Title: "Want your personalized plan built from this result?"
- Buttons: `Yes — build my plan` (primary, fires `onYes`) · `Not yet` (ghost, fires `onNo`).
- Caller logs `commit_intent` on Yes; on No the caller flips an `aggressive` state.

### 2. `src/components/demo/DemoLoopShell.tsx` — commit gate + micro-yes escalation
- New state: `commitOpen`, `aggressive`, `previewClicked`, `viewCount` (incremented every `onPreviewClick`).
- When the user becomes `unlocked` (existing logic) OR clicks first prescribed video → open `CommitIntentDialog` once (guard with ref).
- On Yes → `logDemoEvent('commit_intent', { simId, severity, gap, pct })` then call `goUpgrade()`.
- On No → close, set `aggressive=true` (CTA card uses stronger primary glow + adds a small pulsing ring).
- **Micro-yes CTA copy override** (takes precedence over severity copy):
  - `viewCount >= 2` → "Get my full system"
  - `previewClicked` (1 click) → "Finish unlocking your plan"
  - else → "See how to fix this"
  - `pct > 70` still wins as ultimate override → "Finish unlocking your system" (existing).
- `goUpgrade()` unchanged URL params (already includes `simId/severity/gap/pct/your/elite/projected`).

### 3. New: `src/hooks/useDemoUrgency.ts`
- Returns `{ remainingMs, expired, startedAt }`.
- Persists `demo_urgency_<from>_<simId>` in `sessionStorage` (start ts). 10-minute window.
- On first call, fires `logDemoEvent('urgency_started', { from, simId })` once.
- Updates every 1000ms via `setInterval`, cleans up on unmount.

### 4. `src/pages/demo/DemoUpgrade.tsx` — urgency, value stack, 1-click checkout, exit intercept
- **Urgency banner** above headline: clock icon + "Your analysis is saved for the next MM:SS" (uses `useDemoUrgency`). When expired: red banner "Analysis expired" and primary CTA text becomes "Re-run your analysis to unlock your system" (clicking navigates back to `/demo/${from}`).
- **Value stack** (between recap and CTA):
  - Header: "You're unlocking:"
  - Bulleted list (✓ icons): personalized system / full drill library / progress tracking + performance history / adaptive programming.
  - Anchor line below: "Most athletes spend $200–$500/month trying to fix this manually."
  - No price shown.
- **1-click continuation**: `handleContinue` builds `/checkout?prefill=${simId}&reason=${reason}&gap=${gap}&pct=${pctParam}&from=${from}` and navigates. Keeps the existing `complete()` call. (Even though `/checkout` route may not exist yet in the SPA, this is per spec; we'll add a graceful fallback note in code comments.)
- **Exit intercept**: 
  - `useEffect` adds a `popstate` listener; first attempt to back-navigate cancels by `history.pushState` and opens `ExitInterceptDialog`.
  - Also intercept clicks on the demoted "Keep exploring" link the same way (call `e.preventDefault()` then open dialog).
  - Dialog: "Do you want us to save your personalized plan?" — `Save my plan` (email input + Save) · `Leave` (proceeds to navigate away).
  - On Save: insert into `demo_leads` (new table, see §5) `{ user_id, email, sim_id, severity, gap, pct, from_slug }` and `logDemoEvent('lead_captured', { simId, gap })`. Toast confirmation, then close intercept and stay on page (or proceed if user prefers — we keep them on page so they can still convert).

### 5. New table: `demo_leads` (migration)
```sql
create table public.demo_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  sim_id text,
  severity text,
  gap text,
  pct integer,
  from_slug text,
  created_at timestamptz not null default now()
);
alter table public.demo_leads enable row level security;
-- Anonymous + authed inserts allowed (lead capture is intentionally permissive)
create policy "anyone can insert demo leads"
  on public.demo_leads for insert
  to anon, authenticated
  with check (true);
-- Only the owner (when known) can read their own
create policy "owners read their leads"
  on public.demo_leads for select
  to authenticated
  using (user_id = auth.uid());
create index demo_leads_email_idx on public.demo_leads(email);
create index demo_leads_created_idx on public.demo_leads(created_at desc);
```

### 6. New: `src/components/demo/ExitInterceptDialog.tsx`
shadcn Dialog with email `Input`, basic regex validation, `Save my plan` and `Leave` buttons. `onSave(email)` and `onLeave()` callbacks.

### 7. Stripe alignment (§7)
- Checkout URL carries `prefill=${simId}&reason=${reason}&gap=${gap}&pct=${pct}&from=${from}` so any future `/checkout` page (or existing one) can read these. No backend changes needed beyond emitting the params.
- Update `useDemoProgress.logEvent('unlock_click', ...)` payload (already added `simId` previously) — confirmed.

### Files
- new: `src/components/demo/CommitIntentDialog.tsx`
- new: `src/components/demo/ExitInterceptDialog.tsx`
- new: `src/hooks/useDemoUrgency.ts`
- new: SQL migration for `demo_leads`
- edit: `src/components/demo/DemoLoopShell.tsx`
- edit: `src/pages/demo/DemoUpgrade.tsx`

### Out of scope
- No real Stripe enablement (user must already have it). We only pass params.
- No price reveal on upgrade page (per spec).
- No removal of `/select-modules` route — only the demo path skips it.
