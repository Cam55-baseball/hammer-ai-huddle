

# Fix: Auth State Flicker Causing Force-Redirects

## Root Cause

**`useAuth` is a standalone hook, not a context.** Each of the 206 call sites creates its own independent `useState` for `user`, `session`, and `loading`. When the Supabase token refreshes (on tab return, background→foreground, or periodic refresh), `onAuthStateChange` fires across all instances. Each instance independently transitions through `user=null` before settling back to the valid user.

The Dashboard (line 127) watches `user` in a `useEffect` and immediately navigates to `/auth` when `user` is `null` — even during a transient token refresh cycle. This is the direct cause of both bugs.

**Bug 1** (Edit activity → redirect): Opening the activity detail dialog triggers a re-render cascade. If a token refresh happens to coincide (Supabase refreshes tokens proactively), the Dashboard's `useEffect` catches the transient null and redirects.

**Bug 2** (Tab switch → redirect): Returning to the tab triggers `TOKEN_REFRESHED`. The `onAuthStateChange` callback sets `user` to `session?.user ?? null`. If the callback fires with `event=TOKEN_REFRESHED` before the session is fully resolved, `user` flickers to `null`, triggering the redirect.

## Fix Strategy

### 1. Convert `useAuth` to a React Context (single source of truth)

Create `src/contexts/AuthContext.tsx`:
- One `onAuthStateChange` listener for the entire app
- One `getSession()` call on mount
- All 206 consumers read from context instead of maintaining independent state
- No more state drift or flicker across components

Update `src/hooks/useAuth.ts` to re-export from context (preserves all existing imports).

### 2. Guard redirects against transient null states

In `Dashboard.tsx` (and all other pages with auth redirects):
- Add a `session` check alongside `user` — only redirect when `session === null` AND `loading === false`
- Add a stabilization delay: do not redirect within the first render cycle after `loading` becomes `false`

Specifically, change Dashboard line 125-133 from:
```typescript
if (authLoading) return;
if (!user) { navigate("/auth", { replace: true }); return; }
```
to:
```typescript
if (authLoading) return;
if (!user && !session) { navigate("/auth", { replace: true }); return; }
```

Apply same pattern to: `Profile.tsx`, `ProfileSetup.tsx`, `AnalyzeVideo.tsx`.

### 3. Prevent token refresh from clearing user state

In the new AuthContext, handle `onAuthStateChange` more carefully:
```typescript
onAuthStateChange((event, newSession) => {
  if (event === 'TOKEN_REFRESHED' && !newSession) return; // skip transient null
  if (event === 'SIGNED_OUT') { setUser(null); setSession(null); }
  else { setSession(newSession); setUser(newSession?.user ?? null); }
  setLoading(false);
});
```

### 4. React Query — already safe
`refetchOnWindowFocus` is globally `false` in `App.tsx` (line 109). The two hooks that override it (`useDaySessions`, `useRecentSessions`) only refetch data — they don't trigger navigation. No changes needed.

### 5. No visibility change handlers exist
Confirmed: no `visibilitychange` or `window.focus/blur` listeners in the codebase. No changes needed.

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | **New** — single auth state provider |
| `src/hooks/useAuth.ts` | Rewrite to consume AuthContext (API unchanged) |
| `src/App.tsx` | Wrap app in `AuthProvider` |
| `src/pages/Dashboard.tsx` | Guard redirect with `session` check |
| `src/pages/Profile.tsx` | Same guard |
| `src/pages/ProfileSetup.tsx` | Same guard |
| `src/pages/AnalyzeVideo.tsx` | Same guard |

## What This Does NOT Do
- No route structure changes
- No new dependencies
- No database changes
- All 206 `useAuth()` call sites continue working without modification

