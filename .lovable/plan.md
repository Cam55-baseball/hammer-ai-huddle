## Why installed Home Screen apps don't update

When a user taps "Add to Home Screen", the OS launches the app in **standalone PWA mode**, which behaves very differently from a browser tab:

1. **The service worker is killed aggressively.** iOS especially suspends the SW within seconds of the app being backgrounded. Our 60-second `setInterval(registration.update)` only fires while the SW thread is alive — on a Home Screen app it almost never gets the chance to run before the OS suspends it.
2. **Standalone mode has its own HTTP cache layer.** Even with `NetworkFirst` on navigations, iOS standalone aggressively serves the precached `index.html` shell on cold launch before any network request is issued, then the JS bundle hashes inside it point at old chunks that are still in the precache.
3. **`controllerchange` never fires on cold launch.** Our auto-reload only runs when a *running* tab sees a new SW take control. A Home Screen app cold-launches into the new SW already in control → no `controllerchange` event → no reload → user sees the shell that the new SW activated from precache, which is the *previous* build's `index.html`.
4. **`clientsClaim` + precached HTML is the trap.** The new SW activates, claims the client, and immediately serves the precached old `index.html` from the previous deploy because precache entries beat `NetworkFirst` for the document request on the very first navigation of a cold launch.
5. **`start_url: /dashboard` is auth-gated.** When the auth redirect kicks in, the SW serves the cached fallback for that route, compounding the staleness.

Net effect: installed users stay on whatever build they had when they installed, sometimes for weeks.

## Fix

Three coordinated changes:

### 1. Stop precaching `index.html`; always fetch it from the network on launch

`vite.config.ts`
- Remove `html` from `globPatterns` so `index.html` is **never** in the precache manifest.
  ```ts
  globPatterns: ['**/*.{js,css}']
  ```
- Remove `navigateFallback: 'index.html'` (it forces precached-shell fallback even when network is available — fatal for standalone).
- Keep the `NetworkFirst` runtime cache for navigations, but lower `networkTimeoutSeconds` to `2` and reduce `maxAgeSeconds` to `60 * 60` (1h) so even offline launches recover quickly once back online.
- Add an explicit `'no-store'` `runtimeCaching` entry for `/version.json` (next bullet).

### 2. Add a build-version probe + forced reload on cold launch

This is the only reliable way to catch the standalone "SW already in control of stale shell" case.

**Build-time:**
- Generate `public/version.json` at build time containing the current commit/build hash. We already use Vite — emit it via a tiny vite plugin in `vite.config.ts`:
  ```ts
  {
    name: 'emit-version',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ build: Date.now().toString(36) }),
      });
    },
  }
  ```
- Inline the same `__BUILD_ID__` constant into the bundle via `define`:
  ```ts
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) }
  ```

**Runtime (`src/registerSW.ts`):**
- On every app launch *and* on `visibilitychange → visible` (this is what fires when a user re-opens the Home Screen app), `fetch('/version.json', { cache: 'no-store' })` and compare to `__BUILD_ID__`.
- If they differ:
  1. Unregister all SWs.
  2. `caches.keys()` → delete every cache.
  3. Set the `__sw_reloaded_once` flag.
  4. `location.reload()` (gated by the existing `isUserBusy` check).
- This bypasses the SW lifecycle entirely and works even when the SW thread is suspended.

### 3. Make the kill-switch path safer

`src/registerSW.ts`
- On `activate` of a new SW (detected via `wb.addEventListener('activated', …)`), proactively `caches.delete('html-shell')` so the next navigation must hit the network for `index.html`.
- Reduce the polling interval from 60s → 30s for foreground tabs (cheap; helps browser users too).
- Add a `pageshow` listener (fires on iOS when the standalone app is restored from the bfcache after being backgrounded) that triggers the version probe immediately.

### 4. Manifest tweak (defensive)

`public/manifest.json`
- Change `start_url` from `/dashboard` to `/dashboard?source=pwa` and add `"id": "/"`. This won't help already-installed users (manifest fields are pinned at install time per OS-level PWA rules), but ensures **future** installs have a stable, non-auth-redirected `start_url` that the SW can match cleanly.

### 5. Existing-installed-user recovery (one-time)

For users already on an old build, the version-probe in step 2 is what rescues them — on their next cold launch of the Home Screen app, the probe runs *before* React renders anything meaningful, sees a build mismatch, nukes caches, unregisters the SW, and reloads into the fresh bundle. After that one self-healing reload, all subsequent updates flow through the new auto-update path.

---

## Files to change

| File | Change |
|------|--------|
| `vite.config.ts` | Remove HTML from precache; drop `navigateFallback`; add `version.json` emit plugin; add `__BUILD_ID__` define; add `no-store` runtime cache for `/version.json` |
| `src/registerSW.ts` | Add `version.json` probe on launch + visibility/pageshow; nuke caches & SW on mismatch; clear `html-shell` cache on SW `activated`; tighten polling to 30s |
| `public/manifest.json` | `start_url` → `/dashboard?source=pwa`; add `"id": "/"` |
| `src/vite-env.d.ts` | Declare `const __BUILD_ID__: string` |

No DB, edge function, or feature-code changes.

## How it will behave after this ships

1. You publish.
2. A user with the Home Screen app re-opens it (cold launch *or* foreground after background).
3. Within ~1 second, the version probe fetches `/version.json` (no-store, ~200 bytes), sees a mismatch with their bundled `__BUILD_ID__`.
4. Caches and SW are wiped, the page silently reloads, and the new bundle loads from the network.
5. A small "Updated to latest version" toast confirms the refresh.
6. Future updates continue flowing through the same self-healing path automatically.

## Risks

- **Extra request per launch**: One ~200-byte `version.json` fetch per app launch and per tab-visibility-change. Negligible.
- **Offline cold launch**: Without `navigateFallback: index.html`, a user launching the Home Screen app while fully offline will see the browser offline page. Acceptable trade-off — and the `NetworkFirst` runtime cache still serves the last good `index.html` for up to 1h, covering almost all real-world offline cases.
- **Reload loop**: The existing `__sw_reloaded_once` sessionStorage flag prevents loops; the version probe additionally checks that the *new* `__BUILD_ID__` doesn't equal the *just-fetched* version before reloading.
