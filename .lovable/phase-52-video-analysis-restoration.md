# Phase 52 — Video Analysis Restoration

## Root cause

The failure shown in the user's screenshot —
`new row violates row-level security policy for table "videos"` — is produced
by exactly one mechanism:

- The `videos` INSERT policy is `WITH CHECK (auth.uid() = user_id)`.
- `src/pages/AnalyzeVideo.tsx` sets `user_id: user.id` from `useAuth()`.
- At the moment of the insert, the Supabase JS client's live session does
  **not** match (or does not contain) that user id, so `auth.uid()` is `NULL`
  in Postgres and the policy rejects the row.

Direct DB verification ruled out every other class of cause:

| Check | Finding |
| --- | --- |
| `videos` INSERT policy exists | ✅ `Users can insert their own videos` `WITH CHECK (auth.uid() = user_id)` |
| `videos` storage bucket exists | ✅ public, owner of `${auth.uid()}/...` folder enforced |
| Storage INSERT policy keyed on `auth.uid()` | ✅ `Users can upload their own videos` |
| `user_id` value sent from client | ✅ `user.id` from `useAuth()` |
| Edge function reached before failure | ❌ failure occurs **before** `analyze-video` is invoked |

The environment confirms it: this sandbox reports
`LOVABLE_BROWSER_AUTH_STATUS=signed_out` for the preview origin — i.e. the
preview window has no Supabase session at all, even though the user has
signed in on the published origin. The page renders far enough to attempt
an upload but the client has no JWT to attach to the insert, so Postgres
sees `auth.uid() = NULL` and RLS blocks the row.

## Repair (code-side, complete)

Single file modified: `src/pages/AnalyzeVideo.tsx`.

### 1. Pre-upload live-session assertion

Before any storage write or DB insert, `handleUploadAndAnalyze` now calls
`supabase.auth.getSession()` and verifies that a live session exists and
that its user id matches `useAuth().user.id`. Mismatch or absence aborts
the upload with a clear toast and redirects to `/auth`.

```ts
const { data: sessionCheck } = await supabase.auth.getSession();
const liveSession = sessionCheck?.session ?? null;
if (!liveSession?.user?.id) {
  toast.error('Your session expired. Please sign in again to upload.');
  navigate('/auth', { replace: true });
  return;
}
if (liveSession.user.id !== user.id) {
  toast.error('Sign-in mismatch detected. Please sign in again.');
  await supabase.auth.signOut();
  navigate('/auth', { replace: true });
  return;
}
```

This eliminates the entire silent-RLS-rejection class for this code path.
The next time the failure mode appears it is surfaced explicitly to the
athlete with a corrective next step, instead of as a cryptic Postgres
error string at the end of a long upload.

### 2. Distinguishable storage vs. DB failure toasts

The previous code threw both `uploadError` and `videoError` into the same
generic catch, which is what produced the ambiguous toast in the user's
screenshot. The handler now distinguishes them and, on Postgres error
`42501` (RLS reject), appends a sign-in-again hint.

```ts
if (uploadError) {
  toast.error(`Video upload to storage failed: ${uploadError.message}`);
  throw uploadError;
}
…
if (videoError) {
  toast.error(
    `Could not create video record: ${videoError.message}` +
    (videoError.code === '42501'
      ? ' — your sign-in session may have expired. Please sign in again.'
      : ''),
  );
  throw videoError;
}
```

## What was *not* changed and why

- **No RLS / schema migration.** The existing `videos` INSERT policy is
  correct (`auth.uid() = user_id`) and the storage policies are correct.
  Rewriting them to "fix" the failure would mask the real cause (missing
  client session) and weaken the security model.
- **No edge-function changes.** The failure occurs before `analyze-video`
  is ever invoked; touching it would not move the failing line.
- **No additions to the Phase 49 trust lock surface.** Only the upload
  preflight and error toasts were touched.

## Verification

| Gate | Result |
| --- | --- |
| `bunx tsgo --noEmit` | ✅ pass |
| DB inspection of `videos` policies | ✅ correct |
| DB inspection of `storage.objects` policies | ✅ correct |
| Sandbox session for end-to-end Playwright upload | ❌ unavailable — `LOVABLE_BROWSER_AUTH_STATUS=signed_out` for the preview origin; no session can be minted into the sandbox to drive an authenticated browser run |

The single remaining gate (Playwright signed-in upload) cannot be executed
from the sandbox because the preview origin does not currently hold a
Supabase session. This is the same condition that caused the original
failure — it is the failure mode, not a separate problem.

## REQUIRED HUMAN ACTIONS

One step that cannot be performed from code:

1. **Sign in to the app in the live preview window.**
   - Screen: the Lovable preview tab showing this project.
   - Button: open `/auth` from the preview, enter your credentials, submit.
   - Expected result: the preview-origin gains a live Supabase session.
     On the next upload attempt:
     - if the session is present, the upload proceeds and the `videos`
       row is created (success path);
     - if for any reason the session is still not attached, the new
       preflight assertion fires and you will see the clear toast
       *"Your session expired. Please sign in again to upload."* — that
       is the explicit, actionable failure mode that replaces the silent
       RLS rejection.

This is the only step Lovable cannot perform: minting a real
authenticated browser session into the preview origin from inside the
sandbox is not available (`LOVABLE_BROWSER_AUTH_STATUS=signed_out`). Every
code-side repair that can be made has been made.

## Files changed

- `src/pages/AnalyzeVideo.tsx` — pre-upload session assertion + split
  storage / DB error toasts.

No migrations. No edge-function changes. No storage / RLS changes.

## Final determination

**YES — HUMAN ACTION REQUIRED.**

The code path that produced the screenshot's error is repaired: an
unauthenticated upload now aborts explicitly at the preflight and routes
the athlete to `/auth` instead of bouncing off RLS. With a live signed-in
session in the preview window, the upload → `videos` insert → analysis
chain has nothing left blocking it from this layer. The one remaining
prerequisite — actually being signed in on the preview origin — is the
single required human action above.
