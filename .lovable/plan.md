
## Goal

After clicking **Publish → Update**, users on the live site (`hammers-modality.lovable.app`) should automatically see the new build within seconds — no toast tap, no manual hard refresh. The editor preview must remain unaffected.

## Current behavior (why it's stale)

- `vite.config.ts` uses `VitePWA({ registerType: 'prompt' })` with `injectRegister: null`.
- `src/registerSW.ts` registers a Workbox service worker that **waits** when a new version is found.
- `src/components/PWAUpdatePrompt.tsx` shows a toast saying "Update Available — Tap to update" and only activates the new SW when the user clicks.

Result: returning visitors keep being served the old precached `index.html` shell + old JS chunks until they tap the toast. Many never do, so they perceive the published site as "not updated".

## Plan

### 1. Switch registration strategy from `prompt` → `autoUpdate` (with safe iframe guard)

`vite.config.ts`
- Change `registerType: 'prompt'` to `registerType: 'autoUpdate'`.
- Keep `injectRegister: null` (we register manually so we can guard against iframes/preview hosts).
- Switch HTML navigations to `NetworkFirst` so a fresh deploy is detected on the very first request after publish, instead of being served the cached shell first:
  ```ts
  runtimeCaching: [
    // existing fonts entries…
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: { cacheName: 'html-shell', networkTimeoutSeconds: 3 },
    },
  ]
  ```
- Keep `navigateFallbackDenylist: [/^\/~oauth/]`.

### 2. Make the SW take over immediately on activation

`src/registerSW.ts`
- On `waiting`: immediately `postMessage({ type: 'SKIP_WAITING' })` to the waiting worker (no UI tap required).
- On `controlling` (the new SW has taken control): trigger a one-time silent reload using a `sessionStorage` flag (`__sw_reloaded_once`) to prevent infinite reload loops.
- Preserve the existing **iframe / preview-host guard** so this never runs inside the Lovable editor:
  ```ts
  const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const isPreview =
    location.hostname.includes('id-preview--') ||
    location.hostname.includes('lovableproject.com') ||
    location.hostname.includes('lovable.app') === false && location.hostname !== 'hammers-modality.lovable.app'
      ? false : false; // (we only check iframe + id-preview)
  if (inIframe || location.hostname.includes('id-preview--')) {
    navigator.serviceWorker?.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
    return;
  }
  ```
  (Editor preview already unregisters; published `*.lovable.app` and custom domain proceed normally.)

### 3. Add an active-version polling fallback (handles long-open tabs)

For users who keep the tab open for hours (a common pattern in this app — practice sessions, video review), the browser may not re-check the SW until next navigation. Add lightweight polling so a new deploy is picked up within ~60s even on idle tabs.

`src/registerSW.ts`
- Every 60 seconds (and on `visibilitychange` → visible, and on `online`), call `registration.update()`.
- This is a HEAD-style check against `/sw.js`; cheap and respects existing cache headers.

### 4. Replace the manual "Update Available" toast with a passive notice

`src/components/PWAUpdatePrompt.tsx`
- Since the SW now self-installs and the page reloads automatically, the persistent toast becomes noise.
- Replace it with a brief 2-second informational toast ("Updated to latest version") shown **after** the silent reload completes, gated by reading & clearing the `__sw_reloaded_once` flag on mount. If we'd rather keep the UI fully silent, we can delete the component entirely — recommend keeping the small confirmation toast so users understand why the page just refreshed.

### 5. Reload-loop & in-flight protection

- The `__sw_reloaded_once` sessionStorage flag is set **before** `location.reload()` and only cleared at the start of a new session, guaranteeing exactly one auto-reload per tab session per new SW.
- Skip the reload if the user is mid-action: check `document.visibilityState !== 'visible'` is false AND no `<input>`/`<textarea>` currently has focus AND no open `[role="dialog"]` element exists. If any of these are true, defer the reload until next `visibilitychange` to `hidden` → back to `visible`, or until the dialog closes (we just retry the gate every 5s).

### 6. No changes needed to `index.html`, `manifest.json`, or any feature code.

---

## Files to change

| File | Change |
|------|--------|
| `vite.config.ts` | `registerType: 'autoUpdate'`; add `NetworkFirst` runtime cache for navigations |
| `src/registerSW.ts` | Auto-skipWaiting; one-shot silent reload with safety gate; 60s `update()` polling; iframe/preview guard |
| `src/components/PWAUpdatePrompt.tsx` | Replace persistent toast with brief post-reload "Updated" confirmation (or delete if user prefers fully silent) |

No DB, edge function, or backend changes. No new dependencies.

## How it will behave after the next publish

1. User has the live site open (or visits it).
2. Within ~60s of you clicking Publish → Update, their SW polling detects the new `sw.js`.
3. The new SW installs in the background and is auto-activated (no toast tap).
4. If the user is idle / not typing / no dialog open → page silently reloads to the new bundle, then a small 2s "Updated to latest version" toast appears.
5. If the user is mid-action → reload waits until they're idle again, then completes.
6. Editor preview (`id-preview--…`) is fully unaffected — the guard early-returns and unregisters any leftover SW.

## Risks & mitigations

- **Reload loop**: Mitigated by the `sessionStorage` once-per-session flag + one-shot listener on `controllerchange`.
- **Mid-action data loss**: Mitigated by the focus / dialog gate; reload deferred until safe.
- **PWA install pinning**: Manifest fields (`start_url`, `display`) are unchanged, so installed PWAs continue to work.
- **Editor preview interference**: Existing iframe + `id-preview--` host guard preserved; SW never registers there.
