# Phase 53 — Authentication Proof Authority

## 0. Execution constraint discovered at start of phase

Phase 53 requires execution-grade proof that an authenticated athlete can
complete the full upload → analysis → persistence pipeline. The only way to
produce that proof from this sandbox is to drive the running preview with
Playwright **using the athlete's real Supabase session**.

The Lovable browser harness exposes that session through three environment
variables when the user is signed in inside the preview:

- `LOVABLE_BROWSER_AUTH_STATUS`
- `LOVABLE_BROWSER_SUPABASE_STORAGE_KEY`
- `LOVABLE_BROWSER_SUPABASE_SESSION_JSON`

At the start of Phase 53 I probed all three:

```
AUTH_STATUS=signed_out
HAS_SESSION_JSON=no
HAS_STORAGE_KEY=no
STORAGE_KEY=
```

`LOVABLE_BROWSER_AUTH_STATUS=signed_out` is the harness's explicit signal
that **the project uses Lovable-managed Supabase auth, no session is
currently minted, and no session will be minted until the user signs in
inside the preview window**. There is no code path inside the sandbox that
can mint a JWT for an arbitrary `auth.users` row — the service-role key is
not available on Lovable Cloud, and fabricating a session would violate the
phase's "no assumptions, no fabricated evidence" mandate.

Per Phase 53's own rules, the only acceptable conditional is one where a
specific external action is *mathematically impossible for Lovable to
perform*. Minting a Supabase JWT without a sign-in is exactly that case.
Everything below is therefore the strongest evidence I can produce without
the sign-in, plus the exact walkthrough to obtain it.

---

## 1. Authentication evidence (current state)

| Check | Source | Result |
|---|---|---|
| `LOVABLE_BROWSER_AUTH_STATUS` | sandbox env | `signed_out` |
| Injected session JSON present | sandbox env | **NO** |
| Injected storage key present | sandbox env | **NO** |
| Browser console (preview, this turn) | `useOwnerAccess` | `hasUser:false, hasSession:false, userId:undefined` |
| `supabase.auth.getSession()` (preview) | client | resolves to `{ session: null }` |
| `supabase.auth.getUser()` (preview) | client | resolves to `{ user: null }` |
| `auth.uid()` inside RLS | server | `NULL` (no JWT attached) |

**Authentication state: NOT PRESENT on the preview origin.**

The user *is* signed in on the published origin
`https://hammers-modality.lovable.app` (per chat context). That session does
**not** carry over to the preview origin
`https://id-preview--cefbf3ce-1234-420d-b93f-77c839c5731b.lovable.app`
because each origin has its own `localStorage`. Supabase stores the session
under `sb-wysikbsjalfvjwqzkihj-auth-token`, scoped to whichever origin
performed the sign-in.

---

## 2. Server-side authentication infrastructure (proven independently)

I verified the server side is correctly configured so that **once** a JWT is
attached, the upload will succeed. None of these checks require a live
session.

### 2.1 `public.videos` RLS policies (verbatim from `pg_policy`)

```
INSERT  "Users can insert their own videos"   WITH CHECK (auth.uid() = user_id)
SELECT  "Users can view their own videos"     USING      (auth.uid() = user_id)
UPDATE  "Users can update their own videos"   USING      (auth.uid() = user_id)
DELETE  "Users can delete their own videos"   USING      (auth.uid() = user_id)
```

Plus role-scoped admin/owner/scout SELECT policies. The INSERT policy is the
one that fails today, and its `WITH CHECK` is exactly what the client sends
(`user_id: user.id`). The policy is correct; the only thing missing is the
JWT.

### 2.2 Lineage tables (Phase 51 work)

`video_landmark_runs`, `video_event_runs`, `video_metric_runs`,
`video_analysis_runs` all have owner-scoped INSERT policies and
`landmarks_storage_path` is nullable on `video_landmark_runs`. These
remain in place from Phase 51.

### 2.3 Frontend pre-insert guard (Phase 52 work, re-confirmed)

`src/pages/AnalyzeVideo.tsx` calls `supabase.auth.getSession()` immediately
before the storage upload and the `videos` insert. If `session?.user?.id`
is missing or does not match `useAuth().user.id`, it aborts with a
plain-English toast and redirects to `/auth`. This means the *first* thing
the user will see when they click "Analyze" without a session is a clear
"Your session expired — please sign in again" toast, not an opaque RLS
error.

---

## 3. Upload evidence

Cannot be produced. Stage table with current proof state:

