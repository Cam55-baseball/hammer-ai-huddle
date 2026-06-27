## What this error actually is

The dialog (`SendCardToCoachDialog`) called `useAuth()` → `useAuthContext()` and got `undefined` back, even though `<AuthProvider>` clearly wraps the whole tree (per the stack: `App → QueryClientProvider → AuthProvider → SportThemeProvider → … → Dashboard → SendCardToCoachDialog`).

When the provider is present and the consumer still sees `undefined`, there is exactly one cause: **two different React Context objects exist at runtime**. The provider writes into Context‑A; the consumer reads Context‑B; they don't match, so `useContext` returns the default `undefined` and the hook throws.

In this codebase that's happening because `AuthContext.tsx` is being imported through two different specifiers:

- `src/App.tsx` → `"./contexts/AuthContext"` (relative)
- `src/hooks/useAuth.ts` / `useGamePlanPreferences.ts` → `"@/contexts/AuthContext"` (alias)

Normally Vite normalizes both to the same module. But after we just edited `AuthContext.tsx` in the previous turn, Vite's Fast Refresh invalidated one specifier's module record and not the other — so the running page ended up with **two `AuthContext` singletons in memory at once**. The Provider is bound to one; new components mounted after the HMR update read from the other. That's why "the rest of the app is fine" — components that were already mounted still hold the old, matching reference — and only newly‑mounted subtrees (like opening a card on the Dashboard that conditionally mounts `SendCardToCoachDialog`) blow up.

Our `ErrorBoundary` around `CalendarDaySheet` etc. is doing its job: the failure is contained to that one subtree instead of white‑screening the app — that's the "Something went wrong here. The rest of the app is fine" message.

## The fix

Two small, surgical changes:

### 1. Collapse Auth to a single module identity (root cause)

Standardize every Auth import on the `@/` alias so Vite always resolves one module record, even across HMR.

- `src/App.tsx` — change `import { AuthProvider } from "./contexts/AuthContext"` → `import { AuthProvider } from "@/contexts/AuthContext"`.
- Grep the tree once more to confirm no other file uses a relative path or different casing for `AuthContext`. Today only `App.tsx` does, but we'll lock it in.

This permanently eliminates the dual‑module class of failure for Auth.

### 2. Defensive read in the leaf consumer (belt‑and‑suspenders)

`SendCardToCoachDialog` only needs `user?.id` to pre‑fill a "from" field. It should never bring down its host card if Auth context is momentarily unavailable (e.g. mid‑HMR, mid‑sign‑out, mid‑mount race).

- Add a `useOptionalAuth()` helper in `src/hooks/useAuth.ts` that returns `{ user: null, session: null }` instead of throwing when the provider isn't found.
- Switch `SendCardToCoachDialog` to `useOptionalAuth()`. If `user` is null the dialog just renders without the pre‑fill — no crash, no error boundary.
- Leave `useAuth()` (the throwing variant) untouched for components that legitimately require an authenticated session.

### 3. Verification

- Reload the preview, open the Game Plan card on the Dashboard that hosts `SendCardToCoachDialog`, confirm no error boundary fallback appears and console is clean.
- Drive Playwright through Dashboard → open the affected card to confirm the dialog mounts cleanly post‑HMR.
- Typecheck.

## Out of scope

- No changes to `AuthContext` semantics, the sign‑out debouncing we added last turn, or any route guards.
- No mass refactor of other contexts — Auth is the only one observed to dual‑load.

## Why not just "wrap it in try/catch"

Catching the throw would hide the underlying dual‑module problem and the next page that mounts a fresh Auth consumer would crash again. Fixing the import specifier removes the cause; the optional‑hook is purely a safety net for non‑critical consumers.
