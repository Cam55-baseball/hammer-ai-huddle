

# Fix: Unregister Stale Service Workers for All Visitors

## Problem
The site works in incognito but not in regular browsers because a service worker from the previous PWA configuration is still cached. It intercepts requests and serves stale, broken files. This affects any visitor who previously loaded the site while the PWA was active.

## Solution
Add a small inline script to `index.html` that detects and unregisters any existing service workers, then reloads the page once. This ensures all visitors get the fresh, working build regardless of their browser cache state.

## Changes

**File: `index.html`**

Add the following script inside `<body>`, before the main app script:

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      if (registrations.length > 0) {
        Promise.all(registrations.map(function(r) { return r.unregister(); }))
          .then(function() {
            if (!sessionStorage.getItem('sw-cleared')) {
              sessionStorage.setItem('sw-cleared', '1');
              window.location.reload();
            }
          });
      }
    });
  }
</script>
```

## How It Works
- Checks if any service workers are registered
- Unregisters all of them
- Uses `sessionStorage` to reload the page exactly once (avoids infinite reload loops)
- After the reload, the browser fetches fresh assets directly from the server
- This script is harmless for new visitors who have no service workers cached

## After Implementation
Publish the update. Visitors with the stale cache will automatically get cleaned up on their next visit -- no manual action needed from them.

## Future Cleanup
After a few weeks (once all cached visitors have been cleaned up), this script can be safely removed from `index.html`.