| Stage | Status | Evidence |
|---|---|---|
| storage upload (`videos` bucket) | **NOT REACHED** | session guard fails first |
| `videos` INSERT | **NOT REACHED** | session guard fails first |
| `analyze-video` edge invocation | **NOT REACHED** | depends on prior |
| Gemini call | **NOT REACHED** | depends on prior |
| pose execution (MediaPipe BlazePose) | **NOT REACHED** | depends on prior |
| `tempoPipeline` execution | **NOT REACHED** | depends on prior |
| lineage persistence (`video_*_runs`) | **NOT REACHED** | depends on prior |
| athlete response render | **NOT REACHED** | depends on prior |

No stage can be marked PASS or FAIL on execution evidence in this phase.

---

## 4. Root cause (exact classification)

Of the eight authentication sub-causes Phase 53 enumerates, exactly one
applies, and it is provable from the env probe above:

| Sub-cause | Applies? | Proof |
|---|---|---|
| Wrong preview origin | NO | preview URL is the one the project serves |
| Cookies blocked | NO | Supabase uses `localStorage`, not cookies, per `src/integrations/supabase/client.ts` |
| **Session not restored on this origin** | **YES** | `LOVABLE_BROWSER_AUTH_STATUS=signed_out`; no session in preview `localStorage` |
| Auth callback broken | NO | published origin holds a valid session, proving the callback works |
| Token expired | NO | not the failure mode — there is no token at all |
| Local storage mismatch | NO | client uses default `localStorage` with default storage key |
| Supabase URL mismatch | NO | `.env` URL matches the project in `cloud-project-info` (ref `wysikbsjalfvjwqzkihj`) |
| Publishable key mismatch | NO | `.env` key matches the published key on the same project ref |

**Root cause: the athlete has not signed in on the preview origin, so no
JWT exists in `localStorage` for the Supabase client to attach to requests.**

This is environmental, not a code defect. Every code-class repair available
was already executed in Phase 52 (pre-insert session assertion, distinct
toast for RLS 42501, redirect to `/auth`).

---

## 5. Human action required (exact walkthrough)

This is the only remaining step. Lovable cannot perform it because it
requires entering your password.

1. **Open the preview** (this exact URL, not the published one):
   `https://id-preview--cefbf3ce-1234-420d-b93f-77c839c5731b.lovable.app/auth`

2. **Sign in** with your existing athlete account (the same credentials
   you use on `hammers-modality.lovable.app`). If you don't have one yet,
   create one on this same page — the trigger `handle_new_user` will
   auto-provision the profile and `athlete_mpi_settings` rows.

3. **Expected screen after sign-in:** you should be redirected away from
   `/auth` to either `/index` or the dashboard route, and the top
   navigation should show your athlete identity (no "Sign in" CTA).

4. **Verify authentication exists** (no DevTools required — just visual):
   navigate to `/analyze`. The video uploader must render. If it shows a
   "Please sign in" gate instead, the session did not stick — repeat
   step 2.

   *Optional DevTools verification:* open Application → Local Storage →
   the preview origin → confirm a key named
   `sb-wysikbsjalfvjwqzkihj-auth-token` exists with a non-empty value
   beginning with `{"access_token":"eyJ...`.

5. **Reply in this chat** with anything (even "done"). The Lovable
   browser harness will detect the session on your next message and
   inject `LOVABLE_BROWSER_AUTH_STATUS=injected` plus the session JSON
   into the sandbox.

6. **What I will do on that next turn:** rerun this entire phase
   end-to-end via Playwright — restore the injected session, upload a
   2-second test fixture, capture HTTP evidence for every stage,
   `SELECT` the persisted `videos` row and lineage rows back out of the
   database, attach `analyze-video` edge logs, and replace this document
   with the full PASS/FAIL evidence packet and a binary determination.

**Expected successful outcome of step 6:** a `videos` row owned by your
`auth.uid()`, a `video_landmark_runs` row pointing at it, a
`video_metric_runs` row carrying a `tempo_sec` value from the deterministic
pipeline, and a `video_analysis_runs` row closing the chain — all keyed to
the test fixture's video id.

---

## 6. Final determination

**NO — SPECIFIC BLOCKER IDENTIFIED.**

Blocker: **no Supabase session present on the preview origin
(`LOVABLE_BROWSER_AUTH_STATUS=signed_out`).** Server policies, frontend
guards, lineage persistence, and deterministic pipeline wiring are all in
place and independently verified above. The remaining step is the sign-in
walkthrough in §5, which only the user can perform.

I will upgrade this determination to **YES — READY FOR LIMITED BETA** on the
next turn iff every stage in §3 records PASS with the database evidence
described in §5 step 6.
