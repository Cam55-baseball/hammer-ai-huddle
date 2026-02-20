
# Fix: Shared Links Return a Blank Page

## Root Cause — Confirmed

The app is a React Single Page Application (SPA). Every route — `/dashboard`, `/auth`, `/shared-activity/ABC123` — is handled **client-side by React Router**. The server only knows about one real file: `index.html`.

When a user opens a direct link like:
```
https://hammers-modality.lovable.app/shared-activity/ABC123
```

The hosting server receives a request for `/shared-activity/ABC123`. It looks for a file at that path, finds nothing, and returns a blank response or error page. React never boots because `index.html` is never served. The user sees a completely blank screen with no login, no landing page, nothing.

This is a classic SPA deployment problem. The fix is standard: tell the server to **always serve `index.html`** regardless of the URL path, so React Router can handle routing on the client side.

## The Fix — One File

Add a `_redirects` file to the `public/` folder with a single rule:

**File: `public/_redirects`**
```
/*    /index.html   200
```

This tells the hosting infrastructure: "For any URL path, serve `index.html` with a 200 status." React Router then boots normally and renders the correct page — `/shared-activity/ABC123` renders `SharedActivity.tsx`, `/auth` renders `Auth.tsx`, etc.

This is the standard fix for Vite + React Router SPAs deployed on Netlify-compatible hosts (which Lovable's hosting uses).

## Why This Affects Only Direct/Shared Links

When users navigate **within** the app (clicking buttons, links), React Router intercepts the navigation before the browser ever sends a request to the server — so it works fine. But when someone opens a link from outside (shared link in a text, email, copied URL), the browser makes a fresh server request — and that's when the blank page happens.

## Files Changed

| File | Change Type |
|---|---|
| `public/_redirects` | New file — 1 line |

No code changes, no database changes, no edge function changes.

## Also Fixing the Previous Auth Redirect Issue

While implementing this, the auth redirect key mismatch (`from` vs `returnTo`) identified in the previous analysis will also be fixed in the same pass:

- `src/pages/SharedActivity.tsx` — change `state: { from: ... }` to `state: { returnTo: ... }`
- `src/pages/Auth.tsx` — add `|| state?.from` fallback so both keys work

This ensures users who open a shared link while logged out are sent back to the shared activity page (not the dashboard) after signing in.

## Technical Details

The `public/_redirects` file is copied verbatim into the build output's root by Vite. Lovable's hosting reads this file and configures the server accordingly. No Vite config changes are needed — the `public/` directory is already the static assets folder.
