
# Fix: Clear All Cached Assets for Returning Visitors

## Problem
The service worker cleanup script only unregisters service workers, but does not clear the **Cache Storage API** entries left behind by the old PWA. Browsers may still serve stale JS chunks (`vendor-ui-C68qUwAh.js`) from these caches even after the service worker itself is gone.

## Solution
Enhance the inline script in `index.html` to also delete all Cache Storage entries via `caches.keys()` + `caches.delete()`. This ensures both the service worker AND its cached assets are fully purged.

## Changes

**File: `index.html`** (lines 36-50)

Replace the current service worker cleanup script with an expanded version:

```html
<script>
  (function() {
    var needsReload = false;
    var promises = [];

    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      promises.push(
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          if (registrations.length > 0) {
            needsReload = true;
            return Promise.all(registrations.map(function(r) { return r.unregister(); }));
          }
        })
      );
    }

    // 2. Clear all Cache Storage entries (PWA offline caches)
    if ('caches' in window) {
      promises.push(
        caches.keys().then(function(names) {
          if (names.length > 0) {
            needsReload = true;
            return Promise.all(names.map(function(n) { return caches.delete(n); }));
          }
        })
      );
    }

    // 3. Reload once after cleanup
    if (promises.length > 0) {
      Promise.all(promises).then(function() {
        if (needsReload && !sessionStorage.getItem('sw-cleared')) {
          sessionStorage.setItem('sw-cleared', '1');
          window.location.reload();
        }
      });
    }
  })();
</script>
```

## How It Works
- Unregisters service workers (same as before)
- Also deletes all Cache Storage entries -- this is where the old PWA stored offline copies of JS chunks like `vendor-ui-C68qUwAh.js`
- Reloads exactly once using `sessionStorage` guard (same as before)
- Harmless for visitors with no caches

## Important
After publishing, you should still do a **hard refresh** (`Ctrl+Shift+R` / `Cmd+Shift+R`) or clear site data in your own browser, since the old cached `index.html` (without this updated script) may itself be cached by the browser's HTTP cache.

## After Implementation
Publish the update. Returning visitors whose browsers serve the new `index.html` will automatically have all stale caches purged.
